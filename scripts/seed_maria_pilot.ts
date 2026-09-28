import { query, getPostgresPool } from "../server/db/postgres";
import { TenantContext } from "../server/db/tenantContext";

const MARIA_REAL_PRODUCTS = [
  {
    id: "prod-lumina-anel-001",
    sku: "ANEL-001",
    name: "Anel Solitário Minimalista Zircônia 6mm",
    category: "ANEIS",
    bath: "OURO_18K",
    costPrice: 25.0,
    price: 99.0,
    stock: 1, // Estoque = 1 para teste obrigatório de concorrência simultânea
    warrantyMonths: 12,
    imageUrl: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&auto=format&fit=crop&q=80",
    description: "Anel solitário clássico com pedra zircônia cristal lapidação brilhante 6mm, banho de ouro 18K antialérgico com verniz protetor italiano.",
  },
  {
    id: "prod-lumina-col-001",
    sku: "COL-001",
    name: "Colar Riviera Zircônias Cristal Cravação Francesa 45cm",
    category: "COLARES",
    bath: "RODIO_BRANCO",
    costPrice: 68.0,
    price: 249.0,
    stock: 3,
    warrantyMonths: 12,
    imageUrl: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&auto=format&fit=crop&q=80",
    description: "Colar riviera articulado com zircônias cúbicas cristal 3mm cravadas à mão, fecho joalheria com trava dupla de segurança, acabamento nobre em ródio branco.",
  },
  {
    id: "prod-lumina-bri-001",
    sku: "BRI-001",
    name: "Brinco Gota Fusion Esmeralda Colombiana Zircônias",
    category: "BRINCOS",
    bath: "OURO_18K",
    costPrice: 42.0,
    price: 159.0,
    stock: 6,
    warrantyMonths: 12,
    imageUrl: "https://images.unsplash.com/photo-1630019852942-f89202989a59?w=800&auto=format&fit=crop&q=80",
    description: "Brinco de gota com pedra fusion verde esmeralda colombiana rodeada por microzircônias cravejadas, brilho e profundidade únicos.",
  },
  {
    id: "prod-lumina-pul-001",
    sku: "PUL-001",
    name: "Pulseira Elo Português Fecho Boia 18cm",
    category: "PULSEIRAS",
    bath: "OURO_18K",
    costPrice: 49.0,
    price: 189.9,
    stock: 4,
    warrantyMonths: 12,
    imageUrl: "https://images.unsplash.com/photo-1611591475103-4fa1b7765a7f?w=800&auto=format&fit=crop&q=80",
    description: "Pulseira estruturada elos portugueses 6mm com fecho boia decorativo imponente, ideal para compor mixes contemporâneos.",
  },
  {
    id: "prod-lumina-garg-001",
    sku: "GARG-001",
    name: "Gargantilha Ponto de Luz Zircônia Redonda 40cm",
    category: "COLARES",
    bath: "OURO_18K",
    costPrice: 22.0,
    price: 89.9,
    stock: 8,
    warrantyMonths: 12,
    imageUrl: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&auto=format&fit=crop&q=80",
    description: "Corrente veneziana fina e delicada de 40cm com pingente ponto de luz solitário 5mm, a peça coringa essencial do dia a dia.",
  },
  {
    id: "prod-lumina-bri-002",
    sku: "BRI-002",
    name: "Brinco Argola Dupla Fio Quadrado Click",
    category: "BRINCOS",
    bath: "OURO_18K",
    costPrice: 28.0,
    price: 119.0,
    stock: 5,
    warrantyMonths: 12,
    imageUrl: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&auto=format&fit=crop&q=80",
    description: "Argola moderna com aro duplo geométrico de perfil quadrado e fecho click suave de alta fixação, banho ouro 18K 10 milésimos.",
  },
  {
    id: "prod-lumina-anel-002",
    sku: "ANEL-002",
    name: "Anel Meia Aliança Aparador Microcravado Zircônias",
    category: "ANEIS",
    bath: "OURO_18K",
    costPrice: 26.0,
    price: 109.9,
    stock: 7,
    warrantyMonths: 12,
    imageUrl: "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800&auto=format&fit=crop&q=80",
    description: "Meia aliança aparadora cravejada com duas fileiras de microzircônias cristal, acabamento liso e anatômico extremamente confortável.",
  },
  {
    id: "prod-lumina-pul-002",
    sku: "PUL-002",
    name: "Pulseira Veneziana Olho Grego Madre-Pérola",
    category: "PULSEIRAS",
    bath: "OURO_18K",
    costPrice: 36.0,
    price: 139.0,
    stock: 4,
    warrantyMonths: 12,
    imageUrl: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=800&auto=format&fit=crop&q=80",
    description: "Pulseira com elo veneziano e entremeio de olho grego trabalhado em madrepérola natural e zircônias azuis, amuleto de proteção com elegância.",
  },
  {
    id: "prod-lumina-col-002",
    sku: "COL-002",
    name: "Choker Fita Laminada Escama 35cm + 5cm",
    category: "COLARES",
    bath: "OURO_18K",
    costPrice: 45.0,
    price: 169.0,
    stock: 5,
    warrantyMonths: 12,
    imageUrl: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&auto=format&fit=crop&q=80",
    description: "Choker em fita maleável laminada textura escama de 4mm, caimento impecável no colo com extensor de 5cm e fecho lagosta.",
  },
  {
    id: "prod-lumina-conj-001",
    sku: "CONJ-001",
    name: "Conjunto Gota Turmalina Paraíba Brinco e Colar",
    category: "CONJUNTOS",
    bath: "RODIO_BRANCO",
    costPrice: 75.0,
    price: 289.0,
    stock: 3,
    warrantyMonths: 12,
    imageUrl: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&auto=format&fit=crop&q=80",
    description: "Conjunto luxo com colar e par de brincos cravejados com cristal tonalidade azul turmalina paraíba envoltos por halo de microzircônias brilhantes.",
  },
];

