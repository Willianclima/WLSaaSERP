import {
  OrganizationEntity,
  UserEntity,
  OrganizationMemberEntity,
  PlanDefinition,
  SubscriptionEntity,
  OrganizationModuleEntity,
  SystemModuleKey,
} from "../types/saas";
import { ProductEntity } from "../modules/products/product.types";
import {
  InventoryMovementEntity,
  InventoryLocationEntity,
  InventoryBalanceEntity,
  InventoryReservationEntity,
} from "../modules/inventory/inventory.types";
import {
  CustomerEntity,
  CustomerAddressEntity,
  CustomerContactEntity,
} from "../modules/customers/customer.types";
import {
  OrderEntity,
  OrderItemEntity,
  OrderPaymentEntity,
  OrderStateTransitionEntity,
} from "../modules/orders/order.types";

export interface IdempotencyRecord {
  id: string;
  organizationId: string;
  idempotencyKey: string;
  resourceType: string;
  requestHash?: string;
  status: "PROCESSING" | "COMPLETED" | "FAILED";
  responseCode?: number;
  responseBody?: any;
  userId?: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}


export const DEFAULT_SYSTEM_MODULES: { key: SystemModuleKey; name: string; category: string }[] = [
  { key: "core_erp", name: "Core ERP & Cadastros Básicos", category: "CORE" },
  { key: "catalog_inventory", name: "Catálogo de Joias & Ledger de Estoque", category: "COMMERCIAL" },
  { key: "consignments", name: "Gestão de Consignações & Maletas", category: "VERTICAL_SEMIJOIAS" },
  { key: "commission_engine", name: "Motor de Comissões Escalonadas", category: "VERTICAL_SEMIJOIAS" },
  { key: "digital_warranty", name: "Passaporte de Garantia Digital QR", category: "VERTICAL_SEMIJOIAS" },
  { key: "custom_jewelry", name: "Estúdio de Joias Personalizadas", category: "VERTICAL_SEMIJOIAS" },
  { key: "ecommerce_storefront", name: "E-commerce do Comprador & Vitrine", category: "ECOMMERCE" },
  { key: "custom_domain_ssl", name: "Domínio Próprio & SSL Gerenciado", category: "INFRA" },
  { key: "webhooks_api", name: "Webhooks Externos & Event-Driven API", category: "INTEGRATION" },
  { key: "ai_copilot_mcp", name: "AI Copilot & MCP Gateway", category: "AI" },
  { key: "security_lgpd", name: "Auditoria de Segurança & LGPD", category: "GOVERNANCE" },
];

export const INITIAL_PLANS: PlanDefinition[] = [
  {
    id: "TRIAL_30D",
    name: "Trial Grátis 30 Dias (Full Experience)",
    priceMonthlyBrl: 0.00,
    trialDays: 30,
    maxUsers: 5,
    maxProducts: 2000,
    maxResellers: 100,
    allowedModules: [
      "core_erp",
      "catalog_inventory",
      "consignments",
      "commission_engine",
      "digital_warranty",
      "custom_jewelry",
      "ecommerce_storefront",
      "custom_domain_ssl",
      "webhooks_api",
      "ai_copilot_mcp",
      "security_lgpd",
    ],
    description: "Acesso total a todos os módulos do ERP, Consignação e E-commerce por 30 dias sem compromisso.",
    highlightBadge: "TESTE GRÁTIS",
  },
  {
    id: "STARTER",
    name: "Starter (Varejo Essencial)",
    priceMonthlyBrl: 129.00,
    trialDays: 0,
    maxUsers: 2,
    maxProducts: 500,
    maxResellers: 10,
    allowedModules: [
      "core_erp",
      "catalog_inventory",
      "ecommerce_storefront",
      "digital_warranty",
    ],
    description: "Ideal para lojas físicas iniciantes e ateliês que precisam de catálogo e controle básico de pedidos.",
  },
  {
    id: "PRO",
    name: "Profissional (Consignação & Revendedoras)",
    priceMonthlyBrl: 289.00,
    trialDays: 0,
    maxUsers: 8,
    maxProducts: 5000,
    maxResellers: 80,
    allowedModules: [
      "core_erp",
      "catalog_inventory",
      "consignments",
      "commission_engine",
      "digital_warranty",
      "custom_jewelry",
      "ecommerce_storefront",
      "custom_domain_ssl",
      "webhooks_api",
      "security_lgpd",
    ],
    description: "Para marcas e distribuidoras que operam com rede de revendedoras em consignação e comissões automáticas.",
    highlightBadge: "MAIS POPULAR",
  },
  {
    id: "ENTERPRISE",
    name: "Enterprise & Franquias",
    priceMonthlyBrl: 589.00,
    trialDays: 0,
    maxUsers: 50,
    maxProducts: 999999,
    maxResellers: 9999,
    allowedModules: [
      "core_erp",
      "catalog_inventory",
      "consignments",
      "commission_engine",
      "digital_warranty",
      "custom_jewelry",
      "ecommerce_storefront",
      "custom_domain_ssl",
      "webhooks_api",
      "ai_copilot_mcp",
      "security_lgpd",
    ],
    description: "Infraestrutura dedicada, AI Copilot ilimitado, multi-filiais, suporte prioritário e SLA de 99.9%.",
  },
];

