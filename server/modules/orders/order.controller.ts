import { Response } from "express";
import { AuthenticatedRequest } from "../../middlewares/authMiddleware";
import { OrderService } from "./order.service";
import {
  OrderFilterQuery,
  CreateOrderDTO,
  OrderTransitionDTO,
  CreateOrderPaymentDTO,
  ReturnOrderItemsDTO,
  RefundOrderPaymentDTO,
} from "./order.types";

export class OrderController {
  /**
   * GET /api/orders
   */
  static async list(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = req.organizationId!;
      const filter: OrderFilterQuery = {
        status: req.query.status as any,
        channel: req.query.channel as any,
        customerId: req.query.customerId as string,
        resellerId: req.query.resellerId as string,
        search: req.query.search as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        minAmount: req.query.minAmount ? Number(req.query.minAmount) : undefined,
        maxAmount: req.query.maxAmount ? Number(req.query.maxAmount) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : 100,
        offset: req.query.offset ? Number(req.query.offset) : 0,
      };

      const result = await OrderService.listOrders(orgId, filter);

      return res.json({
        success: true,
        data: result.orders,
        total: result.total,
        organizationId: orgId,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || "Erro ao listar pedidos.",
      });
    }
  }

  /**
   * GET /api/orders/:id
   */
  static async getById(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = req.organizationId!;
      const { id } = req.params;

      const order = await OrderService.getOrderById(orgId, id);
      if (!order) {
        return res.status(404).json({
          success: false,
          error: `Pedido ${id} não encontrado na organização.`,
        });
      }

      return res.json({
        success: true,
        data: order,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || "Erro ao buscar detalhes do pedido.",
      });
    }
  }

  /**
   * POST /api/orders
   */
  static async create(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = req.organizationId!;
      const dto: CreateOrderDTO = req.body;

      if (!dto.items || dto.items.length === 0) {
        return res.status(400).json({
          success: false,
          error: "O pedido deve conter ao menos 1 item.",
        });
      }

      const operatorName = (req as any).user?.name || req.body.operatorName || "Gestor de Vendas";
      const userId = (req as any).user?.id;
      const order = await OrderService.createOrder(orgId, dto, operatorName, userId);

      return res.status(201).json({
        success: true,
        data: order,
        message: `Pedido ${order.orderNumber} registrado com sucesso!`,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message || "Falha ao registrar pedido.",
      });
    }
  }

  /**
   * POST /api/orders/:id/transition
   */
  static async transition(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = req.organizationId!;
      const { id } = req.params;
      const dto: OrderTransitionDTO = req.body;

      if (!dto.event) {
        return res.status(400).json({
          success: false,
          error: "O evento de transição FSM (event) é obrigatório.",
        });
      }

      const operatorName = (req as any).user?.name || dto.operatorName || "Operador Comercial";
      const userId = (req as any).user?.id;
      const updatedOrder = await OrderService.transitionOrder(orgId, id, {
        ...dto,
        operatorName,
      }, userId);

      return res.json({
        success: true,
        data: updatedOrder,
        message: `Pedido ${updatedOrder.orderNumber} transicionado com sucesso para o estado ${updatedOrder.status}.`,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message || "Transição de estado inválida ou não autorizada.",
      });
    }
  }

  /**
   * POST /api/orders/:id/payments
   */
  static async addPayment(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = req.organizationId!;
      const { id } = req.params;
      const dto: CreateOrderPaymentDTO = req.body;

      if (!dto.paymentMethod || !dto.amount || dto.amount <= 0) {
        return res.status(400).json({
          success: false,
          error: "Método de pagamento e valor válido são obrigatórios.",
        });
      }

      const operatorName = (req as any).user?.name || "Operador Financeiro";
      const payment = await OrderService.addOrderPayment(orgId, id, dto, operatorName);
      const updatedOrder = await OrderService.getOrderById(orgId, id);

      return res.status(201).json({
        success: true,
        data: {
          payment,
          order: updatedOrder,
        },
        message: "Pagamento adicionado ao pedido com sucesso!",
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message || "Falha ao adicionar pagamento ao pedido.",
      });
    }
  }

  /**
   * POST /api/orders/:id/return (Devolução Física de Mercadorias / Produtos)
   */
  static async returnItems(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = req.organizationId!;
      const { id } = req.params;
      const dto: ReturnOrderItemsDTO = req.body;

      if (!dto.items || dto.items.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Ao menos 1 item deve ser especificado para devolução.",
        });
      }

      const operatorName = (req as any).user?.name || dto.operatorName || "Operador de Garantia e Devolução";
      const userId = (req as any).user?.id;
      const updatedOrder = await OrderService.returnOrderItems(orgId, id, {
        ...dto,
        operatorName,
      }, userId);

      return res.json({
        success: true,
        data: updatedOrder,
        message: `Devolução processada com sucesso. Pedido atualizado para '${updatedOrder.status}'.`,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message || "Erro ao processar devolução de mercadorias.",
      });
    }
  }

  /**
   * POST /api/orders/:id/refund-payment (Estorno Financeiro Desacoplado)
   */
  static async refundPayment(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = req.organizationId!;
      const { id } = req.params;
      const dto: RefundOrderPaymentDTO = req.body;

      if (!dto.amount || dto.amount <= 0) {
        return res.status(400).json({
          success: false,
          error: "Valor de estorno financeiro deve ser maior que zero.",
        });
      }

      const operatorName = (req as any).user?.name || dto.operatorName || "Operador Financeiro";
      const userId = (req as any).user?.id;
      const updatedOrder = await OrderService.refundOrderPayment(orgId, id, {
        ...dto,
        operatorName,
      }, userId);

      return res.json({
        success: true,
        data: updatedOrder,
        message: `Estorno financeiro de R$ ${dto.amount.toFixed(2)} processado com sucesso. Status financeiro: ${updatedOrder.paymentStatus}.`,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message || "Erro ao processar estorno financeiro.",
      });
    }
  }

  /**
   * POST /api/orders/:id/cancel
   */
  static async cancel(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = req.organizationId!;
      const { id } = req.params;
      const { reason } = req.body;
      const operatorName = (req as any).user?.name || "Operador Comercial";
      const userId = (req as any).user?.id;

      const updatedOrder = await OrderService.transitionOrder(orgId, id, {
        event: "CANCEL_ORDER",
        reason: reason || "Cancelamento direto solicitado no painel.",
        operatorName,
      }, userId);

      return res.json({
        success: true,
        data: updatedOrder,
        message: `Pedido ${updatedOrder.orderNumber} cancelado e reserva de estoque liberada.`,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message || "Erro ao cancelar pedido.",
      });
    }
  }

  /**
   * POST /api/orders/:id/refund (Global Refund Fallback)
   */
  static async refund(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = req.organizationId!;
      const { id } = req.params;
      const { reason } = req.body;
      const operatorName = (req as any).user?.name || "Setor de Devoluções";
      const userId = (req as any).user?.id;

      const updatedOrder = await OrderService.transitionOrder(orgId, id, {
        event: "REFUND_ORDER",
        reason: reason || "Estorno e devolução total solicitados pelo cliente.",
        operatorName,
      }, userId);

      return res.json({
        success: true,
        data: updatedOrder,
        message: `Pedido ${updatedOrder.orderNumber} estornado com sucesso e mercadorias devolvidas ao estoque.`,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message || "Erro ao estornar pedido.",
      });
    }
  }
}
