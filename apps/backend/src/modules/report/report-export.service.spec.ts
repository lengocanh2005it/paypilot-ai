import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ReportExportService } from './report-export.service';

describe('ReportExportService', () => {
  const fetchExportData = jest.fn().mockResolvedValue({
    businessName: 'Công ty Demo',
    fromDate: '2026-06-01',
    toDate: '2026-06-30',
    summary: {
      totalRevenue: 100,
      totalExpense: 40,
      net: 60,
      classifiedCount: 1,
      reviewCount: 0,
      totalCount: 1,
      aiAccuracy: 100,
    },
    accounts: [],
    details: [],
  });
  const reportData = { fetchExportData } as never;

  let store: Map<string, string>;
  let redis: { get: jest.Mock; setex: jest.Mock };

  beforeEach(() => {
    store = new Map();
    redis = {
      get: jest.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
      setex: jest.fn((key: string, _ttl: number, value: string) => {
        store.set(key, value);
        return Promise.resolve('OK');
      }),
    };
    fetchExportData.mockClear();
  });

  function makeService() {
    return new ReportExportService(reportData, redis as never);
  }

  it('createExport generates an excel file and caches it in Redis', async () => {
    const service = makeService();
    const result = await service.createExport('tenant-1', 'excel', '2026-06-01', '2026-06-30');

    expect(result.exportId).toEqual(expect.any(String));
    expect(result.format).toBe('excel');
    expect(result.fileName).toContain('.xlsx');
    expect(redis.setex).toHaveBeenCalledTimes(1);
  });

  it('createExport generates a pdf file', async () => {
    const service = makeService();
    const result = await service.createExport('tenant-1', 'pdf', '2026-06-01', '2026-06-30');
    expect(result.fileName).toContain('.pdf');
  });

  it('getExportFile returns cached file when Redis hit and tenant matches', async () => {
    const service = makeService();
    const created = await service.createExport('tenant-1', 'excel', '2026-06-01', '2026-06-30');

    const file = await service.getExportFile(created.exportId, 'tenant-1', {
      format: 'excel',
      fromDate: '2026-06-01',
      toDate: '2026-06-30',
    });

    expect(file.buffer.length).toBeGreaterThan(0);
    expect(fetchExportData).toHaveBeenCalledTimes(1); // not called again for the cached read
  });

  it('getExportFile throws ForbiddenException when tenant does not match cached entry', async () => {
    const service = makeService();
    const created = await service.createExport('tenant-1', 'excel', '2026-06-01', '2026-06-30');

    await expect(
      service.getExportFile(created.exportId, 'tenant-2', {
        format: 'excel',
        fromDate: '2026-06-01',
        toDate: '2026-06-30',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('getExportFile regenerates the file when Redis misses', async () => {
    const service = makeService();

    const file = await service.getExportFile('non-existent-id', 'tenant-1', {
      format: 'pdf',
      fromDate: '2026-06-01',
      toDate: '2026-06-30',
    });

    expect(file.buffer.length).toBeGreaterThan(0);
    expect(fetchExportData).toHaveBeenCalledTimes(1);
  });

  it('getExportFile throws BadRequestException when Redis misses and fallback fromDate/toDate is missing', async () => {
    const service = makeService();

    await expect(
      service.getExportFile('non-existent-id', 'tenant-1', {
        format: 'pdf',
        fromDate: '',
        toDate: '2026-06-30',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(fetchExportData).not.toHaveBeenCalled();
  });
});
