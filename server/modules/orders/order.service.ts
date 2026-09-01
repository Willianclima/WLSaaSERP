import { dbStore } from "../../db/store";
import { UnitOfWork, TransactionContext } from "../../db/transaction";
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

export class OrderService {
  /**
   * Helper to format sequential order numbers (e.g. ORD-2026-0001)
   */
  private static generateOrderNumber(organizationId: string): string {
    const existingOrgOrders = OrderRepository.list(organizationId);
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
    const allOrders = OrderRepository.list(organizationId, filter);
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
    const order = OrderRepository.findById(organizationId, orderId);
    if (!order) {
      return null;
    }
    return this.hydrateOrder(order);
  }

  /**
   * Helper to hydrate order relationships (Items, Payments, FSM Transitions)
   */
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
      const existingIdempotent = OrderRepository.findByIdempotencyKey(organizationId, dto.idempotencyKey);
      if (existingIdempotent) {
        return this.hydrateOrder(existingIdempotent);
      }
    }

    return await UnitOfWork.transaction(organizationId, async (tx: TransactionContext) => {
      // 1. Resolve Customer Snapshot (Frozen at order time)
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

      // 3. Resolve Order Items & Freeze Immutable Product Snapshots
      const orderId = `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const orderNumber = this.generateOrderNumber(organizationId);
      const nowIso = new Date().toISOString();

      let subtotalAmount = 0;
      const itemsEntities: OrderItemEntity[] = [];

      for (const itemDto of dto.items) {
        const prod = dbStore.products.get(itemDto.productId);
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
          locationId: itemDto.locationId || "loc-lumina-matriz",
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

      // 5. Stage Main Order Entity
      const orderEntity: OrderEntity = {
        id: orderId,
        organizationId,
        orderNumber,
        customerId: customerSnapshot.id,
        customerSnapshot,
        channel: dto.channel,
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
      const order = OrderRepository.findById(organizationId, orderId, tx);
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
      const order = OrderRepository.findById(organizationId, orderId, tx);
      if (!order) {
        throw new Error(`Pedido ${orderId} não encontrado.`);
      }

      if (order.status !== "PAID" && order.status !== "FULFILLED" && order.status !== "PARTIALLY_RETURNED") {
        throw new Error(`Devolução não permitida para pedido no status '${order.status}'. Somente pedidos pagos ou entregues podem receber devolução.`);
      }

      const items = OrderRepository.getItemsByOrderId(organizationId, orderId, tx);
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
      const order = OrderRepository.findById(organizationId, orderId, tx);
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

      return this.hydrateOrder(order, tx);
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
    const payments = OrderRepository.getPaymentsByOrderId(organizationId, order.id, tx);
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
    const order = OrderRepository.findById(organizationId, orderId, tx);
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
    const items = OrderRepository.getItemsByOrderId(organizationId, orderId, tx);

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
        const payments = OrderRepository.getPaymentsByOrderId(organizationId, orderId, tx);
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

    return this.hydrateOrder(order, tx);
  }
}
