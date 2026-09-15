import { UnitOfWork, TransactionContext } from "../../db/transaction";
import { query } from "../../db/postgres";
import {
  OrderEntity,
  OrderItemEntity,
  OrderPaymentEntity,
  OrderStateTransitionEntity,
  OrderStatus,
  OrderEvent,
  CreateOrderDTO,
  OrderTransitionDTO,
  OrderFilterQuery,
  CreateOrderPaymentDTO,
  ReturnOrderItemsDTO,
  RefundOrderPaymentDTO,
  ProductSnapshot,
  OrderCustomerSnapshot,
} from "./order.types";
import { OrderRepository } from "./order.repository";
import { OrderStateMachine } from "./order.state-machine";
import { inventoryRepo } from "../inventory/inventory.repository";
import { auditService } from "../../services/auditService";
import { productRepo } from "../products/product.repository";
import { CustomerService } from "../customers/customer.service";
import { userRepo, orgRepo } from "../../repositories";

export class OrderService {
  /**
   * Helper to format sequential order numbers (e.g. ORD-2026-0001)
   */
  private static async generateOrderNumber(organizationId: string, tx?: TransactionContext): Promise<string> {
    const year = new Date().getFullYear();
    const queryFn = tx?.pgClient ? tx.pgClient.query.bind(tx.pgClient) : query;
    try {
      const res = await queryFn(
        "SELECT COUNT(*) as total FROM orders WHERE organization_id = $1",
        [organizationId]
      );
      const count = parseInt(res.rows[0]?.total || "0", 10) + 1;
      const padded = String(count).padStart(4, "0");
      const rand = Math.floor(1000 + Math.random() * 9000);
      return `ORD-${year}-${padded}-${rand}`;
    } catch {
      const rand = Math.floor(1000 + Math.random() * 9000);
      return `ORD-${year}-${Date.now().toString().slice(-4)}-${rand}`;
    }
  }

  /**
   * Helper to generate a Digital Warranty Code (e.g. GRT-8F2A9D)
   */
  private static generateWarrantyCode(): string {
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `GRT-${randomHex}`;
  }

