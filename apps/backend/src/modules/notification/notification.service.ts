import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { paginateParams } from '../../common/util/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import {
  checkCopilotQuotaNotifications,
  createBillingPaymentDue,
  createBillingSuccess,
  createOverageStarted,
  createPlanActivatedByPartner,
  createQuotaExceeded,
  createQuotaWarning,
  createReviewNeeded,
  createTenantSuspended,
} from './notification-creators';
import { NotificationDeliveryService } from './notification-delivery.service';
import { NotificationStreamService } from './notification-stream.service';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  readAt: Date | null;
  createdAt: Date;
}

export interface NotificationListResult {
  items: NotificationItem[];
  unreadCount: number;
  total: number;
}

export interface TransactionEvent {
  type: 'transaction_classified';
  transactionId: string;
  status: 'classified' | 'review';
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly deliveryService: NotificationDeliveryService,
    private readonly streamService: NotificationStreamService,
  ) {}

  streamForToken(token: string) {
    return this.streamService.streamForToken(token);
  }

  streamTransactionEventsForToken(token: string) {
    return this.streamService.streamTransactionEventsForToken(token);
  }

  emitTransactionClassified(
    tenantId: string,
    transactionId: string,
    status: 'classified' | 'review',
  ): void {
    this.streamService.emitTransactionClassified(tenantId, transactionId, status);
  }

  private userScope(userId: string): Prisma.NotificationWhereInput {
    return {
      OR: [{ userId: null }, { userId }],
    };
  }

  async list(
    tenantId: string,
    userId: string,
    page: number,
    limit: number,
  ): Promise<NotificationListResult> {
    const where: Prisma.NotificationWhereInput = {
      tenantId,
      ...this.userScope(userId),
    };

    const { skip } = paginateParams(page, limit);
    const [items, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { ...where, readAt: null },
      }),
    ]);

    return { items, unreadCount, total };
  }

  async getUnreadCount(tenantId: string, userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        tenantId,
        readAt: null,
        ...this.userScope(userId),
      },
    });
  }

  async markRead(
    tenantId: string,
    userId: string,
    notificationId: string,
  ): Promise<NotificationItem> {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        tenantId,
        ...this.userScope(userId),
      },
    });

    if (!notification) {
      throw new NotFoundException('Thông báo không tồn tại');
    }

    if (notification.readAt) {
      return notification;
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(tenantId: string, userId: string): Promise<{ updated: number }> {
    const result = await this.prisma.notification.updateMany({
      where: {
        tenantId,
        readAt: null,
        ...this.userScope(userId),
      },
      data: { readAt: new Date() },
    });

    return { updated: result.count };
  }

  async remove(
    tenantId: string,
    userId: string,
    notificationId: string,
  ): Promise<{ deleted: number }> {
    const result = await this.prisma.notification.deleteMany({
      where: {
        id: notificationId,
        tenantId,
        ...this.userScope(userId),
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Thông báo không tồn tại');
    }

    return { deleted: result.count };
  }

  async removeMany(tenantId: string, userId: string, ids: string[]): Promise<{ deleted: number }> {
    if (ids.length === 0) {
      return { deleted: 0 };
    }

    const result = await this.prisma.notification.deleteMany({
      where: {
        id: { in: ids },
        tenantId,
        ...this.userScope(userId),
      },
    });

    return { deleted: result.count };
  }

  async removeAll(tenantId: string, userId: string): Promise<{ deleted: number }> {
    const result = await this.prisma.notification.deleteMany({
      where: {
        tenantId,
        ...this.userScope(userId),
      },
    });

    return { deleted: result.count };
  }

  async createReviewNeeded(
    tenantId: string,
    transactionDbId: string,
    content: string | null,
    confidenceScore: number,
  ): Promise<void> {
    await createReviewNeeded(
      this.prisma,
      this.streamService,
      this.deliveryService,
      this.logger,
      tenantId,
      transactionDbId,
      content,
      confidenceScore,
    );
  }

  async createQuotaWarning(
    tenantId: string,
    used: number,
    quota: number,
    cycleStart: Date,
  ): Promise<void> {
    await createQuotaWarning(
      this.prisma,
      this.streamService,
      this.deliveryService,
      this.logger,
      tenantId,
      used,
      quota,
      cycleStart,
    );
  }

  async createQuotaExceeded(tenantId: string, quota: number, cycleStart: Date): Promise<void> {
    await createQuotaExceeded(
      this.prisma,
      this.streamService,
      this.deliveryService,
      this.logger,
      tenantId,
      quota,
      cycleStart,
    );
  }

  async checkCopilotQuotaNotifications(
    tenantId: string,
    used: number,
    quota: number,
    cycleStart: Date,
  ): Promise<void> {
    await checkCopilotQuotaNotifications(
      this.prisma,
      this.streamService,
      this.deliveryService,
      this.logger,
      tenantId,
      used,
      quota,
      cycleStart,
    );
  }

  async createOverageStarted(
    tenantId: string,
    pricePerTransaction: number,
    cycleStart: Date,
  ): Promise<void> {
    await createOverageStarted(
      this.prisma,
      this.streamService,
      this.deliveryService,
      this.logger,
      tenantId,
      pricePerTransaction,
      cycleStart,
    );
  }

  async createBillingSuccess(
    tenantId: string,
    kind: 'upgrade' | 'overage',
    plan: string,
    amount: number,
    quota?: number,
  ): Promise<void> {
    await createBillingSuccess(
      this.prisma,
      this.streamService,
      this.deliveryService,
      this.logger,
      tenantId,
      kind,
      plan,
      amount,
      quota,
    );
  }

  async createPlanActivatedByPartner(tenantId: string, plan: string, quota: number): Promise<void> {
    await createPlanActivatedByPartner(
      this.prisma,
      this.streamService,
      this.deliveryService,
      this.logger,
      tenantId,
      plan,
      quota,
    );
  }

  async createBillingPaymentDue(
    tenantId: string,
    amount: number,
    overageCount: number,
  ): Promise<void> {
    await createBillingPaymentDue(
      this.prisma,
      this.streamService,
      this.deliveryService,
      this.logger,
      tenantId,
      amount,
      overageCount,
    );
  }

  async createTenantSuspended(tenantId: string): Promise<void> {
    await createTenantSuspended(
      this.prisma,
      this.streamService,
      this.deliveryService,
      this.logger,
      tenantId,
    );
  }
}
