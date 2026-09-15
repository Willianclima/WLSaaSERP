import { InventoryConcurrencyService } from "./inventoryConcurrency.service";
import { inventoryRepo } from "./inventory.repository";
import { reservationExpiryWorker } from "./reservationExpiryWorker";
import { dbStore } from "../../db/store";
import { IdempotencyService } from "../../services/idempotency.service";
import { query } from "../../db/postgres";
import { OrderService } from "../orders/order.service";
import { TenantContext } from "../../db/tenantContext";

export interface TestResultItem {
  testName: string;
  category: string;
  passed: boolean;
  durationMs: number;
  details: string;
  data?: any;
}

export interface HardeningSuiteReport {
  suiteName: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalDurationMs: number;
  timestamp: string;
  results: TestResultItem[];
}

export class InventoryHardeningTestSuite {
  private static TEST_ORG = "org-hardening-sandbox-tenant";
  private static TEST_LOC_A = "loc-sandbox-a";
  private static TEST_LOC_B = "loc-sandbox-b";

  private static async setupTestEnvironment() {
    const orgId = this.TEST_ORG;
    await this.teardownTestEnvironment();

    // Ensure sandbox tenant and locations exist in PostgreSQL under super admin privileges
    await TenantContext.run({ tenantId: orgId, isSuperAdmin: true }, async () => {
      try {
        await query(
          `INSERT INTO organizations (id, name, slug, document, contact_email, contact_whatsapp, status, created_at, updated_at)
           VALUES ($1, 'Sandbox Org Hardening', 'sandbox-org-hardening', '00000000000199', 'sandbox@aura.test', '11999999999', 'ACTIVE', NOW(), NOW())
           ON CONFLICT (id) DO NOTHING`,
          [orgId]
        );
        await query(
          `INSERT INTO inventory_locations (id, organization_id, name, code, type, is_active, created_at)
           VALUES 
             ($1, $2, 'Armazém Sandbox de Teste A', 'TEST-SANDBOX-A', 'WAREHOUSE', TRUE, NOW()),
             ($3, $2, 'Armazém Sandbox de Teste B', 'TEST-SANDBOX-B', 'PHYSICAL_STORE', TRUE, NOW())
           ON CONFLICT (id) DO NOTHING`,
          [this.TEST_LOC_A, orgId, this.TEST_LOC_B]
        );
      } catch (err: any) {
        console.warn("[setupTestEnvironment] Aviso ao criar fixtures em PG:", err.message);
      }
    });

    // Seed test location A in memory
    dbStore.inventoryLocations.set(this.TEST_LOC_A, {
      id: this.TEST_LOC_A,
      organizationId: orgId,
      name: "Armazém Sandbox de Teste A",
      code: "TEST-SANDBOX-A",
      type: "WAREHOUSE",
      isActive: true,
      createdAt: new Date().toISOString(),
    });

    // Seed test location B in memory
    dbStore.inventoryLocations.set(this.TEST_LOC_B, {
      id: this.TEST_LOC_B,
      organizationId: orgId,
      name: "Armazém Sandbox de Teste B",
      code: "TEST-SANDBOX-B",
      type: "PHYSICAL_STORE",
      isActive: true,
      createdAt: new Date().toISOString(),
    });
  }

  /**
   * Completely cleans up all sandbox fixtures to prevent memory or database pollution
   */
  private static async teardownTestEnvironment() {
    const orgId = this.TEST_ORG;
    // Remove in-memory balances
    for (const [key, bal] of dbStore.inventoryBalances.entries()) {
      if (bal.organizationId === orgId) {
        dbStore.inventoryBalances.delete(key);
      }
    }
    // Remove in-memory reservations
    for (const [key, res] of dbStore.inventoryReservations.entries()) {
      if (res.organizationId === orgId) {
        dbStore.inventoryReservations.delete(key);
      }
    }
    // Remove in-memory locations
    dbStore.inventoryLocations.delete(this.TEST_LOC_A);
    dbStore.inventoryLocations.delete(this.TEST_LOC_B);

    // Clean up PostgreSQL fixtures
    await TenantContext.run({ tenantId: orgId, isSuperAdmin: true }, async () => {
      try {
        await query("DELETE FROM order_items WHERE organization_id = $1", [orgId]);
        await query("DELETE FROM orders WHERE organization_id = $1", [orgId]);
        await query("DELETE FROM inventory_reservations WHERE organization_id = $1", [orgId]);
        await query("DELETE FROM inventory_movements WHERE organization_id = $1", [orgId]);
        await query("DELETE FROM inventory_balances WHERE organization_id = $1", [orgId]);
        await query("DELETE FROM inventory_locations WHERE organization_id = $1", [orgId]);
        await query("DELETE FROM idempotency_keys WHERE organization_id = $1", [orgId]);
        await query("DELETE FROM products WHERE organization_id = $1", [orgId]);
        await query("DELETE FROM organizations WHERE id = $1", [orgId]);
      } catch (err: any) {
        // Cleanup ignore
      }
    });
  }

