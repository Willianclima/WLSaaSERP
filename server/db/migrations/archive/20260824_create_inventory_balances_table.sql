-- ==============================================================================
-- POSTGRESQL MIGRATION SCRIPT
-- DESCRIPTION: Replaces legacy stock structure with the 'inventory_balances' table
--              using UUID keys, atomic quantity fields, and PostgreSQL CHECK constraints.
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

BEGIN;

-- 1. Ensure inventory_locations exists for multi-location references
CREATE TABLE IF NOT EXISTS inventory_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'PHYSICAL_STORE', -- HEADQUARTERS, PHYSICAL_STORE, WAREHOUSE, RESELLER_BAG, EVENT_STAND
    code VARCHAR(50) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_location_org_code UNIQUE(organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_inventory_locations_org ON inventory_locations(organization_id);

-- 2. Drop legacy stock structures/triggers if existing
DROP TABLE IF EXISTS product_stocks CASCADE;
DROP TABLE IF EXISTS current_stocks CASCADE;

-- 3. Create the 'inventory_balances' Table
CREATE TABLE IF NOT EXISTS inventory_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES inventory_locations(id) ON DELETE CASCADE,
    
    -- Stock quantity physically present in the specified location
    on_hand_quantity INT NOT NULL DEFAULT 0,
    
    -- Stock quantity locked for active carts, checkout sessions, or pending order deliveries
    reserved_quantity INT NOT NULL DEFAULT 0,
    
    -- Generated column for immediate saleable stock availability: AVAILABLE = ON_HAND - RESERVED
    available_quantity INT GENERATED ALWAYS AS (on_hand_quantity - reserved_quantity) STORED,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Uniqueness constraint: Exactly one balance record per product per location
    CONSTRAINT uq_inventory_balances_product_location UNIQUE (product_id, location_id),
    
    -- Mathematical Integrity Constraints (PostgreSQL CHECK Constraints)
    CONSTRAINT check_on_hand_non_negative CHECK (on_hand_quantity >= 0),
    CONSTRAINT check_reserved_non_negative CHECK (reserved_quantity >= 0),
    CONSTRAINT check_reserved_within_on_hand CHECK (reserved_quantity <= on_hand_quantity)
);

-- 4. Create Performance Indexes for Fast Lookups and Availability Queries
CREATE INDEX IF NOT EXISTS idx_inventory_balances_product ON inventory_balances(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_balances_location ON inventory_balances(location_id);
CREATE INDEX IF NOT EXISTS idx_inventory_balances_available ON inventory_balances(product_id, available_quantity);

-- 5. Trigger to automatically update updated_at timestamp on record changes
CREATE OR REPLACE FUNCTION update_inventory_balances_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inventory_balances_updated_at ON inventory_balances;
CREATE TRIGGER trg_inventory_balances_updated_at
    BEFORE UPDATE ON inventory_balances
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_balances_timestamp();

-- 6. Schema Documentation Comments
COMMENT ON TABLE inventory_balances IS 'Operational projection table tracking physical on-hand and reserved stock quantities per product and location.';
COMMENT ON COLUMN inventory_balances.id IS 'Primary key UUID for balance record.';
COMMENT ON COLUMN inventory_balances.product_id IS 'Foreign key referencing the target product (UUID).';
COMMENT ON COLUMN inventory_balances.location_id IS 'Foreign key referencing the warehouse, store, or reseller bag (UUID).';
COMMENT ON COLUMN inventory_balances.on_hand_quantity IS 'Physical stock on shelf/storage (CHECK >= 0).';
COMMENT ON COLUMN inventory_balances.reserved_quantity IS 'Allocated/held stock for orders (CHECK >= 0 AND <= on_hand_quantity).';
COMMENT ON COLUMN inventory_balances.available_quantity IS 'Calculated net stock available for immediate sale/allocation (on_hand - reserved).';

COMMIT;
