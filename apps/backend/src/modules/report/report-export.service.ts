import { randomUUID } from 'node:crypto';
import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { RedisService } from '../../redis/redis.service';
import { ReportDataService } from './report-data.service';
import { buildExportWorkbook } from './report-excel.util';
import { buildExportPdf } from './report-pdf.util';

export type ExportFormat = 'excel' | 'pdf';

interface CachedExport {
  tenantId: string;
  format: ExportFormat;
  fileName: string;
  bufferBase64: string;
}

const EXPORT_CACHE_TTL_SECONDS = 600;
const EXPORT_CACHE_PREFIX = 'copilot:export:';

function contentTypeFor(format: ExportFormat): string {
  return format === 'excel'
    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : 'application/pdf';
}

function fileNameFor(format: ExportFormat, fromDate: string, toDate: string): string {
  const ext = format === 'excel' ? 'xlsx' : 'pdf';
  return `bao-cao-dinh-khoan-${fromDate}-${toDate}.${ext}`;
}

@Injectable()
export class ReportExportService {
  constructor(
    private readonly reportData: ReportDataService,
    private readonly redis: RedisService,
  ) {}

  async buildFile(
    tenantId: string,
    format: ExportFormat,
    fromDate: string,
    toDate: string,
  ): Promise<{ buffer: Buffer; contentType: string; fileName: string }> {
    const data = await this.reportData.fetchExportData(tenantId, fromDate, toDate);
    const fileName = fileNameFor(format, fromDate, toDate);

    if (format === 'excel') {
      const wb = buildExportWorkbook({ ...data, exportedAt: new Date() });
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
      return { buffer, contentType: contentTypeFor(format), fileName };
    }

    const buffer = await buildExportPdf({ ...data, exportedAt: new Date() });
    return { buffer, contentType: contentTypeFor(format), fileName };
  }

  async createExport(
    tenantId: string,
    format: ExportFormat,
    fromDate: string,
    toDate: string,
  ): Promise<{
    exportId: string;
    format: ExportFormat;
    fileName: string;
    fromDate: string;
    toDate: string;
  }> {
    const { buffer, fileName } = await this.buildFile(tenantId, format, fromDate, toDate);
    const exportId = randomUUID();

    const cached: CachedExport = {
      tenantId,
      format,
      fileName,
      bufferBase64: buffer.toString('base64'),
    };
    await this.redis.setex(
      `${EXPORT_CACHE_PREFIX}${exportId}`,
      EXPORT_CACHE_TTL_SECONDS,
      JSON.stringify(cached),
    );

    return { exportId, format, fileName, fromDate, toDate };
  }

  async getExportFile(
    exportId: string,
    tenantId: string,
    fallback: { format: ExportFormat; fromDate: string; toDate: string },
  ): Promise<{ buffer: Buffer; contentType: string; fileName: string }> {
    const raw = await this.redis.get(`${EXPORT_CACHE_PREFIX}${exportId}`);

    if (raw) {
      const cached = JSON.parse(raw) as CachedExport;
      if (cached.tenantId !== tenantId) {
        throw new ForbiddenException('Không có quyền truy cập file export này');
      }
      return {
        buffer: Buffer.from(cached.bufferBase64, 'base64'),
        contentType: contentTypeFor(cached.format),
        fileName: cached.fileName,
      };
    }

    if (!fallback.fromDate || !fallback.toDate) {
      throw new BadRequestException(
        'Thiếu tham số fromDate/toDate để tạo lại file export đã hết hạn',
      );
    }

    return this.buildFile(tenantId, fallback.format, fallback.fromDate, fallback.toDate);
  }
}