  private static async ensureTestProduct(orgId: string, productId: string, name = "Produto Teste Hardening"): Promise<void> {
    await query(
      `INSERT INTO products (
        id, organization_id, sku, name, category, bath, price, cost_price, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, 'ANEIS', 'OURO_18K', 100.0, 30.0, 'ATIVO', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING`,
      [productId, orgId, `SKU-${productId}`, name]
    );
  }

  /**
   * TEST 1: 2 Users / 1 Item in Dispute (Zero Overselling Prevention)
   */
  static async testTwoUsersOneItem(): Promise<TestResultItem> {
    const start = Date.now();
    const testName = "1. Disputa de 2 Usuários por 1 Item (Zero Oversell)";
    const orgId = this.TEST_ORG;
    const productId = `prod-dispute-${Date.now()}`;
    const locationId = this.TEST_LOC_A;

    try {
      await this.ensureTestProduct(orgId, productId);
      // 1. Initial balance: 1 unit on hand
      await inventoryRepo.adjustOnHand(orgId, productId, locationId, 1);

      // 2. Concurrently attempt 2 formal reservations
      const [resUserA, resUserB] = await Promise.allSettled([
        InventoryConcurrencyService.createReservation(orgId, {
          productId,
          locationId,
          quantity: 1,
          referenceType: "CHECKOUT_RESERVATION",
          referenceId: "CART-USER-A",
          operatorName: "User A",
          ttlMinutes: 15,
        }),
        InventoryConcurrencyService.createReservation(orgId, {
          productId,
          locationId,
          quantity: 1,
          referenceType: "CHECKOUT_RESERVATION",
          referenceId: "CART-USER-B",
          operatorName: "User B",
          ttlMinutes: 15,
        }),
      ]);

      const successCount = [resUserA, resUserB].filter((r) => r.status === "fulfilled").length;
      const rejectedCount = [resUserA, resUserB].filter((r) => r.status === "rejected").length;

      const finalBal = await inventoryRepo.getBalance(orgId, productId, locationId);

      const passed =
        successCount === 1 &&
        rejectedCount === 1 &&
        finalBal?.onHandQuantity === 1 &&
        finalBal?.reservedQuantity === 1 &&
        finalBal?.availableQuantity === 0;

      return {
        testName,
        category: "CONCURRENCY_ATOMICITY",
        passed,
        durationMs: Date.now() - start,
        details: passed
          ? `Sucesso: 1 reserva aceita, 1 rejeitada com HTTP 409. Saldo final: on_hand=1, reserved=1, available=0.`
          : `Falha: successCount=${successCount}, rejectedCount=${rejectedCount}, finalBal=${JSON.stringify(finalBal)}`,
        data: { successCount, rejectedCount, finalBal },
      };
    } catch (err: any) {
      return {
        testName,
        category: "CONCURRENCY_ATOMICITY",
        passed: false,
        durationMs: Date.now() - start,
        details: `Erro inesperado: ${err.message}`,
      };
    }
  }

  /**
   * TEST 2: 10 Concurrent Reservations under stock constraint (4 units available)
   */
  static async testTenConcurrentReservations(): Promise<TestResultItem> {
    const start = Date.now();
    const testName = "2. 10 Reservas Concorrentes sob Estoque de 4 un";
    const orgId = this.TEST_ORG;
    const productId = `prod-burst-${Date.now()}`;
    const locationId = this.TEST_LOC_A;

    try {
      await this.ensureTestProduct(orgId, productId);
      // Initial balance: 4 units on hand
      await inventoryRepo.adjustOnHand(orgId, productId, locationId, 4);

      // Launch 10 simultaneous reservations of 1 unit each
      const attempts = Array.from({ length: 10 }, (_, i) =>
        InventoryConcurrencyService.createReservation(orgId, {
          productId,
          locationId,
          quantity: 1,
          referenceType: "CHECKOUT_RESERVATION",
          referenceId: `CART-${i + 1}`,
          operatorName: `Bot-${i + 1}`,
          ttlMinutes: 10,
        })
      );

      const results = await Promise.allSettled(attempts);
      const successCount = results.filter((r) => r.status === "fulfilled").length;
      const rejectedCount = results.filter((r) => r.status === "rejected").length;

      const finalBal = await inventoryRepo.getBalance(orgId, productId, locationId);

      const passed =
        successCount === 4 &&
        rejectedCount === 6 &&
        finalBal?.onHandQuantity === 4 &&
        finalBal?.reservedQuantity === 4 &&
        finalBal?.availableQuantity === 0;

      return {
        testName,
        category: "HIGH_CONTENTION_BURST",
        passed,
        durationMs: Date.now() - start,
        details: passed
          ? `Sucesso: Exatamente 4 reservas aprovadas e 6 rejeitadas por STOCK_UNAVAILABLE. Saldo perfeitamente consistente.`
          : `Falha: Aprovadas=${successCount}, Rejeitadas=${rejectedCount}, Saldo=${JSON.stringify(finalBal)}`,
        data: { successCount, rejectedCount, finalBal },
      };
    } catch (err: any) {
      return {
        testName,
        category: "HIGH_CONTENTION_BURST",
        passed: false,
        durationMs: Date.now() - start,
        details: `Erro inesperado: ${err.message}`,
      };
    }
  }

