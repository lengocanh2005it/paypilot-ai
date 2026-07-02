import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { OpenAiService } from './openai.service';

export interface InvoiceSimilarityRow {
  id: string;
  invoice_code: string;
  amount: string;
  customer_id: string;
  customer_name: string;
  due_date: Date | null;
  similarity: number;
}

export interface CustomerSimilarityRow {
  id: string;
  name: string;
  phone: string | null;
  similarity: number;
}

@Injectable()
export class EmbeddingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly openAiService: OpenAiService,
  ) {}

  buildInvoiceEmbeddingText(invoiceCode: string, customerName: string, amount: number): string {
    return `${invoiceCode} ${customerName} ${amount}`;
  }

  buildCustomerEmbeddingText(name: string, phone?: string | null, email?: string | null): string {
    return [name, phone, email].filter(Boolean).join(' ');
  }

  private toVectorLiteral(embedding: number[]): string {
    return `[${embedding.join(',')}]`;
  }

  async embedAndStoreInvoice(
    invoiceId: string,
    invoiceCode: string,
    customerName: string,
    amount: number,
  ): Promise<void> {
    const text = this.buildInvoiceEmbeddingText(invoiceCode, customerName, amount);
    const embedding = await this.openAiService.createEmbedding(text);
    if (!embedding) return;

    const vectorLiteral = this.toVectorLiteral(embedding);
    await this.prisma.$executeRawUnsafe(
      'UPDATE invoices SET embedding = $1::vector WHERE id = $2::uuid',
      vectorLiteral,
      invoiceId,
    );
  }

  async embedAndStoreCustomer(
    customerId: string,
    name: string,
    phone?: string | null,
    email?: string | null,
  ): Promise<void> {
    const text = this.buildCustomerEmbeddingText(name, phone, email);
    const embedding = await this.openAiService.createEmbedding(text);
    if (!embedding) return;

    const vectorLiteral = this.toVectorLiteral(embedding);
    await this.prisma.$executeRawUnsafe(
      'UPDATE customers SET embedding = $1::vector WHERE id = $2::uuid',
      vectorLiteral,
      customerId,
    );
  }

  async findSimilarInvoices(
    tenantId: string,
    embedding: number[],
    limit = 3,
  ): Promise<InvoiceSimilarityRow[]> {
    const vectorLiteral = this.toVectorLiteral(embedding);

    return this.prisma.$queryRawUnsafe<InvoiceSimilarityRow[]>(
      `SELECT i.id, i.invoice_code, i.amount::text, i.customer_id, c.name AS customer_name,
              i.due_date,
              1 - (i.embedding <=> $1::vector) AS similarity
       FROM invoices i
       INNER JOIN customers c ON c.id = i.customer_id
       WHERE i.tenant_id = $2::uuid
         AND i.deleted_at IS NULL
         AND c.deleted_at IS NULL
         AND i.embedding IS NOT NULL
         AND i.status IN ('unpaid', 'partial')
       ORDER BY i.embedding <=> $1::vector
       LIMIT $3`,
      vectorLiteral,
      tenantId,
      limit,
    );
  }

  async findSimilarCustomers(
    tenantId: string,
    embedding: number[],
    limit = 3,
  ): Promise<CustomerSimilarityRow[]> {
    const vectorLiteral = this.toVectorLiteral(embedding);

    return this.prisma.$queryRawUnsafe<CustomerSimilarityRow[]>(
      `SELECT id, name, phone,
              1 - (embedding <=> $1::vector) AS similarity
       FROM customers
       WHERE tenant_id = $2::uuid
         AND deleted_at IS NULL
         AND embedding IS NOT NULL
       ORDER BY embedding <=> $1::vector
       LIMIT $3`,
      vectorLiteral,
      tenantId,
      limit,
    );
  }

  async findInvoicesByRule(
    tenantId: string,
    invoiceCodes: string[],
    amount?: number,
  ): Promise<
    Array<{
      id: string;
      invoiceCode: string;
      amount: Prisma.Decimal;
      customerId: string;
      dueDate: Date | null;
      customer: { name: string };
    }>
  > {
    if (invoiceCodes.length === 0 && amount === undefined) {
      return [];
    }

    const codeFilters = invoiceCodes.map((code) => ({
      invoiceCode: { contains: code, mode: 'insensitive' as const },
    }));

    return this.prisma.invoice.findMany({
      where: {
        tenantId,
        deletedAt: null,
        status: { in: ['unpaid', 'partial'] },
        ...(invoiceCodes.length > 0
          ? { OR: codeFilters }
          : amount !== undefined
            ? { amount: new Prisma.Decimal(amount) }
            : {}),
      },
      include: { customer: { select: { name: true } } },
      take: 5,
    });
  }
}
