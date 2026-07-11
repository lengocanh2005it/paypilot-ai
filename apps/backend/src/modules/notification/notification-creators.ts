import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationDeliveryService } from './notification-delivery.service';
import { NotificationStreamService } from './notification-stream.service';

function formatVnd(amount: number): string {
  return `${amount.toLocaleString('vi-VN')}đ`;
}

function getPlanLabel(plan: string): string {
  const labels: Record<string, string> = {
    free: 'Free',
    starter: 'Starter',
    pro: 'Pro',
    enterprise: 'Enterprise',
  };
  return labels[plan.toLowerCase()] ?? plan;
}

function buildContentPreview(content: string | null): string {
  if (!content?.trim()) {
    return '';
  }

  const trimmed = content.trim();
  return trimmed.length > 80 ? `${trimmed.slice(0, 80)}…` : trimmed;
}

async function publish(
  prisma: PrismaService,
  streamService: NotificationStreamService,
  deliveryService: NotificationDeliveryService,
  logger: { warn: (message: string, error?: unknown) => void },
  tenantId: string,
  type: NotificationType,
  data: { title: string; body: string; link: string | null },
): Promise<void> {
  const notification = await prisma.notification.create({
    data: {
      tenantId,
      userId: null,
      type,
      title: data.title,
      body: data.body,
      link: data.link,
    },
  });

  streamService.emitNotification(tenantId, notification);

  void Promise.all([
    deliveryService
      .enqueueEmailIfEnabled(tenantId, data)
      .catch((err: unknown) => logger.warn(`Failed to queue email for tenant ${tenantId}`, err)),
    deliveryService
      .sendSlackIfEnabled(tenantId, data)
      .catch((err: unknown) => logger.warn(`Failed to send Slack for tenant ${tenantId}`, err)),
  ]);
}

async function createOncePerCycle(
  prisma: PrismaService,
  streamService: NotificationStreamService,
  deliveryService: NotificationDeliveryService,
  logger: { warn: (message: string, error?: unknown) => void },
  tenantId: string,
  type: NotificationType,
  cycleStart: Date,
  data: { title: string; body: string; link: string | null },
): Promise<void> {
  const existing = await prisma.notification.findFirst({
    where: {
      tenantId,
      type,
      userId: null,
      createdAt: { gte: cycleStart },
    },
  });

  if (existing) {
    return;
  }

  await publish(prisma, streamService, deliveryService, logger, tenantId, type, data);
}

export async function createReviewNeeded(
  prisma: PrismaService,
  streamService: NotificationStreamService,
  deliveryService: NotificationDeliveryService,
  logger: { warn: (message: string, error?: unknown) => void },
  tenantId: string,
  _transactionDbId: string,
  content: string | null,
  confidenceScore: number,
): Promise<void> {
  const preview = buildContentPreview(content);
  const body = preview
    ? `Độ tin cậy ${confidenceScore}% — "${preview}"`
    : `Độ tin cậy ${confidenceScore}% — cần kế toán xác nhận định khoản`;

  await publish(
    prisma,
    streamService,
    deliveryService,
    logger,
    tenantId,
    NotificationType.review_needed,
    {
      title: 'Giao dịch mới cần review',
      body,
      link: '/review',
    },
  );
}

export async function createQuotaWarning(
  prisma: PrismaService,
  streamService: NotificationStreamService,
  deliveryService: NotificationDeliveryService,
  logger: { warn: (message: string, error?: unknown) => void },
  tenantId: string,
  used: number,
  quota: number,
  cycleStart: Date,
): Promise<void> {
  const percent = Math.round((used / quota) * 100);
  await createOncePerCycle(
    prisma,
    streamService,
    deliveryService,
    logger,
    tenantId,
    NotificationType.quota_warning,
    cycleStart,
    {
      title: 'Sắp hết quota giao dịch',
      body: `Đã dùng ${used}/${quota} giao dịch (${percent}%) trong chu kỳ này. Cân nhắc nâng cấp gói.`,
      link: '/settings?tab=billing',
    },
  );
}

export async function createQuotaExceeded(
  prisma: PrismaService,
  streamService: NotificationStreamService,
  deliveryService: NotificationDeliveryService,
  logger: { warn: (message: string, error?: unknown) => void },
  tenantId: string,
  quota: number,
  cycleStart: Date,
): Promise<void> {
  await createOncePerCycle(
    prisma,
    streamService,
    deliveryService,
    logger,
    tenantId,
    NotificationType.quota_exceeded,
    cycleStart,
    {
      title: 'Đã hết quota giao dịch',
      body: `Đã dùng hết ${quota} giao dịch trong chu kỳ này.`,
      link: '/settings?tab=billing',
    },
  );
}

