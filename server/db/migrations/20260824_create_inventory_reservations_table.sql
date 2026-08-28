-- ==============================================================================
-- POSTGRESQL MIGRATION SCRIPT
-- MIGRATION: 20260824_create_inventory_reservations_table.sql
-- DESCRIPTION: Creates the 'inventory_reservations' table for formal lifecycle
--              tracking of stock reservations:
--              (ACTIVE -> CONFIRMED | RELEASED | EXPIRED | CANCELED)
--              Includes fields: organization_id, product_id, location_id,
--              quantity, status, idempotency keys, TTL timestamps, and constraints.
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

BEGIN;

-- 1. Create Enum for Reservation Lifecycle Status (if not existing)
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
    
    -- Stock quantity reserved/allocated
    quantity INT NOT NULL,
    
    -- Current lifecycle status of the reservation
    status inventory_reservation_status NOT NULL DEFAULT 'ACTIVE',
    
    -- Business Domain Reference (e.g. ORDER, CHECKOUT_CART, CONSIGNMENT, QUOTATION)
    reference_type VARCHAR(100) NOT NULL,
    reference_id VARCHAR(150) NOT NULL,
    
    -- Idempotency key to safely retry checkout/reservation operations without double-reserving
    idempotency_key VARCHAR(255) NULL,
    
    -- Expiration timestamp (TTL) & Lifecycle event tracking timestamps
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    confirmed_at TIMESTAMP WITH TIME ZONE NULL,
    released_at TIMESTAMP WITH TIME ZONE NULL,
    
    -- Operator & Context Notes
    operator_name VARCHAR(150) NULL,
    notes TEXT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Integrity & Multi-Tenant Constraints
    CONSTRAINT check_reservation_quantity_positive CHECK (quantity > 0),
    CONSTRAINT uq_reservation_tenant_idempotency UNIQUE (organization_id, idempotency_key)
);

-- 3. Performance & Query Indexes
-- Tenant + Status index for listing active or historical reservations per organization
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_tenant_status 
    ON inventory_reservations(organization_id, status);

-- Partial index on ACTIVE reservations with expires_at for fast TTL sweep cron jobs
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_active_expires 
    ON inventory_reservations(organization_id, expires_at) 
    WHERE status = 'ACTIVE';

-- Product + Location lookup index for stock balance correlation
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_product_loc 
    ON inventory_reservations(organization_id, product_id, location_id);

-- Reference lookup index for order / checkout linkage
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_reference 
    ON inventory_reservations(organization_id, reference_type, reference_id);

-- 4. Trigger to automatically update updated_at timestamp on reservation mutation
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

-- 5. Documentation Comments
COMMENT ON TABLE inventory_reservations IS 'Tracks the formal lifecycle of inventory reservations (ACTIVE, CONFIRMED, RELEASED, EXPIRED, CANCELED) across multi-tenant locations with TTL and idempotency protection.';
COMMENT ON COLUMN inventory_reservations.id IS 'Primary key UUID for reservation record.';
COMMENT ON COLUMN inventory_reservations.organization_id IS 'Tenant foreign key UUID.';
COMMENT ON COLUMN inventory_reservations.product_id IS 'Product foreign key UUID.';
COMMENT ON COLUMN inventory_reservations.location_id IS 'Physical or virtual inventory location UUID.';
COMMENT ON COLUMN inventory_reservations.quantity IS 'Quantity held in reservation (CHECK > 0).';
COMMENT ON COLUMN inventory_reservations.status IS 'Lifecycle state: ACTIVE, CONFIRMED, RELEASED, EXPIRED, CANCELED.';
COMMENT ON COLUMN inventory_reservations.expires_at IS 'Expiration deadline for time-to-live (TTL) auto-release.';
COMMENT ON COLUMN inventory_reservations.idempotency_key IS 'Unique key per tenant ensuring safe idempotency during checkouts.';

COMMIT;
