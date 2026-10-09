-- =========================================================================
-- MIGRATION: 010_billing_webhook_recovery.sql
-- DESCRIPTION: Resilient Webhook Processing, Failure Recovery & Retries.
-- =========================================================================

ALTER TABLE billing_webhook_events ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE billing_webhook_events ADD COLUMN IF NOT EXISTS attempts INT DEFAULT 1;
ALTER TABLE billing_webhook_events ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
