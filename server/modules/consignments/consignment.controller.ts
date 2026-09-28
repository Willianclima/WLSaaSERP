import { Response } from "express";
import { AuthenticatedRequest } from "../../middlewares/authMiddleware";
import { consignmentRepo } from "./consignment.repository";
import { ConsignmentEntity } from "./consignment.types";
import { auditService } from "../../services/auditService";

export class ConsignmentController {
  static async list(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = req.organizationId!;
      const list = await consignmentRepo.listByOrg(orgId);
      return res.json({ success: true, consignments: list, total: list.length });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response) {
    try {
      const consignment = await consignmentRepo.findById(req.params.id);
      if (!consignment) {
        return res.status(404).json({ success: false, error: "Consignação não encontrada." });
      }
      return res.json({ success: true, consignment });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  static async create(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = req.organizationId!;
      const { resellerName, resellerPhone, commissionRate = 30, items = [], settlementDueDays = 30, notes } = req.body;

      if (!resellerName) {
        return res.status(400).json({ success: false, error: "Nome da revendedora é obrigatório." });
      }

      const totalPieces = items.reduce((sum: number, it: any) => sum + (Number(it.quantity) || 1), 0);
      const totalValue = items.reduce(
        (sum: number, it: any) => sum + (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0),
        0
      );

      const code = `CSG-${Date.now().toString().slice(-4)}`;
      const now = new Date();
      const settlementDueAt = new Date(now.getTime() + settlementDueDays * 86400000);

      const consignment: ConsignmentEntity = {
        id: `csg-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        organizationId: orgId,
        code,
        resellerName,
        resellerPhone,
        status: "OPEN",
        commissionRate: Number(commissionRate) || 30,
        totalPieces,
        totalValue,
        soldValue: 0,
        resellerCommission: 0,
        netStoreAmount: 0,
        items,
        dispatchedAt: now.toISOString(),
        settlementDueAt: settlementDueAt.toISOString(),
        notes,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      const created = await consignmentRepo.create(consignment);

      await auditService.logAction(
        orgId,
        req.user?.id,
        "CONSIGNMENT_CREATED",
        "CONSIGNMENT",
        created.id,
        req.ip,
        req.headers["user-agent"] as string,
        `Maleta de consignação criada para revendedora ${resellerName} (${totalPieces} peças, R$ ${totalValue.toFixed(2)})`
      );

      return res.status(201).json({
        success: true,
        message: `Maleta de consignação ${code} criada com sucesso para ${resellerName}!`,
        consignment: created,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}
