import { Response } from "express";
import { AuthenticatedRequest } from "../../middlewares/authMiddleware";
import { inventoryRepo } from "./inventory.repository";
import { productRepo } from "../products/product.repository";
import { ProductEntity } from "../products/product.types";
import { InventoryBalanceEntity, InventoryLocationEntity } from "./inventory.types";

/**
 * Controller for 'inventory_balances'
 * Provides robust endpoints for querying stock levels by location,
 * calculating 'available_quantity' as 'on_hand_quantity - reserved_quantity',
 * and enforcing mathematical integrity rules (PostgreSQL CHECK constraints).
 */
export class InventoryBalancesController {
  /**
   * Helper method to calculate available_quantity and validate CHECK constraints
   */
  private static calculateAndValidateBalance(
    onHandQuantity: number,
    reservedQuantity: number
  ): {
    availableQuantity: number;
    isValidOnHand: boolean;
    isValidReserved: boolean;
    isValidRatio: boolean;
    isConsistent: boolean;
  } {
    const onHand = Number(onHandQuantity) || 0;
    const reserved = Number(reservedQuantity) || 0;
    
    // Core Business & Mathematical Logic: available_quantity = on_hand_quantity - reserved_quantity
    const availableQuantity = onHand - reserved;

    // Validation matching PostgreSQL CHECK constraints:
    // CHECK (on_hand_quantity >= 0)
    const isValidOnHand = onHand >= 0;
    // CHECK (reserved_quantity >= 0)
    const isValidReserved = reserved >= 0;
    // CHECK (reserved_quantity <= on_hand_quantity)
    const isValidRatio = reserved <= onHand;

    const isConsistent = isValidOnHand && isValidReserved && isValidRatio;

    return {
      availableQuantity,
      isValidOnHand,
      isValidReserved,
      isValidRatio,
      isConsistent,
    };
  }

  /**
   * GET /api/inventory/balances/location/:locationId
   * Queries all stock levels in a specific location (Store, Warehouse, or Reseller Bag).
   * Calculates 'available_quantity' for every product and provides aggregated location metrics.
   */
  static async getBalancesByLocation(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = req.organizationId!;
      const { locationId } = req.params;
      const { search, lowStockOnly, category } = req.query;

      // 1. Verify location exists for this tenant
      const location = await inventoryRepo.findLocationById(orgId, locationId);
      if (!location) {
        return res.status(404).json({
          success: false,
          error: `Localização '${locationId}' não encontrada para esta organização.`,
        });
      }

      // 2. Fetch all balances for this location
      const rawBalances = await inventoryRepo.listBalancesByLocation(orgId, locationId);
      const allProducts = await productRepo.listByOrg(orgId);
      const productMap = new Map<string, ProductEntity>(allProducts.map((p) => [p.id, p]));

      // 3. Format and enrich balance items with calculation logic: available = on_hand - reserved
      let totalOnHand = 0;
      let totalReserved = 0;
      let totalStockValue = 0;

      const items = rawBalances.map((bal) => {
        const product = productMap.get(bal.productId);
        const {
          availableQuantity,
          isValidOnHand,
          isValidReserved,
          isValidRatio,
          isConsistent,
        } = InventoryBalancesController.calculateAndValidateBalance(
          bal.onHandQuantity,
          bal.reservedQuantity
        );

        totalOnHand += bal.onHandQuantity;
        totalReserved += bal.reservedQuantity;
        if (product?.price) {
          totalStockValue += bal.onHandQuantity * product.price;
        }

        return {
          id: bal.id,
          productId: bal.productId,
          locationId: bal.locationId,
          product: product
            ? {
                id: product.id,
                sku: product.sku,
                name: product.name,
                category: product.category,
                bath: product.bath,
                price: product.price,
                costPrice: product.costPrice,
                imageUrl: product.imageUrl,
                collection: product.collection,
              }
            : null,
          // Stock breakdown columns
          onHandQuantity: bal.onHandQuantity,
          reservedQuantity: bal.reservedQuantity,
          // Calculated quantity: on_hand_quantity - reserved_quantity
          availableQuantity,
          // Database Check Constraints Verification Flags
          integrity: {
            checkOnHandNonNegative: isValidOnHand,
            checkReservedNonNegative: isValidReserved,
            checkReservedWithinOnHand: isValidRatio,
            isCompliant: isConsistent,
          },
          updatedAt: bal.updatedAt,
          createdAt: bal.createdAt,
        };
      });

      // 4. Apply optional filters
      let filteredItems = items;

      if (search && typeof search === "string") {
        const query = search.toLowerCase();
        filteredItems = filteredItems.filter(
          (item) =>
            item.product?.name.toLowerCase().includes(query) ||
            item.product?.sku.toLowerCase().includes(query)
        );
      }

      if (category && typeof category === "string" && category !== "TODOS") {
        filteredItems = filteredItems.filter((item) => item.product?.category === category);
      }

      if (lowStockOnly === "true") {
        filteredItems = filteredItems.filter(
          (item) => item.availableQuantity <= 5
        );
      }

      // Aggregated summary for this location
      const totalAvailable = totalOnHand - totalReserved;

      return res.json({
        success: true,
        data: {
          location: {
            id: location.id,
            name: location.name,
            code: location.code,
            type: location.type,
            description: location.description,
            isActive: location.isActive,
          },
          metrics: {
            totalProductsTracked: items.length,
            totalOnHandQuantity: totalOnHand,
            totalReservedQuantity: totalReserved,
            // Calculated location total available: totalOnHand - totalReserved
            totalAvailableQuantity: totalAvailable,
            totalEstimatedStockValueBrl: totalStockValue,
            formula: "available_quantity = on_hand_quantity - reserved_quantity",
          },
          items: filteredItems,
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || "Erro ao consultar saldos de estoque por localização.",
      });
    }
  }