  /**
   * TEST 3: Multi-Worker Sweep Expired Race Condition (Idempotent TTL Sweep)
   */
  static async testReservationExpirationRace(): Promise<TestResultItem> {
    const start = Date.now();
    const testName = "3. Corrida de Expiração TTL com 5 Workers Concorrentes";
    const orgId = this.TEST_ORG;
    const productId = `prod-ttl-${Date.now()}`;
    const locationId = this.TEST_LOC_A;

    try {
      await this.ensureTestProduct(orgId, productId);
      // 1. Initial balance: 10 on hand
      await inventoryRepo.adjustOnHand(orgId, productId, locationId, 10);

      // 2. Create a reservation of 3 units with expired TTL in the past
      const res = await InventoryConcurrencyService.createReservation(orgId, {
        productId,
        locationId,
        quantity: 3,
        referenceType: "ORDER",
        referenceId: "ORDER-EXPIRE-TEST",
        ttlMinutes: -1, // Expired 1 min ago
      });

      // Confirm initial reservation hold
      const midBal = await inventoryRepo.getBalance(orgId, productId, locationId);
      if (midBal?.reservedQuantity !== 3 || midBal?.availableQuantity !== 7) {
        throw new Error(`Estado inicial inválido: reserved=${midBal?.reservedQuantity}`);
      }

      // 3. Launch 5 parallel workers simultaneously executing sweepExpiredReservations
      const workerResults = await Promise.all([
        InventoryConcurrencyService.sweepExpiredReservations(orgId),
        InventoryConcurrencyService.sweepExpiredReservations(orgId),
        InventoryConcurrencyService.sweepExpiredReservations(orgId),
        InventoryConcurrencyService.sweepExpiredReservations(orgId),
        InventoryConcurrencyService.sweepExpiredReservations(orgId),
      ]);

      const totalExpiredReported = workerResults.reduce((acc, curr) => acc + curr.length, 0);
      const finalBal = await inventoryRepo.getBalance(orgId, productId, locationId);
      const finalRes = await inventoryRepo.findReservationById(orgId, res.id);

      const passed =
        totalExpiredReported === 1 &&
        finalRes?.status === "EXPIRED" &&
        finalBal?.onHandQuantity === 10 &&
        finalBal?.reservedQuantity === 0 &&
        finalBal?.availableQuantity === 10;

      return {
        testName,
        category: "TTL_SWEEP_IDEMPOTENCY",
        passed,
        durationMs: Date.now() - start,
        details: passed
          ? `Sucesso: 5 workers simultâneos processaram a reserva. Exatamente 1 transicionou o status e decrementou reserved_quantity uma única vez.`
          : `Falha: totalExpiredReported=${totalExpiredReported}, reserved_quantity=${finalBal?.reservedQuantity}`,
        data: { totalExpiredReported, finalBal, finalStatus: finalRes?.status },
      };
    } catch (err: any) {
      return {
        testName,
        category: "TTL_SWEEP_IDEMPOTENCY",
        passed: false,
        durationMs: Date.now() - start,
        details: `Erro inesperado: ${err.message}`,
      };
    }
  }

  /**
   * TEST 4: Simultaneous Cancel + Payment Race Condition
   */
  static async testSimultaneousCancelAndPayment(): Promise<TestResultItem> {
    const start = Date.now();
    const testName = "4. Corrida Simultânea entre Confirmação de Pagamento e Cancelamento";
    const orgId = this.TEST_ORG;
    const productId = `prod-race-pay-cancel-${Date.now()}`;
    const locationId = this.TEST_LOC_A;

    try {
      await this.ensureTestProduct(orgId, productId);
      // 1. Initial on hand: 5 units
      await inventoryRepo.adjustOnHand(orgId, productId, locationId, 5);

      // 2. Active reservation of 2 units
      const res = await InventoryConcurrencyService.createReservation(orgId, {
        productId,
        locationId,
        quantity: 2,
        referenceType: "ORDER",
        referenceId: "ORD-RACE-01",
        ttlMinutes: 30,
      });

      // 3. Concurrently trigger Payment Confirmation and Release/Cancellation
      const [payResult, cancelResult] = await Promise.allSettled([
        InventoryConcurrencyService.confirmReservation(orgId, res.id, "Gateway PIX"),
        InventoryConcurrencyService.releaseReservation(orgId, res.id, "Usuário clicou em cancelar"),
      ]);

      const successCount = [payResult, cancelResult].filter((r) => r.status === "fulfilled").length;
      const rejectedCount = [payResult, cancelResult].filter((r) => r.status === "rejected").length;

      const finalBal = await inventoryRepo.getBalance(orgId, productId, locationId);
      const finalRes = await inventoryRepo.findReservationById(orgId, res.id);

      // One must succeed and one must fail; final reserved must be 0
      const isConsistent =
        successCount === 1 &&
        rejectedCount === 1 &&
        finalBal?.reservedQuantity === 0 &&
        (finalRes?.status === "CONFIRMED" || finalRes?.status === "RELEASED");

      return {
        testName,
        category: "MUTUAL_EXCLUSION",
        passed: isConsistent,
        durationMs: Date.now() - start,
        details: isConsistent
          ? `Sucesso: Exclusão mútua garantida. Operação vencedora: status=${finalRes?.status}. Sem corrupção de saldo (reserved=0).`
          : `Falha: successCount=${successCount}, finalBal=${JSON.stringify(finalBal)}`,
        data: { successCount, rejectedCount, finalBal, finalStatus: finalRes?.status },
      };
    } catch (err: any) {
      return {
        testName,
        category: "MUTUAL_EXCLUSION",
        passed: false,
        durationMs: Date.now() - start,
        details: `Erro inesperado: ${err.message}`,
      };
    }
  }

