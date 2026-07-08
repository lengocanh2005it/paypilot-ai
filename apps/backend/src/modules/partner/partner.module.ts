import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { NotificationModule } from '../notification/notification.module';
import { AiCostService } from './ai-cost.service';
import { PartnerController } from './partner.controller';
import { PlanPricingService } from './plan-pricing.service';
import { RevenueAnalyticsService } from './revenue-analytics.service';
import { TenantManagementService } from './tenant-management.service';

@Module({
  imports: [PrismaModule, NotificationModule, AuditLogModule],
  controllers: [PartnerController],
  providers: [TenantManagementService, RevenueAnalyticsService, PlanPricingService, AiCostService],
})
export class PartnerModule {}