async function seedMariaPilot() {
  console.log("=================================================================");
  console.log("🚀 PILOTO COMERCIAL 01 — SEED DOS 10 PRODUTOS REAIS DA MARIA");
  console.log("=================================================================\n");

  const orgId = "org-lumina-01";

  await TenantContext.run({ tenantId: orgId, isSuperAdmin: true }, async () => {
    // 1. Garantir localização de estoque física matriz
    const locRes = await query(
      `INSERT INTO inventory_locations (
        id, organization_id, name, code, type, description, is_active, created_at
      ) VALUES ('loc-matriz-org-lumina-01', $1, 'Showroom Matriz Lumina', 'MATRIZ', 'HEADQUARTERS', 'Estoque principal da loja física e showroom', true, NOW())
      ON CONFLICT (organization_id, code) DO UPDATE SET name = EXCLUDED.name
      RETURNING id`,
      [orgId]
    );
    const locId = locRes.rows[0]?.id || "loc-matriz-org-lumina-01";
    console.log(`✅ Localização de estoque verificada: ${locId}`);

    // 2. Inserir os 10 produtos reais
    for (const p of MARIA_REAL_PRODUCTS) {
      const prodRes = await query(
        `INSERT INTO products (
          id, organization_id, sku, name, description, category, collection,
          material, bath, stones, price, cost_price, warranty_months,
          is_customizable, status, image_url, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, false, 'ATIVO', $14, NOW(), NOW())
        ON CONFLICT (organization_id, sku) DO UPDATE SET
          name = EXCLUDED.name,
          price = EXCLUDED.price,
          cost_price = EXCLUDED.cost_price,
          description = EXCLUDED.description,
          image_url = EXCLUDED.image_url,
          status = 'ATIVO'
        RETURNING id`,
        [
          p.id,
          orgId,
          p.sku,
          p.name,
          p.description,
          p.category,
          "Coleção Real Piloto 01",
          "Liga Nobre Antialérgica",
          p.bath,
          JSON.stringify(["Zircônia"]),
          p.price,
          p.costPrice,
          p.warrantyMonths,
          p.imageUrl,
        ]
      );
      const actualProdId = prodRes.rows[0]?.id || p.id;

      // Inserir saldo de estoque em inventory_balances
      const balId = `bal-${actualProdId}-${locId}`;
      await query(
        `INSERT INTO inventory_balances (
          id, organization_id, product_id, location_id, on_hand_quantity,
          reserved_quantity, available_quantity, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, 0, $5, NOW(), NOW())
        ON CONFLICT (product_id, location_id) DO UPDATE SET
          on_hand_quantity = EXCLUDED.on_hand_quantity,
          available_quantity = EXCLUDED.available_quantity`,
        [balId, orgId, actualProdId, locId, p.stock]
      );

      // Registrar movimento inicial de compra no ledger
      const movId = `mov-init-${actualProdId}`;
      await query(
        `INSERT INTO inventory_movements (
          id, organization_id, product_id, location_id, type, quantity_change,
          physical_balance_after, consigned_balance_after, on_hand_after,
          reserved_after, available_after, reference_type, operator_name, notes, created_at
        ) VALUES ($1, $2, $3, $4, 'PURCHASE', $5, $5, 0, $5, 0, $5, 'INITIAL_STOCK', 'Maria Silva (Dona)', 'Carga inicial do Piloto Comercial 01', NOW())
        ON CONFLICT (id) DO NOTHING`,
        [movId, orgId, actualProdId, locId, p.stock]
      );

      console.log(`  💎 [${p.sku}] ${p.name} -> Estoque: ${p.stock} | Preço: R$ ${p.price.toFixed(2)} | Custo: R$ ${p.costPrice.toFixed(2)}`);
    }

    // 3. Garantir Assinatura Piloto 01 (30 dias gratuitos - TRIALING)
    const future = new Date(Date.now() + 30 * 86400000);
    await query(
      `UPDATE subscriptions SET
        status = 'TRIALING',
        plan_id = 'PRO',
        trial_ends_at = $1,
        current_period_end = $1,
        updated_at = NOW()
      WHERE organization_id = $2`,
      [future.toISOString(), orgId]
    );

    // 4. Garantir que a organização está com Onboarding completo para aparecer ativa no catálogo
    await query(
      `UPDATE organizations SET
        name = 'Lumina Semijoias Finas',
        contact_whatsapp = '(19) 98765-4321',
        status = 'ACTIVE',
        updated_at = NOW()
      WHERE id = $1`,
      [orgId]
    );

    console.log(`\n✅ Assinatura da Loja Piloto 01 configurada: Status = TRIALING (30 dias gratuitos para validação real).`);
  });

  console.log("\n=================================================================");
  console.log("🎉 SEED DO PILOTO COMERCIAL 01 CONCLUÍDO COM SUCESSO!");
  console.log("=================================================================\n");
  getPostgresPool().end();
}

seedMariaPilot().catch((err) => {
  console.error("Erro no seed:", err);
  getPostgresPool().end();
});