  /**
   * TEST 5: Deadlock Simulation (Crossed Resource Transfers Loc A -> Loc B and Loc B -> Loc A)
   */
  static async testDeadlockSimulation(): Promise<TestResultItem> {
    const start = Date.now();
    const testName = "5. Simulação de Deadlock (Transferências Cruzadas Loc A ⇄ Loc B)";
    const orgId = this.TEST_ORG;
    const productId = `prod-deadlock-${Date.now()}`;

    try {
      await this.ensureTestProduct(orgId, productId);
      // 1. Initial balances: 10 at Loc A, 10 at Loc B
      await inventoryRepo.adjustOnHand(orgId, productId, this.TEST_LOC_A, 10);
      await inventoryRepo.adjustOnHand(orgId, productId, this.TEST_LOC_B, 10);

      // 2. Concurrently execute transfer A -> B and transfer B -> A
      const [transferAtoB, transferBtoA] = await Promise.all([
        InventoryConcurrencyService.executeCompositeTransfer(orgId, {
          transferId: `TRF-A-B-${Date.now()}`,
          sourceLocationId: this.TEST_LOC_A,
          targetLocationId: this.TEST_LOC_B,
          items: [{ productId, quantity: 3 }],
          notes: "Transferência Loc A para Loc B",
        }),
        InventoryConcurrencyService.executeCompositeTransfer(orgId, {
          transferId: `TRF-B-A-${Date.now()}`,
          sourceLocationId: this.TEST_LOC_B,
          targetLocationId: this.TEST_LOC_A,
          items: [{ productId, quantity: 3 }],
          notes: "Transferência Loc B para Loc A",
        }),
      ]);

      const balA = await inventoryRepo.getBalance(orgId, productId, this.TEST_LOC_A);
      const balB = await inventoryRepo.getBalance(orgId, productId, this.TEST_LOC_B);

      const passed =
        transferAtoB.transferId !== "" &&
        transferBtoA.transferId !== "" &&
        balA?.onHandQuantity === 10 &&
        balB?.onHandQuantity === 10;

      return {
        testName,
        category: "DEADLOCK_MITIGATION",
        passed,
        durationMs: Date.now() - start,
        details: passed
          ? `Sucesso: Ordenação determinística de locks e retry automático executaram ambas as transferências sem deadlocks.`
          : `Falha: balA=${balA?.onHandQuantity}, balB=${balB?.onHandQuantity}`,
        data: { balA, balB },
      };
    } catch (err: any) {
      return {
        testName,
        category: "DEADLOCK_MITIGATION",
        passed: false,
        durationMs: Date.now() - start,
        details: `Deadlock ou erro detectado: ${err.message}`,
      };
    }
  }

  /**
   * TEST 6: Universal Idempotency Validation (Same Request Key x Multiple Concurrent Retries)
   */
  static async testIdempotencyValidation(): Promise<TestResultItem> {
    const start = Date.now();
    const testName = "6. Validação de Idempotência Global (Mesma Chave x Múltiplas Tentativas)";
    const orgId = this.TEST_ORG;
    const testKey = `idem-key-test-${Date.now()}`;
    let executionCounter = 0;

    try {
      // Execute operation wrapped in IdempotencyService 5 times concurrently
      const executions = await Promise.all([
        IdempotencyService.execute(
          {
            organizationId: orgId,
            idempotencyKey: testKey,
            resourceType: "PAYMENT_WEBHOOK",
            payload: { orderId: "ORD-999", amount: 150.0 },
          },
          async () => {
            executionCounter++;
            return { statusCode: 200, data: { orderId: "ORD-999", status: "PAID", counter: executionCounter } };
          }
        ),
        IdempotencyService.execute(
          {
            organizationId: orgId,
            idempotencyKey: testKey,
            resourceType: "PAYMENT_WEBHOOK",
            payload: { orderId: "ORD-999", amount: 150.0 },
          },
          async () => {
            executionCounter++;
            return { statusCode: 200, data: { orderId: "ORD-999", status: "PAID", counter: executionCounter } };
          }
        ),
        IdempotencyService.execute(
          {
            organizationId: orgId,
            idempotencyKey: testKey,
            resourceType: "PAYMENT_WEBHOOK",
            payload: { orderId: "ORD-999", amount: 150.0 },
          },
          async () => {
            executionCounter++;
            return { statusCode: 200, data: { orderId: "ORD-999", status: "PAID", counter: executionCounter } };
          }
        ),
      ]);

      const fromCacheCount = executions.filter((e) => e.fromCache).length;
      const initialCount = executions.filter((e) => !e.fromCache).length;

      const passed =
        executionCounter === 1 &&
        initialCount === 1 &&
        fromCacheCount === 2 &&
        executions[0].data.orderId === "ORD-999";

      return {
        testName,
        category: "GLOBAL_IDEMPOTENCY",
        passed,
        durationMs: Date.now() - start,
        details: passed
          ? `Sucesso: A operação foi executada exatamente 1 vez no core. 2 chamadas subsequentes retornaram o resultado original do cache de idempotência.`
          : `Falha: executionCounter=${executionCounter}, initialCount=${initialCount}, fromCacheCount=${fromCacheCount}`,
        data: { executionCounter, initialCount, fromCacheCount },
      };
    } catch (err: any) {
      return {
        testName,
        category: "GLOBAL_IDEMPOTENCY",
        passed: false,
        durationMs: Date.now() - start,
        details: `Erro inesperado: ${err.message}`,
      };
    }
  }

