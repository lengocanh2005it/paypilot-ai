import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { PlanGuard } from '../../common/guards/plan.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { SettingsModule } from '../settings/settings.module';
import { MonthlyReportScheduler } from './monthly-report.scheduler';
import { ReportController } from './report.controller';
import { ReportSqlBuilder } from './report.sql';
import { ReportDataService } from './report-data.service';
import { ReportExportService } from './report-export.service';

@Module({
  imports: [
    PrismaModule,
    SettingsModule,
    NotificationModule,
    BullModule.registerQueue({ name: 'email-delivery' }),
  ],
  controllers: [ReportController],
  providers: [
    ReportDataService,
    ReportSqlBuilder,
    ReportExportService,
    MonthlyReportScheduler,
    PlanGuard,
  ],
  exports: [ReportDataService, ReportSqlBuilder, ReportExportService],
})
export class ReportModule {}
