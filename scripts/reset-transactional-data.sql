-- =========================================================================
-- SCRIPT DE ADMINISTRAÇÃO: LIMPEZA DE TABELAS TRANSACIONAIS (POSTGRESQL)
-- 
-- Finalidade:
-- Limpa todos os dados operacionais (pedidos, clientes, estoque, faturas),
-- mantendo intactas as organizações, usuários, planos, módulos e estoques matriz.
-- =========================================================================

BEGIN;

-- 1. Pedidos, Pagamentos e Transições de Status
DELETE FROM order_payments;
DELETE FROM order_items;
DELETE FROM order_state_transitions;
DELETE FROM orders;

-- 2. Consignações para Revendedoras
DELETE FROM consignments;

-- 3. Movimentações, Reservas e Saldos de Estoque
DELETE FROM inventory_movements;
DELETE FROM inventory_reservations;
DELETE FROM inventory_balances;

-- 4. Clientes (CRM), Contatos e Endereços
DELETE FROM customer_contacts;
DELETE FROM customer_addresses;
DELETE FROM customers;

-- 5. Catálogo de Produtos e Fotos
DELETE FROM product_media;
DELETE FROM products;
DELETE FROM categories;

-- 6. Faturas e Webhooks de Cobrança
DELETE FROM billing_webhook_events;
DELETE FROM billing_invoices;

-- 7. Chaves de Idempotência e Logs Operacionais
DELETE FROM idempotency_keys;
DELETE FROM audit_logs;

COMMIT;

-- =========================================================================
-- VERIFICAÇÃO FINAL:
-- =========================================================================
SELECT 
  (SELECT COUNT(*) FROM organizations) as organizacoes_mantidas,
  (SELECT COUNT(*) FROM users) as usuarios_mantidos,
  (SELECT COUNT(*) FROM plans) as planos_mantidos,
  (SELECT COUNT(*) FROM inventory_locations) as locais_estoque_mantidos,
  (SELECT COUNT(*) FROM orders) as pedidos_restantes,
  (SELECT COUNT(*) FROM customers) as clientes_restantes,
  (SELECT COUNT(*) FROM products) as produtos_restantes;
