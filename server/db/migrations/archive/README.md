# Arquivo Histórico de Migrações (Superseded & Legacy)

Este diretório contém migrações anteriores à consolidação da arquitetura oficial do Sprint 1.2.1.

## Motivos do Arquivamento:
1. **`20260126_create_inventory_balances_table.sql` & `20260824_create_inventory_balances_table.sql`**:
   - Rascunhos iniciais que utilizavam tipos de dados `UUID` puros e não continham chave de multi-inquilino (`organization_id`) consistente com os padrões do SaaS (`VARCHAR(64)`).
   - Substituídas pela migração oficial `002_inventory_locations_and_balances.sql`.

2. **`20260127_create_inventory_reservations_table.sql` & `20260824_create_inventory_reservations_table.sql`**:
   - Rascunhos de ciclo de vida de reservas com enum isolado e campos sem o padrão relacional estrito de tenant.
   - Substituídas pela migração oficial `003_inventory_reservations.sql`.

3. **`20260824_transition_to_inventory_balances.sql`**:
   - Script histórico de transição de bancos legados para multi-localização.
   - Preservado apenas para histórico de auditoria de dados preexistentes.

4. **`20260824_create_idempotency_keys_table.sql`**:
   - Padronizado na cadeia oficial como `004_idempotency_keys.sql`.

5. **`20260825_create_customers_table.sql`**:
   - Padronizado na cadeia oficial como `005_customers_crm.sql`.

6. **`20260825_create_orders_and_order_items_tables.sql`**:
   - Padronizado na cadeia oficial como `006_orders_and_ledger.sql`.

A cadeia de migração oficial e ativa do sistema reside no diretório pai `/server/db/migrations/` numerada de `001_` a `007_`.
