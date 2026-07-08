import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@xcash/shared-types';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { OnboardingService } from '../onboarding/onboarding.service';
import { ReportService } from '../report/report.service';
import { CopilotToolService } from './copilot-tool.service';
import { OpenAiService } from './openai.service';

describe('CopilotToolService — propose_confirm_transaction_classification', () => {
  let service: CopilotToolService;

  const prisma = {
    transactionClassification: {
      findFirst: jest.fn(),
    },
    chartOfAccount: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CopilotToolService,
        { provide: ReportService, useValue: {} },
        { provide: OnboardingService, useValue: {} },
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: { client: { get: jest.fn(), set: jest.fn() } } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: OpenAiService, useValue: {} },
      ],
    }).compile();

    service = module.get(CopilotToolService);
  });

  it('trả canConfirm=true kèm đủ field khi status=review và role có quyền', async () => {
    prisma.transactionClassification.findFirst.mockResolvedValue({
      id: 'class-1',
      debitAccount: '642',
      creditAccount: '112',
      confidenceScore: 92,
      status: 'review',
      amount: 150000,
      transaction: { content: 'Thanh toán điện nước' },
    });

    const result = (await service.proposeConfirmTransactionClassification(
      'tenant-1',
      'txn-1',
      Role.ACCOUNTANT,
    )) as Record<string, unknown>;

    expect(result).toEqual(
      expect.objectContaining({
        transactionId: 'txn-1',
        classificationId: 'class-1',
        debitAccount: '642',
        creditAccount: '112',
        confidence: 92,
        status: 'review',
        content: 'Thanh toán điện nước',
        amount: 150000,
        canConfirm: true,
      }),
    );
  });

  it('trả canConfirm=false kèm lý do khi status khác review', async () => {
    prisma.transactionClassification.findFirst.mockResolvedValue({
      id: 'class-2',
      debitAccount: '642',
      creditAccount: '112',
      confidenceScore: 92,
      status: 'classified',
      amount: 150000,
      transaction: { content: 'Thanh toán điện nước' },
    });

    const result = (await service.proposeConfirmTransactionClassification(
      'tenant-1',
      'txn-2',
      Role.ACCOUNTANT,
    )) as Record<string, unknown>;

    expect(result.canConfirm).toBe(false);
    expect(result.status).toBe('classified');
    expect(typeof result.reason).toBe('string');
  });

  it('trả canConfirm=false kèm lý do khi role là viewer, dù status=review', async () => {
    prisma.transactionClassification.findFirst.mockResolvedValue({
      id: 'class-3',
      debitAccount: '642',
      creditAccount: '112',
      confidenceScore: 92,
      status: 'review',
      amount: 150000,
      transaction: { content: 'Thanh toán điện nước' },
    });

    const result = (await service.proposeConfirmTransactionClassification(
      'tenant-1',
      'txn-3',
      Role.VIEWER,
    )) as Record<string, unknown>;

    expect(result.canConfirm).toBe(false);
    expect(result.status).toBe('review');
    expect(typeof result.reason).toBe('string');
  });
});

describe('CopilotToolService — propose_correct_transaction_classification', () => {
  let service: CopilotToolService;

  const prisma = {
    transactionClassification: {
      findFirst: jest.fn(),
    },
    chartOfAccount: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CopilotToolService,
        { provide: ReportService, useValue: {} },
        { provide: OnboardingService, useValue: {} },
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: { client: { get: jest.fn(), set: jest.fn() } } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: OpenAiService, useValue: {} },
      ],
    }).compile();

    service = module.get(CopilotToolService);
  });

  const mockClassification = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: 'class-1',
    debitAccount: '642',
    creditAccount: '112',
    confidenceScore: 92,
    status: 'review',
    amount: 150000,
    transaction: { content: 'Thanh toán điện nước' },
    ...overrides,
  });

  const mockBothAccountsValid = [{ accountCode: '641' }, { accountCode: '111' }];

  it('trả canCorrect=true kèm đủ field cũ + mới khi role/status/mã TK đều hợp lệ', async () => {
    prisma.transactionClassification.findFirst.mockResolvedValue(mockClassification());
    prisma.chartOfAccount.findMany.mockResolvedValue(mockBothAccountsValid);

    const result = (await service.proposeCorrectTransactionClassification(
      'tenant-1',
      'txn-1',
      '641',
      '111',
      Role.ACCOUNTANT,
    )) as Record<string, unknown>;

    expect(result).toEqual(
      expect.objectContaining({
        transactionId: 'txn-1',
        classificationId: 'class-1',
        debitAccount: '642',
        creditAccount: '112',
        proposedDebitAccount: '641',
        proposedCreditAccount: '111',
        canCorrect: true,
      }),
    );
  });

  it('trả canCorrect=false kèm lý do khi role là viewer', async () => {
    prisma.transactionClassification.findFirst.mockResolvedValue(mockClassification());
    prisma.chartOfAccount.findMany.mockResolvedValue(mockBothAccountsValid);

    const result = (await service.proposeCorrectTransactionClassification(
      'tenant-1',
      'txn-2',
      '641',
      '111',
      Role.VIEWER,
    )) as Record<string, unknown>;

    expect(result.canCorrect).toBe(false);
    expect(typeof result.reason).toBe('string');
  });

  it('trả canCorrect=false kèm lý do khi status khác review', async () => {
    prisma.transactionClassification.findFirst.mockResolvedValue(
      mockClassification({ status: 'classified' }),
    );
    prisma.chartOfAccount.findMany.mockResolvedValue(mockBothAccountsValid);

    const result = (await service.proposeCorrectTransactionClassification(
      'tenant-1',
      'txn-3',
      '641',
      '111',
      Role.ACCOUNTANT,
    )) as Record<string, unknown>;

    expect(result.canCorrect).toBe(false);
    expect(result.status).toBe('classified');
    expect(typeof result.reason).toBe('string');
  });

  it('trả canCorrect=false kèm lý do khi mã tài khoản mới không hợp lệ', async () => {
    prisma.transactionClassification.findFirst.mockResolvedValue(mockClassification());
    prisma.chartOfAccount.findMany.mockResolvedValue([]);

    const result = (await service.proposeCorrectTransactionClassification(
      'tenant-1',
      'txn-4',
      '999',
      '111',
      Role.ACCOUNTANT,
    )) as Record<string, unknown>;

    expect(result.canCorrect).toBe(false);
    expect(typeof result.reason).toBe('string');
  });
});
