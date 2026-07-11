import { Injectable } from '@nestjs/common';
import type { Role } from '@xcash/shared-types';
import { BillingService } from '../billing/billing.service';
import { ReportDataService } from '../report/report-data.service';
import { ReportExportService } from '../report/report-export.service';
import { CopilotKnowledgeService } from './copilot-knowledge.service';
import { COPILOT_TOOLS } from './copilot-tool.registry';
import { CopilotTransactionQueryService } from './copilot-tx-query.service';

/**
 * Thin wrapper around executeTool() to provide the CopilotToolService
 * interface expected by CopilotAgentService and CopilotStreamService.
 */
@Injectable()
export class CopilotToolService {
  constructor(
    private readonly reportService: ReportDataService,
    private readonly txQueryService: CopilotTransactionQueryService,
    private readonly knowledgeService: CopilotKnowledgeService,
    private readonly billingService: BillingService,
    private readonly exportService: ReportExportService,
  ) {}

  async execute(
    tenantId: string,
    name: string,
    args: Record<string, unknown>,
    role?: Role,
  ): Promise<unknown> {
    const entry = COPILOT_TOOLS.find((t) => t.name === name);
    if (!entry) throw new Error(`Unknown copilot tool: ${name}`);
    return entry.execute(
      {
        reportService: this.reportService,
        txQueryService: this.txQueryService,
        knowledgeService: this.knowledgeService,
        billingService: this.billingService,
        exportService: this.exportService,
      },
      tenantId,
      args,
      role,
    );
  }
}
