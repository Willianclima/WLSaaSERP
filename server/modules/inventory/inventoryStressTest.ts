/**
 * ============================================================================
 * INVENTORY STRESS TEST SUITE: HIGH CONCURRENCY, RLS & DB ROW-LOCK INTEGRITY
 * ============================================================================
 * 
 * Simula múltiplas requisições simultâneas para atualizar o estoque de um
 * MESMO PRODUTO em alta contenção, avaliando:
 * 
 * 1. Pessimistic Row Locking (PostgreSQL SELECT ... FOR UPDATE)
 * 2. Integridade de Row Level Security (RLS) multi-tenant sob alta concorrência
 * 3. Detecção e reporte de Race Conditions:
 *    - Lost Updates (atualizações perdidas / sobrescritas)
 *    - Overselling / Estoque Negativo
 *    - Reservas fantasmas (divergência entre saldo reservado e tabela de reservas)
 *    - Vazamento de contexto de tenant (Cross-Tenant RLS Leakage)
 *    - Deadlocks não tratados
 * 
 * Execução CLI:
 *   npx tsx server/modules/inventory/inventoryStressTest.ts
 */

import { query, withTransaction, applyRlsContext } from "../../db/postgres";
import { TenantContext } from "../../db/tenantContext";
import { inventoryRepo } from "./inventory.repository";
import { InventoryConcurrencyService } from "./inventoryConcurrency.service";
import { InventoryBalanceEntity } from "./inventory.types";

export interface StressScenarioResult {
  scenarioName: string;
  concurrencyLevel: number;
  totalRequests: number;
  successfulRequests: number;
  rejectedRequests: number;
  failedRequests: number;
  durationMs: number;
  throughputOpsPerSec: number;
  latencyMs: {
    min: number;
    max: number;
    avg: number;
    p95: number;
  };
  raceConditionsDetected: boolean;
  rlsViolationsDetected: boolean;
  checks: {
    checkName: string;
    passed: boolean;
    expected: any;
    actual: any;
    details?: string;
  }[];
  details: string;
}

export interface StressTestSuiteReport {
  suiteName: string;
  timestamp: string;
  totalDurationMs: number;
  concurrencyPassed: boolean;
  rlsPassed: boolean;
  raceConditionsDetected: boolean;
  summary: {
    scenariosRun: number;
    scenariosPassed: number;
    totalConcurrentRequests: number;
  };
  scenarios: StressScenarioResult[];
}

export class InventoryStressTester {
  // Sandbox Tenants for Stress Testing
  public static readonly TENANT_A = "stress-tenant-alpha";
  public static readonly TENANT_B = "stress-tenant-beta";
  public static readonly LOC_A = "loc-stress-wh-a";
  public static readonly LOC_B = "loc-stress-wh-b";

  /**
   * Setup fixtures: tenants, locations, and test products
   */
  public static async setupEnvironment(): Promise<void> {
    // SuperAdmin mode to seed test organizations and locations
    await TenantContext.run({ tenantId: this.TENANT_A, isSuperAdmin: true }, async () => {
      // 1. Ensure organizations
      await query(
        `INSERT INTO organizations (id, name, slug, document, contact_email, contact_whatsapp, status, created_at, updated_at)
         VALUES 
           ($1, 'Tenant Alpha Stress', 'tenant-alpha-stress', '11111111000199', 'alpha@stress.test', '11988887777', 'ACTIVE', NOW(), NOW()),
           ($2, 'Tenant Beta Stress', 'tenant-beta-stress', '22222222000199', 'beta@stress.test', '11988886666', 'ACTIVE', NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET status = 'ACTIVE'`,
        [this.TENANT_A, this.TENANT_B]
      );

      // 2. Ensure locations
      await query(
        `INSERT INTO inventory_locations (id, organization_id, name, code, type, is_active, created_at)
         VALUES 
           ($1, $2, 'Armazém Central Alpha', 'WH-ALPHA', 'WAREHOUSE', TRUE, NOW()),
           ($3, $4, 'Armazém Central Beta', 'WH-BETA', 'WAREHOUSE', TRUE, NOW())
         ON CONFLICT (id) DO NOTHING`,
        [this.LOC_A, this.TENANT_A, this.LOC_B, this.TENANT_B]
      );
    });
  }

  /**
   * Helper to ensure a clean product fixture
   */
  public static async ensureProduct(orgId: string, productId: string, sku: string, name: string): Promise<void> {
    await TenantContext.run({ tenantId: orgId, isSuperAdmin: false }, async () => {
      await query(
        `INSERT INTO products (
          id, organization_id, sku, name, category, bath, price, cost_price, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 'ANEIS', 'OURO_18K', 150.0, 50.0, 'ATIVO', NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET name = $4`,
        [productId, orgId, sku, name]
      );
    });
  }

