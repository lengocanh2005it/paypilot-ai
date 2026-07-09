import { Global, Module } from '@nestjs/common';
import { NotificationModule } from '../modules/notification/notification.module';
import { QuotaNotificationService } from './services/quota-notification.service';
import { SubscriptionQueryAdapter } from './services/subscription-query.adapter';

@Global()
@Module({
  imports: [NotificationModule],
  providers: [QuotaNotificationService, SubscriptionQueryAdapter],
  exports: [QuotaNotificationService, SubscriptionQueryAdapter],
})
export class CommonServicesModule {}