// In-Memory Database Store Initialized with Lumina Semijoias
class DatabaseStore {
  public organizations: Map<string, OrganizationEntity> = new Map();
  public users: Map<string, UserEntity> = new Map();
  public members: Map<string, OrganizationMemberEntity> = new Map();
  public subscriptions: Map<string, SubscriptionEntity> = new Map();
  public organizationModules: Map<string, OrganizationModuleEntity[]> = new Map();
  public plans: Map<string, PlanDefinition> = new Map();
  public products: Map<string, ProductEntity> = new Map();
  public inventoryMovements: Map<string, InventoryMovementEntity> = new Map();
  public inventoryLocations: Map<string, InventoryLocationEntity> = new Map();
  public inventoryBalances: Map<string, InventoryBalanceEntity> = new Map();
  public inventoryReservations: Map<string, InventoryReservationEntity> = new Map();
  public idempotencyKeys: Map<string, IdempotencyRecord> = new Map();
  public customers: Map<string, CustomerEntity> = new Map();
  public customerAddresses: Map<string, CustomerAddressEntity> = new Map();
  public customerContacts: Map<string, CustomerContactEntity> = new Map();
  public orders: Map<string, OrderEntity> = new Map();
  public orderItems: Map<string, OrderItemEntity> = new Map();
  public orderPayments: Map<string, OrderPaymentEntity> = new Map();
  public orderStateTransitions: Map<string, OrderStateTransitionEntity> = new Map();

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    // 1. Load Plans
    INITIAL_PLANS.forEach((plan) => this.plans.set(plan.id, plan));

    // 2. Organization: Lumina Semijoias
    const orgLumina: OrganizationEntity = {
      id: "org-lumina-01",
      name: "Lumina Semijoias & Alta Joalheria",
      slug: "lumina",
      document: "48.291.802/0001-94",
      segment: "SEMIJOIAS",
      logoUrl: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=200&auto=format&fit=crop&q=80",
      city: "Limeira",
      state: "SP",
      contactEmail: "contato@luminasemijoias.com.br",
      contactWhatsapp: "+55 (19) 98765-4321",
      customDomain: "loja.aura.com",
      customDomainStatus: "ACTIVE",
      status: "ACTIVE",
      createdAt: "2026-08-01 10:00",
      updatedAt: "2026-08-20 18:00",
    };
    this.organizations.set(orgLumina.id, orgLumina);

    // 3. Super Admin & Owner User
    const userAdmin: UserEntity = {
      id: "usr-admin-01",
      name: "Willian C. Lima",
      email: "willianCLima@gmail.com",
      passwordHash: "demo_hash_bcrypt_super_secure",
      phone: "+55 (19) 99876-5432",
      isPlatformSuperAdmin: true,
      status: "ACTIVE",
      createdAt: "2026-08-01 10:00",
      lastLoginAt: new Date().toISOString().replace("T", " ").substring(0, 16),
    };
    this.users.set(userAdmin.id, userAdmin);

    // 4. Membership
    const memberLumina: OrganizationMemberEntity = {
      id: "mem-01",
      organizationId: orgLumina.id,
      userId: userAdmin.id,
      role: "OWNER",
      customPermissions: ["*"],
      status: "ACTIVE",
      createdAt: "2026-08-01 10:00",
    };
    this.members.set(memberLumina.id, memberLumina);

    // 5. Subscription (Trial 30 days active with 20 days remaining)
    const now = new Date();
    const trialStart = new Date(now.getTime() - 10 * 86400000);
    const trialEnd = new Date(now.getTime() + 20 * 86400000);

    const subscription: SubscriptionEntity = {
      id: "sub-lumina-01",
      organizationId: orgLumina.id,
      planId: "TRIAL_30D",
      status: "TRIALING",
      trialStartedAt: trialStart.toISOString().replace("T", " ").substring(0, 16),
      trialEndsAt: trialEnd.toISOString().replace("T", " ").substring(0, 16),
      currentPeriodStart: trialStart.toISOString().replace("T", " ").substring(0, 16),
      currentPeriodEnd: trialEnd.toISOString().replace("T", " ").substring(0, 16),
      paymentMethod: "MANUAL_TRIAL",
      autoRenew: true,
      createdAt: trialStart.toISOString().replace("T", " ").substring(0, 16),
      updatedAt: now.toISOString().replace("T", " ").substring(0, 16),
    };
    this.subscriptions.set(orgLumina.id, subscription);

    // 6. Organization Modules Activated
    const initialOrgModules: OrganizationModuleEntity[] = DEFAULT_SYSTEM_MODULES.map((mod) => ({
      id: `mod-${orgLumina.id}-${mod.key}`,
      organizationId: orgLumina.id,
      moduleKey: mod.key,
      isEnabled: true,
      activatedAt: trialStart.toISOString().replace("T", " ").substring(0, 16),
    }));
    this.organizationModules.set(orgLumina.id, initialOrgModules);

