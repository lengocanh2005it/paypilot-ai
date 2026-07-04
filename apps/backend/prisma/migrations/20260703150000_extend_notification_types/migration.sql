-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'quota_warning';
ALTER TYPE "NotificationType" ADD VALUE 'quota_exceeded';
ALTER TYPE "NotificationType" ADD VALUE 'overage_started';
ALTER TYPE "NotificationType" ADD VALUE 'billing_success';
ALTER TYPE "NotificationType" ADD VALUE 'billing_payment_due';
ALTER TYPE "NotificationType" ADD VALUE 'tenant_suspended';
