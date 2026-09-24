-- =========================================================================
-- MIGRATION: 003_inventory_reservations.sql
-- DESCRIPTION: Formal stock reservation lifecycle engine (ACTIVE, CONFIRMED,
--              RELEASED, EXPIRED, CANCELED) with TTL, tenant isolation and idempotency.
-- =========================================================================

CREATE TABLE IF NOT EXISTS inventory_reservations (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    location_id VARCHAR(64) NOT NULL REFERENCES inventory_locations(id) ON DELETE CASCADE,
    quantity INT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, CONFIRMED, RELEASED, EXPIRED, CANCELED
    
    -- Business Reference (ORDER, CHECKOUT_CART, CONSIGNMENT_BAG, QUOTATION)
    reference_type VARCHAR(100) NOT NULL,
    reference_id VARCHAR(150) NOT NULL,
    
    -- Idempotency key per tenant
    idempotency_key VARCHAR(255),
    
    -- TTL / Lifecycle timestamps
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    released_at TIMESTAMP WITH TIME ZONE,
    
    operator_name VARCHAR(150),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT check_reservation_quantity_positive CHECK (quantity > 0),
    UNIQUE(organization_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_org_status ON inventory_reservations(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_expires ON inventory_reservations(organization_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_product_loc ON inventory_reservations(organization_id, product_id, location_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_reference ON inventory_reservations(organization_id, reference_type, reference_id);