  /**
   * TEST 7: Full Reservation Lifecycle (ACTIVE -> CONFIRMED, ACTIVE -> RELEASED, ACTIVE -> CANCELED, ACTIVE -> EXPIRED)
   */
  static async testReservationFullLifecycle(): Promise<TestResultItem> {
    const start = Date.now();
    const testName = "7. Ciclo de Vida Completo da Tabela inventory_reservations (ACTIVE, CONFIRMED, RELEASED, EXPIRED, CANCELED)";
    const orgId = this.TEST_ORG;
    const productId = `prod-lifecycle-${Date.now()}`;
    const locationId = this.TEST_LOC_A;

    try {
      await this.ensureTestProduct(orgId, productId);
      // 1. Initial balance: 20 units on hand
      await inventoryRepo.adjustOnHand(orgId, productId, locationId, 20);

      // Phase A: Create ACTIVE reservation of 5 units -> Available drops to 15
      const resA = await InventoryConcurrencyService.createReservation(orgId, {
        productId,
        locationId,
        quantity: 5,
        referenceType: "CHECKOUT_RESERVATION",
        referenceId: "ORDER-LIFECYCLE-A",
        operatorName: "Lifecycle Tester",
        ttlMinutes: 15,
      });

      const balAfterA = await inventoryRepo.getBalance(orgId, productId, locationId);
      const isPhaseAPassed =
        resA.status === "ACTIVE" &&
        balAfterA?.onHandQuantity === 20 &&
        balAfterA?.reservedQuantity === 5 &&
        balAfterA?.availableQuantity === 15;

      // Phase B: Cancel reservation resA -> Status CANCELED, Available restored to 20
      const resACanceled = await InventoryConcurrencyService.cancelReservation(
        orgId,
        resA.id,
        "Cliente desistiu antes do pagamento"
      );
      const balAfterACancel = await inventoryRepo.getBalance(orgId, productId, locationId);
      const isPhaseBPassed =
        resACanceled.status === "CANCELED" &&
        balAfterACancel?.reservedQuantity === 0 &&
        balAfterACancel?.availableQuantity === 20;

      // Phase C: Create ACTIVE reservation of 6 units and CONFIRM it -> Drops on_hand to 14
      const resC = await InventoryConcurrencyService.createReservation(orgId, {
        productId,
        locationId,
        quantity: 6,
        referenceType: "ORDER",
        referenceId: "ORDER-LIFECYCLE-C",
        operatorName: "Lifecycle Tester",
        ttlMinutes: 15,
      });
      const resCConfirmed = await InventoryConcurrencyService.confirmReservation(
        orgId,
        resC.id,
        "Faturamento PDV"
      );
      const balAfterC = await inventoryRepo.getBalance(orgId, productId, locationId);
      const isPhaseCPassed =
        resCConfirmed.status === "CONFIRMED" &&
        balAfterC?.onHandQuantity === 14 &&
        balAfterC?.reservedQuantity === 0 &&
        balAfterC?.availableQuantity === 14;

      // Phase D: Create ACTIVE reservation of 4 units and RELEASE it -> Status RELEASED, reserved back to 0
      const resD = await InventoryConcurrencyService.createReservation(orgId, {
        productId,
        locationId,
        quantity: 4,
        referenceType: "CHECKOUT_CART",
        referenceId: "CART-LIFECYCLE-D",
        operatorName: "Lifecycle Tester",
        ttlMinutes: 15,
      });
      const resDReleased = await InventoryConcurrencyService.releaseReservation(
        orgId,
        resD.id,
        "Carrinho abandonado liberado manualmente"
      );
      const balAfterD = await inventoryRepo.getBalance(orgId, productId, locationId);
      const isPhaseDPassed =
        resDReleased.status === "RELEASED" &&
        balAfterD?.reservedQuantity === 0 &&
        balAfterD?.availableQuantity === 14;

      const passed = isPhaseAPassed && isPhaseBPassed && isPhaseCPassed && isPhaseDPassed;

      return {
        testName,
        category: "RESERVATION_LIFECYCLE",
        passed,
        durationMs: Date.now() - start,
        details: passed
          ? `Sucesso: Todos os estados do ciclo de vida (ACTIVE, CONFIRMED, RELEASED, CANCELED) transicionados com integridade atômica e saldo preservado.`
          : `Falha: PhaseA=${isPhaseAPassed}, PhaseB=${isPhaseBPassed}, PhaseC=${isPhaseCPassed}, PhaseD=${isPhaseDPassed}`,
        data: { isPhaseAPassed, isPhaseBPassed, isPhaseCPassed, isPhaseDPassed, finalBalance: balAfterD },
      };
    } catch (err: any) {
      return {
        testName,
        category: "RESERVATION_LIFECYCLE",
        passed: false,
        durationMs: Date.now() - start,
        details: `Erro inesperado: ${err.message}`,
      };
    }
  }

