-- ==============================================================================
-- MIGRATION: 20260824_transition_to_inventory_balances.sql
-- DESCRIPTION: Transitions legacy single current_balance to the multi-dimensional
--              inventory_balances model (Product + Location) with atomic concurrency
--              and mathematical integrity constraints.
-- ==============================================================================

BEGIN;

-- 1. Ensure Multi-Location Table Exists
CREATE TABLE IF NOT EXISTS inventory_locations (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'PHYSICAL_STORE', -- HEADQUARTERS, PHYSICAL_STORE, WAREHOUSE, RESELLER_BAG, EVENT_STAND
    code VARCHAR(50) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_locations_org ON inventory_locations(organization_id);

-- 2. Ensure Default Headquarters Location Exists for Each Tenant (for Backfill)
INSERT INTO inventory_locations (id, organization_id, name, type, code, description, is_active, created_at)
SELECT 
    'loc-hq-' || org.id AS id,
    org.id AS organization_id,
    'Matriz / Showroom Central' AS name,
    'HEADQUARTERS' AS type,
    'MATRIZ' AS code,
    'Localização física padrão da matriz para migração de estoque' AS description,
    TRUE AS is_active,
    CURRENT_TIMESTAMP AS created_at
FROM organizations org
WHERE NOT EXISTS (
    SELECT 1 FROM inventory_locations loc 
    WHERE loc.organization_id = org.id AND (loc.type = 'HEADQUARTERS' OR loc.code = 'MATRIZ')
);

-- 3. Create the New `inventory_balances` Table with Full Integrity Constraints
CREATE TABLE IF NOT EXISTS inventory_balances (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    location_id VARCHAR(64) NOT NULL REFERENCES inventory_locations(id) ON DELETE CASCADE,
    
    -- Real on-shelf physical quantity
    on_hand_quantity INT NOT NULL DEFAULT 0,
    
    -- Quantity allocated/reserved in active carts, checkout locks, or pending transfers
    reserved_quantity INT NOT NULL DEFAULT 0,
    
    -- Available for immediate sale or new bag assignment: AVAILABLE = ON_HAND - RESERVED
    available_quantity INT GENERATED ALWAYS AS (on_hand_quantity - reserved_quantity) STORED,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Composite Uniqueness: One balance record per Product per Location within Tenant
    CONSTRAINT uq_tenant_product_location UNIQUE (organization_id, product_id, location_id),
    
    -- Database-level Integrity Constraints to prevent negative stock and overselling:
    CONSTRAINT check_on_hand_non_negative CHECK (on_hand_quantity >= 0),
    CONSTRAINT check_reserved_non_negative CHECK (reserved_quantity >= 0),
    CONSTRAINT check_reserved_within_on_hand CHECK (reserved_quantity <= on_hand_quantity)
);

-- 4. Create Performance Indexes for Fast Lookups
CREATE INDEX IF NOT EXISTS idx_inventory_balances_org_product ON inventory_balances(organization_id, product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_balances_org_location ON inventory_balances(organization_id, location_id);
CREATE INDEX IF NOT EXISTS idx_inventory_balances_available ON inventory_balances(organization_id, product_id, available_quantity);

-- 5. Data Migration / Backfill from Legacy Ledger Snapshots to Primary Headquarters Location
WITH LatestMovements AS (
    SELECT DISTINCT ON (organization_id, product_id)
        organization_id,
        product_id,
        physical_balance_after,
        consigned_balance_after,
        created_at
    FROM inventory_movements
    ORDER BY organization_id, product_id, created_at DESC
),
DefaultOrgLocations AS (
    SELECT DISTINCT ON (organization_id)
        organization_id,
        id AS location_id
    FROM inventory_locations
    WHERE type = 'HEADQUARTERS' OR code = 'MATRIZ'
    ORDER BY organization_id, created_at ASC
)
INSERT INTO inventory_balances (
    id,
    organization_id,
    product_id,
    location_id,
    on_hand_quantity,
    reserved_quantity,
    created_at,
    updated_at
)
SELECT
    'bal-mig-' || p.id || '-' || dol.location_id AS id,
    p.organization_id,
    p.id AS product_id,
    dol.location_id,
    GREATEST(0, COALESCE(lm.physical_balance_after, 0)) AS on_hand_quantity,
    0 AS reserved_quantity,
    CURRENT_TIMESTAMP AS created_at,
    CURRENT_TIMESTAMP AS updated_at
FROM products p
JOIN DefaultOrgLocations dol ON dol.organization_id = p.organization_id
LEFT JOIN LatestMovements lm ON lm.organization_id = p.organization_id AND lm.product_id = p.id
ON CONFLICT (organization_id, product_id, location_id) 
DO UPDATE SET
    on_hand_quantity = EXCLUDED.on_hand_quantity,
    updated_at = CURRENT_TIMESTAMP;

-- 6. Add Schema Comments for Documentation & Audit Compliance
COMMENT ON TABLE inventory_balances IS 'Multi-location inventory balance tracking separating physical on-hand from reserved quantities.';
COMMENT ON COLUMN inventory_balances.on_hand_quantity IS 'Physical stock present in the specific location/store/bag (CHECK >= 0).';
COMMENT ON COLUMN inventory_balances.reserved_quantity IS 'Stock temporarily held for active checkout, orders, or transfers (CHECK >= 0 AND <= on_hand_quantity).';
COMMENT ON COLUMN inventory_balances.available_quantity IS 'Generated column (on_hand_quantity - reserved_quantity) representing stock immediately saleable.';

COMMIT;
