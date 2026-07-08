import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AiCallType, SubscriptionPlan } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard, PartnerGuard } from '../../common/guards/auth.guards';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { AuditLogService } from '../audit-log/audit-log.service';
import { ListAuditLogsQueryDto } from '../audit-log/dto/list-audit-logs.dto';
import { AiCostService } from './ai-cost.service';
import { SetTenantPlanDto, UpdatePlanPricingDto } from './dto/plan-pricing.dto';
import { PlanPricingService } from './plan-pricing.service';
import { RevenueAnalyticsService } from './revenue-analytics.service';
import { TenantManagementService } from './tenant-management.service';

@ApiTags('partner')
@Controller('partner')
@UseGuards(JwtAuthGuard, PartnerGuard)
export class PartnerController {
  constructor(
    private readonly tenantManagement: TenantManagementService,
    private readonly revenueAnalytics: RevenueAnalyticsService,
    private readonly planPricing: PlanPricingService,
    private readonly aiCost: AiCostService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get('tenants')
  listTenants(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('plan') plan?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tenantManagement.listTenants({
      search,
      status,
      plan,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('stats')
  getStats(@Query('fromDate') fromDate?: string, @Query('toDate') toDate?: string) {
    return this.revenueAnalytics.getStats({ fromDate, toDate });
  }

  @Get('tenants/:id')
  getTenantDetail(@Param('id') id: string) {
    return this.tenantManagement.getTenantDetail(id);
  }

  @Get('revenue-trend')
  getRevenueTrend(@Query('fromDate') fromDate?: string, @Query('toDate') toDate?: string) {
    return this.revenueAnalytics.getRevenueTrend({ fromDate, toDate });
  }

  @Get('payments')
  listPayments(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('plan') plan?: string,
    @Query('search') search?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.revenueAnalytics.listPayments({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status,
      plan,
      search,
      fromDate,
      toDate,
    });
  }

  @Get('audit-logs')
  listAuditLogs(@Query() query: ListAuditLogsQueryDto) {
    return this.auditLogService.listForPartner(query);
  }

  @Patch('tenants/:id/plan')
  setTenantPlan(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SetTenantPlanDto,
  ) {
    return this.planPricing.setTenantPlan(id, dto.targetPlan as SubscriptionPlan, user.id);
  }

  @Patch('tenants/:id/suspend')
  suspend(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.tenantManagement.suspendTenant(id, user.id);
  }

  @Patch('tenants/:id/activate')
  activate(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.tenantManagement.activateTenant(id, user.id);
  }

  @Get('ai-costs')
  getAiCosts(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('tenantId') tenantId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.aiCost.getAiCosts({
      fromDate,
      toDate,
      tenantId,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('ai-costs/detail')
  getAiCostDetail(
    @Query('tenantId') tenantId: string,
    @Query('callType') callType?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.aiCost.getAiCostDetail({
      tenantId,
      callType: callType as AiCallType | undefined,
      fromDate,
      toDate,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('plan-pricing')
  listPlanPricing() {
    return this.planPricing.listPlanPricing();
  }

  @Patch('plan-pricing/:plan')
  updatePlanPricing(
    @CurrentUser() user: AuthenticatedUser,
    @Param('plan') plan: SubscriptionPlan,
    @Body() dto: UpdatePlanPricingDto,
  ) {
    return this.planPricing.updatePlanPricing(plan, dto, user.id);
  }
}