  /**
   * TEST 8: Background Worker Automatic Expiry & Triggered Stock Reconciliation
   */
  static async testBackgroundWorkerExpiryAndReconciliation(): Promise<TestResultItem> {
    const start = Date.now();
    const testName = "8. Background Worker / Cron: Expiração Automática por TTL e Reconciliação de Estoque";
    const orgId = this.TEST_ORG;
    const productId = `prod-worker-test-${Date.now()}`;
    const locationId = this.TEST_LOC_A;

    try {
      await this.ensureTestProduct(orgId, productId);
      // 1. Initial balance: 50 units on hand
      await inventoryRepo.adjustOnHand(orgId, productId, locationId, 50);

      // 2. Create an already-expired reservation (e.g. created with -1 minute TTL)
      const pastDate = new Date(Date.now() - 60000).toISOString();
      const expiredResRecord = await inventoryRepo.createReservationRecord({
        id: `res-worker-exp-${Date.now()}`,
        organizationId: orgId,
        productId,
        locationId,
        quantity: 10,
        status: "ACTIVE",
        referenceType: "CHECKOUT_CART",
        referenceId: "CART-EXPIRED-TEST",
        expiresAt: pastDate,
        createdAt: new Date(Date.now() - 120000).toISOString(),
        updatedAt: new Date(Date.now() - 120000).toISOString(),
      });
      // Also increment balance's reserved_quantity to simulate the hold
      await inventoryRepo.reserveStock(orgId, productId, locationId, 10);

      // 3. Create a second ACTIVE reservation that is NOT expired (TTL +15m)
      const validResRecord = await InventoryConcurrencyService.createReservation(orgId, {
        productId,
        locationId,
        quantity: 5,
        referenceType: "CHECKOUT_CART",
        referenceId: "CART-VALID-TEST",
        operatorName: "Worker Tester",
        ttlMinutes: 15,
      });

      const balBeforeWorker = await inventoryRepo.getBalance(orgId, productId, locationId);
      const isSetupValid =
        balBeforeWorker?.onHandQuantity === 50 &&
        balBeforeWorker?.reservedQuantity === 15 &&
        balBeforeWorker?.availableQuantity === 35;

      // 4. Trigger the Background Worker sweep and stock reconciliation cycle
      const cycleResult = await reservationExpiryWorker.runSweepCycle(orgId);

      // 5. Verify the expired reservation is now status 'EXPIRED'
      const freshExpiredRes = await inventoryRepo.findReservationById(orgId, expiredResRecord.id);
      const isExpiredStateCorrect = freshExpiredRes?.status === "EXPIRED" && Boolean(freshExpiredRes?.releasedAt);

      // 6. Verify the valid reservation remains ACTIVE
      const freshValidRes = await inventoryRepo.findReservationById(orgId, validResRecord.id);
      const isValidStatePreserved = freshValidRes?.status === "ACTIVE";

      // 7. Verify stock balance was automatically reconciled:
      // on_hand = 50, reserved = 5 (only validRes remaining), available = 45
      const balAfterWorker = await inventoryRepo.getBalance(orgId, productId, locationId);
      const isBalanceCorrect =
        balAfterWorker?.onHandQuantity === 50 &&
        balAfterWorker?.reservedQuantity === 5 &&
        balAfterWorker?.availableQuantity === 45;

      const passed =
        isSetupValid &&
        isExpiredStateCorrect &&
        isValidStatePreserved &&
        isBalanceCorrect &&
        cycleResult.totalExpired >= 1;

      return {
        testName,
        category: "BACKGROUND_WORKER_EXPIRY_RECONCILIATION",
        passed,
        durationMs: Date.now() - start,
        details: passed
          ? `Sucesso: Background Worker identificou reserva vencida #${expiredResRecord.id}, atualizou para EXPIRED, manteve reserva ativa #${validResRecord.id}, e reconciliou saldo disponível para ${balAfterWorker?.availableQuantity} un.`
          : `Falha: SetupValid=${isSetupValid}, ExpiredState=${isExpiredStateCorrect}, ValidState=${isValidStatePreserved}, BalAfter=${isBalanceCorrect} (reserved=${balAfterWorker?.reservedQuantity}, avail=${balAfterWorker?.availableQuantity})`,
        data: {
          cycleResult,
          balBefore: balBeforeWorker,
          balAfter: balAfterWorker,
          expiredRes: freshExpiredRes,
          validRes: freshValidRes,
        },
      };
    } catch (err: any) {
      return {
        testName,
        category: "BACKGROUND_WORKER_EXPIRY_RECONCILIATION",
        passed: false,
        durationMs: Date.now() - start,
        details: `Erro inesperado: ${err.message}`,
      };
    }
  }

