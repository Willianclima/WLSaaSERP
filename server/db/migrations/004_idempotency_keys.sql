-- =========================================================================
-- MIGRATION: 004_idempotency_keys.sql
-- DESCRIPTION: Universal idempotency key engine for transactions across
--              Orders, Payments, Inventory Reservations and Webhooks.
-- =========================================================================

CREATE TABLE IF NOT EXISTS idempotency_keys (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    idempotency_key VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100) NOT NULL, -- INVENTORY_RESERVATION, ORDER, PAYMENT, CONSIGNMENT, TRANSFER, WEBHOOK
    request_hash VARCHAR(64),
    status VARCHAR(30) NOT NULL DEFAULT 'PROCESSING', -- PROCESSING, COMPLETED, FAILED
    response_code INT,
    response_body JSONB,
    user_id VARCHAR(64),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_lookup ON idempotency_keys(organization_id, idempotency_key);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires ON idempotency_keys(expires_at);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_resource ON idempotency_keys(organization_id, resource_type, created_at DESC);