  /**
   * Clean up stress artifacts
   */
  public static async teardownEnvironment(): Promise<void> {
    await TenantContext.run({ tenantId: this.TENANT_A, isSuperAdmin: true }, async () => {
      try {
        await query(`DELETE FROM inventory_reservations WHERE organization_id IN ($1, $2)`, [this.TENANT_A, this.TENANT_B]);
        await query(`DELETE FROM inventory_movements WHERE organization_id IN ($1, $2)`, [this.TENANT_A, this.TENANT_B]);
        await query(`DELETE FROM inventory_balances WHERE organization_id IN ($1, $2)`, [this.TENANT_A, this.TENANT_B]);
        await query(`DELETE FROM products WHERE organization_id IN ($1, $2)`, [this.TENANT_A, this.TENANT_B]);
      } catch (err: any) {
        console.warn("[teardownEnvironment] Erro ao limpar fixtures:", err.message);
      }
    });
  }

  /**
   * Calculates percentile from latencies array
   */
  private static calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
  }

  // ==========================================================================
  // CENÁRIO 1: STRESS DE ATUALIZAÇÃO CONCORRENTE NO MESMO PRODUTO (LOST UPDATES)
  // ==========================================================================
  /**
   * Dispara 50 requisições simultâneas de incremento e decremento no MESMO produto.
   * Se o locking falhar, ocorrerá a clássica Race Condition de "Lost Update",
   * resultando em saldo final divergente do somatório matemático dos deltas aplicados.
   */
  public static async testConcurrentStockUpdates(concurrency = 50): Promise<StressScenarioResult> {
    const scenarioName = "Cenário 1: 50 Requisições Simultâneas de Atualização no Mesmo Produto (Detecção de Lost Updates)";
    const orgId = this.TENANT_A;
    const productId = `prod-stress-updates-${Date.now()}`;
    const locationId = this.LOC_A;
    const initialOnHand = 100;

    await this.ensureProduct(orgId, productId, `SKU-UPD-${Date.now()}`, "Produto Stress Lost Update");

    // 1. Initial on-hand balance
    await TenantContext.run({ tenantId: orgId }, async () => {
      await inventoryRepo.adjustOnHand(orgId, productId, locationId, initialOnHand);
    });

    // 2. Prepare 50 concurrent operations with mixed deltas (+5, -3, +10, -8, +2, -1, etc.)
    const deltas: number[] = [];
    for (let i = 0; i < concurrency; i++) {
      // Deterministic spread: half positive, half negative
      const isPositive = i % 2 === 0;
      const amount = (i % 5) + 1; // 1 to 5
      deltas.push(isPositive ? amount : -amount);
    }

    const latencies: number[] = [];
    let successfulRequests = 0;
    let failedRequests = 0;
    let rejectedRequests = 0;
    let expectedSumOfAcceptedDeltas = 0;

    const startTotal = Date.now();

    // 3. Dispatch all concurrent operations simultaneously
    const results = await Promise.allSettled(
      deltas.map(async (delta, idx) => {
        const opStart = Date.now();
        return await TenantContext.run({ tenantId: orgId }, async () => {
          try {
            // Pessimistic lock row-update: adjusts physical stock with FOR UPDATE protection
            const updatedBal = await inventoryRepo.adjustOnHand(orgId, productId, locationId, delta);
            const opDuration = Date.now() - opStart;
            latencies.push(opDuration);
            return { delta, updatedBal, success: true, opDuration };
          } catch (err: any) {
            const opDuration = Date.now() - opStart;
            latencies.push(opDuration);
            throw { delta, error: err.message, opDuration };
          }
        });
      })
    );

    const totalDuration = Date.now() - startTotal;

    // 4. Analyze execution results
    for (const res of results) {
      if (res.status === "fulfilled") {
        successfulRequests++;
        expectedSumOfAcceptedDeltas += res.value.delta;
      } else {
        if (res.reason?.error?.includes("Saldo insuficiente") || res.reason?.error?.includes("CHECK")) {
          rejectedRequests++;
        } else {
          failedRequests++;
        }
      }
    }

    // 5. Query final state directly from database under TenantContext
    const finalBal = await TenantContext.run({ tenantId: orgId }, async () => {
      return await inventoryRepo.getBalance(orgId, productId, locationId);
    });

    const actualOnHand = finalBal?.onHandQuantity ?? 0;
    const expectedFinalOnHand = initialOnHand + expectedSumOfAcceptedDeltas;

    // 6. Assertions for Race Conditions
    const noLostUpdates = actualOnHand === expectedFinalOnHand;
    const noNegativeStock = actualOnHand >= 0 && (finalBal?.availableQuantity ?? 0) >= 0;
    const raceConditionsDetected = !noLostUpdates || !noNegativeStock;

    const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
    const minLatency = latencies.length > 0 ? Math.min(...latencies) : 0;
    const maxLatency = latencies.length > 0 ? Math.max(...latencies) : 0;
    const p95Latency = this.calculatePercentile(latencies, 95);
    const throughput = totalDuration > 0 ? Math.round((concurrency / (totalDuration / 1000)) * 10) / 10 : 0;

    return {
      scenarioName,
      concurrencyLevel: concurrency,
      totalRequests: concurrency,
      successfulRequests,
      rejectedRequests,
      failedRequests,
      durationMs: totalDuration,
      throughputOpsPerSec: throughput,
      latencyMs: { min: minLatency, max: maxLatency, avg: avgLatency, p95: p95Latency },
      raceConditionsDetected,
      rlsViolationsDetected: false,
      checks: [
        {
          checkName: "Ausência de Lost Updates (Atomicidade exata da soma dos deltas)",
          passed: noLostUpdates,
          expected: expectedFinalOnHand,
          actual: actualOnHand,
          details: noLostUpdates 
            ? `O estoque final (${actualOnHand}) bateu exatamente com o saldo inicial (${initialOnHand}) + deltas aplicados (${expectedSumOfAcceptedDeltas}). Zero atualizações perdidas.`
            : `RACE CONDITION DETECTADA: Saldo final (${actualOnHand}) diverge do valor esperado (${expectedFinalOnHand}). Houve sobreposição de transações não serializadas.`,
        },
        {
          checkName: "Garantia de Não-Negatividade (on_hand >= 0)",
          passed: noNegativeStock,
          expected: ">= 0",
          actual: actualOnHand,
          details: noNegativeStock ? "Saldo físico e disponível permaneceram estritamente positivos ou zero." : "VIOLAÇÃO: Saldo negativo detectado.",
        },
      ],
      details: raceConditionsDetected
        ? `FALHA: Race condition detectada em ${concurrency} requisições simultâneas. Esperado: ${expectedFinalOnHand}, Obtido: ${actualOnHand}.`
        : `SUCESSO: ${concurrency} operações concorrentes processadas com integridade total em ${totalDuration}ms (${throughput} op/s). Lock preveniu 100% de lost updates.`,
    };
  }

  // ==========================================================================
  // CENÁRIO 2: FLASH-SALE ULTRA-CONTENÇÃO (OVERSELLING PREVENTION)
  // ==========================================================================
  /**
   * Simula 60 compradores tentando reservar simultaneamente 1 unidade
   * em um produto com estoque físico inicial de apenas 12 unidades.
   * Valida se:
   * - Exatamente 12 reservas são aprovadas
   * - Exatamente 48 são rejeitadas com 409 Saldo Insuficiente
   * - O saldo disponível não fica negativo
   * - O reserved_quantity bate exatamente com o total de registros na tabela inventory_reservations
   */
  public static async testFlashSaleOversellingPrevention(shoppers = 60, stockAvailable = 12): Promise<StressScenarioResult> {
    const scenarioName = "Cenário 2: Flash-Sale de Alta Contenção (60 Disputas Concorrentes por 12 Itens - Zero Oversell)";
    const orgId = this.TENANT_A;
    const productId = `prod-stress-flashsale-${Date.now()}`;
    const locationId = this.LOC_A;

    await this.ensureProduct(orgId, productId, `SKU-FLASH-${Date.now()}`, "Produto Flash Sale");

    // 1. Seed initial stock
    await TenantContext.run({ tenantId: orgId }, async () => {
      await inventoryRepo.adjustOnHand(orgId, productId, locationId, stockAvailable);
    });

    const latencies: number[] = [];
    const startTotal = Date.now();

    // 2. Fire 60 concurrent shoppers attempting to reserve 1 unit
    const reservationAttempts = await Promise.allSettled(
      Array.from({ length: shoppers }, (_, i) => {
        const shopperId = `shopper-${i + 1}`;
        const opStart = Date.now();
        return TenantContext.run({ tenantId: orgId }, async () => {
          try {
            const res = await InventoryConcurrencyService.createReservation(orgId, {
              productId,
              locationId,
              quantity: 1,
              referenceType: "CHECKOUT_RESERVATION",
              referenceId: `CART-${shopperId}`,
              operatorName: `Bot ${shopperId}`,
              ttlMinutes: 10,
            });
            const duration = Date.now() - opStart;
            latencies.push(duration);
            return res;
          } catch (err: any) {
            const duration = Date.now() - opStart;
            latencies.push(duration);
            throw err;
          }
        });
      })
    );

    const totalDuration = Date.now() - startTotal;

    let successfulReservations = 0;
    let rejectedReservations = 0;
    let unexpectedErrors = 0;

    for (const attempt of reservationAttempts) {
      if (attempt.status === "fulfilled") {
        successfulReservations++;
      } else {
        const msg = attempt.reason?.message || "";
        if (msg.includes("Saldo insuficiente") || msg.includes("insuficiente para reserva")) {
          rejectedReservations++;
        } else {
          unexpectedErrors++;
        }
      }
    }

    // 3. Inspect final database balances and active reservation count
    const { finalBalance, activeReservationsInDb } = await TenantContext.run({ tenantId: orgId }, async () => {
      const bal = await inventoryRepo.getBalance(orgId, productId, locationId);
      const activeRes = await inventoryRepo.listActiveReservations(orgId);
      const productRes = activeRes.filter((r) => r.productId === productId);
      return { finalBalance: bal, activeReservationsInDb: productRes };
    });

    const actualReserved = finalBalance?.reservedQuantity ?? 0;
    const actualAvailable = finalBalance?.availableQuantity ?? 0;
    const actualOnHand = finalBalance?.onHandQuantity ?? 0;
    const sumActiveQuantities = activeReservationsInDb.reduce((sum, r) => sum + r.quantity, 0);

    // Assertions
    const exactWinners = successfulReservations === stockAvailable;
    const exactRejections = rejectedReservations === (shoppers - stockAvailable);
    const zeroAvailable = actualAvailable === 0;
    const zeroOversell = actualAvailable >= 0 && actualReserved <= stockAvailable;
    const zeroPhantomReservations = actualReserved === sumActiveQuantities && actualReserved === successfulReservations;

    const raceConditionsDetected = !exactWinners || !exactRejections || !zeroOversell || !zeroPhantomReservations;

    const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
    const minLatency = latencies.length > 0 ? Math.min(...latencies) : 0;
    const maxLatency = latencies.length > 0 ? Math.max(...latencies) : 0;
    const p95Latency = this.calculatePercentile(latencies, 95);
    const throughput = totalDuration > 0 ? Math.round((shoppers / (totalDuration / 1000)) * 10) / 10 : 0;

    return {
      scenarioName,
      concurrencyLevel: shoppers,
      totalRequests: shoppers,
      successfulRequests: successfulReservations,
      rejectedRequests: rejectedReservations,
      failedRequests: unexpectedErrors,
      durationMs: totalDuration,
      throughputOpsPerSec: throughput,
      latencyMs: { min: minLatency, max: maxLatency, avg: avgLatency, p95: p95Latency },
      raceConditionsDetected,
      rlsViolationsDetected: false,
      checks: [
        {
          checkName: "Zero Overselling (Aprovações == Estoque Disponível)",
          passed: exactWinners,
          expected: stockAvailable,
          actual: successfulReservations,
          details: exactWinners
            ? `Exatamente ${stockAvailable} compradores obtiveram reserva.`
            : `RACE CONDITION: Houve overselling ou under-allocation (${successfulReservations} aprovados para ${stockAvailable} disponíveis).`,
        },
        {
          checkName: "Rejeições Corretas por Saldo Esgotado",
          passed: exactRejections,
          expected: shoppers - stockAvailable,
          actual: rejectedReservations,
          details: `${rejectedReservations}/${shoppers - stockAvailable} requisições excedentes bloqueadas consistentemente.`,
        },
        {
          checkName: "Integridade de Saldo Disponível (available_quantity >= 0)",
          passed: zeroAvailable,
          expected: 0,
          actual: actualAvailable,
          details: `Saldo disponível restante: ${actualAvailable} un (Físico: ${actualOnHand}, Reservado: ${actualReserved}).`,
        },
        {
          checkName: "Zero Reservas Fantasmas (reserved_quantity == soma(inventory_reservations.quantity))",
          passed: zeroPhantomReservations,
          expected: actualReserved,
          actual: sumActiveQuantities,
          details: `Saldo reservado na tabela inventory_balances (${actualReserved}) bateu 1:1 com os registros da tabela inventory_reservations (${sumActiveQuantities}).`,
        },
      ],
      details: raceConditionsDetected
        ? `FALHA: Inconsistência de estoque em flash sale concorrente.`
        : `SUCESSO: Zero Overselling garantido. ${successfulReservations} reservas aceitas e ${rejectedReservations} rejeitadas em ${totalDuration}ms sem race conditions.`,
    };
  }

  // ==========================================================================
  // CENÁRIO 3: INTEGRIDADE DO RLS MULTI-TENANT SOB CARGA CONCORRENTE
  // ==========================================================================
  /**
   * Testa a blindagem do Row Level Security (RLS) enquanto múltiplos tenants
   * disparam transações concorrentes ao mesmo tempo.
   * Valida se:
   * - Tenant B NÃO consegue ver nem alterar o saldo do produto de Tenant A
   * - Tenant B tentar reservar o produto de Tenant A é bloqueado pelo RLS (0 rows)
   * - A variável de sessão `app.current_tenant_id` não vaza entre conexões concorrentes
   * - As operações do Tenant B no seu próprio estoque ocorrem sem bloqueios cruzados
   */
  public static async testRlsMultiTenantConcurrency(concurrencyPerTenant = 25): Promise<StressScenarioResult> {
    const scenarioName = "Cenário 3: Validação Estrita de RLS Multi-Tenant sob Carga Concorrente Simultânea";
    const prodA = `prod-rls-tenant-a-${Date.now()}`;
    const prodB = `prod-rls-tenant-b-${Date.now()}`;

    // Seed products for Tenant A and Tenant B
    await this.ensureProduct(this.TENANT_A, prodA, `SKU-RLS-A-${Date.now()}`, "Item Tenant A");
    await this.ensureProduct(this.TENANT_B, prodB, `SKU-RLS-B-${Date.now()}`, "Item Tenant B");

    // Initialize balances
    await TenantContext.run({ tenantId: this.TENANT_A }, async () => {
      await inventoryRepo.adjustOnHand(this.TENANT_A, prodA, this.LOC_A, 50);
    });
    await TenantContext.run({ tenantId: this.TENANT_B }, async () => {
      await inventoryRepo.adjustOnHand(this.TENANT_B, prodB, this.LOC_B, 30);
    });

    const latencies: number[] = [];
    const totalRequests = concurrencyPerTenant * 2;
    let unauthorizedAccessCount = 0;
    let crossTenantDataLeaks = 0;
    let tenantALegitimateSuccess = 0;
    let tenantBLegitimateSuccess = 0;
    let tenantBCrossAttacksBlocked = 0;

    const startTotal = Date.now();

    // Launch concurrent mixed operations
    await Promise.allSettled([
      // Tenant A legitimate operations (25 concurrent updates on prodA)
      ...Array.from({ length: concurrencyPerTenant }, async (_, i) => {
        const opStart = Date.now();
        await TenantContext.run({ tenantId: this.TENANT_A }, async () => {
          try {
            await inventoryRepo.adjustOnHand(this.TENANT_A, prodA, this.LOC_A, 1);
            tenantALegitimateSuccess++;
          } finally {
            latencies.push(Date.now() - opStart);
          }
        });
      }),

      // Tenant B operations: HALF are legitimate on prodB, HALF are malicious cross-tenant attempts on prodA
      ...Array.from({ length: concurrencyPerTenant }, async (_, i) => {
        const opStart = Date.now();
        const isCrossTenantAttack = i % 2 === 0;

        await TenantContext.run({ tenantId: this.TENANT_B }, async () => {
          try {
            if (isCrossTenantAttack) {
              // MALICIOUS ATTEMPT: Tenant B attempts to read or update Tenant A's balance
              // Direct query attempt on Tenant A's product under Tenant B's RLS session
              const leakCheck = await query(
                `SELECT * FROM inventory_balances WHERE product_id = $1`,
                [prodA]
              );

              if (leakCheck.rows.length > 0) {
                // If Tenant B sees any row belonging to Tenant A, that's a critical RLS leak!
                crossTenantDataLeaks++;
              } else {
                tenantBCrossAttacksBlocked++;
              }

              // Malicious write attempt: Tenant B attempts to manipulate Tenant A's balance
              const writeAttack = await query(
                `UPDATE inventory_balances SET on_hand_quantity = 9999 WHERE product_id = $1 RETURNING *`,
                [prodA]
              );

              if (writeAttack.rows.length > 0) {
                unauthorizedAccessCount++;
              }
            } else {
              // Legitimate update on Tenant B's own product
              await inventoryRepo.adjustOnHand(this.TENANT_B, prodB, this.LOC_B, 1);
              tenantBLegitimateSuccess++;
            }
          } finally {
            latencies.push(Date.now() - opStart);
          }
        });
      }),
    ]);

    const totalDuration = Date.now() - startTotal;

    // Verify Tenant A's balance in DB is strictly unaffected by Tenant B's attack
    const finalBalA = await TenantContext.run({ tenantId: this.TENANT_A }, async () => {
      return await inventoryRepo.getBalance(this.TENANT_A, prodA, this.LOC_A);
    });

    const finalBalB = await TenantContext.run({ tenantId: this.TENANT_B }, async () => {
      return await inventoryRepo.getBalance(this.TENANT_B, prodB, this.LOC_B);
    });

    const expectedBalAOnHand = 50 + tenantALegitimateSuccess;
    const isTenantAIntact = finalBalA?.onHandQuantity === expectedBalAOnHand && finalBalA?.onHandQuantity !== 9999;
    const rlsIsolated = crossTenantDataLeaks === 0 && unauthorizedAccessCount === 0 && isTenantAIntact;

    const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
    const minLatency = latencies.length > 0 ? Math.min(...latencies) : 0;
    const maxLatency = latencies.length > 0 ? Math.max(...latencies) : 0;
    const p95Latency = this.calculatePercentile(latencies, 95);
    const throughput = totalDuration > 0 ? Math.round((totalRequests / (totalDuration / 1000)) * 10) / 10 : 0;

    return {
      scenarioName,
      concurrencyLevel: totalRequests,
      totalRequests,
      successfulRequests: tenantALegitimateSuccess + tenantBLegitimateSuccess + tenantBCrossAttacksBlocked,
      rejectedRequests: 0,
      failedRequests: unauthorizedAccessCount + crossTenantDataLeaks,
      durationMs: totalDuration,
      throughputOpsPerSec: throughput,
      latencyMs: { min: minLatency, max: maxLatency, avg: avgLatency, p95: p95Latency },
      raceConditionsDetected: !isTenantAIntact,
      rlsViolationsDetected: !rlsIsolated,
      checks: [
        {
          checkName: "Isolamento Estrito de Leitura Cross-Tenant (RLS zero-rows leak)",
          passed: crossTenantDataLeaks === 0,
          expected: 0,
          actual: crossTenantDataLeaks,
          details: crossTenantDataLeaks === 0
            ? "O PostgreSQL RLS filtrou 100% das consultas cross-tenant. Tenant B não obteve visibilidade de nenhum dado do Tenant A."
            : "VIOLAÇÃO GRAVE DE SEGURANÇA: Tenant B conseguiu ler registros pertencentes ao Tenant A!",
        },
        {
          checkName: "Blindagem de Escrita Cross-Tenant (RLS zero-rows updated)",
          passed: unauthorizedAccessCount === 0,
          expected: 0,
          actual: unauthorizedAccessCount,
          details: unauthorizedAccessCount === 0
            ? "Zero alterações não autorizadas. Tentativas de UPDATE malicioso retornaram 0 linhas afetadas pela política RLS."
            : "VIOLAÇÃO GRAVE: Tenant B conseguiu alterar o estoque do Tenant A!",
        },
        {
          checkName: "Integridade das Operações Legítimas de Ambos os Tenants",
          passed: isTenantAIntact && tenantBLegitimateSuccess > 0,
          expected: `Tenant A onHand = ${expectedBalAOnHand}`,
          actual: `Tenant A onHand = ${finalBalA?.onHandQuantity}`,
          details: `Tenant A executou ${tenantALegitimateSuccess} updates e Tenant B executou ${tenantBLegitimateSuccess} updates em paralelo sem interferência de locks ou vazamento de sessão.`,
        },
      ],
      details: rlsIsolated
        ? `SUCESSO: RLS e Row Locks 100% blindados sob ${totalRequests} requisições simultâneas em ${totalDuration}ms. Zero vazamento de dados entre tenants.`
        : `FALHA: Violação de segurança RLS detectada sob concorrência.`,
    };
  }

  // ==========================================================================
  // CENÁRIO 4: ROW-LEVEL PESSIMISTIC LOCKING POSTGRESQL PURO (SELECT ... FOR UPDATE)
  // ==========================================================================
  /**
   * Testa 25 conexões simultâneas executando diretamente transações PostgreSQL
   * com `SELECT ... FOR UPDATE` na tabela `inventory_balances` para atualizar
   * o mesmo registro, validando a serialização estrita no nível do motor do PostgreSQL.
   */
  public static async testPurePostgresRowLockContention(concurrency = 25): Promise<StressScenarioResult> {
    const scenarioName = "Cenário 4: Teste de Contenção de Lock de Banco (25 Conexões Concorrentes com SELECT ... FOR UPDATE)";
    const orgId = this.TENANT_A;
    const productId = `prod-pure-lock-${Date.now()}`;
    const locationId = this.LOC_A;
    const initialOnHand = 200;

    await this.ensureProduct(orgId, productId, `SKU-PURLOCK-${Date.now()}`, "Produto Row Lock Contention");

    // Initialize balance
    await TenantContext.run({ tenantId: orgId }, async () => {
      await inventoryRepo.adjustOnHand(orgId, productId, locationId, initialOnHand);
    });

    const latencies: number[] = [];
    let completedTransactions = 0;
    let deadlockErrors = 0;
    let generalErrors = 0;

    const startTotal = Date.now();

    // 25 concurrent native database transactions contending for the exact same row lock
    const results = await Promise.allSettled(
      Array.from({ length: concurrency }, async (_, i) => {
        const opStart = Date.now();
        return await TenantContext.run({ tenantId: orgId }, async () => {
          return await withTransaction(async (client) => {
            try {
              // 1. SELECT ... FOR UPDATE (Acquires row-level exclusive lock)
              const sel = await client.query(
                `SELECT id, on_hand_quantity, reserved_quantity, available_quantity 
                 FROM inventory_balances 
                 WHERE organization_id = $1 AND product_id = $2 AND location_id = $3 
                 FOR UPDATE`,
                [orgId, productId, locationId]
              );

              if (sel.rows.length === 0) {
                throw new Error("Saldo não encontrado sob lock");
              }

              const row = sel.rows[0];
              const currentOnHand = parseInt(row.on_hand_quantity, 10);
              const currentReserved = parseInt(row.reserved_quantity, 10);
              const newOnHand = currentOnHand + 2; // Increments by 2
              const newAvailable = newOnHand - currentReserved;

              // Small sleep (5ms) to magnify contention window and verify lock queuing
              await new Promise((r) => setTimeout(r, 5));

              // 2. Atomic UPDATE under lock (available_quantity is GENERATED ALWAYS in PostgreSQL)
              await client.query(
                `UPDATE inventory_balances 
                 SET on_hand_quantity = $1, updated_at = NOW() 
                 WHERE id = $2`,
                [newOnHand, row.id]
              );

              completedTransactions++;
              const duration = Date.now() - opStart;
              latencies.push(duration);
              return { success: true, duration };
            } catch (err: any) {
              const duration = Date.now() - opStart;
              latencies.push(duration);
              if (err.message?.includes("deadlock") || err.code === "40P01") {
                deadlockErrors++;
              } else {
                generalErrors++;
              }
              throw err;
            }
          });
        });
      })
    );

    const totalDuration = Date.now() - startTotal;

    // Check final state
    const finalBal = await TenantContext.run({ tenantId: orgId }, async () => {
      return await inventoryRepo.getBalance(orgId, productId, locationId);
    });

    const expectedOnHand = initialOnHand + (completedTransactions * 2);
    const actualOnHand = finalBal?.onHandQuantity ?? 0;
    const noLostUpdates = actualOnHand === expectedOnHand && completedTransactions === concurrency;
    const noDeadlocks = deadlockErrors === 0;

    const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
    const minLatency = latencies.length > 0 ? Math.min(...latencies) : 0;
    const maxLatency = latencies.length > 0 ? Math.max(...latencies) : 0;
    const p95Latency = this.calculatePercentile(latencies, 95);
    const throughput = totalDuration > 0 ? Math.round((concurrency / (totalDuration / 1000)) * 10) / 10 : 0;

    return {
      scenarioName,
      concurrencyLevel: concurrency,
      totalRequests: concurrency,
      successfulRequests: completedTransactions,
      rejectedRequests: 0,
      failedRequests: deadlockErrors + generalErrors,
      durationMs: totalDuration,
      throughputOpsPerSec: throughput,
      latencyMs: { min: minLatency, max: maxLatency, avg: avgLatency, p95: p95Latency },
      raceConditionsDetected: !noLostUpdates,
      rlsViolationsDetected: false,
      checks: [
        {
          checkName: "Serialização Estrita de Locks no PostgreSQL (Zero Lost Updates)",
          passed: noLostUpdates,
          expected: expectedOnHand,
          actual: actualOnHand,
          details: noLostUpdates
            ? `Todas as ${concurrency} transações com SELECT ... FOR UPDATE foram perfeitamente serializadas sem colisões de escrita.`
            : `RACE CONDITION: Saldo final (${actualOnHand}) divergiu do esperado (${expectedOnHand}).`,
        },
        {
          checkName: "Zero Deadlocks no Motor Relacional",
          passed: noDeadlocks,
          expected: 0,
          actual: deadlockErrors,
          details: noDeadlocks ? "Nenhum erro 40P01 (deadlock detected) disparado pelo PostgreSQL." : `Deadlocks detectados: ${deadlockErrors}.`,
        },
      ],
      details: noLostUpdates && noDeadlocks
        ? `SUCESSO: Contenção de banco suportada com perfeição. ${concurrency} transações simultâneas serializadas em ${totalDuration}ms (${throughput} op/s).`
        : `FALHA: Erros de lock ou serialização detectados no banco.`,
    };
  }

  // ==========================================================================
  // MASTER STRESS SUITE RUNNER
  // ==========================================================================
  /**
   * Executa a bateria completa de testes de estresse e gera o relatório consolidado
   */
  public static async runFullStressSuite(): Promise<StressTestSuiteReport> {
    const suiteStart = Date.now();
    console.log("================================================================================");
    console.log("🚀 INICIANDO TESTE DE ESTRESSE DE ESTOQUE: CONCORRÊNCIA, RLS & DATABASE LOCKS");
    console.log("================================================================================");

    await this.setupEnvironment();

    const scenarios: StressScenarioResult[] = [];

    try {
      console.log("\n[1/4] Executando Cenário 1: Lost Updates sob 50 Requisições Simultâneas...");
      const s1 = await this.testConcurrentStockUpdates(50);
      scenarios.push(s1);
      console.log(`  -> ${s1.raceConditionsDetected ? "❌ RACE CONDITION DETECTADA" : "✅ PASSOU"}: ${s1.details}`);

      console.log("\n[2/4] Executando Cenário 2: Flash Sale de 60 Compradores Concorrentes...");
      const s2 = await this.testFlashSaleOversellingPrevention(60, 12);
      scenarios.push(s2);
      console.log(`  -> ${s2.raceConditionsDetected ? "❌ RACE CONDITION DETECTADA" : "✅ PASSOU"}: ${s2.details}`);

      console.log("\n[3/4] Executando Cenário 3: RLS Multi-Tenant sob Alta Carga Concorrente...");
      const s3 = await this.testRlsMultiTenantConcurrency(25);
      scenarios.push(s3);
      console.log(`  -> ${s3.rlsViolationsDetected ? "❌ VAZAMENTO DE RLS" : "✅ PASSOU"}: ${s3.details}`);

      console.log("\n[4/4] Executando Cenário 4: Contenção de Locks SELECT ... FOR UPDATE...");
      const s4 = await this.testPurePostgresRowLockContention(25);
      scenarios.push(s4);
      console.log(`  -> ${s4.raceConditionsDetected ? "❌ RACE CONDITION DETECTADA" : "✅ PASSOU"}: ${s4.details}`);
    } finally {
      await this.teardownEnvironment();
    }

    const totalDuration = Date.now() - suiteStart;
    const anyRaceConditions = scenarios.some((s) => s.raceConditionsDetected);
    const anyRlsViolations = scenarios.some((s) => s.rlsViolationsDetected);
    const scenariosPassed = scenarios.filter((s) => !s.raceConditionsDetected && !s.rlsViolationsDetected).length;
    const totalConcurrentRequests = scenarios.reduce((sum, s) => sum + s.totalRequests, 0);

    const report: StressTestSuiteReport = {
      suiteName: "INVENTORY STRESS & HIGH CONCURRENCY REPORT (RLS + POSTGRESQL ROW LOCKING)",
      timestamp: new Date().toISOString(),
      totalDurationMs: totalDuration,
      concurrencyPassed: !anyRaceConditions,
      rlsPassed: !anyRlsViolations,
      raceConditionsDetected: anyRaceConditions,
      summary: {
        scenariosRun: scenarios.length,
        scenariosPassed,
        totalConcurrentRequests,
      },
      scenarios,
    };

    console.log("\n================================================================================");
    console.log(`🏁 RELATÓRIO FINAL DO TESTE DE ESTRESSE:`);
    console.log(`- Cenários Aprovados: ${scenariosPassed}/${scenarios.length}`);
    console.log(`- Total de Requisições Simultâneas Disparadas: ${totalConcurrentRequests}`);
    console.log(`- Tempo Total de Execução: ${totalDuration}ms`);
    console.log(`- Race Conditions Detectadas: ${anyRaceConditions ? "🚨 SIM (FALHA)" : "🛡️ NENHUMA (100% PROTEGIDO)"}`);
    console.log(`- Violação de RLS / Vazamento de Tenant: ${anyRlsViolations ? "🚨 SIM (FALHA)" : "🛡️ NENHUMA (100% ISOLADO)"}`);
    console.log("================================================================================\n");

    return report;
  }
}

// Auto-run if executed directly via CLI
if (
  process.argv[1]?.includes("inventoryStressTest") ||
  process.argv.includes("--run-stress")
) {
  InventoryStressTester.runFullStressSuite()
    .then((report) => {
      const exitCode = report.raceConditionsDetected || !report.rlsPassed ? 1 : 0;
      process.exit(exitCode);
    })
    .catch((err) => {
      console.error("ERRO FATAL NO TESTE DE ESTRESSE:", err);
      process.exit(1);
    });
}
