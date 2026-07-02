import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { MatchType, Prisma, TransactionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EmbeddingService } from './embedding.service';
import { MatchingService } from './matching.service';
import { OpenAiService } from './openai.service';
import { amountsMatch, calculateConfidenceScore, isDueDateOk } from './utils/confidence-scoring';
import {
  extractInvoiceCodeTokens,
  namesMatch,
  preprocessTransactionContent,
} from './utils/text-preprocessing';

describe('text-preprocessing', () => {
  it('normalizes Vietnamese content', () => {
    expect(preprocessTransactionContent('Thanh toán HD1025')).toBe('thanh toan hd1025');
  });

  it('extracts invoice codes from content', () => {
    expect(extractInvoiceCodeTokens('TT HD1025 Nguyen Van A')).toEqual(
      expect.arrayContaining(['HD1025']),
    );
  });

  it('matches customer names in content', () => {
    expect(namesMatch('Nguyen Van A CK don hang', 'Nguyễn Văn A')).toBe(true);
  });
});

describe('confidence-scoring', () => {
  it('returns high score when rules and semantic align', () => {
    const score = calculateConfidenceScore({
      semanticSimilarity: 0.9,
      amountMatch: true,
      invoiceCodeMatch: true,
      dueDateOk: true,
      customerNameMatch: true,
    });

    expect(score).toBeGreaterThanOrEqual(95);
  });

  it('returns low score for weak matches', () => {
    const score = calculateConfidenceScore({
      semanticSimilarity: 0.2,
      amountMatch: false,
      invoiceCodeMatch: false,
      dueDateOk: true,
      customerNameMatch: false,
    });

    expect(score).toBeLessThan(50);
  });

  it('checks amount equality', () => {
    expect(amountsMatch(350000, 350000)).toBe(true);
    expect(amountsMatch(350000, 340000)).toBe(false);
  });

  it('allows missing due date', () => {
    expect(isDueDateOk(null)).toBe(true);
  });
});

describe('MatchingService', () => {
  let service: MatchingService;

  const prisma = {
    transaction: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    tenant: {
      findUnique: jest.fn(),
    },
    invoice: {
      findMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    invoiceMatch: {
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const openAiService = {
    createEmbedding: jest.fn(),
  };

  const embeddingService = {
    findSimilarInvoices: jest.fn(),
    findSimilarCustomers: jest.fn(),
    findInvoicesByRule: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchingService,
        { provide: PrismaService, useValue: prisma },
        { provide: OpenAiService, useValue: openAiService },
        { provide: EmbeddingService, useValue: embeddingService },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, defaultValue?: string) =>
              key === 'AI_MATCHING_AUTO_THRESHOLD' ? '95' : defaultValue,
          },
        },
      ],
    }).compile();

    service = module.get<MatchingService>(MatchingService);
  });

  it('queues transaction for review when confidence is below threshold', async () => {
    prisma.transaction.findUnique.mockResolvedValue({
      id: 'db-txn-1',
      tenantId: 'tenant-1',
      content: 'tien hang',
      amount: new Prisma.Decimal(100000),
      status: TransactionStatus.pending,
    });
    prisma.tenant.findUnique.mockResolvedValue({ matchingThreshold: 95 });
    openAiService.createEmbedding.mockResolvedValue([0.1, 0.2]);
    embeddingService.findSimilarInvoices.mockResolvedValue([
      {
        id: 'inv-1',
        invoice_code: 'HD9999',
        amount: '500000',
        customer_id: 'cust-1',
        customer_name: 'Unknown',
        due_date: null,
        similarity: 0.3,
      },
    ]);
    embeddingService.findSimilarCustomers.mockResolvedValue([]);
    embeddingService.findInvoicesByRule.mockResolvedValue([]);
    prisma.transaction.update.mockResolvedValue({});

    const result = await service.processTransaction('db-txn-1');

    expect(result?.autoMatched).toBe(false);
    expect(result?.status).toBe(TransactionStatus.review);
    expect(prisma.transaction.update).toHaveBeenCalled();
  });

  it('auto matches when semantic and rules produce high confidence', async () => {
    prisma.transaction.findUnique.mockResolvedValue({
      id: 'db-txn-2',
      tenantId: 'tenant-1',
      content: 'Thanh toan HD1025 Nguyen Van A',
      amount: new Prisma.Decimal(350000),
      status: TransactionStatus.pending,
    });
    prisma.tenant.findUnique.mockResolvedValue({ matchingThreshold: 95 });
    openAiService.createEmbedding.mockResolvedValue([0.5, 0.6]);
    embeddingService.findSimilarInvoices.mockResolvedValue([
      {
        id: 'inv-2',
        invoice_code: 'HD1025',
        amount: '350000',
        customer_id: 'cust-2',
        customer_name: 'Nguyen Van A',
        due_date: new Date('2026-12-31'),
        similarity: 0.92,
      },
    ]);
    embeddingService.findSimilarCustomers.mockResolvedValue([]);
    embeddingService.findInvoicesByRule.mockResolvedValue([]);

    prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<void>) => {
      await fn(prisma);
    });
    prisma.invoice.findUniqueOrThrow.mockResolvedValue({
      id: 'inv-2',
      paidAmount: new Prisma.Decimal(0),
      amount: new Prisma.Decimal(350000),
    });

    const result = await service.processTransaction('db-txn-2');

    expect(result?.autoMatched).toBe(true);
    expect(result?.status).toBe(TransactionStatus.matched);
    expect(prisma.invoiceMatch.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          matchType: MatchType.auto,
          matchedBy: 'ai',
        }),
      }),
    );
  });
});
