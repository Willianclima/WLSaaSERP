-- =========================================================================
-- MIGRATION: 009_consignments.sql
-- DESCRIPTION: Consignments & Reseller Maletas Module (Vertical Semijoias).
-- Plan Control: Protected by moduleKey 'consignments' (PRO / ENTERPRISE only).
-- =========================================================================

CREATE TABLE IF NOT EXISTS consignments (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    reseller_id VARCHAR(64),
    reseller_name VARCHAR(255) NOT NULL,
    reseller_phone VARCHAR(30),
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('DRAFT', 'DISPATCHED', 'OPEN', 'SETTLING', 'SETTLED', 'CANCELED')),
    commission_rate NUMERIC(5,2) DEFAULT 30.00 CHECK (commission_rate >= 0 AND commission_rate <= 100),
    total_pieces INTEGER NOT NULL DEFAULT 0 CHECK (total_pieces >= 0),
    total_value NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (total_value >= 0),
    sold_value NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (sold_value >= 0),
    reseller_commission NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (reseller_commission >= 0),
    net_store_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (net_store_amount >= 0),
    items JSONB DEFAULT '[]',
    dispatched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    settlement_due_at TIMESTAMP WITH TIME ZONE NOT NULL,
    settled_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_consignment_code UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_consignments_org_status ON consignments (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_consignments_reseller ON consignments (organization_id, reseller_name);

-- RLS Enforcement
ALTER TABLE consignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE consignments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON consignments;
CREATE POLICY tenant_isolation_policy ON consignments
  FOR ALL
  USING (
    organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')
    OR current_setting('app.is_super_admin', true) = 'true'
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')
    OR current_setting('app.is_super_admin', true) = 'true'
  );
