import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { PartnerController } from './partner.controller';
import { PartnerService } from './partner.service';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [PartnerController],
  providers: [PartnerService],
})
export class PartnerModule {}
