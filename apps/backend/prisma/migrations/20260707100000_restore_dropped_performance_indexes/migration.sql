-- Restore indexes accidentally dropped by add_copilot_conversations migration
CREATE INDEX "transactions_tenant_id_transaction_date_idx" ON "transactions"("tenant_id", "transaction_date");

CREATE INDEX "notifications_tenant_id_type_created_at_idx" ON "notifications"("tenant_id", "type", "created_at");

CREATE INDEX "transaction_classifications_tenant_id_created_at_idx" ON "transaction_classifications"("tenant_id", "created_at");

CREATE INDEX "subscriptions_tenant_id_status_idx" ON "subscriptions"("tenant_id", "status");
