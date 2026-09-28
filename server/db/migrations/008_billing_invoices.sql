-- =========================================================================
-- MIGRATION: 008_billing_invoices.sql
-- DESCRIPTION: Commercial Billing Layer & Payment Webhooks Isolation.
-- Architecture: Subscription -> Billing -> Payment Provider -> Webhook (Idempotent) -> SubscriptionService -> ACTIVE
-- =========================================================================

CREATE TABLE IF NOT EXISTS billing_invoices (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    subscription_id VARCHAR(64),
    plan_id VARCHAR(32) NOT NULL REFERENCES plans(id),
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(3) DEFAULT 'BRL',
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('PIX', 'CREDIT_CARD', 'BOLETO')),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'FAILED', 'EXPIRED', 'CANCELED')),
    pix_qr_code TEXT,
    pix_copy_paste TEXT,
    pix_txid VARCHAR(128),
    boleto_barcode VARCHAR(128),
    boleto_url TEXT,
    credit_card_last4 VARCHAR(4),
    paid_at TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    provider_tx_id VARCHAR(128),
    idempotency_key VARCHAR(128),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_billing_invoices_org ON billing_invoices (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_provider_tx ON billing_invoices (provider_tx_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_idemp ON billing_invoices (organization_id, idempotency_key);

-- Log table for processed webhooks ensuring complete idempotency against duplicate delivery
CREATE TABLE IF NOT EXISTS billing_webhook_events (
    id VARCHAR(64) PRIMARY KEY,
    event_id VARCHAR(128) NOT NULL UNIQUE,
    provider_tx_id VARCHAR(128),
    event_type VARCHAR(64) NOT NULL,
    invoice_id VARCHAR(64) REFERENCES billing_invoices(id),
    organization_id VARCHAR(64) REFERENCES organizations(id),
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PROCESSED',
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_billing_webhooks_event_id ON billing_webhook_events (event_id);
CREATE INDEX IF NOT EXISTS idx_billing_webhooks_inv ON billing_webhook_events (invoice_id);

-- Enable RLS for billing_invoices
ALTER TABLE billing_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_invoices FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON billing_invoices;
CREATE POLICY tenant_isolation_policy ON billing_invoices
  FOR ALL
  USING (
    organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')
    OR current_setting('app.is_super_admin', true) = 'true'
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')
    OR current_setting('app.is_super_admin', true) = 'true'
  );
