import { Response } from "express";
import { AuthenticatedRequest } from "../../middlewares/authMiddleware";
import { CustomerService } from "./customer.service";
import { CustomerFilterQuery } from "./customer.types";
import { auditService } from "../../services/auditService";

export class CustomerController {
  /**
   * GET /api/customers
   */
  static async list(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = req.organizationId!;
      const filter: CustomerFilterQuery = {
        personType: req.query.personType as any,
        status: req.query.status as any,
        customerTier: req.query.customerTier as any,
        search: req.query.search as string,
        limit: req.query.limit ? Number(req.query.limit) : 100,
        offset: req.query.offset ? Number(req.query.offset) : 0,
      };

      const result = await CustomerService.listCustomers(orgId, filter);

      return res.json({
        success: true,
        data: result.customers,
        total: result.total,
        organizationId: orgId,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || "Erro ao listar clientes.",
      });
    }
  }

  /**
   * GET /api/customers/:id
   */
  static async getById(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = req.organizationId!;
      const { id } = req.params;

      const customer = await CustomerService.getCustomerById(orgId, id);

      return res.json({
        success: true,
        data: customer,
      });
    } catch (error: any) {
      return res.status(404).json({
        success: false,
        error: error.message || "Cliente não encontrado.",
      });
    }
  }

  /**
   * POST /api/customers
   */
  static async create(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = req.organizationId!;
      const newCustomer = await CustomerService.createCustomer(orgId, req.body);

      const clientIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
      const userAgent = req.headers["user-agent"] || "Aura Web Client";

      await auditService.logAction(
        orgId,
        req.user?.id,
        "CREATE_CUSTOMER",
        "customers",
        newCustomer.id,
        clientIp,
        userAgent,
        `Cliente ${newCustomer.fullName || newCustomer.companyName || newCustomer.id} cadastrado com sucesso.`,
        {
          personType: newCustomer.personType,
          customerTier: newCustomer.customerTier,
        }
      );

      return res.status(201).json({
        success: true,
        data: newCustomer,
        message: "Cliente cadastrado com sucesso.",
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message || "Erro ao criar cliente.",
      });
    }
  }

  /**
   * PUT /api/customers/:id
   */
  static async update(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = req.organizationId!;
      const { id } = req.params;

      const updated = await CustomerService.updateCustomer(orgId, id, req.body);
      const clientIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
      const userAgent = req.headers["user-agent"] || "Aura Web Client";

      await auditService.logAction(
        orgId,
        req.user?.id,
        "UPDATE_CUSTOMER",
        "customers",
        id,
        clientIp,
        userAgent,
        `Dados do cliente ${updated.fullName || updated.companyName || id} atualizados.`,
        { updatedFields: Object.keys(req.body) }
      );

      return res.json({
        success: true,
        data: updated,
        message: "Cliente atualizado com sucesso.",
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message || "Erro ao atualizar cliente.",
      });
    }
  }

  /**
   * PATCH /api/customers/:id/status
   */
  static async updateStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = req.organizationId!;
      const { id } = req.params;
      const { status } = req.body;

      if (!status || !["ACTIVE", "INACTIVE", "BLOCKED", "ARCHIVED"].includes(status)) {
        return res.status(400).json({
          success: false,
          error: "Status inválido. Use ACTIVE, INACTIVE, BLOCKED ou ARCHIVED.",
        });
      }

      const updated = await CustomerService.updateStatus(orgId, id, status);
      const clientIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
      const userAgent = req.headers["user-agent"] || "Aura Web Client";

      await auditService.logAction(
        orgId,
        req.user?.id,
        "CHANGE_CUSTOMER_STATUS",
        "customers",
        id,
        clientIp,
        userAgent,
        `Status do cliente ${updated.fullName || id} alterado para ${status}.`,
        { newStatus: status }
      );

      return res.json({
        success: true,
        data: updated,
        message: `Status do cliente alterado para ${status}.`,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message || "Erro ao atualizar status do cliente.",
      });
    }
  }

  /**
   * DELETE /api/customers/:id
   * Soft-Deletes / Archives the customer to maintain ERP integrity (Orders, Warranties, Consignments)
   */
  static async delete(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = req.organizationId!;
      const { id } = req.params;

      const archived = await CustomerService.deleteCustomer(orgId, id);
      const clientIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
      const userAgent = req.headers["user-agent"] || "Aura Web Client";

      await auditService.logAction(
        orgId,
        req.user?.id,
        "ARCHIVE_CUSTOMER",
        "customers",
        id,
        clientIp,
        userAgent,
        `Cliente ${archived.fullName || id} arquivado para preservar histórico de pedidos e garantias.`,
        { reason: "Customer soft-deleted to maintain warranty & fiscal integrity" }
      );

      return res.json({
        success: true,
        data: archived,
        message: "Cliente arquivado com sucesso. Histórico fiscal e pedidos preservados.",
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message || "Erro ao arquivar cliente.",
      });
    }
  }
}