    // 7. Seed Inventory Locations for Lumina Semijoias
    const locations: InventoryLocationEntity[] = [
      {
        id: "loc-lumina-matriz",
        organizationId: orgLumina.id,
        name: "Matriz Limeira - Showroom Principal",
        type: "HEADQUARTERS",
        code: "MATRIZ",
        description: "Estoque central do showroom principal da fábrica em Limeira",
        isActive: true,
        createdAt: "2026-08-01 10:00",
      },
      {
        id: "loc-lumina-deposito",
        organizationId: orgLumina.id,
        name: "Depósito Central de Expedição",
        type: "WAREHOUSE",
        code: "DEPOSITO-EXP",
        description: "Almoxarifado e estoque pulmão para pedidos e e-commerce",
        isActive: true,
        createdAt: "2026-08-01 10:00",
      },
      {
        id: "loc-lumina-maleta-ana",
        organizationId: orgLumina.id,
        name: "Maleta Revendedora - Ana Beatriz (Campinas)",
        type: "RESELLER_BAG",
        code: "MALETA-ANA",
        description: "Maleta em consignação com a consultora líder Ana Beatriz",
        isActive: true,
        createdAt: "2026-08-01 10:00",
      },
      {
        id: "loc-lumina-maleta-juliana",
        organizationId: orgLumina.id,
        name: "Maleta Revendedora - Juliana Rossi (Limeira)",
        type: "RESELLER_BAG",
        code: "MALETA-JULIANA",
        description: "Maleta em consignação com a consultora Juliana Rossi",
        isActive: true,
        createdAt: "2026-08-01 10:00",
      },
    ];

    locations.forEach((loc) => this.inventoryLocations.set(loc.id, loc));

    // 8. Seed Initial Products (ERP Domain) for Lumina and Inventory Balances
    const initialProducts: Array<{ entity: ProductEntity; initialPhysical: number; initialConsigned: number }> = [
      {
        entity: {
          id: "prod-lumina-01",
          organizationId: orgLumina.id,
          sku: "COL-00125",
          name: "Colar Riviera Cravejado Zircônias",
          category: "COLARES",
          collection: "Alta Noite & Festas",
          material: "Liga Nobre Hipoalergênica",
          bath: "OURO_18K",
          stones: ["Zircônia Cristal 3mm", "Zircônia Baguete"],
          price: 389.9,
          costPrice: 85.0,
          promoPrice: 349.9,
          warrantyMonths: 12,
          isCustomizable: false,
          imageUrl: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&auto=format&fit=crop&q=80",
          description: "Colar Riviera de brilho intenso com cravamento contínuo em garras e fecho joalheria com trava dupla de segurança.",
          status: "ATIVO",
          createdAt: "2026-08-05 09:00",
          updatedAt: "2026-08-15 14:00",
        },
        initialPhysical: 24,
        initialConsigned: 18,
      },
      {
        entity: {
          id: "prod-lumina-02",
          organizationId: orgLumina.id,
          sku: "BR-00192",
          name: "Brinco Gota Esmeralda Fusion",
          category: "BRINCOS",
          collection: "Gemas Brasileiras",
          material: "Semijoia Hipoalergênica",
          bath: "RODIO_BRANCO",
          stones: ["Esmeralda Colombiana Fusion", "Microzircônias"],
          price: 189.0,
          costPrice: 42.0,
          warrantyMonths: 12,
          isCustomizable: false,
          imageUrl: "https://images.unsplash.com/photo-1630019852942-f89202989a59?w=600&auto=format&fit=crop&q=80",
          description: "Brinco gota em pedra fusion esmeralda com cravação pavê em microzircônias brilhantes e pino reforçado.",
          status: "ATIVO",
          createdAt: "2026-08-06 11:30",
          updatedAt: "2026-08-16 10:00",
        },
        initialPhysical: 35,
        initialConsigned: 22,
      },
      {
        entity: {
          id: "prod-lumina-03",
          organizationId: orgLumina.id,
          sku: "AN-00340",
          name: "Anel Solitário Coroa Imperial 6mm",
          category: "ANEIS",
          collection: "Amor Eterno",
          material: "Prata 925 com banho triplo",
          bath: "OURO_18K",
          stones: ["Zircônia Central 6mm"],
          price: 159.0,
          costPrice: 32.0,
          warrantyMonths: 12,
          isCustomizable: false,
          imageUrl: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600&auto=format&fit=crop&q=80",
          description: "Anel solitário clássico com galeria trabalhada, garantindo alta reflexão de luz e conforto anatômico no aro.",
          status: "ATIVO",
          createdAt: "2026-08-07 14:00",
          updatedAt: "2026-08-17 16:20",
        },
        initialPhysical: 18,
        initialConsigned: 15,
      },
      {
        entity: {
          id: "prod-lumina-04",
          organizationId: orgLumina.id,
          sku: "PERS-0080",
          name: "Colar Placa Personalizada com Gravação & Ponto de Luz",
          category: "PERSONALIZADOS",
          collection: "Linha Afetiva",
          material: "Latão Nobre Estampado",
          bath: "OURO_18K",
          stones: ["Zircônia Ponto de Luz 2mm"],
          price: 249.0,
          costPrice: 55.0,
          warrantyMonths: 12,
          isCustomizable: true,
          imageUrl: "https://images.unsplash.com/photo-1611591475155-42864299616f?w=600&auto=format&fit=crop&q=80",
          description: "Peça personalizada sob demanda com gravação a laser profunda de nome, iniciais ou data com acabamento espelhado.",
          status: "ATIVO",
          createdAt: "2026-08-08 10:15",
          updatedAt: "2026-08-18 11:00",
        },
        initialPhysical: 50,
        initialConsigned: 0,
      },
      {
        entity: {
          id: "prod-lumina-05",
          organizationId: orgLumina.id,
          sku: "PUL-00210",
          name: "Pulseira Elo Português com Berloques de Pérola",
          category: "PULSEIRAS",
          collection: "Clássicos do Dia a Dia",
          material: "Semijoia",
          bath: "ROSE_GOLD",
          stones: ["Pérolas Naturais Cultivadas"],
          price: 219.0,
          costPrice: 48.0,
          warrantyMonths: 12,
          isCustomizable: false,
          imageUrl: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600&auto=format&fit=crop&q=80",
          description: "Pulseira elegante em elos estruturados com acabamento em ouro rosé e delicadas pérolas selecionadas.",
          status: "ATIVO",
          createdAt: "2026-08-09 15:40",
          updatedAt: "2026-08-19 09:30",
        },
        initialPhysical: 12,
        initialConsigned: 8,
      },
      {
        entity: {
          id: "prod-lumina-06",
          organizationId: orgLumina.id,
          sku: "CONJ-0099",
          name: "Conjunto Gotas Turmalina Paraíba (Colar + Brinco)",
          category: "CONJUNTOS",
          collection: "Pedras Raras",
          material: "Liga Antialérgica",
          bath: "RODIO_NEGRO",
          stones: ["Turmalina Paraíba Fusion", "Zircônias Negras"],
          price: 459.0,
          costPrice: 110.0,
          warrantyMonths: 12,
          isCustomizable: false,
          imageUrl: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600&auto=format&fit=crop&q=80",
          description: "Conjunto exclusivo em banho de ródio negro e pedra neon turmalina paraíba, destaque absoluto em eventos sofisticados.",
          status: "ATIVO",
          createdAt: "2026-08-10 16:20",
          updatedAt: "2026-08-20 17:00",
        },
        initialPhysical: 8,
        initialConsigned: 10,
      },
    ];

