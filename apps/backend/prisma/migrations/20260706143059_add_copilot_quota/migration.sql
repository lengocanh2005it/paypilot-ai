/*
  Warnings:

  - You are about to drop the column `direction` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `import_batch_id` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `source` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the `transaction_import_batches` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'copilot_quota_warning';
ALTER TYPE "NotificationType" ADD VALUE 'copilot_quota_exceeded';

-- DropForeignKey
ALTER TABLE "transaction_import_batches" DROP CONSTRAINT "transaction_import_batches_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_import_batch_id_fkey";

-- DropIndex
DROP INDEX "notifications_tenant_id_type_created_at_idx";

-- DropIndex
DROP INDEX "subscriptions_tenant_id_status_idx";

-- DropIndex
DROP INDEX "transaction_classifications_tenant_id_created_at_idx";

-- DropIndex
DROP INDEX "transactions_tenant_id_source_idx";

-- DropIndex
DROP INDEX "transactions_tenant_id_transaction_date_idx";

-- AlterTable
ALTER TABLE "plan_pricing" ADD COLUMN     "copilot_quota" INTEGER NOT NULL DEFAULT -1;

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "copilot_used_this_cycle" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "direction",
DROP COLUMN "import_batch_id",
DROP COLUMN "source";

-- DropTable
DROP TABLE "transaction_import_batches";

-- DropEnum
DROP TYPE "TransactionDirection";

-- DropEnum
DROP TYPE "TransactionSource";
