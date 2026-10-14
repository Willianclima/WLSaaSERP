-- =========================================================================
-- MIGRATION: 011_billing_idempotency_unique.sql
-- DESCRIPTION: Enforce concurrency-safe unique idempotency index per tenant
-- =========================================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_billing_invoices_org_idemp 
ON billing_invoices (organization_id, idempotency_key) 
WHERE idempotency_key IS NOT NULL;
