import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { WEBHOOK_QUEUE } from '../../queue/queue.module';
import { BankingService } from './banking.service';
import { WebhookController } from './webhook.controller';

@Module({
  imports: [BullModule.registerQueue({ name: WEBHOOK_QUEUE })],
  controllers: [WebhookController],
  providers: [BankingService],
  exports: [BankingService],
})
export class BankingModule {}