    initialProducts.forEach(({ entity, initialPhysical, initialConsigned }) => {
      this.products.set(entity.id, entity);

      // Distribute Physical Stock between Matriz (60%) and Depósito (40%)
      const matrizOnHand = Math.ceil(initialPhysical * 0.6);
      const depositoOnHand = initialPhysical - matrizOnHand;
      // Reserved quantity (simulated active orders)
      const matrizReserved = matrizOnHand > 5 ? 2 : 0;

      // Balance for Matriz
      const balMatriz: InventoryBalanceEntity = {
        id: `bal-${entity.id}-matriz`,
        organizationId: orgLumina.id,
        productId: entity.id,
        locationId: "loc-lumina-matriz",
        onHandQuantity: matrizOnHand,
        reservedQuantity: matrizReserved,
        availableQuantity: matrizOnHand - matrizReserved,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
      };
      this.inventoryBalances.set(`${orgLumina.id}:${entity.id}:loc-lumina-matriz`, balMatriz);

      // Balance for Depósito
      const balDeposito: InventoryBalanceEntity = {
        id: `bal-${entity.id}-deposito`,
        organizationId: orgLumina.id,
        productId: entity.id,
        locationId: "loc-lumina-deposito",
        onHandQuantity: depositoOnHand,
        reservedQuantity: 0,
        availableQuantity: depositoOnHand,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
      };
      this.inventoryBalances.set(`${orgLumina.id}:${entity.id}:loc-lumina-deposito`, balDeposito);

      // If consigned, distribute between Maleta Ana and Maleta Juliana
      if (initialConsigned > 0) {
        const anaOnHand = Math.ceil(initialConsigned * 0.6);
        const julianaOnHand = initialConsigned - anaOnHand;

        const balAna: InventoryBalanceEntity = {
          id: `bal-${entity.id}-maleta-ana`,
          organizationId: orgLumina.id,
          productId: entity.id,
          locationId: "loc-lumina-maleta-ana",
          onHandQuantity: anaOnHand,
          reservedQuantity: 0,
          availableQuantity: anaOnHand,
          createdAt: entity.updatedAt,
          updatedAt: entity.updatedAt,
        };
        this.inventoryBalances.set(`${orgLumina.id}:${entity.id}:loc-lumina-maleta-ana`, balAna);

        if (julianaOnHand > 0) {
          const balJuliana: InventoryBalanceEntity = {
            id: `bal-${entity.id}-maleta-juliana`,
            organizationId: orgLumina.id,
            productId: entity.id,
            locationId: "loc-lumina-maleta-juliana",
            onHandQuantity: julianaOnHand,
            reservedQuantity: 0,
            availableQuantity: julianaOnHand,
            createdAt: entity.updatedAt,
            updatedAt: entity.updatedAt,
          };
          this.inventoryBalances.set(`${orgLumina.id}:${entity.id}:loc-lumina-maleta-juliana`, balJuliana);
        }
      }

      // Seed Initial Purchase Ledger Movement
      const purchaseMovementId = `mov-init-${entity.id}`;
      const totalPurchased = initialPhysical + initialConsigned;
      this.inventoryMovements.set(purchaseMovementId, {
        id: purchaseMovementId,
        organizationId: orgLumina.id,
        productId: entity.id,
        locationId: "loc-lumina-matriz",
        type: "PURCHASE",
        quantityChange: totalPurchased,
        physicalBalanceAfter: totalPurchased,
        consignedBalanceAfter: 0,
        onHandAfter: totalPurchased,
        reservedAfter: 0,
        availableAfter: totalPurchased,
        referenceType: "INITIAL_STOCK",
        referenceId: "LOTE-INICIAL-2026",
        operatorName: "Gestão Matriz (Lumina)",
        notes: "Entrada inicial de lote de fabricação / galvanoplastia",
        createdAt: entity.createdAt,
      });

      // If there is consigned stock, seed consignment movement
      if (initialConsigned > 0) {
        const consignMovementId = `mov-consign-${entity.id}`;
        this.inventoryMovements.set(consignMovementId, {
          id: consignMovementId,
          organizationId: orgLumina.id,
          productId: entity.id,
          locationId: "loc-lumina-maleta-ana",
          type: "CONSIGNMENT_OUT",
          quantityChange: -initialConsigned,
          physicalBalanceAfter: initialPhysical,
          consignedBalanceAfter: initialConsigned,
          onHandAfter: initialPhysical,
          reservedAfter: matrizReserved,
          availableAfter: initialPhysical - matrizReserved,
          referenceType: "CONSIGNMENT",
          referenceId: "MALETA-01-CAMPINAS",
          operatorName: "Expedição Consignados",
          notes: "Envio de mostruário para rede de revendedoras de Campinas/Limeira",
          createdAt: entity.updatedAt,
        });
      }
    });

