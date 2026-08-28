-- ==============================================================================
-- POSTGRESQL MIGRATION SCRIPT
-- MIGRATION: 20260824_create_idempotency_keys_table.sql
-- DESCRIPTION: Universal idempotency key registry for distributed transactions
--              across Orders, Payments, Inventory Reservations, Transfers,
--              Consignments and Webhooks.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

BEGIN;

-- 1. Create enum for idempotency processing status
DO $$ BEGIN
    CREATE TYPE idempotency_status AS ENUM (
        'PROCESSING',
        'COMPLETED',
        'FAILED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create the 'idempotency_keys' table
CREATE TABLE IF NOT EXISTS idempotency_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    idempotency_key VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100) NOT NULL, -- INVENTORY_RESERVATION, ORDER, PAYMENT, CONSIGNMENT, TRANSFER, WEBHOOK
    request_hash VARCHAR(64) NULL,       -- SHA-256 hash of payload to detect conflicting payloads
    status idempotency_status NOT NULL DEFAULT 'PROCESSING',
    response_code INT NULL,              -- HTTP Status Code (200, 201, 409, etc.)
    response_body JSONB NULL,            -- Stored cached JSON response payload
    user_id UUID NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Uniqueness constraint per tenant
    CONSTRAINT uq_tenant_idempotency_key UNIQUE (organization_id, idempotency_key)
);

-- 3. Indexes for rapid lookups and TTL sweeps
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_lookup 
    ON idempotency_keys(organization_id, idempotency_key);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires 
    ON idempotency_keys(expires_at) 
    WHERE status = 'PROCESSING' OR status = 'COMPLETED';

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_resource 
    ON idempotency_keys(organization_id, resource_type, created_at DESC);

-- 4. Timestamp trigger
CREATE OR REPLACE FUNCTION update_idempotency_keys_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_idempotency_keys_updated_at ON idempotency_keys;
CREATE TRIGGER trg_idempotency_keys_updated_at
    BEFORE UPDATE ON idempotency_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_idempotency_keys_timestamp();

COMMIT;
