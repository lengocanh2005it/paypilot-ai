import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InvoiceStatus, MatchType, Prisma, TransactionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EmbeddingService } from './embedding.service';
import { OpenAiService } from './openai.service';
import { amountsMatch, calculateConfidenceScore, isDueDateOk } from './utils/confidence-scoring';
import {
  extractInvoiceCodeTokens,
  extractPhoneNumbers,
  namesMatch,
  preprocessTransactionContent,
} from './utils/text-preprocessing';

export interface MatchCandidate {
  invoiceId: string;
  invoiceCode: string;
  customerId: string;
  customerName: string;
  amount: number;
  confidenceScore: number;
  semanticSimilarity: number;
}

export interface MatchingResult {
  transactionId: string;
  status: TransactionStatus;
  confidenceScore: number;
  autoMatched: boolean;
  matchedInvoiceId?: string;
  candidates: MatchCandidate[];
}

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly openAiService: OpenAiService,
    private readonly embeddingService: EmbeddingService,
    private readonly configService: ConfigService,
  ) {}

  async processTransaction(transactionDbId: string): Promise<MatchingResult | null> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionDbId },
    });

    if (!transaction || transaction.status !== TransactionStatus.pending) {
      return null;
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: transaction.tenantId },
    });

    const threshold = tenant?.matchingThreshold ?? this.getAutoThreshold();
    const content = transaction.content ?? '';
    const txnAmount = Number(transaction.amount);

    const candidates = await this.findCandidates(transaction.tenantId, content, txnAmount);

    const best = candidates[0];
    const confidenceScore = best?.confidenceScore ?? 0;

    if (best && confidenceScore >= threshold) {
      await this.applyAutoMatch(transaction, best, confidenceScore);
      return {
        transactionId: transaction.id,
        status: TransactionStatus.matched,
        confidenceScore,
        autoMatched: true,
        matchedInvoiceId: best.invoiceId,
        candidates,
      };
    }

    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: TransactionStatus.review,
        confidenceScore,
      },
    });

    return {
      transactionId: transaction.id,
      status: TransactionStatus.review,
      confidenceScore,
      autoMatched: false,
      candidates,
    };
  }

  async getMatchSuggestions(tenantId: string, transactionDbId: string): Promise<MatchCandidate[]> {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id: transactionDbId, tenantId },
    });

    if (!transaction) {
      return [];
    }

    return this.findCandidates(tenantId, transaction.content ?? '', Number(transaction.amount));
  }

  private getAutoThreshold(): number {
    return Number.parseInt(this.configService.get<string>('AI_MATCHING_AUTO_THRESHOLD', '95'), 10);
  }

  private async findCandidates(
    tenantId: string,
    content: string,
    txnAmount: number,
  ): Promise<MatchCandidate[]> {
    const normalizedContent = preprocessTransactionContent(content);
    const invoiceCodes = extractInvoiceCodeTokens(content);
    const phones = extractPhoneNumbers(content);

    const embedding = await this.openAiService.createEmbedding(normalizedContent || content);

    const candidateMap = new Map<string, MatchCandidate>();

    if (embedding) {
      const similarInvoices = await this.embeddingService.findSimilarInvoices(
        tenantId,
        embedding,
        5,
      );

      for (const row of similarInvoices) {
        const candidate = this.scoreCandidate(
          row.id,
          row.invoice_code,
          row.customer_id,
          row.customer_name,
          Number(row.amount),
          row.due_date,
          Number(row.similarity),
          content,
          txnAmount,
          invoiceCodes,
          phones,
        );
        candidateMap.set(candidate.invoiceId, candidate);
      }

      const similarCustomers = await this.embeddingService.findSimilarCustomers(
        tenantId,
        embedding,
        3,
      );

      for (const customer of similarCustomers) {
        const invoices = await this.prisma.invoice.findMany({
          where: {
            tenantId,
            customerId: customer.id,
            deletedAt: null,
            status: { in: ['unpaid', 'partial'] },
          },
          include: { customer: { select: { name: true } } },
          take: 2,
        });

        for (const invoice of invoices) {
          if (candidateMap.has(invoice.id)) continue;
          const candidate = this.scoreCandidate(
            invoice.id,
            invoice.invoiceCode,
            invoice.customerId,
            invoice.customer.name,
            Number(invoice.amount),
            invoice.dueDate,
            Number(customer.similarity) * 0.8,
            content,
            txnAmount,
            invoiceCodes,
            phones,
          );
          candidateMap.set(candidate.invoiceId, candidate);
        }
      }
    }

    const ruleInvoices = await this.embeddingService.findInvoicesByRule(
      tenantId,
      invoiceCodes,
      txnAmount,
    );

    for (const invoice of ruleInvoices) {
      if (candidateMap.has(invoice.id)) continue;
      const candidate = this.scoreCandidate(
        invoice.id,
        invoice.invoiceCode,
        invoice.customerId,
        invoice.customer.name,
        Number(invoice.amount),
        invoice.dueDate,
        0.5,
        content,
        txnAmount,
        invoiceCodes,
        phones,
      );
      candidateMap.set(candidate.invoiceId, candidate);
    }

    return [...candidateMap.values()]
      .sort((a, b) => b.confidenceScore - a.confidenceScore)
      .slice(0, 3);
  }

  private scoreCandidate(
    invoiceId: string,
    invoiceCode: string,
    customerId: string,
    customerName: string,
    invoiceAmount: number,
    dueDate: Date | null,
    semanticSimilarity: number,
    content: string,
    txnAmount: number,
    invoiceCodes: string[],
    phones: string[],
  ): MatchCandidate {
    const normalizedCode = invoiceCode.toUpperCase().replace(/\s/g, '');
    const invoiceCodeMatch =
      invoiceCodes.some((code) => normalizedCode.includes(code) || code.includes(normalizedCode)) ||
      preprocessTransactionContent(content).includes(preprocessTransactionContent(invoiceCode));

    const customerNameMatch = namesMatch(content, customerName);
    const phoneMatch = phones.length > 0;

    return {
      invoiceId,
      invoiceCode,
      customerId,
      customerName,
      amount: invoiceAmount,
      semanticSimilarity,
      confidenceScore: calculateConfidenceScore({
        semanticSimilarity,
        amountMatch: amountsMatch(txnAmount, invoiceAmount),
        invoiceCodeMatch,
        dueDateOk: isDueDateOk(dueDate),
        customerNameMatch: customerNameMatch || phoneMatch,
      }),
    };
  }

  private async applyAutoMatch(
    transaction: { id: string; tenantId: string; amount: Prisma.Decimal },
    candidate: MatchCandidate,
    confidenceScore: number,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.invoiceMatch.create({
        data: {
          transactionId: transaction.id,
          invoiceId: candidate.invoiceId,
          matchedAmount: transaction.amount,
          confidenceScore,
          matchType: MatchType.auto,
          matchedBy: 'ai',
        },
      });

      const invoice = await tx.invoice.findUniqueOrThrow({
        where: { id: candidate.invoiceId },
      });

      const newPaidAmount = new Prisma.Decimal(invoice.paidAmount).add(transaction.amount);
      const invoiceAmount = new Prisma.Decimal(invoice.amount);

      let status: InvoiceStatus = InvoiceStatus.unpaid;
      if (newPaidAmount.gte(invoiceAmount)) {
        status = newPaidAmount.gt(invoiceAmount) ? InvoiceStatus.overpaid : InvoiceStatus.paid;
      } else if (newPaidAmount.gt(0)) {
        status = InvoiceStatus.partial;
      }

      await tx.invoice.update({
        where: { id: candidate.invoiceId },
        data: {
          paidAmount: newPaidAmount,
          status,
        },
      });

      await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          status: TransactionStatus.matched,
          confidenceScore,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: transaction.tenantId,
          entityType: 'transaction',
          entityId: transaction.id,
          action: 'ai_auto_match',
          actor: 'ai',
          afterState: {
            invoiceId: candidate.invoiceId,
            invoiceCode: candidate.invoiceCode,
            confidenceScore,
          },
        },
      });
    });

    this.logger.log(
      `Auto matched transaction ${transaction.id} → invoice ${candidate.invoiceCode} (${confidenceScore}%)`,
    );
  }
}