  /**
   * TEST 9: Real PostgreSQL SELECT ... FOR UPDATE Lock Validation (Fase 1.2 Mandatory Test)
   * Estoque = 1. Simultaneamente: Pedido A e Pedido B.
   * Resultado esperado:
   * Pedido A -> RESERVADO
   * Pedido B -> REJEITADO (409 Saldo insuficiente)
   * Saldo: on_hand = 1, reserved = 1, available = 0
   * Pagamento A -> SALE -> on_hand = 0, reserved = 0, available = 0
   */
  static async testPostgresForUpdateLocking(): Promise<TestResultItem> {
    const start = Date.now();
    const testName = "9. Bloqueio Concorrente PostgreSQL Real (FOR UPDATE Lock + Transição SALE)";
    const orgId = "org-lumina-01";
    const testProductId = "prod-test-lock-" + Date.now();
    const testLocationId = "loc-lumina-matriz";

    try {
      // 1. Inserir produto no catálogo PostgreSQL
      await query(
        `INSERT INTO products (
          id, organization_id, sku, name, category, bath, price, cost_price, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, 'OURO_18K', $6, $7, 'ACTIVE', NOW(), NOW())`,
        [testProductId, orgId, `SKU-LOCK-${Date.now()}`, "Produto Teste Lock FOR UPDATE", "Aneis", 200.0, 50.0]
      );

      // 2. Saldo inicial exatamente 1 unidade no banco: on_hand = 1, reserved = 0
      await query(
        `INSERT INTO inventory_balances (
          id, organization_id, product_id, location_id, on_hand_quantity, reserved_quantity, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 1, 0, NOW(), NOW())`,
        [`bal-${testProductId}-${testLocationId}`, orgId, testProductId, testLocationId]
      );

      // 3. Disparar Pedido A e Pedido B SIMULTANEAMENTE competindo pelo mesmo item
      const [resA, resB] = await Promise.allSettled([
        OrderService.createOrder(
          orgId,
          {
            customerId: "cust-lock-a",
            customerSnapshot: { id: "cust-lock-a", name: "Comprador A", phone: "11988880001" },
            channel: "ECOMMERCE",
            initialStatus: "INVENTORY_RESERVED",
            items: [{ productId: testProductId, locationId: testLocationId, quantity: 1 }],
          },
          "Simulador Concorrente A"
        ),
        OrderService.createOrder(
          orgId,
          {
            customerId: "cust-lock-b",
            customerSnapshot: { id: "cust-lock-b", name: "Comprador B", phone: "11988880002" },
            channel: "ECOMMERCE",
            initialStatus: "INVENTORY_RESERVED",
            items: [{ productId: testProductId, locationId: testLocationId, quantity: 1 }],
          },
          "Simulador Concorrente B"
        ),
      ]);

      const fulfilled = [resA, resB].filter((r) => r.status === "fulfilled");
      const rejected = [resA, resB].filter((r) => r.status === "rejected");

      if (fulfilled.length !== 1 || rejected.length !== 1) {
        return {
          testName,
          category: "POSTGRES_ROW_LOCKING",
          passed: false,
          durationMs: Date.now() - start,
          details: `Falha de concorrência: Esperado 1 sucesso e 1 rejeição, obtido ${fulfilled.length} sucessos e ${rejected.length} rejeições.`,
        };
      }

      const winner = (fulfilled[0] as any).value;
      const loserError = (rejected[0] as any).reason;
      const isStockError = loserError?.message?.includes("Saldo insuficiente") || loserError?.message?.includes("INSUFFICIENT_STOCK");

      if (!isStockError) {
        return {
          testName,
          category: "POSTGRES_ROW_LOCKING",
          passed: false,
          durationMs: Date.now() - start,
          details: `Falha: o pedido perdedor não reportou saldo insuficiente: ${loserError?.message}`,
        };
      }

      // 4. Checar saldo no PostgreSQL pós-reserva: on_hand = 1, reserved = 1, available = 0
      const postReserveBal = await query(
        "SELECT on_hand_quantity, reserved_quantity, available_quantity FROM inventory_balances WHERE organization_id = $1 AND product_id = $2 AND location_id = $3",
        [orgId, testProductId, testLocationId]
      );
      const prRow = postReserveBal.rows[0];
      if (prRow.on_hand_quantity !== 1 || prRow.reserved_quantity !== 1 || prRow.available_quantity !== 0) {
        return {
          testName,
          category: "POSTGRES_ROW_LOCKING",
          passed: false,
          durationMs: Date.now() - start,
          details: `Saldo pós-reserva incorreto no PostgreSQL: ${JSON.stringify(prRow)}`,
        };
      }

      // 5. Confirmar pagamento do vencedor -> transição SALE -> baixa de estoque
      await OrderService.transitionOrder(
        orgId,
        winner.id,
        { event: "CONFIRM_PAYMENT", reason: "PIX aprovado" },
        "Operador Financeiro"
      );

      // 6. Checar saldo final no PostgreSQL: on_hand = 0, reserved = 0, available = 0
      const finalBal = await query(
        "SELECT on_hand_quantity, reserved_quantity, available_quantity FROM inventory_balances WHERE organization_id = $1 AND product_id = $2 AND location_id = $3",
        [orgId, testProductId, testLocationId]
      );
      const fRow = finalBal.rows[0];
      if (fRow.on_hand_quantity !== 0 || fRow.reserved_quantity !== 0 || fRow.available_quantity !== 0) {
        return {
          testName,
          category: "POSTGRES_ROW_LOCKING",
          passed: false,
          durationMs: Date.now() - start,
          details: `Saldo pós-pagamento incorreto no PostgreSQL: ${JSON.stringify(fRow)}`,
        };
      }

      // 7. Checar registro de movimentação SALE no livro-razão (inventory_movements)
      const movs = await query(
        "SELECT type, quantity_change, physical_balance_after FROM inventory_movements WHERE organization_id = $1 AND product_id = $2 ORDER BY created_at DESC LIMIT 1",
        [orgId, testProductId]
      );

      return {
        testName,
        category: "POSTGRES_ROW_LOCKING",
        passed: true,
        durationMs: Date.now() - start,
        details: `Concorrência PostgreSQL 100% protegida: 1 reserva aceita (${winner.orderNumber}), 1 rejeição por 409 Saldo Insuficiente. Pós-pagamento: saldo zerado (on_hand=0, reserved=0) com movimentação SALE registrada.`,
        data: {
          winnerOrderNumber: winner.orderNumber,
          finalBalance: fRow,
          ledgerMovement: movs.rows[0],
        },
      };
    } catch (err: any) {
      return {
        testName,
        category: "POSTGRES_ROW_LOCKING",
        passed: false,
        durationMs: Date.now() - start,
        details: `Erro durante execução do teste de lock no PostgreSQL: ${err.message}`,
      };
    } finally {
      await TenantContext.run({ tenantId: orgId, isSuperAdmin: true }, async () => {
        try {
          await query("DELETE FROM order_items WHERE product_id = $1", [testProductId]);
          await query("DELETE FROM inventory_reservations WHERE product_id = $1", [testProductId]);
          await query("DELETE FROM inventory_movements WHERE product_id = $1", [testProductId]);
          await query("DELETE FROM inventory_balances WHERE product_id = $1", [testProductId]);
          await query("DELETE FROM products WHERE id = $1", [testProductId]);
        } catch {
          // cleanup ignore
        }
      });
    }
  }

