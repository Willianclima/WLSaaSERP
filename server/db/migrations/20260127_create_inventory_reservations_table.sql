-- ==============================================================================
-- MIGRATION: 20260127_create_inventory_reservations_table.sql
-- DESCRIPTION: Creates the 'inventory_reservations' table for formal reservation
--              lifecycle management (ACTIVE -> CONFIRMED | RELEASED | EXPIRED | CANCELED)
--              with TTL expiration, idempotency support, and multi-tenant isolation.
-- ==============================================================================

BEGIN;

-- 1. Create enum type for reservation lifecycle status if not exists
DO $$ BEGIN
    CREATE TYPE inventory_reservation_status AS ENUM (
        'ACTIVE',
        'CONFIRMED',
        'RELEASED',
        'EXPIRED',
        'CANCELED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create the 'inventory_reservations' Table
CREATE TABLE IF NOT EXISTS inventory_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES inventory_locations(id) ON DELETE CASCADE,
    quantity INT NOT NULL,
    status inventory_reservation_status NOT NULL DEFAULT 'ACTIVE',
    
    -- Business Reference (Order, Cart, Consignment, Quotation)
    reference_type VARCHAR(100) NOT NULL,
    reference_id VARCHAR(150) NOT NULL,
    
    -- Idempotency protection for payment/order webhooks and retries
    idempotency_key VARCHAR(255) NULL,
    
    -- TTL / Expiration timestamp
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    confirmed_at TIMESTAMP WITH TIME ZONE NULL,
    released_at TIMESTAMP WITH TIME ZONE NULL,
    
    -- Metadata & Auditing
    operator_name VARCHAR(150) NULL,
    notes TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Integrity Constraints
    CONSTRAINT check_reservation_quantity_positive CHECK (quantity > 0),
    CONSTRAINT uq_reservation_idempotency UNIQUE (organization_id, idempotency_key)
);

-- 3. Indexes for queries, TTL sweeps, and tenant lookups
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_tenant_status 
    ON inventory_reservations(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_active_expires 
    ON inventory_reservations(organization_id, expires_at) 
    WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_product_loc 
    ON inventory_reservations(organization_id, product_id, location_id);

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_reference 
    ON inventory_reservations(organization_id, reference_type, reference_id);

-- 4. Automatic timestamp trigger
CREATE OR REPLACE FUNCTION update_inventory_reservations_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inventory_reservations_updated_at ON inventory_reservations;
CREATE TRIGGER trg_inventory_reservations_updated_at
    BEFORE UPDATE ON inventory_reservations
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_reservations_timestamp();

COMMIT;
