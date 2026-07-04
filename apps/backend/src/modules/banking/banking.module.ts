import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { WEBHOOK_QUEUE } from '../../queue/queue.module';
import { NotificationModule } from '../notification/notification.module';
import { BankingService } from './banking.service';
import { WebhookController } from './webhook.controller';

@Module({
  imports: [BullModule.registerQueue({ name: WEBHOOK_QUEUE }), PrismaModule, NotificationModule],
  controllers: [WebhookController],
  providers: [BankingService],
  exports: [BankingService],
})
export class BankingModule {}