    // 9. Seed Initial Customers (PF & PJ Multi-Tenant)
    const custCamilaPF: CustomerEntity = {
      id: "cust-lumina-01",
      organizationId: orgLumina.id,
      personType: "PF",
      fullName: "Camila Guimarães Rocha",
      cpf: "342.891.758-20",
      rg: "44.921.802-X",
      birthDate: "1992-05-14",
      gender: "F",
      primaryEmail: "camila.guimaraes@gmail.com",
      primaryPhone: "+55 (19) 99123-4567",
      whatsapp: "+55 (19) 99123-4567",
      status: "ACTIVE",
      customerTier: "VIP",
      notes: "Cliente VIP frequente de colares riviera e personalizações com gravação a laser.",
      createdAt: "2026-08-02 11:00",
      updatedAt: "2026-08-18 16:30",
    };

    const custAddressCamila: CustomerAddressEntity = {
      id: "addr-camila-01",
      organizationId: orgLumina.id,
      customerId: custCamilaPF.id,
      type: "SHIPPING",
      recipientName: "Camila Guimarães Rocha",
      zipCode: "13480-010",
      street: "Rua Santa Cruz",
      number: "450",
      complement: "Apto 82 - Torre Diamante",
      neighborhood: "Centro",
      city: "Limeira",
      state: "SP",
      country: "BRA",
      referencePoint: "Próximo à Praça Toledo Barros",
      isDefault: true,
      createdAt: "2026-08-02 11:00",
    };

    const custBoutiquePJ: CustomerEntity = {
      id: "cust-lumina-02",
      organizationId: orgLumina.id,
      personType: "PJ",
      fullName: "Boutique Elegance Joias & Acessórios Ltda",
      companyName: "Boutique Elegance Joias & Acessórios Ltda",
      tradeName: "Boutique Elegance Campinas",
      cnpj: "18.394.029/0001-55",
      stateRegistration: "244.891.023.110",
      isStateRegistrationExempt: false,
      primaryEmail: "compras@boutiqueelegance.com.br",
      primaryPhone: "+55 (19) 3234-8899",
      whatsapp: "+55 (19) 98822-3344",
      status: "ACTIVE",
      customerTier: "WHOLESALE",
      notes: "Boutique parceira para compras de atacado e revenda com mostruário próprio.",
      createdAt: "2026-08-03 09:30",
      updatedAt: "2026-08-12 14:20",
    };

    const custAddressBoutique: CustomerAddressEntity = {
      id: "addr-boutique-01",
      organizationId: orgLumina.id,
      customerId: custBoutiquePJ.id,
      type: "MAIN",
      recipientName: "Boutique Elegance - Depto Compras",
      zipCode: "13025-020",
      street: "Avenida Coronel Silva Telles",
      number: "880",
      complement: "Loja 04 - Galeria Cambuí",
      neighborhood: "Cambuí",
      city: "Campinas",
      state: "SP",
      country: "BRA",
      isDefault: true,
      createdAt: "2026-08-03 09:30",
    };

    const custContactBoutique: CustomerContactEntity = {
      id: "cont-boutique-01",
      organizationId: orgLumina.id,
      customerId: custBoutiquePJ.id,
      label: "Comprador Responsável",
      contactName: "Mariana Prado",
      email: "mariana.prado@boutiqueelegance.com.br",
      phone: "+55 (19) 98822-3344",
      isNfeRecipient: true,
      createdAt: "2026-08-03 09:30",
    };

    this.customers.set(custCamilaPF.id, custCamilaPF);
    this.customerAddresses.set(custAddressCamila.id, custAddressCamila);
    this.customers.set(custBoutiquePJ.id, custBoutiquePJ);
    this.customerAddresses.set(custAddressBoutique.id, custAddressBoutique);
    this.customerContacts.set(custContactBoutique.id, custContactBoutique);

