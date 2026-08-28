-- ==============================================================================
-- MIGRATION: 20260126_create_inventory_balances_table.sql
-- DESCRIPTION: Creates the 'inventory_balances' table with multi-location balance tracking
--              and mathematical CHECK constraints to prevent negative stock and overselling.
-- ==============================================================================

-- Enable UUID extension if not already present
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

BEGIN;

-- 1. Create the 'inventory_balances' Table
CREATE TABLE IF NOT EXISTS inventory_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES inventory_locations(id) ON DELETE CASCADE,
    on_hand_quantity INT NOT NULL DEFAULT 0,
    reserved_quantity INT NOT NULL DEFAULT 0,
    
    -- Optional computed column for quick lookup of free stock: AVAILABLE = ON_HAND - RESERVED
    available_quantity INT GENERATED ALWAYS AS (on_hand_quantity - reserved_quantity) STORED,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure single record per product per location
    CONSTRAINT uq_inventory_balances_product_location UNIQUE (product_id, location_id),
    
    -- CHECK constraints
    CONSTRAINT check_on_hand_non_negative CHECK (on_hand_quantity >= 0),
    CONSTRAINT check_reserved_non_negative CHECK (reserved_quantity >= 0),
    CONSTRAINT check_reserved_within_on_hand CHECK (reserved_quantity <= on_hand_quantity)
);

-- 2. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_balances_product ON inventory_balances(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_balances_location ON inventory_balances(location_id);
CREATE INDEX IF NOT EXISTS idx_inventory_balances_available ON inventory_balances(product_id, available_quantity);

-- 3. Automatic timestamp updater trigger
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

COMMIT;
