import { dbStore } from "../../db/store";
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
  ProductSnapshot,
  OrderCustomerSnapshot,
} from "./order.types";
import { InventoryService } from "../inventory/inventory.service";

export class OrderService {
  /**
   * Helper to format sequential order numbers (e.g. ORD-2026-0001)
   */
  private static generateOrderNumber(organizationId: string): string {
    const existingOrgOrders = Array.from(dbStore.orders.values()).filter(
      (o) => o.organizationId === organizationId
    );
    const count = existingOrgOrders.length + 1;
    const year = new Date().getFullYear();
    const padded = String(count).padStart(4, "0");
    return `ORD-${year}-${padded}`;
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
  private static generatePixPayload(amount: number, orderNumber: string) {
    const pixCode = `00020126580014br.gov.bcb.pix0136lumina-pix-${orderNumber}5204000053039865802BR5925Lumina+Semijoias+Limeira6009SAO+PAULO62070503***6304${Math.random().toString(16).substring(2, 6).toUpperCase()}`;
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
    let allOrders = Array.from(dbStore.orders.values()).filter(
      (o) => o.organizationId === organizationId
    );

    if (filter.status) {
      allOrders = allOrders.filter((o) => o.status === filter.status);
    }
    if (filter.channel) {
      allOrders = allOrders.filter((o) => o.channel === filter.channel);
    }
    if (filter.customerId) {
      allOrders = allOrders.filter((o) => o.customerId === filter.customerId);
    }
    if (filter.resellerId) {
      allOrders = allOrders.filter((o) => o.resellerId === filter.resellerId);
    }
    if (filter.minAmount !== undefined) {
      allOrders = allOrders.filter((o) => o.totalAmount >= filter.minAmount!);
    }
    if (filter.maxAmount !== undefined) {
      allOrders = allOrders.filter((o) => o.totalAmount <= filter.maxAmount!);
    }
    if (filter.startDate) {
      allOrders = allOrders.filter((o) => o.createdAt >= filter.startDate!);
    }
    if (filter.endDate) {
      allOrders = allOrders.filter((o) => o.createdAt <= filter.endDate!);
    }
    if (filter.search) {
      const q = filter.search.toLowerCase().trim();
      allOrders = allOrders.filter((o) => {
        const orderNum = (o.orderNumber || "").toLowerCase();
        const custName = (o.customerSnapshot?.name || "").toLowerCase();
        const custDoc = (o.customerSnapshot?.document || "").toLowerCase();
        const custEmail = (o.customerSnapshot?.email || "").toLowerCase();
        const reseller = (o.resellerName || "").toLowerCase();
        const warranty = (o.warrantyCode || "").toLowerCase();
        return (
          orderNum.includes(q) ||
          custName.includes(q) ||
          custDoc.includes(q) ||
          custEmail.includes(q) ||
          reseller.includes(q) ||
          warranty.includes(q)
        );
      });
    }

    // Sort by created date descending
    allOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Hydrate items, payments, and transitions
    const hydratedOrders = allOrders.map((ord) => this.hydrateOrder(ord));

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
    const order = dbStore.orders.get(orderId);
    if (!order || order.organizationId !== organizationId) {
      return null;
    }
    return this.hydrateOrder(order);
  }

  /**
   * Helper to hydrate order relationships
   */
  private static hydrateOrder(order: OrderEntity): OrderEntity {
    const items = Array.from(dbStore.orderItems.values()).filter(
      (item) => item.organizationId === order.organizationId && item.orderId === order.id
    );
    const payments = Array.from(dbStore.orderPayments.values()).filter(
      (pay) => pay.organizationId === order.organizationId && pay.orderId === order.id
    );
    const transitions = Array.from(dbStore.orderStateTransitions.values()).filter(
      (trans) => trans.organizationId === order.organizationId && trans.orderId === order.id
    );

    transitions.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    return {
      ...order,
      items,
      payments,
      transitions,
    };
  }

  /**
   * Create a new Order (Draft or Immediate Sale / Omnichannel Order)
   */
  static async createOrder(
    organizationId: string,
    dto: CreateOrderDTO,
    operatorName: string = "Sistema de Vendas"
  ): Promise<OrderEntity> {
    // 1. Resolve Customer Snapshot
    let customerSnapshot: OrderCustomerSnapshot = {
      id: dto.customerId || `cust-${Date.now()}`,
      personType: "PF",
      name: "Cliente Balcão",
      document: "***.***.***-**",
      email: "cliente@loja.com",
      phone: "+55 (19) 99999-0000",
      stateRegistration: undefined as string | undefined,
    };

    const existingCustomer = dbStore.customers.get(dto.customerId);
    if (existingCustomer && existingCustomer.organizationId === organizationId) {
      customerSnapshot = {
        id: existingCustomer.id,
        personType: existingCustomer.personType as "PF" | "PJ",
        name: existingCustomer.fullName || existingCustomer.tradeName || existingCustomer.companyName || "Cliente",
        document: existingCustomer.cpf || existingCustomer.cnpj || "",
        email: existingCustomer.primaryEmail || "",
        phone: existingCustomer.primaryPhone || existingCustomer.whatsapp || "",
        stateRegistration: existingCustomer.stateRegistration,
      };
    }

    // 2. Resolve Shipping Address
    let shippingAddress = {
      recipientName: customerSnapshot.name,
      zipCode: "13480-000",
      street: "Rua do Comércio",
      number: "100",
      complement: "",
      neighborhood: "Centro",
      city: "Limeira",
      state: "SP",
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
    } else if (existingCustomer) {
      const defaultAddr = Array.from(dbStore.customerAddresses.values()).find(
        (a) => a.organizationId === organizationId && a.customerId === existingCustomer.id && a.isDefault
      );
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

    // 3. Resolve Order Items and Immutable Product Snapshots
    const orderId = `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const orderNumber = this.generateOrderNumber(organizationId);
    const nowIso = new Date().toISOString();

    let subtotalAmount = 0;
    const itemsEntities: OrderItemEntity[] = [];

    for (const itemDto of dto.items) {
      const prod = dbStore.products.get(itemDto.productId);
      if (!prod || prod.organizationId !== organizationId) {
        throw new Error(`Produto ${itemDto.productId} não encontrado no catálogo.`);
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
        locationId: itemDto.locationId || "loc-lumina-matriz",
        productSnapshot,
        quantity: itemDto.quantity,
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

    // 4. Resolve Reseller Commission if applicable
    let resellerName: string | undefined;
    let resellerCommissionRate = dto.resellerCommissionRate;
    let resellerCommissionAmount: number | undefined;

    if (dto.resellerId) {
      const reseller = Array.from(dbStore.users.values()).find(
        (u) => u.id === dto.resellerId || u.email === dto.resellerId
      );
      if (reseller) {
        resellerName = reseller.name;
      }
      if (resellerCommissionRate === undefined) {
        resellerCommissionRate = 25; // Default 25%
      }
      resellerCommissionAmount = (totalAmount * resellerCommissionRate) / 100;
    }

    const initialStatus: OrderStatus = dto.initialStatus || "DRAFT";

    // 5. Build Main Order Entity
    const orderEntity: OrderEntity = {
      id: orderId,
      organizationId,
      orderNumber,
      customerId: customerSnapshot.id,
      customerSnapshot,
      channel: dto.channel,
      status: initialStatus,
      shippingAddress,
      currency: "BRL",
      subtotalAmount,
      discountAmount,
      shippingAmount,
      totalAmount,
      resellerId: dto.resellerId,
      resellerName,
      resellerCommissionRate,
      resellerCommissionAmount,
      idempotencyKey: dto.idempotencyKey,
      createdBy: dto.createdBy || operatorName,
      operatorName: operatorName,
      notes: dto.notes,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // Save Order and Items in dbStore
    dbStore.orders.set(orderEntity.id, orderEntity);
    for (const item of itemsEntities) {
      dbStore.orderItems.set(item.id, item);
    }

    // 6. Record Initial State Transition
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
    dbStore.orderStateTransitions.set(initTransition.id, initTransition);

    // 7. Process Initial Payments if provided
    if (dto.payments && dto.payments.length > 0) {
      for (const payDto of dto.payments) {
        await this.addOrderPayment(organizationId, orderId, payDto, operatorName);
      }
    }

    // 8. If created directly as INVENTORY_RESERVED or AWAITING_PAYMENT, reserve stock
    if (initialStatus === "INVENTORY_RESERVED" || initialStatus === "AWAITING_PAYMENT") {
      await this.reserveInventoryForOrder(organizationId, orderId, operatorName);
    }

    return this.hydrateOrder(orderEntity);
  }

  /**
   * Add a Payment to an Order (PIX, Credit Card, Boleto, etc.)
   */
  static async addOrderPayment(
    organizationId: string,
    orderId: string,
    dto: CreateOrderPaymentDTO,
    operatorName: string = "Operador Financeiro"
  ): Promise<OrderPaymentEntity> {
    const order = dbStore.orders.get(orderId);
    if (!order || order.organizationId !== organizationId) {
      throw new Error("Pedido não encontrado.");
    }

    const nowIso = new Date().toISOString();
    const gateway = dto.gateway || (dto.paymentMethod === "PIX" ? "MERCADOPAGO" : "MANUAL");

    let pixQrCodeUrl: string | undefined;
    let pixCopyPaste: string | undefined;
    let pixExpiration: string | undefined;

    if (dto.paymentMethod === "PIX") {
      const pix = this.generatePixPayload(dto.amount, order.orderNumber);
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
      orderId,
      paymentMethod: dto.paymentMethod,
      gateway,
      gatewayTransactionId: `${gateway.toLowerCase()}_tx_${Date.now()}`,
      status: "PENDING",
      amount: dto.amount,
      installments: dto.installments || 1,
      pixQrCode: dto.pixQrCode || pixCopyPaste,
      pixQrCodeUrl,
      pixCopyPaste,
      pixExpiration,
      boletoBarcode,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    dbStore.orderPayments.set(paymentEntity.id, paymentEntity);

    // If order was in INVENTORY_RESERVED or DRAFT, transition to AWAITING_PAYMENT
    if (order.status === "DRAFT" || order.status === "INVENTORY_RESERVED" || order.status === "PENDING_CONFIRMATION") {
      await this.transitionOrder(organizationId, orderId, {
        event: "REQUEST_PAYMENT",
        operatorName,
        reason: `Cobrança de ${dto.paymentMethod} (R$ ${dto.amount.toFixed(2)}) gerada com sucesso.`,
      });
    }

    return paymentEntity;
  }

  /**
   * Finite State Machine (FSM) Transition Engine
   * Validates state transitions, enforces atomic stock ledger updates, and audits events.
   */
  static async transitionOrder(
    organizationId: string,
    orderId: string,
    dto: OrderTransitionDTO
  ): Promise<OrderEntity> {
    const order = dbStore.orders.get(orderId);
    if (!order || order.organizationId !== organizationId) {
      throw new Error(`Pedido ${orderId} não encontrado.`);
    }

    const currentStatus = order.status;
    let nextStatus: OrderStatus = currentStatus;
    const nowIso = new Date().toISOString();
    const operatorName = dto.operatorName || "Operador de Vendas";

    // Enforce FSM Rules
    switch (dto.event) {
      case "SUBMIT_ORDER":
        if (currentStatus !== "DRAFT") {
          throw new Error(`Transição inválida: Não é possível submeter pedido no estado ${currentStatus}.`);
        }
        nextStatus = "INVENTORY_RESERVED";
        await this.reserveInventoryForOrder(organizationId, orderId, operatorName);
        break;

      case "RESERVE_INVENTORY":
        if (currentStatus !== "DRAFT" && currentStatus !== "PENDING_CONFIRMATION") {
          throw new Error(`Estoque já foi reservado ou pedido está em estado ${currentStatus}.`);
        }
        nextStatus = "INVENTORY_RESERVED";
        await this.reserveInventoryForOrder(organizationId, orderId, operatorName);
        break;

      case "REQUEST_PAYMENT":
        if (currentStatus !== "INVENTORY_RESERVED" && currentStatus !== "DRAFT" && currentStatus !== "PENDING_CONFIRMATION") {
          throw new Error(`Não é possível solicitar pagamento no estado ${currentStatus}.`);
        }
        nextStatus = "AWAITING_PAYMENT";
        break;

      case "PROCESS_PAYMENT":
        if (currentStatus !== "AWAITING_PAYMENT") {
          throw new Error(`Pagamento só pode entrar em processamento a partir de AWAITING_PAYMENT.`);
        }
        nextStatus = "PAYMENT_PROCESSING";
        break;

      case "CONFIRM_PAYMENT":
        if (
          currentStatus !== "AWAITING_PAYMENT" &&
          currentStatus !== "PAYMENT_PROCESSING" &&
          currentStatus !== "INVENTORY_RESERVED" &&
          currentStatus !== "DRAFT" &&
          currentStatus !== "PENDING_CONFIRMATION"
        ) {
          throw new Error(`Não é possível confirmar pagamento para pedido no estado ${currentStatus}.`);
        }
        nextStatus = "PAID";

        // 1. Mark payments as PAID
        const payments = Array.from(dbStore.orderPayments.values()).filter(
          (p) => p.organizationId === organizationId && p.orderId === orderId
        );
        for (const p of payments) {
          p.status = "PAID";
          p.paidAt = nowIso;
          p.updatedAt = nowIso;
        }

        // 2. Issue Digital Warranty Code
        if (!order.warrantyCode) {
          order.warrantyCode = this.generateWarrantyCode();
        }

        // 3. Confirm Inventory Deduction in Ledger (SALE movement)
        await this.confirmInventorySaleForOrder(organizationId, orderId, operatorName);
        break;

      case "START_FULFILLMENT":
        if (currentStatus !== "PAID") {
          throw new Error(`Apenas pedidos no estado PAID podem entrar em separação/expedição.`);
        }
        nextStatus = "FULFILLMENT_PENDING";
        break;

      case "COMPLETE_FULFILLMENT":
        if (currentStatus !== "FULFILLMENT_PENDING" && currentStatus !== "PAID") {
          throw new Error(`Apenas pedidos pagos ou em expedição podem ser finalizados como FULFILLED.`);
        }
        nextStatus = "FULFILLED";
        break;

      case "CANCEL_ORDER":
        if (currentStatus === "FULFILLED" || currentStatus === "REFUNDED" || currentStatus === "CANCELED") {
          throw new Error(`Não é possível cancelar pedido já ${currentStatus}.`);
        }
        nextStatus = "CANCELED";
        // Release reserved inventory back to available physical stock
        await this.releaseInventoryReservationForOrder(organizationId, orderId, dto.reason || "Cancelamento de pedido");
        break;

      case "EXPIRE_ORDER":
        if (currentStatus !== "INVENTORY_RESERVED" && currentStatus !== "AWAITING_PAYMENT" && currentStatus !== "DRAFT") {
          throw new Error(`Apenas pedidos pendentes de pagamento podem expirar por TTL.`);
        }
        nextStatus = "EXPIRED";
        await this.releaseInventoryReservationForOrder(organizationId, orderId, "Expiração por tempo limite de pagamento (TTL)");
        break;

      case "REFUND_ORDER":
        if (currentStatus !== "PAID" && currentStatus !== "FULFILLED" && currentStatus !== "FULFILLMENT_PENDING") {
          throw new Error(`Apenas pedidos com pagamento liquidado podem ser estornados.`);
        }
        nextStatus = "REFUNDED";
        // Return goods to inventory via REVERSAL ledger entry
        await this.refundInventoryForOrder(organizationId, orderId, dto.reason || "Estorno solicitado pelo cliente");
        break;

      case "REOPEN_DRAFT":
        if (currentStatus !== "CANCELED" && currentStatus !== "EXPIRED") {
          throw new Error(`Apenas pedidos cancelados ou expirados podem ser reabertos como rascunho.`);
        }
        nextStatus = "DRAFT";
        break;

      default:
        throw new Error(`Evento de transição desconhecido: ${dto.event}`);
    }

    // Update order status and timestamp
    order.status = nextStatus;
    order.updatedAt = nowIso;

    // Record Transition History Audit
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

    dbStore.orderStateTransitions.set(transitionEntity.id, transitionEntity);

    return this.hydrateOrder(order);
  }

  // --- INVENTORY INTEGRATION HELPERS ---

  /**
   * Reserves physical stock in inventory balances for an order
   */
  private static async reserveInventoryForOrder(
    organizationId: string,
    orderId: string,
    operatorName: string
  ) {
    const items = Array.from(dbStore.orderItems.values()).filter(
      (item) => item.organizationId === organizationId && item.orderId === orderId
    );

    for (const item of items) {
      const locationKey = `${organizationId}:${item.productId}:${item.locationId}`;
      let balance = dbStore.inventoryBalances.get(locationKey);

      if (!balance) {
        // Create initial balance record if not present
        balance = {
          id: `bal-${item.productId}-${item.locationId}`,
          organizationId,
          productId: item.productId,
          locationId: item.locationId,
          onHandQuantity: 10, // fallback
          reservedQuantity: 0,
          availableQuantity: 10,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        dbStore.inventoryBalances.set(locationKey, balance);
      }

      // Check availability
      if (balance.availableQuantity < item.quantity) {
        console.warn(`Estoque baixo para o produto ${item.productSnapshot.name}. Disponível: ${balance.availableQuantity}, Solicitado: ${item.quantity}`);
      }

      // Increase reservedQuantity, decrease availableQuantity
      balance.reservedQuantity += item.quantity;
      balance.availableQuantity = Math.max(0, balance.onHandQuantity - balance.reservedQuantity);
      balance.updatedAt = new Date().toISOString();
    }
  }

  /**
   * Confirms payment and permanently deducts inventory from On-Hand stock, writing SALE movement
   */
  private static async confirmInventorySaleForOrder(
    organizationId: string,
    orderId: string,
    operatorName: string
  ) {
    const order = dbStore.orders.get(orderId);
    const items = Array.from(dbStore.orderItems.values()).filter(
      (item) => item.organizationId === organizationId && item.orderId === orderId
    );

    const nowIso = new Date().toISOString();

    for (const item of items) {
      const locationKey = `${organizationId}:${item.productId}:${item.locationId}`;
      const balance = dbStore.inventoryBalances.get(locationKey);

      if (balance) {
        // Decrease on-hand and reserved
        balance.onHandQuantity = Math.max(0, balance.onHandQuantity - item.quantity);
        balance.reservedQuantity = Math.max(0, balance.reservedQuantity - item.quantity);
        balance.availableQuantity = Math.max(0, balance.onHandQuantity - balance.reservedQuantity);
        balance.updatedAt = nowIso;
      }

      // Record SALE movement in Ledger
      const movId = `mov-sale-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      dbStore.inventoryMovements.set(movId, {
        id: movId,
        organizationId,
        productId: item.productId,
        locationId: item.locationId,
        type: "SALE",
        quantityChange: -item.quantity,
        physicalBalanceAfter: balance?.onHandQuantity ?? 0,
        consignedBalanceAfter: 0,
        onHandAfter: balance?.onHandQuantity ?? 0,
        reservedAfter: balance?.reservedQuantity ?? 0,
        availableAfter: balance?.availableQuantity ?? 0,
        referenceType: "ORDER",
        referenceId: order?.orderNumber || orderId,
        operatorName,
        notes: `Venda faturada canal ${order?.channel || "OMNICHANNEL"}: ${item.quantity} un de ${item.productSnapshot.name}`,
        createdAt: nowIso,
      });
    }
  }

  /**
   * Releases stock reservation on cancellation or TTL expiration
   */
  private static async releaseInventoryReservationForOrder(
    organizationId: string,
    orderId: string,
    reason: string
  ) {
    const items = Array.from(dbStore.orderItems.values()).filter(
      (item) => item.organizationId === organizationId && item.orderId === orderId
    );

    const nowIso = new Date().toISOString();

    for (const item of items) {
      const locationKey = `${organizationId}:${item.productId}:${item.locationId}`;
      const balance = dbStore.inventoryBalances.get(locationKey);

      if (balance && balance.reservedQuantity > 0) {
        balance.reservedQuantity = Math.max(0, balance.reservedQuantity - item.quantity);
        balance.availableQuantity = Math.max(0, balance.onHandQuantity - balance.reservedQuantity);
        balance.updatedAt = nowIso;
      }
    }
  }

  /**
   * Restores items back to physical stock on refund
   */
  private static async refundInventoryForOrder(
    organizationId: string,
    orderId: string,
    reason: string
  ) {
    const order = dbStore.orders.get(orderId);
    const items = Array.from(dbStore.orderItems.values()).filter(
      (item) => item.organizationId === organizationId && item.orderId === orderId
    );

    const nowIso = new Date().toISOString();

    for (const item of items) {
      const locationKey = `${organizationId}:${item.productId}:${item.locationId}`;
      const balance = dbStore.inventoryBalances.get(locationKey);

      if (balance) {
        balance.onHandQuantity += item.quantity;
        balance.availableQuantity += item.quantity;
        balance.updatedAt = nowIso;
      }

      // Record REVERSAL movement in Ledger
      const movId = `mov-rev-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      dbStore.inventoryMovements.set(movId, {
        id: movId,
        organizationId,
        productId: item.productId,
        locationId: item.locationId,
        type: "REVERSAL",
        quantityChange: item.quantity,
        physicalBalanceAfter: balance?.onHandQuantity ?? item.quantity,
        consignedBalanceAfter: 0,
        onHandAfter: balance?.onHandQuantity ?? item.quantity,
        reservedAfter: balance?.reservedQuantity ?? 0,
        availableAfter: balance?.availableQuantity ?? item.quantity,
        referenceType: "REVERSAL_OPERATION",
        referenceId: order?.orderNumber || orderId,
        operatorName: "Setor de Devoluções e Garantia",
        notes: `Estorno de venda: ${item.quantity} un de ${item.productSnapshot.name}. Motivo: ${reason}`,
        createdAt: nowIso,
      });
    }
  }
}