    // 10. Seed Initial Orders with Immutable Product Snapshots & FSM States
    const prod01 = this.products.get("prod-lumina-01")!;
    const prod02 = this.products.get("prod-lumina-02")!;

    // Order 1: Paid E-commerce Order
    const order01: OrderEntity = {
      id: "ord-lumina-1842",
      organizationId: orgLumina.id,
      orderNumber: "ORD-2026-1842",
      customerId: custCamilaPF.id,
      customerSnapshot: {
        id: custCamilaPF.id,
        personType: "PF",
        name: custCamilaPF.fullName,
        document: custCamilaPF.cpf!,
        email: custCamilaPF.primaryEmail,
        phone: custCamilaPF.primaryPhone,
      },
      channel: "ECOMMERCE",
      status: "PAID",
      shippingAddress: {
        recipientName: custAddressCamila.recipientName,
        zipCode: custAddressCamila.zipCode,
        street: custAddressCamila.street,
        number: custAddressCamila.number,
        complement: custAddressCamila.complement,
        neighborhood: custAddressCamila.neighborhood,
        city: custAddressCamila.city,
        state: custAddressCamila.state,
        country: custAddressCamila.country,
        phone: custCamilaPF.primaryPhone,
      },
      currency: "BRL",
      subtotalAmount: 578.9,
      discountAmount: 20.0,
      shippingAmount: 25.0,
      totalAmount: 583.9,
      resellerId: "res-01",
      resellerName: "Ana Beatriz (Campinas)",
      resellerCommissionRate: 25,
      resellerCommissionAmount: 139.72,
      warrantyCode: "GRT-8F2A9D",
      idempotencyKey: "idem-checkout-ord-1842",
      createdAt: "2026-08-20 14:30",
      updatedAt: "2026-08-20 14:35",
    };

    const orderItem01: OrderItemEntity = {
      id: "item-ord1-01",
      organizationId: orgLumina.id,
      orderId: order01.id,
      productId: prod01.id,
      locationId: "loc-lumina-matriz",
      productSnapshot: {
        productId: prod01.id,
        sku: prod01.sku,
        name: prod01.name,
        category: prod01.category,
        collection: prod01.collection,
        material: prod01.material,
        bath: prod01.bath,
        stones: prod01.stones,
        price: prod01.price,
        costPrice: prod01.costPrice,
        promoPrice: prod01.promoPrice,
        warrantyMonths: prod01.warrantyMonths,
        isCustomizable: prod01.isCustomizable,
        imageUrl: prod01.imageUrl,
        description: prod01.description,
        snapshotTimestamp: "2026-08-20 14:30",
      },
      quantity: 1,
      unitPrice: 389.9,
      costPriceSnapshot: 85.0,
      discountAmount: 20.0,
      totalAmount: 369.9,
      customizationSpec: {
        engravingName: "Camila & Rafael",
        fontStyle: "CURSIVA",
        gemStone: "ZIRCONIA_CRISTAL",
        bathFinish: "OURO_18K",
        chainLengthCm: 45,
        giftBox: true,
        specialNotes: "Embalar com laço de veludo dourado",
      },
      createdAt: "2026-08-20 14:30",
    };

    const orderItem02: OrderItemEntity = {
      id: "item-ord1-02",
      organizationId: orgLumina.id,
      orderId: order01.id,
      productId: prod02.id,
      locationId: "loc-lumina-matriz",
      productSnapshot: {
        productId: prod02.id,
        sku: prod02.sku,
        name: prod02.name,
        category: prod02.category,
        collection: prod02.collection,
        material: prod02.material,
        bath: prod02.bath,
        stones: prod02.stones,
        price: prod02.price,
        costPrice: prod02.costPrice,
        warrantyMonths: prod02.warrantyMonths,
        isCustomizable: prod02.isCustomizable,
        imageUrl: prod02.imageUrl,
        snapshotTimestamp: "2026-08-20 14:30",
      },
      quantity: 1,
      unitPrice: 189.0,
      costPriceSnapshot: 42.0,
      discountAmount: 0.0,
      totalAmount: 189.0,
      createdAt: "2026-08-20 14:30",
    };

    const orderPayment01: OrderPaymentEntity = {
      id: "pay-ord1-01",
      organizationId: orgLumina.id,
      orderId: order01.id,
      paymentMethod: "PIX",
      gateway: "MERCADOPAGO",
      gatewayTransactionId: "mp_pix_99182371289",
      status: "PAID",
      amount: 583.9,
      installments: 1,
      pixQrCodeUrl: "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=00020126580014br.gov.bcb.pix0136lumina-pix-18425204000053039865802BR5925Lumina+Semijoias+Limeira6009SAO+PAULO62070503***6304E8A2",
      pixCopyPaste: "00020126580014br.gov.bcb.pix0136lumina-pix-18425204000053039865802BR5925Lumina+Semijoias+Limeira6009SAO+PAULO62070503***6304E8A2",
      paidAt: "2026-08-20 14:35",
      createdAt: "2026-08-20 14:30",
      updatedAt: "2026-08-20 14:35",
    };

