/**
 * Seed nhiều doanh nghiệp demo đa dạng cho Partner Dashboard (Cas Partner).
 * Không đụng vào tenant thật của user hiện có — chỉ tạo thêm tenant mới với prefix email riêng.
 *
 * Chạy:
 *   pnpm --filter @xcash/backend run prisma:seed:partners
 */

import {
  type AccountType,
  type ClassificationType,
  PrismaClient,
  type SubscriptionPlan,
  type SubscriptionStatus,
  type TransactionStatus,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { TT133_ACCOUNTS } from '../src/modules/chart-of-accounts/tt133-seed';

const prisma = new PrismaClient();

const EMAIL_SUFFIX = '@xcash-demo.vn';
const PASSWORD = 'Demo@12345';

const COMMON_ACCOUNT_PAIRS: Array<{ debit: string; credit: string; type: 'revenue' | 'expense' }> =
  [
    { debit: '112', credit: '511', type: 'revenue' },
    { debit: '111', credit: '511', type: 'revenue' },
    { debit: '112', credit: '131', type: 'revenue' },
    { debit: '334', credit: '112', type: 'expense' },
    { debit: '642', credit: '112', type: 'expense' },
    { debit: '627', credit: '112', type: 'expense' },
    { debit: '641', credit: '112', type: 'expense' },
    { debit: '635', credit: '112', type: 'expense' },
    { debit: '333', credit: '112', type: 'expense' },
    { debit: '152', credit: '112', type: 'expense' },
  ];

const CONTENT_SAMPLES = {
  revenue: [
    'CK TIEN HANG THANG',
    'THANH TOAN DON HANG',
    'THU PHI DICH VU',
    'KHACH HANG TT CONG NO',
    'DOANH THU BAN LE',
  ],
  expense: [
    'TRA LUONG NHAN VIEN',
    'THANH TOAN HOA DON DIEN NUOC',
    'MUA VAT TU VAN PHONG',
    'CHI PHI VAN CHUYEN',
    'NOP THUE GTGT',
    'TRA LAI VAY NGAN HANG',
    'THUE MAT BANG KINH DOANH',
  ],
};

const BANKS = [
  'Vietcombank',
  'Techcombank',
  'ACB',
  'BIDV',
  'MB Bank',
  'Sacombank',
  'VPBank',
  'TPBank',
  'HDBank',
];

interface PaymentHistoryEntry {
  monthsAgo: number;
  plan: SubscriptionPlan;
  amount: number;
}

interface TenantSeedConfig {
  businessName: string;
  slug: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  pricePerMonth: number;
  transactionQuota: number;
  monthlyTxCount: number;
  aiAccuracyTarget: number; // 0-100, % giao dịch auto-classify với confidence cao
  reviewPct: number; // % rơi vào review queue
  skippedPct: number;
  paymentHistory: PaymentHistoryEntry[];
}

const TENANTS: TenantSeedConfig[] = [
  {
    businessName: 'Cửa hàng Tiện Lợi Mini Mart',
    slug: 'minimart',
    plan: 'free',
    status: 'active',
    pricePerMonth: 0,
    transactionQuota: 50,
    monthlyTxCount: 32,
    aiAccuracyTarget: 90,
    reviewPct: 8,
    skippedPct: 2,
    paymentHistory: [],
  },
  {
    businessName: 'Studio Ảnh Cưới Hạnh Phúc',
    slug: 'hanhphuc-studio',
    plan: 'free',
    status: 'active',
    pricePerMonth: 0,
    transactionQuota: 50,
    monthlyTxCount: 12,
    aiAccuracyTarget: 82,
    reviewPct: 15,
    skippedPct: 3,
    paymentHistory: [],
  },
  {
    businessName: 'Phòng khám Nha khoa Sài Gòn',
    slug: 'nhakhoa-saigon',
    plan: 'starter',
    status: 'active',
    pricePerMonth: 299_000,
    transactionQuota: 500,
    monthlyTxCount: 410,
    aiAccuracyTarget: 88,
    reviewPct: 10,
    skippedPct: 2,
    paymentHistory: [
      { monthsAgo: 5, plan: 'starter', amount: 299_000 },
      { monthsAgo: 4, plan: 'starter', amount: 299_000 },
      { monthsAgo: 3, plan: 'starter', amount: 299_000 },
      { monthsAgo: 2, plan: 'starter', amount: 299_000 },
      { monthsAgo: 1, plan: 'starter', amount: 299_000 },
      { monthsAgo: 0, plan: 'starter', amount: 299_000 },
    ],
  },
  {
    businessName: 'Xưởng May Đồng Tâm',
    slug: 'may-dongtam',
    plan: 'starter',
    status: 'suspended',
    pricePerMonth: 299_000,
    transactionQuota: 500,
    monthlyTxCount: 180,
    aiAccuracyTarget: 70,
    reviewPct: 22,
    skippedPct: 8,
    paymentHistory: [
      { monthsAgo: 5, plan: 'starter', amount: 299_000 },
      { monthsAgo: 4, plan: 'starter', amount: 299_000 },
      { monthsAgo: 3, plan: 'starter', amount: 299_000 },
    ],
  },
  {
    businessName: 'Công ty Xây dựng Đại Phát',
    slug: 'daiphat-xd',
    plan: 'starter',
    status: 'active',
    pricePerMonth: 299_000,
    transactionQuota: 500,
    monthlyTxCount: 340,
    aiAccuracyTarget: 84,
    reviewPct: 12,
    skippedPct: 3,
    paymentHistory: [
      { monthsAgo: 3, plan: 'starter', amount: 299_000 },
      { monthsAgo: 2, plan: 'starter', amount: 299_000 },
      { monthsAgo: 1, plan: 'starter', amount: 299_000 },
    ],
  },
  {
    businessName: 'Quán Cà phê Highlands Nhượng Quyền',
    slug: 'highlands-nq',
    plan: 'pro',
    status: 'active',
    pricePerMonth: 799_000,
    transactionQuota: 2000,
    monthlyTxCount: 1750,
    aiAccuracyTarget: 93,
    reviewPct: 6,
    skippedPct: 1,
    paymentHistory: [
      { monthsAgo: 5, plan: 'starter', amount: 299_000 },
      { monthsAgo: 4, plan: 'starter', amount: 299_000 },
      { monthsAgo: 3, plan: 'pro', amount: 799_000 },
      { monthsAgo: 2, plan: 'pro', amount: 799_000 },
      { monthsAgo: 1, plan: 'pro', amount: 799_000 },
      { monthsAgo: 0, plan: 'pro', amount: 799_000 },
    ],
  },
  {
    businessName: 'Công ty TNHH Vận tải Phương Nam',
    slug: 'phuongnam-vt',
    plan: 'pro',
    status: 'active',
    pricePerMonth: 799_000,
    transactionQuota: 2000,
    monthlyTxCount: 2150,
    aiAccuracyTarget: 91,
    reviewPct: 7,
    skippedPct: 2,
    paymentHistory: [
      { monthsAgo: 5, plan: 'pro', amount: 799_000 },
      { monthsAgo: 4, plan: 'pro', amount: 799_000 },
      { monthsAgo: 3, plan: 'pro', amount: 799_000 },
      { monthsAgo: 2, plan: 'pro', amount: 799_000 },
      { monthsAgo: 1, plan: 'pro', amount: 799_000 },
    ],
  },
  {
    businessName: 'Trường Mầm non Ánh Dương',
    slug: 'anhduong-mn',
    plan: 'pro',
    status: 'suspended',
    pricePerMonth: 799_000,
    transactionQuota: 2000,
    monthlyTxCount: 520,
    aiAccuracyTarget: 65,
    reviewPct: 25,
    skippedPct: 10,
    paymentHistory: [
      { monthsAgo: 4, plan: 'pro', amount: 799_000 },
      { monthsAgo: 3, plan: 'pro', amount: 799_000 },
    ],
  },
  {
    businessName: 'Chuỗi Nhà thuốc Long Châu Mini',
    slug: 'longchau-mini',
    plan: 'enterprise',
    status: 'active',
    pricePerMonth: 2_500_000,
    transactionQuota: 999_999,
    monthlyTxCount: 4800,
    aiAccuracyTarget: 95,
    reviewPct: 4,
    skippedPct: 1,
    paymentHistory: [
      { monthsAgo: 5, plan: 'pro', amount: 799_000 },
      { monthsAgo: 4, plan: 'pro', amount: 799_000 },
      { monthsAgo: 3, plan: 'enterprise', amount: 2_500_000 },
      { monthsAgo: 2, plan: 'enterprise', amount: 2_500_000 },
      { monthsAgo: 1, plan: 'enterprise', amount: 2_500_000 },
    ],
  },
  {
    businessName: 'Công ty CP Bán lẻ Sài Gòn Xanh',
    slug: 'saigonxanh',
    plan: 'enterprise',
    status: 'active',
    pricePerMonth: 2_500_000,
    transactionQuota: 999_999,
    monthlyTxCount: 3600,
    aiAccuracyTarget: 89,
    reviewPct: 9,
    skippedPct: 2,
    paymentHistory: [
      { monthsAgo: 5, plan: 'enterprise', amount: 2_500_000 },
      { monthsAgo: 4, plan: 'enterprise', amount: 2_500_000 },
      { monthsAgo: 3, plan: 'enterprise', amount: 2_500_000 },
      { monthsAgo: 2, plan: 'enterprise', amount: 2_500_000 },
      { monthsAgo: 1, plan: 'enterprise', amount: 2_500_000 },
      { monthsAgo: 0, plan: 'enterprise', amount: 2_500_000 },
    ],
  },
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}

function randomDayThisMonth(): Date {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysElapsed = Math.max(1, now.getDate());
  const day = randomInt(1, daysElapsed);
  const d = new Date(start);
  d.setDate(day);
  d.setHours(randomInt(7, 20), randomInt(0, 59), 0, 0);
  return d;
}

function dateMonthsAgo(monthsAgo: number, day: number): Date {
  const now = new Date();
  const safeDay = monthsAgo === 0 ? Math.min(day, now.getDate()) : day;
  return new Date(now.getFullYear(), now.getMonth() - monthsAgo, safeDay, 10, 0, 0);
}

async function ensureChartOfAccounts(tenantId: string): Promise<void> {
  const count = await prisma.chartOfAccount.count({ where: { tenantId } });
  if (count > 0) return;
  await prisma.chartOfAccount.createMany({
    data: TT133_ACCOUNTS.map((a) => ({
      tenantId,
      accountCode: a.accountCode,
      accountName: a.accountName,
      accountType: a.accountType as AccountType,
      parentCode: a.parentCode,
      isActive: true,
    })),
    skipDuplicates: true,
  });
}

async function seedTenant(config: TenantSeedConfig): Promise<void> {
  const email = `admin.${config.slug}${EMAIL_SUFFIX}`;
  const existingUser = await prisma.user.findUnique({ where: { email } });

  let tenantId: string;
  let adminUserId: string;

  if (existingUser?.tenantId) {
    tenantId = existingUser.tenantId;
    adminUserId = existingUser.id;
    console.log(`↺ Tenant đã tồn tại, cập nhật lại dữ liệu: ${config.businessName}`);

    await prisma.transactionClassification.deleteMany({ where: { tenantId } });
    await prisma.transaction.deleteMany({ where: { tenantId } });
    await prisma.paymentOrder.deleteMany({ where: { tenantId } });
    await prisma.subscription.deleteMany({ where: { tenantId } });
  } else {
    const passwordHash = await bcrypt.hash(PASSWORD, 12);
    const tenant = await prisma.tenant.create({
      data: { businessName: config.businessName },
    });
    const adminUser = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        name: config.businessName,
        email,
        passwordHash,
        role: 'admin',
      },
    });
    tenantId = tenant.id;
    adminUserId = adminUser.id;
    console.log(`✚ Tạo tenant mới: ${config.businessName}`);
  }

  await ensureChartOfAccounts(tenantId);

  const cycleEnd = new Date();
  cycleEnd.setMonth(cycleEnd.getMonth() + 1);
  cycleEnd.setDate(1);

  await prisma.subscription.create({
    data: {
      tenantId,
      plan: config.plan,
      pricePerMonth: config.pricePerMonth,
      transactionQuota: config.transactionQuota,
      transactionUsedThisCycle: Math.min(config.monthlyTxCount, config.transactionQuota),
      status: config.status,
      currentCycleEnd: cycleEnd,
    },
  });

  const existingGrant = await prisma.casGrant.findFirst({ where: { tenantId } });
  if (!existingGrant) {
    await prisma.casGrant.create({
      data: {
        tenantId,
        grantId: `demo-grant-${config.slug}`,
        accessToken: 'demo-access-token',
        accountNumber: String(randomInt(1_000_000_000, 9_999_999_999)),
        accountHolderName: config.businessName.toUpperCase(),
        bankName: pick(BANKS),
        status: 'active',
      },
    });
  }

  for (const p of config.paymentHistory) {
    await prisma.paymentOrder.create({
      data: {
        tenantId,
        orderCode: `SEED-${config.slug}-${p.monthsAgo}`,
        targetPlan: p.plan,
        amount: p.amount,
        status: 'paid',
        paidAt: dateMonthsAgo(p.monthsAgo, randomInt(1, 27)),
        createdAt: dateMonthsAgo(p.monthsAgo, randomInt(1, 27)),
      },
    });
  }

  const txData = Array.from({ length: config.monthlyTxCount }).map((_, i) => {
    const roll = Math.random() * 100;
    const isReview = roll < config.reviewPct;
    const isSkipped = !isReview && roll < config.reviewPct + config.skippedPct;
    const isRevenue = Math.random() < 0.35;
    const pair = pick(
      COMMON_ACCOUNT_PAIRS.filter((p) => p.type === (isRevenue ? 'revenue' : 'expense')),
    );
    const content = pick(isRevenue ? CONTENT_SAMPLES.revenue : CONTENT_SAMPLES.expense);
    const amount = isRevenue ? randomInt(500_000, 25_000_000) : -randomInt(100_000, 20_000_000);
    const txDate = randomDayThisMonth();

    let status: TransactionStatus;
    if (isSkipped) status = 'skipped';
    else if (isReview) status = 'review';
    else status = 'classified';

    return {
      tenantId,
      grantId: `demo-grant-${config.slug}`,
      transactionId: `partner-seed-${config.slug}-${i}`,
      amount,
      senderAccount: isRevenue ? 'KHACH HANG' : content,
      receiverAccount: '0000000000',
      content: `${content} ${i}`,
      transactionDate: txDate,
      createdAt: txDate,
      status,
      _debit: pair.debit,
      _credit: pair.credit,
      _amount: Math.abs(amount),
    };
  });

  const CHUNK = 200;
  for (let i = 0; i < txData.length; i += CHUNK) {
    const chunk = txData.slice(i, i + CHUNK);
    const created = await prisma.transaction.createManyAndReturn({
      data: chunk.map(({ _debit, _credit, _amount, ...rest }) => rest),
    });

    const classifications = created.map((tx, idx) => {
      const meta = chunk[idx];
      const highConfidence = Math.random() * 100 < config.aiAccuracyTarget;
      const confidenceScore =
        tx.status === 'review'
          ? randomInt(50, 84)
          : highConfidence
            ? randomInt(85, 99)
            : randomInt(60, 84);
      const isManual = tx.status === 'classified' && Math.random() < 0.08;

      return {
        tenantId,
        transactionId: tx.id,
        debitAccount: meta._debit,
        creditAccount: meta._credit,
        amount: meta._amount,
        confidenceScore,
        classificationType: (isManual ? 'manual' : 'auto') as ClassificationType,
        classifiedBy: isManual ? adminUserId : 'ai',
        reason: isManual ? 'Kế toán xác nhận thủ công.' : 'AI tự động phân loại theo mẫu TT133.',
        status: tx.status,
        createdAt: tx.createdAt,
      };
    });

    await prisma.transactionClassification.createMany({ data: classifications });
  }

  console.log(
    `  → ${config.monthlyTxCount} giao dịch, gói ${config.plan} (${config.status}), ${config.paymentHistory.length} kỳ thanh toán`,
  );
}

async function main(): Promise<void> {
  console.log(`🌱 Seeding ${TENANTS.length} doanh nghiệp demo cho Partner Dashboard...\n`);

  for (const config of TENANTS) {
    await seedTenant(config);
  }

  console.log('\n🎉 Xong — đăng nhập bằng tài khoản Cas Partner để xem Partner Dashboard.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
