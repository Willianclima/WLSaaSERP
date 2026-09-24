# Arquitetura de Banco de Dados — Aura SaaS & ERP

## Decisão Arquitetural Oficial (P0)

> **POSTGRESQL É A ÚNICA FONTE DE VERDADE DO SISTEMA.**
>
> Todas as entidades de negócio — Organizações, Usuários, Assinaturas, Produtos, Estoque (Físico e Reservado), Movimentações Contábeis (Ledger), Clientes (PF/PJ), Pedidos, Pagamentos e Logs de Auditoria — residem e são transacionadas no PostgreSQL com Row Level Security (RLS) e isolamento multi-inquilino estrito.
>
> O Firebase e Firestore foram completamente removidos da arquitetura (Sprint 1.3). Toda a persistência operacional, transacional e analítica é 100% relacional no PostgreSQL.

---

## Ciclo de Vida e Evolução do Banco

A evolução do banco de dados segue um fluxo linear e auditável:

```text
DATABASE NOVO
      ↓
migrations oficiais (server/db/migrations/001_... a 007_...)
      ↓
schema atual consolidado (server/db/schema.sql)
      ↓
seed inicial (npm run db:seed)
      ↓
sistema funcionando
```

### Regras da Fonte Única:
1. **Migrations (`server/db/migrations/`)**: **Fonte Oficial** de evolução DDL. Executadas pelo `npm run db:migrate` (`server/db/migrator.ts`) e registradas na tabela `_schema_migrations` com hash SHA-256 e timestamp.
2. **`schema.sql`**: **Snapshot/Export Canônico** do banco de dados consolidado para referência rápida, diagramação e ferramentas externas.
3. Arquivos TypeScript legados como `schema.sql.ts` e `rls.sql.ts` estão formalmente depreciados em favor da cadeia numerada em `migrations/`.

---

## Cadeia Oficial de Migrações:

| Ordem | Arquivo | Módulo / Responsabilidade |
|---|---|---|
| `001` | `001_initial_core_schema.sql` | Organizações, Usuários, Memberships, Planos, Assinaturas, Módulos, Auditoria, Categorias, Produtos |
| `002` | `002_inventory_locations_and_balances.sql` | Multi-localização, saldos de estoque físico (`on_hand`), reservado (`reserved`), disponível (`available`) com CHECK constraints |
| `003` | `003_inventory_reservations.sql` | Motor formal de reservas com TTL, status e idempotência |
| `004` | `004_idempotency_keys.sql` | Deduplicação e proteção transacional contra reenvios duplicados |
| `005` | `005_customers_crm.sql` | CRM de clientes PF e PJ, endereços (1:N) e contatos múltiplos (1:N) |
| `006` | `006_orders_and_ledger.sql` | Pedidos com snapshots imutáveis de produtos, pagamentos, FSM e ledger contábil |
| `007` | `007_strict_rls_policies.sql` | Ativação de Row Level Security (RLS) e isolamento multi-tenant forçado |

Migrações históricas e rascunhos anteriores foram arquivados em `server/db/migrations/archive/`.

---

## Comandos Operacionais

- **Executar Migrações:**
  ```bash
  npm run db:migrate
  ```
- **Carregar Carga Inicial / Seed:**
  ```bash
  npm run db:seed
  ```
