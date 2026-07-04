/**
 * Seed dữ liệu demo notification in-app cho tenant đầu tiên tìm được trong DB.
 *
 * Chạy:
 *   pnpm --filter @xcash/backend run prisma:seed:notifications
 *   pnpm --filter @xcash/backend run prisma:seed:notifications -- lengocanhpyne363@gmail.com
 */
import { NotificationType, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_EMAIL = 'lengocanhpyne363@gmail.com';

interface SeedNotification {
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  readAt: Date | null;
  createdAt: Date;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(Math.floor(Math.random() * 10) + 8, Math.floor(Math.random() * 59));
  return d;
}

const DEMO_NOTIFICATIONS: SeedNotification[] = [
  {
    type: NotificationType.review_needed,
    title: 'Giao dịch mới cần review',
    body: 'Độ tin cậy 72% — "CONG TY ABC CK TIEN THUE THANG 6"',
    link: '/review',
    readAt: null,
    createdAt: daysAgo(0),
  },
  {
    type: NotificationType.review_needed,
    title: 'Giao dịch mới cần review',
    body: 'Độ tin cậy 68% — "THANH TOAN HOA DON DIEN THANG 6/2026"',
    link: '/review',
    readAt: null,
    createdAt: daysAgo(0),
  },
  {
    type: NotificationType.review_needed,
    title: 'Giao dịch mới cần review',
    body: 'Độ tin cậy 61% — cần kế toán xác nhận định khoản',
    link: '/review',
    readAt: null,
    createdAt: daysAgo(1),
  },
  {
    type: NotificationType.quota_warning,
    title: 'Sắp hết quota giao dịch',
    body: 'Đã dùng 42/50 giao dịch (84%) trong chu kỳ này. Cân nhắc nâng cấp gói.',
    link: '/settings?tab=billing',
    readAt: null,
    createdAt: daysAgo(1),
  },
  {
    type: NotificationType.billing_success,
    title: 'Nâng cấp gói thành công',
    body: 'Gói STARTER đã được kích hoạt. Số tiền: 299.000đ.',
    link: '/settings?tab=billing',
    readAt: daysAgo(2),
    createdAt: daysAgo(2),
  },
  {
    type: NotificationType.review_needed,
    title: 'Giao dịch mới cần review',
    body: 'Độ tin cậy 74% — "NGUYEN VAN A CK LUONG THANG 5"',
    link: '/review',
    readAt: daysAgo(3),
    createdAt: daysAgo(3),
  },
  {
    type: NotificationType.quota_exceeded,
    title: 'Đã hết quota giao dịch',
    body: 'Đã dùng hết 50 giao dịch trong chu kỳ này.',
    link: '/settings?tab=billing',
    readAt: daysAgo(5),
    createdAt: daysAgo(5),
  },
  {
    type: NotificationType.overage_started,
    title: 'Giao dịch vượt quota',
    body: 'Giao dịch mới vượt quota sẽ tính phí 800đ/giao dịch.',
    link: '/settings?tab=billing',
    readAt: daysAgo(5),
    createdAt: daysAgo(5),
  },
  {
    type: NotificationType.billing_payment_due,
    title: 'Có phí vượt quota cần thanh toán',
    body: '12 giao dịch vượt quota — tổng 9.600đ. Vui lòng thanh toán để tiếp tục.',
    link: '/settings?tab=billing',
    readAt: daysAgo(6),
    createdAt: daysAgo(6),
  },
  {
    type: NotificationType.review_needed,
    title: 'Giao dịch mới cần review',
    body: 'Độ tin cậy 79% — "CONG TY XYZ THANH TOAN HOP DONG SO 12"',
    link: '/review',
    readAt: daysAgo(7),
    createdAt: daysAgo(7),
  },
];

async function main() {
  const email = process.argv[2] ?? DEFAULT_EMAIL;

  const user = await prisma.user.findFirst({
    where: { email },
    select: { tenantId: true, email: true },
  });

  if (!user?.tenantId) {
    console.error(`❌ Không tìm thấy user với email "${email}" hoặc user chưa có tenant.`);
    process.exit(1);
  }

  const { tenantId } = user;
  console.log(`🔔 Seeding notifications cho tenant ${tenantId} (${user.email})...`);

  // Xoá notifications seed cũ (tránh trùng khi chạy lại)
  const deleted = await prisma.notification.deleteMany({
    where: { tenantId, userId: null },
  });
  if (deleted.count > 0) {
    console.log(`   Đã xoá ${deleted.count} notification cũ.`);
  }

  for (const n of DEMO_NOTIFICATIONS) {
    await prisma.notification.create({
      data: {
        tenantId,
        userId: null,
        type: n.type,
        title: n.title,
        body: n.body,
        link: n.link,
        readAt: n.readAt,
        createdAt: n.createdAt,
      },
    });
  }

  const unread = DEMO_NOTIFICATIONS.filter((n) => !n.readAt).length;
  console.log(`✅ Đã tạo ${DEMO_NOTIFICATIONS.length} notifications (${unread} chưa đọc).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