    const trans01: OrderStateTransitionEntity = {
      id: "trans-ord1-01",
      organizationId: orgLumina.id,
      orderId: order01.id,
      fromStatus: "DRAFT",
      toStatus: "INVENTORY_RESERVED",
      event: "SUBMIT_ORDER",
      operatorName: "Camila Guimarães (Checkout Web)",
      createdAt: "2026-08-20 14:30",
    };

    const trans02: OrderStateTransitionEntity = {
      id: "trans-ord1-02",
      organizationId: orgLumina.id,
      orderId: order01.id,
      fromStatus: "INVENTORY_RESERVED",
      toStatus: "AWAITING_PAYMENT",
      event: "REQUEST_PAYMENT",
      operatorName: "MercadoPago Gateway",
      metadata: { reservationTtlMinutes: 15, lockedBalances: ["bal-prod-lumina-01-matriz", "bal-prod-lumina-02-matriz"] },
      createdAt: "2026-08-20 14:31",
    };

    const trans03: OrderStateTransitionEntity = {
      id: "trans-ord1-03",
      organizationId: orgLumina.id,
      orderId: order01.id,
      fromStatus: "AWAITING_PAYMENT",
      toStatus: "PAID",
      event: "CONFIRM_PAYMENT",
      operatorName: "Instant PIX Listener",
      reason: "PIX liquidado no BACEN com sucesso.",
      metadata: { transactionId: "mp_pix_99182371289", stockConfirmedDeduction: true },
      createdAt: "2026-08-20 14:35",
    };

    this.orders.set(order01.id, order01);
    this.orderItems.set(orderItem01.id, orderItem01);
    this.orderItems.set(orderItem02.id, orderItem02);
    this.orderPayments.set(orderPayment01.id, orderPayment01);
    this.orderStateTransitions.set(trans01.id, trans01);
    this.orderStateTransitions.set(trans02.id, trans02);
    this.orderStateTransitions.set(trans03.id, trans03);

    // Order 2: Presential POS Order (Showroom Limeira) - FULFILLED
    const prod03 = this.products.get("prod-lumina-03")!;
    const order02: OrderEntity = {
      id: "ord-lumina-1843",
      organizationId: orgLumina.id,
      orderNumber: "ORD-2026-1843",
      customerId: custCamilaPF.id,
      customerSnapshot: {
        id: custCamilaPF.id,
        personType: "PF",
        name: custCamilaPF.fullName,
        document: custCamilaPF.cpf!,
        email: custCamilaPF.primaryEmail,
        phone: custCamilaPF.primaryPhone,
      },
      channel: "PRESENTIAL_POS",
      status: "FULFILLED",
      shippingAddress: {
        recipientName: custCamilaPF.fullName,
        zipCode: "13480-000",
        street: "Retirada Balcão Showroom",
        number: "S/N",
        neighborhood: "Centro",
        city: "Limeira",
        state: "SP",
        country: "BRA",
        phone: custCamilaPF.primaryPhone,
      },
      currency: "BRL",
      subtotalAmount: 318.0,
      discountAmount: 18.0,
      shippingAmount: 0.0,
      totalAmount: 300.0,
      warrantyCode: "GRT-7C4E1A",
      operatorName: "Luciana Vendas (Balcão Matriz)",
      createdAt: "2026-08-21 11:15",
      updatedAt: "2026-08-21 11:20",
    };

    const orderItem03: OrderItemEntity = {
      id: "item-ord2-01",
      organizationId: orgLumina.id,
      orderId: order02.id,
      productId: prod03.id,
      locationId: "loc-lumina-matriz",
      productSnapshot: {
        productId: prod03.id,
        sku: prod03.sku,
        name: prod03.name,
        category: prod03.category,
        collection: prod03.collection,
        material: prod03.material,
        bath: prod03.bath,
        stones: prod03.stones,
        price: prod03.price,
        costPrice: prod03.costPrice,
        warrantyMonths: prod03.warrantyMonths,
        isCustomizable: false,
        imageUrl: prod03.imageUrl,
        snapshotTimestamp: "2026-08-21 11:15",
      },
      quantity: 2,
      unitPrice: 159.0,
      costPriceSnapshot: 32.0,
      discountAmount: 18.0,
      totalAmount: 300.0,
      createdAt: "2026-08-21 11:15",
    };

    const orderPayment02: OrderPaymentEntity = {
      id: "pay-ord2-01",
      organizationId: orgLumina.id,
      orderId: order02.id,
      paymentMethod: "CREDIT_CARD",
      gateway: "POS_REDE",
      gatewayTransactionId: "rede_tef_8849102",
      status: "PAID",
      amount: 300.0,
      installments: 3,
      paidAt: "2026-08-21 11:18",
      createdAt: "2026-08-21 11:15",
      updatedAt: "2026-08-21 11:18",
    };

    const trans02_1: OrderStateTransitionEntity = {
      id: "trans-ord2-01",
      organizationId: orgLumina.id,
      orderId: order02.id,
      fromStatus: "DRAFT",
      toStatus: "PAID",
      event: "CONFIRM_PAYMENT",
      operatorName: "Luciana Vendas",
      reason: "Venda presencial aprovada na maquininha TEF.",
      createdAt: "2026-08-21 11:18",
    };