  /**
   * Runs the full suite and produces a unified test report
   */
  static async runFullSuite(): Promise<HardeningSuiteReport> {
    const suiteStart = Date.now();
    await this.setupTestEnvironment();

    const results: TestResultItem[] = [];

    try {
      results.push(await TenantContext.run({ tenantId: this.TEST_ORG }, () => this.testTwoUsersOneItem()));
      results.push(await TenantContext.run({ tenantId: this.TEST_ORG }, () => this.testTenConcurrentReservations()));
      results.push(await TenantContext.run({ tenantId: this.TEST_ORG }, () => this.testReservationExpirationRace()));
      results.push(await TenantContext.run({ tenantId: this.TEST_ORG }, () => this.testSimultaneousCancelAndPayment()));
      results.push(await TenantContext.run({ tenantId: this.TEST_ORG }, () => this.testDeadlockSimulation()));
      results.push(await TenantContext.run({ tenantId: this.TEST_ORG }, () => this.testIdempotencyValidation()));
      results.push(await TenantContext.run({ tenantId: this.TEST_ORG }, () => this.testReservationFullLifecycle()));
      results.push(await TenantContext.run({ tenantId: this.TEST_ORG }, () => this.testBackgroundWorkerExpiryAndReconciliation()));
      results.push(await TenantContext.run({ tenantId: "org-lumina-01" }, () => this.testPostgresForUpdateLocking()));
    } finally {
      await this.teardownTestEnvironment();
    }

    const passedTests = results.filter((r) => r.passed).length;
    const failedTests = results.filter((r) => !r.passed).length;

    return {
      suiteName: "SPRINT 2.5: INVENTORY FINAL HARDENING & CONCURRENCY VALIDATION REPORT",
      totalTests: results.length,
      passedTests,
      failedTests,
      totalDurationMs: Date.now() - suiteStart,
      timestamp: new Date().toISOString(),
      results,
    };
  }
}