  /**
   * GET /api/inventory/balances/location/:locationId/product/:productId
   * Returns single stock balance for a specific product in a specific location.
   */
  static async getProductBalanceByLocation(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = req.organizationId!;
      const { locationId, productId } = req.params;

      const location = await inventoryRepo.findLocationById(orgId, locationId);
      if (!location) {
        return res.status(404).json({
          success: false,
          error: `Localização '${locationId}' não encontrada.`,
        });
      }

      const product = await productRepo.findById(orgId, productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          error: `Produto '${productId}' não encontrado.`,
        });
      }

      const balance = await inventoryRepo.getBalance(orgId, productId, locationId);
      const onHand = balance ? balance.onHandQuantity : 0;
      const reserved = balance ? balance.reservedQuantity : 0;

      const {
        availableQuantity,
        isValidOnHand,
        isValidReserved,
        isValidRatio,
        isConsistent,
      } = InventoryBalancesController.calculateAndValidateBalance(onHand, reserved);

      return res.json({
        success: true,
        data: {
          id: balance?.id || `bal-${productId}-${locationId}`,
          organizationId: orgId,
          productId,
          locationId,
          location: {
            id: location.id,
            name: location.name,
            code: location.code,
            type: location.type,
          },
          product: {
            id: product.id,
            sku: product.sku,
            name: product.name,
            category: product.category,
            bath: product.bath,
            price: product.price,
          },
          onHandQuantity: onHand,
          reservedQuantity: reserved,
          // Calculated: available_quantity = on_hand_quantity - reserved_quantity
          availableQuantity,
          integrityCheck: {
            checkOnHandNonNegative: isValidOnHand,
            checkReservedNonNegative: isValidReserved,
            checkReservedWithinOnHand: isValidRatio,
            isCompliant: isConsistent,
          },
          updatedAt: balance?.updatedAt || new Date().toISOString(),
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || "Erro ao consultar saldo do produto na localização.",
      });
    }
  }

  /**
   * GET /api/inventory/balances/product/:productId
   * Returns all location balances for a specific product with multi-location availability breakdown.
   */
  static async getProductBalances(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = req.organizationId!;
      const { productId } = req.params;

      const product = await productRepo.findById(orgId, productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          error: `Produto '${productId}' não encontrado.`,
        });
      }

      const locations = await inventoryRepo.listLocations(orgId);
      const balances = await inventoryRepo.listBalancesByProduct(orgId, productId);
      const balanceMap = new Map(balances.map((b) => [b.locationId, b]));

      let onHandTotal = 0;
      let reservedTotal = 0;

      const locationBreakdown = locations.map((loc) => {
        const bal = balanceMap.get(loc.id);
        const onHand = bal ? bal.onHandQuantity : 0;
        const reserved = bal ? bal.reservedQuantity : 0;

        const { availableQuantity, isConsistent } =
          InventoryBalancesController.calculateAndValidateBalance(onHand, reserved);

        onHandTotal += onHand;
        reservedTotal += reserved;

        return {
          locationId: loc.id,
          locationName: loc.name,
          locationCode: loc.code,
          locationType: loc.type,
          onHandQuantity: onHand,
          reservedQuantity: reserved,
          // Logic: available = on_hand - reserved
          availableQuantity,
          isConsistent,
          updatedAt: bal?.updatedAt || loc.createdAt,
        };
      });

      const availableTotal = onHandTotal - reservedTotal;

      return res.json({
        success: true,
        data: {
          productId,
          product: {
            id: product.id,
            sku: product.sku,
            name: product.name,
            category: product.category,
            bath: product.bath,
            price: product.price,
          },
          totals: {
            onHandTotal,
            reservedTotal,
            // Calculated Global: availableTotal = onHandTotal - reservedTotal
            availableTotal,
            formula: "available_quantity = on_hand_quantity - reserved_quantity",
          },
          locations: locationBreakdown,
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || "Erro ao consultar saldos distribuídos do produto.",
      });
    }
  }

  /**
   * GET /api/inventory/balances/locations/summary
   * Returns a high-level summary of all locations with total physical on-hand, reserved, and available stock.
   */
  static async getLocationsSummary(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = req.organizationId!;
      const locations = await inventoryRepo.listLocations(orgId);

      const summaries = await Promise.all(
        locations.map(async (loc) => {
          const balances = await inventoryRepo.listBalancesByLocation(orgId, loc.id);

          let onHandSum = 0;
          let reservedSum = 0;

          balances.forEach((bal) => {
            onHandSum += bal.onHandQuantity;
            reservedSum += bal.reservedQuantity;
          });

          // Calculated: available = on_hand - reserved
          const availableSum = onHandSum - reservedSum;

          return {
            locationId: loc.id,
            locationName: loc.name,
            locationCode: loc.code,
            locationType: loc.type,
            isActive: loc.isActive,
            totalProductsTracked: balances.length,
            totalOnHand: onHandSum,
            totalReserved: reservedSum,
            totalAvailable: availableSum,
          };
        })
      );

      return res.json({
        success: true,
        data: summaries,
        formula: "available_quantity = on_hand_quantity - reserved_quantity",
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || "Erro ao obter sumário consolidado de locais.",
      });
    }
  }

  /**
   * GET /api/inventory/balances
   * Lists all balances for the organization with search, filtering, and calculated availability.
   */
  static async listAllBalances(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = req.organizationId!;
      const { locationId, productId, search } = req.query;

      let balances: InventoryBalanceEntity[] = [];

      if (locationId && typeof locationId === "string") {
        balances = await inventoryRepo.listBalancesByLocation(orgId, locationId);
      } else if (productId && typeof productId === "string") {
        balances = await inventoryRepo.listBalancesByProduct(orgId, productId);
      } else {
        // Fetch all locations and aggregate their balances
        const locations = await inventoryRepo.listLocations(orgId);
        for (const loc of locations) {
          const locBalances = await inventoryRepo.listBalancesByLocation(orgId, loc.id);
          balances.push(...locBalances);
        }
      }

      const products = await productRepo.listByOrg(orgId);
      const productMap = new Map<string, ProductEntity>(products.map((p) => [p.id, p]));
      const locations = await inventoryRepo.listLocations(orgId);
      const locationMap = new Map<string, InventoryLocationEntity>(locations.map((l) => [l.id, l]));

      const enriched = balances.map((bal) => {
        const product = productMap.get(bal.productId);
        const location = locationMap.get(bal.locationId);

        const { availableQuantity, isConsistent } =
          InventoryBalancesController.calculateAndValidateBalance(
            bal.onHandQuantity,
            bal.reservedQuantity
          );

        return {
          id: bal.id,
          productId: bal.productId,
          locationId: bal.locationId,
          product: product
            ? {
                id: product.id,
                sku: product.sku,
                name: product.name,
                category: product.category,
                price: product.price,
              }
            : null,
          location: location
            ? {
                id: location.id,
                name: location.name,
                code: location.code,
                type: location.type,
              }
            : null,
          onHandQuantity: bal.onHandQuantity,
          reservedQuantity: bal.reservedQuantity,
          availableQuantity,
          isConsistent,
          updatedAt: bal.updatedAt,
        };
      });

      let filtered = enriched;
      if (search && typeof search === "string") {
        const q = search.toLowerCase();
        filtered = filtered.filter(
          (b) =>
            b.product?.name.toLowerCase().includes(q) ||
            b.product?.sku.toLowerCase().includes(q) ||
            b.location?.name.toLowerCase().includes(q)
        );
      }

      return res.json({
        success: true,
        data: filtered,
        total: filtered.length,
        formula: "available_quantity = on_hand_quantity - reserved_quantity",
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || "Erro ao listar saldos de estoque.",
      });
    }
  }
}