    const trans02_2: OrderStateTransitionEntity = {
      id: "trans-ord2-02",
      organizationId: orgLumina.id,
      orderId: order02.id,
      fromStatus: "PAID",
      toStatus: "FULFILLED",
      event: "COMPLETE_FULFILLMENT",
      operatorName: "Luciana Vendas",
      reason: "Semijoias entregues em mãos com termo de garantia digital.",
      createdAt: "2026-08-21 11:20",
    };

    this.orders.set(order02.id, order02);
    this.orderItems.set(orderItem03.id, orderItem03);
    this.orderPayments.set(orderPayment02.id, orderPayment02);
    this.orderStateTransitions.set(trans02_1.id, trans02_1);
    this.orderStateTransitions.set(trans02_2.id, trans02_2);

    // Order 3: B2B Wholesale Order (Boutique PJ) - AWAITING_PAYMENT
    const order03: OrderEntity = {
      id: "ord-lumina-1844",
      organizationId: orgLumina.id,
      orderNumber: "ORD-2026-1844",
      customerId: custBoutiquePJ.id,
      customerSnapshot: {
        id: custBoutiquePJ.id,
        personType: "PJ",
        name: custBoutiquePJ.tradeName || custBoutiquePJ.companyName || "Boutique Elegance",
        document: custBoutiquePJ.cnpj!,
        email: custBoutiquePJ.primaryEmail,
        phone: custBoutiquePJ.primaryPhone,
        stateRegistration: custBoutiquePJ.stateRegistration,
      },
      channel: "B2B_RESELLER",
      status: "AWAITING_PAYMENT",
      shippingAddress: {
        recipientName: custAddressBoutique.recipientName,
        zipCode: custAddressBoutique.zipCode,
        street: custAddressBoutique.street,
        number: custAddressBoutique.number,
        complement: custAddressBoutique.complement,
        neighborhood: custAddressBoutique.neighborhood,
        city: custAddressBoutique.city,
        state: custAddressBoutique.state,
        country: custAddressBoutique.country,
        phone: custBoutiquePJ.primaryPhone,
      },
      currency: "BRL",
      subtotalAmount: 1890.0,
      discountAmount: 189.0, // 10% wholesale discount
      shippingAmount: 45.0,
      totalAmount: 1746.0,
      resellerId: "res-01",
      resellerName: "Ana Beatriz (Campinas)",
      resellerCommissionRate: 15,
      resellerCommissionAmount: 261.90,
      operatorName: "Roberto Silveira (Gerente Atacado)",
      createdAt: "2026-08-22 09:00",
      updatedAt: "2026-08-22 09:05",
    };

    const orderItem04: OrderItemEntity = {
      id: "item-ord3-01",
      organizationId: orgLumina.id,
      orderId: order03.id,
      productId: prod02.id,
      locationId: "loc-lumina-deposito",
      productSnapshot: {
        productId: prod02.id,
        sku: prod02.sku,
        name: prod02.name,
        category: prod02.category,
        collection: prod02.collection,
        material: prod02.material,
        bath: prod02.bath,
        stones: prod02.stones,
        price: prod02.price,
        costPrice: prod02.costPrice,
        warrantyMonths: prod02.warrantyMonths,
        isCustomizable: false,
        imageUrl: prod02.imageUrl,
        snapshotTimestamp: "2026-08-22 09:00",
      },
      quantity: 10,
      unitPrice: 189.0,
      costPriceSnapshot: 42.0,
      discountAmount: 189.0,
      totalAmount: 1701.0,
      createdAt: "2026-08-22 09:00",
    };

    const orderPayment03: OrderPaymentEntity = {
      id: "pay-ord3-01",
      organizationId: orgLumina.id,
      orderId: order03.id,
      paymentMethod: "BOLETO",
      gateway: "ASAAS",
      gatewayTransactionId: "asaas_bol_44819023",
      status: "PENDING",
      amount: 1746.0,
      installments: 1,
      boletoBarcode: "34191.79001 01043.510047 91020.150008 8 98450000174600",
      createdAt: "2026-08-22 09:05",
      updatedAt: "2026-08-22 09:05",
    };

    const trans03_1: OrderStateTransitionEntity = {
      id: "trans-ord3-01",
      organizationId: orgLumina.id,
      orderId: order03.id,
      fromStatus: "DRAFT",
      toStatus: "INVENTORY_RESERVED",
      event: "SUBMIT_ORDER",
      operatorName: "Roberto Silveira",
      createdAt: "2026-08-22 09:00",
    };

    const trans03_2: OrderStateTransitionEntity = {
      id: "trans-ord3-02",
      organizationId: orgLumina.id,
      orderId: order03.id,
      fromStatus: "INVENTORY_RESERVED",
      toStatus: "AWAITING_PAYMENT",
      event: "REQUEST_PAYMENT",
      operatorName: "Roberto Silveira",
      reason: "Boleto faturado para 15 dias emitido no Asaas.",
      createdAt: "2026-08-22 09:05",
    };

    this.orders.set(order03.id, order03);
    this.orderItems.set(orderItem04.id, orderItem04);
    this.orderPayments.set(orderPayment03.id, orderPayment03);
    this.orderStateTransitions.set(trans03_1.id, trans03_1);
    this.orderStateTransitions.set(trans03_2.id, trans03_2);
  }
}

export const dbStore = new DatabaseStore();


