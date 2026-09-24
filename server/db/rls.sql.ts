/**
 * DEPRECATED - AVISO DE CONSOLIDAÇÃO (Sprint 1.2.1)
 * 
 * As políticas de Row Level Security (RLS) foram consolidadas na migração oficial:
 *   /server/db/migrations/007_strict_rls_policies.sql
 * e integradas ao /server/db/schema.sql.
 * 
 * Utilize 'npm run db:migrate' para aplicar e manter as políticas no PostgreSQL.
 */

export const RLS_MIGRATION_DDL = `
-- ============================================================================
-- ROW LEVEL SECURITY (RLS) MULTI-TENANT ISOLATION POLICIES (STRICT P0)
-- ============================================================================

-- 1. PRODUCTS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE products FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON products;
CREATE POLICY tenant_isolation_policy ON products
  FOR ALL
  USING (
    organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  );

-- 2. PRODUCT MEDIA
ALTER TABLE product_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_media FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON product_media;
CREATE POLICY tenant_isolation_policy ON product_media
  FOR ALL
  USING (
    organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  );

-- 3. CUSTOMERS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON customers;
CREATE POLICY tenant_isolation_policy ON customers
  FOR ALL
  USING (
    organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  );

-- 4. CUSTOMER ADDRESSES
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON customer_addresses;
CREATE POLICY tenant_isolation_policy ON customer_addresses
  FOR ALL
  USING (
    organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  );

-- 5. CUSTOMER CONTACTS
ALTER TABLE customer_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_contacts FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON customer_contacts;
CREATE POLICY tenant_isolation_policy ON customer_contacts
  FOR ALL
  USING (
    organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  );

-- 6. ORDERS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON orders;
CREATE POLICY tenant_isolation_policy ON orders
  FOR ALL
  USING (
    organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  );

-- 7. ORDER ITEMS
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON order_items;
CREATE POLICY tenant_isolation_policy ON order_items
  FOR ALL
  USING (
    organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  );

-- 8. ORDER PAYMENTS
ALTER TABLE order_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_payments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON order_payments;
CREATE POLICY tenant_isolation_policy ON order_payments
  FOR ALL
  USING (
    organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  );

-- 9. ORDER STATE TRANSITIONS
ALTER TABLE order_state_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_state_transitions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON order_state_transitions;
CREATE POLICY tenant_isolation_policy ON order_state_transitions
  FOR ALL
  USING (
    organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  );

-- 10. INVENTORY BALANCES
ALTER TABLE inventory_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_balances FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON inventory_balances;
CREATE POLICY tenant_isolation_policy ON inventory_balances
  FOR ALL
  USING (
    organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  );

-- 11. INVENTORY MOVEMENTS (LEDGER)
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON inventory_movements;
CREATE POLICY tenant_isolation_policy ON inventory_movements
  FOR ALL
  USING (
    organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  );

-- 12. INVENTORY RESERVATIONS
ALTER TABLE inventory_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_reservations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON inventory_reservations;
CREATE POLICY tenant_isolation_policy ON inventory_reservations
  FOR ALL
  USING (
    organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  );

-- 13. INVENTORY LOCATIONS
ALTER TABLE inventory_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_locations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON inventory_locations;
CREATE POLICY tenant_isolation_policy ON inventory_locations
  FOR ALL
  USING (
    organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  );

-- 14. IDEMPOTENCY KEYS
ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE idempotency_keys FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON idempotency_keys;
CREATE POLICY tenant_isolation_policy ON idempotency_keys
  FOR ALL
  USING (
    organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  );

-- 15. AUDIT LOGS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON audit_logs;
CREATE POLICY tenant_isolation_policy ON audit_logs
  FOR ALL
  USING (
    organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')
    OR current_setting('app.is_super_admin', true) = 'true'
    OR current_setting('app.current_tenant_id', true) IS NULL
    OR current_setting('app.current_tenant_id', true) = ''
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')
    OR current_setting('app.is_super_admin', true) = 'true'
    OR current_setting('app.current_tenant_id', true) IS NULL
    OR current_setting('app.current_tenant_id', true) = ''
  );

-- 16. ORGANIZATION MEMBERS
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON organization_members;
CREATE POLICY tenant_isolation_policy ON organization_members
  FOR ALL
  USING (
    organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  );

-- 17. ORGANIZATION MODULES
ALTER TABLE organization_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_modules FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON organization_modules;
CREATE POLICY tenant_isolation_policy ON organization_modules
  FOR ALL
  USING (
    organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  );
`;
