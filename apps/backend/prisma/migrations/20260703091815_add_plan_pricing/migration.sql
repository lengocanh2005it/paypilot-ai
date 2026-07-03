-- CreateTable
CREATE TABLE "plan_pricing" (
    "id" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "price_per_month" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "transaction_quota" INTEGER NOT NULL,
    "overage_price_per_transaction" DECIMAL(18,2),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plan_pricing_plan_key" ON "plan_pricing"("plan");

-- Seed default pricing (matches agent-docs/reference/rbac.md pricing table at time of migration)
INSERT INTO "plan_pricing" ("id", "plan", "price_per_month", "transaction_quota", "overage_price_per_transaction", "updated_at")
VALUES
  (gen_random_uuid()::text, 'free', 0, 50, NULL, now()),
  (gen_random_uuid()::text, 'starter', 299000, 500, 800, now()),
  (gen_random_uuid()::text, 'pro', 799000, 2000, 600, now()),
  (gen_random_uuid()::text, 'enterprise', 2500000, 999999, NULL, now())
ON CONFLICT ("plan") DO NOTHING;
