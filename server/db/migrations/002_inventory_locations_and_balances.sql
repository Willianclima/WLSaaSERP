-- =========================================================================
-- MIGRATION: 002_inventory_locations_and_balances.sql
-- DESCRIPTION: Multi-location stock engine with physical on_hand, reserved,
--              and computed available quantities with mathematical check constraints.
-- =========================================================================

-- 1. INVENTORY LOCATIONS (MULTI-LOCATION WAREHOUSES, STORES, RESELLER BAGS)
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

-- 2. INVENTORY BALANCES (PRODUCT + LOCATION MULTI-DIMENSIONAL BALANCE ENGINE)
CREATE TABLE IF NOT EXISTS inventory_balances (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    location_id VARCHAR(64) NOT NULL REFERENCES inventory_locations(id) ON DELETE CASCADE,
    
    -- Real on-shelf physical quantity
    on_hand_quantity INT NOT NULL DEFAULT 0,
    
    -- Quantity locked for active reservations, orders, checkout carts
    reserved_quantity INT NOT NULL DEFAULT 0,
    
    -- Computed column for immediately saleable stock: AVAILABLE = ON_HAND - RESERVED
    available_quantity INT GENERATED ALWAYS AS (on_hand_quantity - reserved_quantity) STORED,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Single record per product per location within tenant
    UNIQUE(organization_id, product_id, location_id),
    
    -- Mathematical Integrity Constraints (Zero Overselling Guarantee)
    CONSTRAINT check_on_hand_non_negative CHECK (on_hand_quantity >= 0),
    CONSTRAINT check_reserved_non_negative CHECK (reserved_quantity >= 0),
    CONSTRAINT check_reserved_within_on_hand CHECK (reserved_quantity <= on_hand_quantity)
);

CREATE INDEX IF NOT EXISTS idx_inventory_balances_org_product ON inventory_balances(organization_id, product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_balances_org_location ON inventory_balances(organization_id, location_id);
CREATE INDEX IF NOT EXISTS idx_inventory_balances_available ON inventory_balances(organization_id, product_id, available_quantity);
