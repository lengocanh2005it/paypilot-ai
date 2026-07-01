import { Module } from '@nestjs/common';
import { BankingService } from './banking.service';
import { WebhookController } from './webhook.controller';

@Module({
  controllers: [WebhookController],
  providers: [BankingService],
  exports: [BankingService],
})
export class BankingModule {}
