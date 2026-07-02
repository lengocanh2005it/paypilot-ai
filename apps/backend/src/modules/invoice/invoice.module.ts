import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { CustomerModule } from '../customer/customer.module';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './invoice.service';

@Module({
  imports: [AiModule, CustomerModule],
  controllers: [InvoiceController],
  providers: [InvoiceService],
  exports: [InvoiceService],
})
export class InvoiceModule {}