  /**
   * Helper to generate simulated PIX payload and QR Code
   */
  private static generatePixPayload(amount: number, orderNumber: string, orgName?: string, city?: string) {
    const sanitizedOrg = (orgName || "Loja Semijoias").substring(0, 25).replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "+");
    const sanitizedCity = (city || "SAO PAULO").toUpperCase().substring(0, 15).replace(/[^A-Z ]/g, "");
    const pixCode = `00020126580014br.gov.bcb.pix0136pix-${orderNumber}5204000053039865802BR5925${sanitizedOrg}6009${sanitizedCity}62070503***6304${Math.random().toString(16).substring(2, 6).toUpperCase()}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixCode)}`;
    return { pixCode, qrUrl };
  }

  /**
   * List orders for an organization with full multi-criteria filtering
   */
  static async listOrders(
    organizationId: string,
    filter: OrderFilterQuery = {}
  ): Promise<{ orders: OrderEntity[]; total: number }> {
    const allOrders = await OrderRepository.listAsync(organizationId, filter);
    const hydratedOrders = await Promise.all(allOrders.map((ord) => this.hydrateOrderAsync(ord)));

    const total = hydratedOrders.length;
    const offset = filter.offset || 0;
    const limit = filter.limit || 100;
    const paginated = hydratedOrders.slice(offset, offset + limit);

    return { orders: paginated, total };
  }

  /**
   * Get single order by ID with full hydration
   */
  static async getOrderById(
    organizationId: string,
    orderId: string
  ): Promise<OrderEntity | null> {
    const order = await OrderRepository.findByIdAsync(organizationId, orderId);
    if (!order) {
      return null;
    }
    return this.hydrateOrderAsync(order);
  }

  /**
   * Helper to hydrate order relationships (Items, Payments, FSM Transitions)
   */
  private static async hydrateOrderAsync(order: OrderEntity, tx?: TransactionContext): Promise<OrderEntity> {
    const [items, payments, transitions] = await Promise.all([
      OrderRepository.getItemsByOrderIdAsync(order.organizationId, order.id, tx),
      OrderRepository.getPaymentsByOrderIdAsync(order.organizationId, order.id, tx),
      OrderRepository.getTransitionsByOrderIdAsync(order.organizationId, order.id, tx),
    ]);

    return {
      ...order,
      items,
      payments,
      transitions,
    };
  }

  private static hydrateOrder(order: OrderEntity, tx?: TransactionContext): OrderEntity {
    const items = OrderRepository.getItemsByOrderId(order.organizationId, order.id, tx);
    const payments = OrderRepository.getPaymentsByOrderId(order.organizationId, order.id, tx);
    const transitions = OrderRepository.getTransitionsByOrderId(order.organizationId, order.id, tx);

    return {
      ...order,
      items,
      payments,
      transitions,
    };
  }

  /**
   * ============================================================================
   * 🏛️ ATOMIC TRANSACTION: CREATE ORDER + ITEMS + SNAPSHOTS + INVENTORY + AUDIT
   * ============================================================================
   */
  static async createOrder(
    organizationId: string,
    dto: CreateOrderDTO,
    operatorName: string = "Sistema de Vendas",
    userId?: string
  ): Promise<OrderEntity> {
    if (dto.idempotencyKey) {
      const existingIdempotent = await OrderRepository.findByIdempotencyKey(organizationId, dto.idempotencyKey);
      if (existingIdempotent) {
        return await this.hydrateOrderAsync(existingIdempotent);
      }
    }

    return await UnitOfWork.transaction(organizationId, async (tx: TransactionContext) => {
      // Fetch organization details to ensure tenant-accurate defaults
      const org = await orgRepo.findById(organizationId);

      // 1. Resolve Customer Snapshot (Frozen at order time)
      let customerId = dto.customerId;
      let existingCustomer: any = null;

      if (customerId) {
        try {
          existingCustomer = await CustomerService.getCustomerById(organizationId, customerId);
        } catch {
          // not found by id
        }
      }

      const inputSnap = (dto as any).customerSnapshot || (dto as any).customer;
      if (!existingCustomer && inputSnap) {
        const doc = inputSnap.document || inputSnap.cpf || "";
        const phone = inputSnap.phone || inputSnap.whatsapp || "";
        const email = inputSnap.email || "";

        if (doc || phone || email) {
          try {
            const foundCust = await query(
              `SELECT * FROM customers WHERE organization_id = $1 AND (
                ($2 <> '' AND (cpf = $2 OR document = $2)) OR
                ($3 <> '' AND (primary_phone = $3 OR whatsapp = $3)) OR
                ($4 <> '' AND primary_email = $4)
              ) LIMIT 1`,
              [organizationId, doc, phone, email]
            );
            if (foundCust.rows.length > 0) {
              existingCustomer = foundCust.rows[0];
              customerId = existingCustomer.id;
            }
          } catch {
            // Ignore query error and proceed to auto-provision
          }
        }
      }

      // If customer doesn't exist in DB, auto-create to fulfill foreign key constraint
      if (!existingCustomer) {
        customerId = customerId || `cust-buyer-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const custName = inputSnap?.name || "Cliente Storefront";
        const custDoc = inputSnap?.document || inputSnap?.cpf || null;
        const orgSlug = org?.slug || organizationId.toLowerCase().replace(/[^a-z0-9]/g, "-");
        const custEmail = inputSnap?.email || `${customerId}@cliente.${orgSlug}.com.br`;
        const custPhone = inputSnap?.phone || inputSnap?.whatsapp || org?.contactWhatsapp || "";

        try {
          await query(
            `INSERT INTO customers (
              id, organization_id, person_type, name, document, email, phone, full_name, cpf,
              primary_email, primary_phone, whatsapp, status, customer_tier, notes, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
            ON CONFLICT (id) DO NOTHING`,
            [
              customerId,
              organizationId,
              inputSnap?.personType || "PF",
              custName,
              custDoc,
              custEmail,
              custPhone,
              custName,
              custDoc,
              custEmail,
              custPhone,
              custPhone,
              "ACTIVE",
              "STANDARD",
              `Origem automática via checkout ${dto.channel || "ECOMMERCE"}`,
            ]
          );
        } catch (insertErr: any) {
          console.error("CUSTOMER INSERT FAILED:", insertErr);
          // If conflict on organization_id + cpf, select that customer
          if (custDoc) {
            const fallbackCust = await query(
              "SELECT * FROM customers WHERE organization_id = $1 AND (cpf = $2 OR document = $2) LIMIT 1",
              [organizationId, custDoc]
            );
            if (fallbackCust.rows.length > 0) {
              customerId = fallbackCust.rows[0].id;
              existingCustomer = fallbackCust.rows[0];
            }
          }
        }

        if (!existingCustomer) {
          existingCustomer = {
            id: customerId,
            personType: inputSnap?.personType || "PF",
            fullName: custName,
            cpf: custDoc,
            primaryEmail: custEmail,
            primaryPhone: custPhone,
            whatsapp: custPhone,
          };
        }
      }

      const orgSlug = org?.slug || organizationId.toLowerCase().replace(/[^a-z0-9]/g, "-");
      const customerSnapshot: OrderCustomerSnapshot = {
        id: customerId!,
        personType: (existingCustomer.personType || "PF") as "PF" | "PJ",
        name: existingCustomer.fullName || existingCustomer.tradeName || existingCustomer.companyName || inputSnap?.name || "Cliente Storefront",
        document: existingCustomer.cpf || existingCustomer.cnpj || existingCustomer.document || inputSnap?.document || "***.***.***-**",
        email: existingCustomer.primaryEmail || inputSnap?.email || `contato@cliente.${orgSlug}.com.br`,
        phone: existingCustomer.primaryPhone || existingCustomer.whatsapp || inputSnap?.phone || org?.contactWhatsapp || "",
        stateRegistration: existingCustomer.stateRegistration,
      };

      // 2. Resolve Shipping Address (Derived dynamically from customer or tenant organization)
      let shippingAddress = {
        recipientName: customerSnapshot.name,
        zipCode: "",
        street: "Endereço de Entrega",
        number: "S/N",
        complement: "",
        neighborhood: "Centro",
        city: org?.city || "São Paulo",
        state: org?.state || "SP",
        country: "BRA",
        phone: customerSnapshot.phone,
        referencePoint: "",
      };

      if (dto.shippingAddress) {
        shippingAddress = {
          ...shippingAddress,
          ...dto.shippingAddress,
          recipientName: dto.shippingAddress.recipientName || customerSnapshot.name,
        };
      } else if (existingCustomer?.addresses?.length) {
        const defaultAddr = existingCustomer.addresses.find((a: any) => a.isDefault) || existingCustomer.addresses[0];
        if (defaultAddr) {
          shippingAddress = {
            recipientName: defaultAddr.recipientName || customerSnapshot.name,
            zipCode: defaultAddr.zipCode,
            street: defaultAddr.street,
            number: defaultAddr.number,
            complement: defaultAddr.complement || "",
            neighborhood: defaultAddr.neighborhood,
            city: defaultAddr.city,
            state: defaultAddr.state,
            country: defaultAddr.country || "BRA",
            phone: customerSnapshot.phone,
            referencePoint: defaultAddr.referencePoint || "",
          };
        }
      }

      // 3. Resolve Order Items & Freeze Immutable Product Snapshots
      const orderId = `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const orderNumber = await this.generateOrderNumber(organizationId, tx);
      const nowIso = new Date().toISOString();

      let subtotalAmount = 0;
      const itemsEntities: OrderItemEntity[] = [];

      // Resolve default inventory location dynamically for tenant
      const orgLocations = await inventoryRepo.listLocations(organizationId);
      let defaultLoc = orgLocations.find((l) => l.type === "HEADQUARTERS" || l.code === "MATRIZ") || orgLocations[0];
      if (!defaultLoc) {
        try {
          defaultLoc = await inventoryRepo.createLocation({
            id: `loc-${organizationId}-matriz`,
            organizationId,
            name: "Estoque Matriz",
            code: "MATRIZ",
            type: "HEADQUARTERS",
            isActive: true,
            createdAt: new Date().toISOString(),
          });
        } catch {
          // If already exists or error, fetch again
          const refetched = await inventoryRepo.listLocations(organizationId);
          defaultLoc = refetched[0];
        }
      }
      const defaultLocationId = defaultLoc?.id || `loc-${organizationId}-default`;

      for (const itemDto of dto.items) {
        let prod = await productRepo.findById(organizationId, itemDto.productId);
        if (!prod && (itemDto as any).sku) {
          prod = await productRepo.findBySku(organizationId, (itemDto as any).sku);
        }
        if (!prod) {
          const allProds = await productRepo.listByOrg(organizationId);
          prod = allProds.find(
            (p) =>
              p.id === itemDto.productId ||
              ((itemDto as any).sku && p.sku.toUpperCase() === String((itemDto as any).sku).toUpperCase()) ||
              ((itemDto as any).name && p.name.toLowerCase() === String((itemDto as any).name).toLowerCase())
          ) || null;
        }

        if (!prod || prod.organizationId !== organizationId) {
          throw new Error(`Produto ${itemDto.productId} não encontrado no catálogo da organização.`);
        }

        const unitPrice = itemDto.unitPrice !== undefined ? itemDto.unitPrice : (prod.promoPrice || prod.price);
        const discount = itemDto.discountAmount || 0;
        const itemTotal = (unitPrice * itemDto.quantity) - discount;
        subtotalAmount += itemTotal;

        const productSnapshot: ProductSnapshot = {
          productId: prod.id,
          sku: prod.sku,
          name: prod.name,
          category: prod.category,
          collection: prod.collection,
          material: prod.material,
          bath: prod.bath,
          stones: [...prod.stones],
          price: prod.price,
          costPrice: prod.costPrice,
          promoPrice: prod.promoPrice,
          warrantyMonths: prod.warrantyMonths,
          isCustomizable: prod.isCustomizable,
          imageUrl: prod.imageUrl,
          description: prod.description,
          snapshotTimestamp: nowIso,
        };

        const itemEntity: OrderItemEntity = {
          id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          organizationId,
          orderId,
          productId: prod.id,
          locationId: itemDto.locationId || defaultLocationId,
          productSnapshot,
          quantity: itemDto.quantity,
          returnedQuantity: 0,
          unitPrice,
          costPriceSnapshot: prod.costPrice,
          discountAmount: discount,
          totalAmount: itemTotal,
          customizationSpec: itemDto.customizationSpec,
          createdAt: nowIso,
        };

        itemsEntities.push(itemEntity);
      }

      const discountAmount = dto.discountAmount || 0;
      const shippingAmount = dto.shippingAmount || 0;
      const totalAmount = Math.max(0, subtotalAmount + shippingAmount - discountAmount);

      // 4. Resolve Reseller Commission
      let resellerName: string | undefined;
      let resellerCommissionRate = dto.resellerCommissionRate;
      let resellerCommissionAmount: number | undefined;

      if (dto.resellerId) {
        const reseller = await userRepo.findById(dto.resellerId);
        if (reseller) {
          resellerName = reseller.name;
        }
        if (resellerCommissionRate === undefined) {
          resellerCommissionRate = 25; // Default 25%
        }
        resellerCommissionAmount = (totalAmount * resellerCommissionRate) / 100;
      }

      const initialStatus: OrderStatus = dto.initialStatus || (dto as any).status || "DRAFT";

      // 5. Stage Main Order Entity
      const orderEntity: OrderEntity = {
        id: orderId,
        organizationId,
        orderNumber,
        customerId: customerSnapshot.id,
        customerSnapshot,
        channel: dto.channel || "PRESENTIAL_POS",
        status: initialStatus,
        paymentStatus: "PENDING",
        shippingAddress,
        currency: "BRL",
        subtotalAmount,
        discountAmount,
        shippingAmount,
        totalAmount,
        refundedTotalAmount: 0,
        resellerId: dto.resellerId,
        resellerName,
        resellerCommissionRate,
        resellerCommissionAmount,
        warrantyCode: (dto as any).warrantyCode || `GRT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        externalReference: dto.externalReference,
        metadata: dto.metadata,
        idempotencyKey: dto.idempotencyKey,
        createdBy: dto.createdBy || operatorName,
        operatorName: operatorName,
        notes: dto.notes,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      OrderRepository.saveOrder(orderEntity, tx);
      OrderRepository.saveOrderItems(itemsEntities, tx);

      // 6. Record Initial State Transition (SUBMIT_ORDER)
      const initTransition: OrderStateTransitionEntity = {
        id: `trans-${Date.now()}-init`,
        organizationId,
        orderId,
        fromStatus: "DRAFT",
        toStatus: initialStatus,
        event: "SUBMIT_ORDER",
        operatorName,
        reason: `Pedido ${orderNumber} criado via canal ${dto.channel}.`,
        createdAt: nowIso,
      };
      OrderRepository.saveTransition(initTransition, tx);

      // 7. Atomic Inventory Reservation within Shared Transaction Context
      if (initialStatus === "INVENTORY_RESERVED" || initialStatus === "AWAITING_PAYMENT") {
        for (const item of itemsEntities) {
          await inventoryRepo.reserveStock(
            organizationId,
            item.productId,
            item.locationId,
            item.quantity,
            tx
          );

          const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min TTL
          await inventoryRepo.createReservationRecord(
            {
              id: `res-${Date.now()}-${item.id}`,
              organizationId,
              productId: item.productId,
              locationId: item.locationId,
              quantity: item.quantity,
              status: "ACTIVE",
              referenceType: "ORDER",
              referenceId: orderNumber,
              idempotencyKey: dto.idempotencyKey ? `${dto.idempotencyKey}_${item.id}` : undefined,
              expiresAt,
              operatorName,
              notes: `Reserva atômica de pedido #${orderNumber} para ${item.quantity} un de ${item.productSnapshot.name}`,
              createdAt: nowIso,
              updatedAt: nowIso,
            },
            tx
          );
        }
      }

      // 8. Process Initial Payments if provided
      if (dto.payments && dto.payments.length > 0) {
        for (const payDto of dto.payments) {
          await this.addOrderPaymentTransactional(organizationId, orderEntity, payDto, operatorName, tx);
        }
      }

      // 9. Stage Audit Log
      await auditService.logAction(
        organizationId,
        userId,
        "ORDER_CREATED",
        "ORDER",
        orderId,
        "127.0.0.1",
        operatorName,
        `Pedido #${orderNumber} criado com sucesso (Total: R$ ${totalAmount.toFixed(2)}, Canal: ${dto.channel}).`,
        { orderId, orderNumber, itemsCount: itemsEntities.length, totalAmount, initialStatus }
      );

      return this.hydrateOrder(orderEntity, tx);
    });
  }

  /**
   * Helper to add a payment within a transactional context
   */
  private static async addOrderPaymentTransactional(
    organizationId: string,
    order: OrderEntity,
    dto: CreateOrderPaymentDTO,
    operatorName: string,
    tx: TransactionContext
  ): Promise<OrderPaymentEntity> {
    const nowIso = new Date().toISOString();
    const gateway = dto.gateway || (dto.paymentMethod === "PIX" ? "MERCADOPAGO" : "MANUAL");

    let pixQrCodeUrl: string | undefined;
    let pixCopyPaste: string | undefined;
    let pixExpiration: string | undefined;

    if (dto.paymentMethod === "PIX") {
      const org = await orgRepo.findById(organizationId);
      const pix = this.generatePixPayload(dto.amount, order.orderNumber, org?.name, org?.city);
      pixQrCodeUrl = pix.qrUrl;
      pixCopyPaste = dto.pixCopyPaste || pix.pixCode;
      const exp = new Date();
      exp.setMinutes(exp.getMinutes() + 30); // 30 min PIX TTL
      pixExpiration = exp.toISOString();
    }

    let boletoBarcode: string | undefined;
    if (dto.paymentMethod === "BOLETO") {
      boletoBarcode = `34191.79001 01043.510047 91020.150008 8 ${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    }

    const paymentEntity: OrderPaymentEntity = {
      id: `pay-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      organizationId,
      orderId: order.id,
      paymentMethod: dto.paymentMethod,
      gateway,
      gatewayTransactionId: `${gateway.toLowerCase()}_tx_${Date.now()}`,
      status: "PENDING",
      amount: dto.amount,
      refundedAmount: 0,
      installments: dto.installments || 1,
      pixQrCode: dto.pixQrCode || pixCopyPaste,
      pixQrCodeUrl,
      pixCopyPaste,
      pixExpiration,
      boletoBarcode,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    OrderRepository.savePayment(paymentEntity, tx);
    return paymentEntity;
  }

  /**
   * Add a Payment to an Order (Public API)
   */
  static async addOrderPayment(
    organizationId: string,
    orderId: string,
    dto: CreateOrderPaymentDTO,
    operatorName: string = "Operador Financeiro"
  ): Promise<OrderPaymentEntity> {
    return await UnitOfWork.transaction(organizationId, async (tx: TransactionContext) => {
      const order = await OrderRepository.findByIdAsync(organizationId, orderId, tx);
      if (!order) {
        throw new Error("Pedido não encontrado.");
      }

      const payment = await this.addOrderPaymentTransactional(organizationId, order, dto, operatorName, tx);

      if (order.status === "DRAFT" || order.status === "INVENTORY_RESERVED" || order.status === "PENDING_CONFIRMATION") {
        await this.transitionOrderTransactional(organizationId, orderId, {
          event: "REQUEST_PAYMENT",
          operatorName,
          reason: `Cobrança de ${dto.paymentMethod} (R$ ${dto.amount.toFixed(2)}) gerada com sucesso.`,
        }, tx);
      }

      return payment;
    });
  }

  /**
   * ============================================================================
   * 📦 DEVOLUÇÃO FÍSICA DE ITENS (RETURN COMMERCIAL WORKFLOW)
   * Suporta Devolução Total ou Parcial com entrada RETURN no Ledger
   * ============================================================================
   */
  static async returnOrderItems(
    organizationId: string,
    orderId: string,
    dto: ReturnOrderItemsDTO,
    userId?: string
  ): Promise<OrderEntity> {
    return await UnitOfWork.transaction(organizationId, async (tx: TransactionContext) => {
      const order = await OrderRepository.findByIdAsync(organizationId, orderId, tx);
      if (!order) {
        throw new Error(`Pedido ${orderId} não encontrado.`);
      }

      if (order.status !== "PAID" && order.status !== "FULFILLED" && order.status !== "PARTIALLY_RETURNED") {
        throw new Error(`Devolução não permitida para pedido no status '${order.status}'. Somente pedidos pagos ou entregues podem receber devolução.`);
      }

      const items = await OrderRepository.getItemsByOrderIdAsync(organizationId, orderId, tx);
      const operatorName = dto.operatorName || "Operador de Garantia e Devoluções";
      const nowIso = new Date().toISOString();

      let totalReturnedItemsCount = 0;
      let totalOrderItemsCount = 0;
      let returnedGoodsValue = 0;

      for (const returnReq of dto.items) {
        const item = items.find((i) => i.id === returnReq.orderItemId);
        if (!item) {
          throw new Error(`Item de pedido ${returnReq.orderItemId} não encontrado.`);
        }

        const currentlyReturned = item.returnedQuantity || 0;
        const availableToReturn = item.quantity - currentlyReturned;

        if (returnReq.quantity <= 0 || returnReq.quantity > availableToReturn) {
          throw new Error(
            `Quantidade de devolução inválida para ${item.productSnapshot.name}. Disponível para devolver: ${availableToReturn} un, Solicitado: ${returnReq.quantity} un.`
          );
        }

        item.returnedQuantity = currentlyReturned + returnReq.quantity;
        const destinationLocationId = returnReq.locationId || item.locationId;

        // 1. Estoque volta via RETURN no Ledger (Devolução comercial legítima)
        await inventoryRepo.adjustOnHand(organizationId, item.productId, destinationLocationId, returnReq.quantity, tx);

        const movId = `mov-ret-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        await inventoryRepo.createMovement(
          {
            id: movId,
            organizationId,
            productId: item.productId,
            locationId: destinationLocationId,
            type: "RETURN", // 🌟 Movimento de devolução de cliente (não REVERSAL)
            quantityChange: returnReq.quantity,
            physicalBalanceAfter: 0,
            consignedBalanceAfter: 0,
            referenceType: "ORDER",
            referenceId: order.orderNumber || orderId,
            operatorName,
            notes: `Devolução comercial de cliente: ${returnReq.quantity} un de ${item.productSnapshot.name}. Motivo: ${returnReq.reason || dto.reason}`,
            createdAt: nowIso,
          },
          tx
        );

        returnedGoodsValue += (item.unitPrice * returnReq.quantity);
      }

      // Persistir atualização dos itens
      OrderRepository.saveOrderItems(items, tx);

      // Calcular se o pedido foi parcial ou totalmente devolvido
      for (const it of items) {
        totalOrderItemsCount += it.quantity;
        totalReturnedItemsCount += (it.returnedQuantity || 0);
      }

      const isTotalReturn = totalReturnedItemsCount >= totalOrderItemsCount;
      const targetStatus: OrderStatus = isTotalReturn ? "RETURNED" : "PARTIALLY_RETURNED";
      const targetEvent: OrderEvent = isTotalReturn ? "RETURN_ITEMS_TOTAL" : "RETURN_ITEMS_PARTIAL";

      // 2. Transição formal da FSM de Pedido
      const currentStatus = order.status;
      order.status = targetStatus;
      order.updatedAt = nowIso;
      OrderRepository.saveOrder(order, tx);

      const transitionEntity: OrderStateTransitionEntity = {
        id: `trans-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        organizationId,
        orderId,
        fromStatus: currentStatus,
        toStatus: targetStatus,
        event: targetEvent,
        operatorName,
        reason: dto.reason || (isTotalReturn ? "Devolução total de produtos do pedido." : "Devolução parcial de produtos do pedido."),
        createdAt: nowIso,
      };
      OrderRepository.saveTransition(transitionEntity, tx);

      // 3. Estorno Financeiro Opcional/Automático
      if (dto.refundPayment && returnedGoodsValue > 0) {
        await this.refundOrderPaymentTransactional(organizationId, order, {
          amount: Math.min(returnedGoodsValue, order.totalAmount - (order.refundedTotalAmount || 0)),
          reason: `Estorno proporcional referente à devolução de itens (${dto.reason})`,
          operatorName,
        }, tx);
      }

      // 4. Auditoria
      await auditService.logAction(
        organizationId,
        userId,
        "ORDER_ITEMS_RETURNED",
        "ORDER",
        orderId,
        "127.0.0.1",
        operatorName,
        `Devolução de mercadorias no pedido #${order.orderNumber}: ${targetStatus} (${totalReturnedItemsCount}/${totalOrderItemsCount} itens devolvidos).`,
        { orderId, orderNumber: order.orderNumber, isTotalReturn, targetStatus, returnedGoodsValue }
      );

      return this.hydrateOrder(order, tx);
    });
  }

  /**
   * ============================================================================
   * 💳 ESTORNO FINANCEIRO DE PAGAMENTO (REFUND FINANCIAL WORKFLOW)
   * Suporta Estorno Parcial ou Total desvinculado de movimentação de peças
   * ============================================================================
   */
  static async refundOrderPayment(
    organizationId: string,
    orderId: string,
    dto: RefundOrderPaymentDTO,
    userId?: string
  ): Promise<OrderEntity> {
    return await UnitOfWork.transaction(organizationId, async (tx: TransactionContext) => {
      const order = await OrderRepository.findByIdAsync(organizationId, orderId, tx);
      if (!order) {
        throw new Error(`Pedido ${orderId} não encontrado.`);
      }

      await this.refundOrderPaymentTransactional(organizationId, order, dto, tx);

      await auditService.logAction(
        organizationId,
        userId,
        "ORDER_PAYMENT_REFUNDED",
        "PAYMENT",
        orderId,
        "127.0.0.1",
        dto.operatorName || "Operador Financeiro",
        `Estorno financeiro processado para o pedido #${order.orderNumber}: R$ ${dto.amount.toFixed(2)}. Motivo: ${dto.reason}`,
        { orderId, amount: dto.amount, paymentStatus: order.paymentStatus }
      );

      return await this.hydrateOrderAsync(order, tx);
    });
  }

  /**
   * Helper transacional para estorno monetário
   */
  private static async refundOrderPaymentTransactional(
    organizationId: string,
    order: OrderEntity,
    dto: RefundOrderPaymentDTO,
    tx: TransactionContext
  ): Promise<void> {
    const payments = await OrderRepository.getPaymentsByOrderIdAsync(organizationId, order.id, tx);
    const paidPayments = payments.filter((p) => p.status === "PAID" || p.status === "PARTIALLY_REFUNDED");

    if (paidPayments.length === 0) {
      throw new Error("Não há pagamentos quitados disponíveis para estorno neste pedido.");
    }

    const currentRefunded = order.refundedTotalAmount || 0;
    const maxRefundable = order.totalAmount - currentRefunded;

    if (dto.amount <= 0 || dto.amount > maxRefundable) {
      throw new Error(
        `Valor de estorno inválido. Máximo reembolsável: R$ ${maxRefundable.toFixed(2)}, Solicitado: R$ ${dto.amount.toFixed(2)}.`
      );
    }

    let remainingToRefund = dto.amount;
    const nowIso = new Date().toISOString();

    for (const payment of paidPayments) {
      if (remainingToRefund <= 0) break;

      const pRefunded = payment.refundedAmount || 0;
      const pAvailable = payment.amount - pRefunded;
      const amountForThis = Math.min(remainingToRefund, pAvailable);

      payment.refundedAmount = pRefunded + amountForThis;
      payment.refundedAt = nowIso;
      payment.updatedAt = nowIso;

      if (payment.refundedAmount >= payment.amount) {
        payment.status = "REFUNDED";
      } else {
        payment.status = "PARTIALLY_REFUNDED";
      }

      OrderRepository.savePayment(payment, tx);
      remainingToRefund -= amountForThis;
    }

    order.refundedTotalAmount = currentRefunded + dto.amount;
    if (order.refundedTotalAmount >= order.totalAmount) {
      order.paymentStatus = "REFUNDED";
    } else {
      order.paymentStatus = "PARTIALLY_REFUNDED";
    }
    order.updatedAt = nowIso;
    OrderRepository.saveOrder(order, tx);
  }

  /**
   * Finite State Machine (FSM) Transition Engine with Shared Transaction Context
   */
  static async transitionOrder(
    organizationId: string,
    orderId: string,
    dto: OrderTransitionDTO,
    userId?: string
  ): Promise<OrderEntity> {
    return await UnitOfWork.transaction(organizationId, async (tx: TransactionContext) => {
      return await this.transitionOrderTransactional(organizationId, orderId, dto, tx, userId);
    });
  }

  /**
   * Internal transactional transition logic
   */
  private static async transitionOrderTransactional(
    organizationId: string,
    orderId: string,
    dto: OrderTransitionDTO,
    tx: TransactionContext,
    userId?: string
  ): Promise<OrderEntity> {
    const order = await OrderRepository.findByIdAsync(organizationId, orderId, tx);
    if (!order) {
      throw new Error(`Pedido ${orderId} não encontrado.`);
    }

    const currentStatus = order.status;
    const operatorName = dto.operatorName || "Operador de Vendas";
    const nowIso = new Date().toISOString();

    // 1. Formal FSM Validation
    const transitionCheck = OrderStateMachine.getNextState(currentStatus, dto.event);
    if (!transitionCheck.isAllowed) {
      throw new Error(transitionCheck.errorMessage || `Transição inválida de ${currentStatus} com evento ${dto.event}.`);
    }

    const nextStatus = transitionCheck.toStatus;
    const items = await OrderRepository.getItemsByOrderIdAsync(organizationId, orderId, tx);

    // 1.1 Business Rules Validation against Real-Time Inventory State
    const inventoryCheck = await OrderStateMachine.validateInventoryRules(
      organizationId,
      order,
      items,
      dto.event,
      tx
    );
    if (!inventoryCheck.isValid) {
      throw new Error(
        `Regra de negócio de estoque violada para transição (${dto.event}): ${inventoryCheck.errors.join("; ")}`
      );
    }

    // 2. Execute Domain & Stock Side-Effects in Transaction Context
    switch (dto.event) {
      case "SUBMIT_ORDER":
      case "RESERVE_INVENTORY":
        for (const item of items) {
          await inventoryRepo.reserveStock(organizationId, item.productId, item.locationId, item.quantity, tx);
        }
        break;

      case "CONFIRM_PAYMENT":
        // A. Mark payments as PAID
        const payments = await OrderRepository.getPaymentsByOrderIdAsync(organizationId, orderId, tx);
        for (const p of payments) {
          p.status = "PAID";
          p.paidAt = nowIso;
          p.updatedAt = nowIso;
          OrderRepository.savePayment(p, tx);
        }
        order.paymentStatus = "PAID";

        // B. Issue Digital Warranty Code
        if (!order.warrantyCode) {
          order.warrantyCode = this.generateWarrantyCode();
        }

        // C. Commit Inventory Deduction (Commit Reservation in Balances & write SALE Ledger event)
        for (const item of items) {
          await inventoryRepo.commitReservation(organizationId, item.productId, item.locationId, item.quantity, tx);

          const movId = `mov-sale-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          await inventoryRepo.createMovement(
            {
              id: movId,
              organizationId,
              productId: item.productId,
              locationId: item.locationId,
              type: "SALE",
              quantityChange: -item.quantity,
              physicalBalanceAfter: 0,
              consignedBalanceAfter: 0,
              referenceType: "ORDER",
              referenceId: order.orderNumber || orderId,
              operatorName,
              notes: `Venda faturada canal ${order.channel || "OMNICHANNEL"}: ${item.quantity} un de ${item.productSnapshot.name}`,
              createdAt: nowIso,
            },
            tx
          );
        }
        break;

      case "CANCEL_ORDER":
      case "EXPIRE_ORDER":
        // Release reserved inventory back to available physical stock
        for (const item of items) {
          try {
            await inventoryRepo.releaseReservation(organizationId, item.productId, item.locationId, item.quantity, tx);
          } catch (e) {
            // If already committed or not reserved, ignore non-blocking
          }
        }
        break;

      case "REFUND_ORDER":
        // Fallback global refund: Devolution of all remaining non-returned items via RETURN Ledger
        for (const item of items) {
          const remaining = item.quantity - (item.returnedQuantity || 0);
          if (remaining > 0) {
            item.returnedQuantity = item.quantity;
            await inventoryRepo.adjustOnHand(organizationId, item.productId, item.locationId, remaining, tx);

            const movId = `mov-ret-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            await inventoryRepo.createMovement(
              {
                id: movId,
                organizationId,
                productId: item.productId,
                locationId: item.locationId,
                type: "RETURN", // 🌟 Movimento de devolução de cliente no ledger
                quantityChange: remaining,
                physicalBalanceAfter: 0,
                consignedBalanceAfter: 0,
                referenceType: "ORDER",
                referenceId: order.orderNumber || orderId,
                operatorName: "Setor de Devoluções e Garantia",
                notes: `Devolução integral de venda: ${remaining} un de ${item.productSnapshot.name}. Motivo: ${dto.reason || "Estorno solicitado"}`,
                createdAt: nowIso,
              },
              tx
            );
          }
        }
        OrderRepository.saveOrderItems(items, tx);

        // Estorno financeiro total
        await this.refundOrderPaymentTransactional(organizationId, order, {
          amount: Math.max(0, order.totalAmount - (order.refundedTotalAmount || 0)),
          reason: dto.reason || "Estorno total do pedido",
          operatorName,
        }, tx);
        break;

      default:
        break;
    }

    // 3. Update order status and timestamp
    order.status = nextStatus;
    order.updatedAt = nowIso;
    OrderRepository.saveOrder(order, tx);

    // 4. Record Transition History Audit
    const transitionEntity: OrderStateTransitionEntity = {
      id: `trans-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      organizationId,
      orderId,
      fromStatus: currentStatus,
      toStatus: nextStatus,
      event: dto.event,
      operatorId: dto.operatorId,
      operatorName,
      reason: dto.reason || `Transição de ${currentStatus} para ${nextStatus} via evento ${dto.event}.`,
      metadata: dto.metadata,
      createdAt: nowIso,
    };
    OrderRepository.saveTransition(transitionEntity, tx);

    // 5. Stage Audit Log
    await auditService.logAction(
      organizationId,
      userId,
      "ORDER_STATUS_CHANGED",
      "ORDER",
      orderId,
      "127.0.0.1",
      operatorName,
      `Pedido #${order.orderNumber} mudou de status: ${currentStatus} -> ${nextStatus} (Evento: ${dto.event}).`,
      { orderId, fromStatus: currentStatus, toStatus: nextStatus, event: dto.event }
    );

    return await this.hydrateOrderAsync(order, tx);
  }
}
