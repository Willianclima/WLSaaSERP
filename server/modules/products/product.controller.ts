import { Response } from "express";
import { AuthenticatedRequest } from "../../middlewares/authMiddleware";
import { ProductService } from "./product.service";
import { CreateProductDTO, UpdateProductDTO, ProductFilterQuery } from "./product.types";
import { auditService } from "../../services/auditService";

export class ProductController {
  /**
   * GET /api/products
   * Lists products for the current tenant with live stock computed from ledger.
   */
  static async list(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = req.organizationId!;
      const filter: ProductFilterQuery = {
        category: req.query.category as string,
        bath: req.query.bath as string,
        status: req.query.status as string,
        search: req.query.search as string,
        minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
        maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : 100,
        offset: req.query.offset ? Number(req.query.offset) : 0,
      };

      const result = await ProductService.listProducts(orgId, filter);

      return res.json({
        success: true,
        data: result.products,
        total: result.total,
        organizationId: orgId,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || "Erro ao listar produtos.",
      });
    }
  }

  /**
   * GET /api/products/:id
   */
  static async getById(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = req.organizationId!;
      const { id } = req.params;

      const product = await ProductService.getProductById(orgId, id);

      return res.json({
        success: true,
        data: product,
      });
    } catch (error: any) {
      return res.status(404).json({
        success: false,
        error: error.message || "Produto não encontrado.",
      });
    }
  }

  /**
   * POST /api/products
   * Creates a new SKU and optional initial inventory ledger entry.
   */
  static async create(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = req.organizationId!;
      const dto: CreateProductDTO = req.body;
      const operatorName = req.user?.name || "Gestor Matriz";

      if (!dto.sku || !dto.name || dto.price === undefined || !dto.category || !dto.bath) {
        return res.status(400).json({
          success: false,
          error: "Campos obrigatórios ausentes: sku, name, price, category, bath.",
        });
      }

      const product = await ProductService.createProduct(orgId, dto, operatorName);

      // Audit Log
      await auditService.logAction(
        orgId,
        req.user?.id,
        "PRODUCT_CREATE",
        "PRODUCT",
        product.id,
        (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1",
        req.headers["user-agent"] || "Aura Web Client",
        `SKU ${product.sku} (${product.name}) criado com sucesso.`,
        { sku: product.sku, price: product.price, bath: product.bath, initialStock: dto.initialStock }
      );

      return res.status(201).json({
        success: true,
        data: product,
        message: `Produto ${product.sku} cadastrado com sucesso!`,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message || "Erro ao cadastrar produto.",
      });
    }
  }

  /**
   * PUT /api/products/:id
   */
  static async update(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = req.organizationId!;
      const { id } = req.params;
      const dto: UpdateProductDTO = req.body;

      const product = await ProductService.updateProduct(orgId, id, dto);

      // Audit Log
      await auditService.logAction(
        orgId,
        req.user?.id,
        "PRODUCT_UPDATE",
        "PRODUCT",
        product.id,
        (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1",
        req.headers["user-agent"] || "Aura Web Client",
        `SKU ${product.sku} atualizado.`,
        dto
      );

      return res.json({
        success: true,
        data: product,
        message: `Produto ${product.sku} atualizado com sucesso!`,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message || "Erro ao atualizar produto.",
      });
    }
  }

  /**
   * DELETE /api/products/:id
   */
  static async delete(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = req.organizationId!;
      const { id } = req.params;

      const success = await ProductService.deleteProduct(orgId, id);
      if (!success) {
        return res.status(404).json({
          success: false,
          error: "Produto não encontrado para exclusão.",
        });
      }

      await auditService.logAction(
        orgId,
        req.user?.id,
        "PRODUCT_DELETE",
        "PRODUCT",
        id,
        (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1",
        req.headers["user-agent"] || "Aura Web Client",
        `Produto ${id} excluído.`
      );

      return res.json({
        success: true,
        message: "Produto removido com sucesso.",
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || "Erro ao excluir produto.",
      });
    }
  }
}
