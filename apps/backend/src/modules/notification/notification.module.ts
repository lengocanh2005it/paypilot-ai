import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { QueueModule } from '../../queue/queue.module';
import { AuthModule } from '../auth/auth.module';
import { SettingsModule } from '../settings/settings.module';
import { EMAIL_QUEUE } from './email.constants';
import { EmailProcessor } from './email.processor';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationDeliveryService } from './notification-delivery.service';
import { NotificationStreamService } from './notification-stream.service';
import { ResendEmailService } from './resend-email.service';
import { SlackService } from './slack.service';

@Module({
  imports: [
    PrismaModule,
    SettingsModule,
    QueueModule,
    ConfigModule,
    AuthModule,
    BullModule.registerQueue({ name: EMAIL_QUEUE }),
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationStreamService,
    NotificationDeliveryService,
    ResendEmailService,
    SlackService,
    EmailProcessor,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