export async function checkCopilotQuotaNotifications(
  prisma: PrismaService,
  streamService: NotificationStreamService,
  deliveryService: NotificationDeliveryService,
  logger: { warn: (message: string, error?: unknown) => void },
  tenantId: string,
  used: number,
  quota: number,
  cycleStart: Date,
): Promise<void> {
  if (quota === -1) return;

  if (used >= quota) {
    await createOncePerCycle(
      prisma,
      streamService,
      deliveryService,
      logger,
      tenantId,
      NotificationType.copilot_quota_exceeded,
      cycleStart,
      {
        title: 'Đã hết lượt chat Copilot',
        body: `Đã dùng hết ${quota} lượt chat Copilot trong tháng này. Nâng cấp gói để tiếp tục.`,
        link: '/settings?tab=billing',
      },
    );
    return;
  }

  const percent = used / quota;
  if (percent >= 0.8) {
    await createOncePerCycle(
      prisma,
      streamService,
      deliveryService,
      logger,
      tenantId,
      NotificationType.copilot_quota_warning,
      cycleStart,
      {
        title: 'Sắp hết lượt chat Copilot',
        body: `Đã dùng ${used}/${quota} lượt chat Copilot (${Math.round(percent * 100)}%) trong tháng này.`,
        link: '/settings?tab=billing',
      },
    );
  }
}

export async function createOverageStarted(
  prisma: PrismaService,
  streamService: NotificationStreamService,
  deliveryService: NotificationDeliveryService,
  logger: { warn: (message: string, error?: unknown) => void },
  tenantId: string,
  pricePerTransaction: number,
  cycleStart: Date,
): Promise<void> {
  await createOncePerCycle(
    prisma,
    streamService,
    deliveryService,
    logger,
    tenantId,
    NotificationType.overage_started,
    cycleStart,
    {
      title: 'Giao dịch vượt quota',
      body: `Giao dịch mới vượt quota sẽ tính phí ${formatVnd(pricePerTransaction)}/giao dịch.`,
      link: '/settings?tab=billing',
    },
  );
}

export async function createBillingSuccess(
  prisma: PrismaService,
  streamService: NotificationStreamService,
  deliveryService: NotificationDeliveryService,
  logger: { warn: (message: string, error?: unknown) => void },
  tenantId: string,
  kind: 'upgrade' | 'overage',
  plan: string,
  amount: number,
  quota?: number,
): Promise<void> {
  const planLabel = getPlanLabel(plan);

  if (kind === 'upgrade') {
    const quotaPart =
      quota != null ? ` Quota ${quota.toLocaleString('vi-VN')} giao dịch/tháng.` : '';
    await publish(
      prisma,
      streamService,
      deliveryService,
      logger,
      tenantId,
      NotificationType.billing_success,
      {
        title: `Mua gói ${planLabel} thành công`,
        body: `Doanh nghiệp của bạn đã kích hoạt gói ${planLabel}.${quotaPart} Số tiền thanh toán: ${formatVnd(amount)}.`,
        link: '/settings?tab=billing',
      },
    );
    return;
  }

  await publish(
    prisma,
    streamService,
    deliveryService,
    logger,
    tenantId,
    NotificationType.billing_success,
    {
      title: 'Thanh toán phí vượt quota thành công',
      body: `Đã thanh toán ${formatVnd(amount)} cho phí vượt quota gói ${planLabel}.`,
      link: '/settings?tab=billing',
    },
  );
}

export async function createPlanActivatedByPartner(
  prisma: PrismaService,
  streamService: NotificationStreamService,
  deliveryService: NotificationDeliveryService,
  logger: { warn: (message: string, error?: unknown) => void },
  tenantId: string,
  plan: string,
  quota: number,
): Promise<void> {
  const planLabel = getPlanLabel(plan);
  await publish(
    prisma,
    streamService,
    deliveryService,
    logger,
    tenantId,
    NotificationType.billing_success,
    {
      title: `Gói ${planLabel} đã được kích hoạt`,
      body: `Gói dịch vụ của doanh nghiệp đã được cập nhật thành ${planLabel} (${quota.toLocaleString('vi-VN')} giao dịch/tháng).`,
      link: '/settings?tab=billing',
    },
  );
}

export async function createBillingPaymentDue(
  prisma: PrismaService,
  streamService: NotificationStreamService,
  deliveryService: NotificationDeliveryService,
  logger: { warn: (message: string, error?: unknown) => void },
  tenantId: string,
  amount: number,
  overageCount: number,
): Promise<void> {
  await publish(
    prisma,
    streamService,
    deliveryService,
    logger,
    tenantId,
    NotificationType.billing_payment_due,
    {
      title: 'Có phí vượt quota cần thanh toán',
      body: `${overageCount} giao dịch vượt quota — tổng ${formatVnd(amount)}. Vui lòng thanh toán để tiếp tục.`,
      link: '/settings?tab=billing',
    },
  );
}

export async function createTenantSuspended(
  prisma: PrismaService,
  streamService: NotificationStreamService,
  deliveryService: NotificationDeliveryService,
  logger: { warn: (message: string, error?: unknown) => void },
  tenantId: string,
): Promise<void> {
  await publish(
    prisma,
    streamService,
    deliveryService,
    logger,
    tenantId,
    NotificationType.tenant_suspended,
    {
      title: 'Tài khoản doanh nghiệp bị khóa',
      body: 'Tài khoản đã bị Cas Partner tạm khóa. Liên hệ hỗ trợ để được mở lại.',
      link: null,
    },
  );
}
