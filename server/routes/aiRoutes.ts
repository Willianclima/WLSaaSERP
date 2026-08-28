import { Router } from "express";
import { GoogleGenAI } from "@google/genai";
import { authMiddleware, AuthenticatedRequest } from "../middlewares/authMiddleware";
import { requireModule } from "../middlewares/rbacMiddleware";

const router = Router();

let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// POST /api/ai/copilot - AI Copilot & MCP Gateway with RBAC & Plan Gating
router.post("/copilot", authMiddleware, requireModule("ai_copilot_mcp"), async (req: AuthenticatedRequest, res) => {
  try {
    const { prompt, currentContext } = req.body;
    const tenant = req.tenant;
    const userRole = req.userRole;
    const ai = getAI();

    // Sensitive intent detector pattern
    const lowerPrompt = (prompt || "").toLowerCase();
    let detectedIntent: any = null;

    if (
      lowerPrompt.includes("cancelar pedido") ||
      lowerPrompt.includes("cancel order") ||
      lowerPrompt.includes("estornar")
    ) {
      const orderMatch = prompt.match(/#?(\d{3,6})/);
      const orderNumber = orderMatch ? orderMatch[1] : "1042";
      detectedIntent = {
        type: "ACTION_PROPOSAL",
        action: "cancel_order",
        title: `Proposta de Ação: Cancelar Pedido #${orderNumber}`,
        riskLevel: "ALTO",
        requiresConfirmation: true,
        permissionRequired: "ORDERS_WRITE_ADMIN",
        params: { orderId: orderNumber, reason: "Solicitado via comando do assistente" },
        message: `Identifiquei uma intenção de cancelamento crítico para o Pedido #${orderNumber}. De acordo com as políticas do AI Gateway e RBAC, ações destrutivas ou financeiras exigem aprovação humana explícita antes do dispatch no ERP.`,
      };
    } else if (
      lowerPrompt.includes("ajustar comissao") ||
      lowerPrompt.includes("alterar comissão") ||
      lowerPrompt.includes("bonificar")
    ) {
      detectedIntent = {
        type: "ACTION_PROPOSAL",
        action: "update_commission_tier",
        title: "Proposta de Ação: Ajuste de Faixa de Comissão",
        riskLevel: "MEDIO",
        requiresConfirmation: true,
        permissionRequired: "FINANCIAL_ADMIN",
        params: { adjustment: "+5% temporário para meta batida" },
        message: `Intenção de alteração na política comercial identificada. Deseja aplicar a regra no motor de comissões com snapshot de auditoria?`,
      };
    }

    if (ai) {
      const systemInstruction = `Você é o Aura Intelligence & MCP Gateway, assistente executivo e comercial de uma plataforma SaaS de Semijoias e Joias Contemporâneas.
Você atua sobre 10 domínios: Catálogo, Clientes, Vendas Omnichannel, Consignação com Ledger de Estoque, Motor de Comissões Escalonadas, Garantias Digitais QR, Produtos Personalizados, Segurança/LGPD e Gestão de Franquias/Revendedoras.
Responda de forma executiva, polida, prática e precisa em Português (Brasil).
Contexto da Empresa Ativa: "${tenant?.name || "Lumina Semijoias"}".
Papel do Operador: ${userRole || "Administrador Geral"}.
Dados de apoio disponíveis: ${JSON.stringify(currentContext || {})}.
Nunca execute ações destrutivas sem instruir que a confirmação humana é obrigatória na camada de governança.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.6,
        },
      });

      return res.json({
        success: true,
        text: response.text || "Análise concluída com sucesso.",
        intent: detectedIntent,
        model: "gemini-3.7-flash",
      });
    }

    // Smart fallback if API key is not configured
    let fallbackText = "";
    if (lowerPrompt.includes("consigna") || lowerPrompt.includes("venc")) {
      fallbackText = `📊 **Análise de Consignações (MCP Dispatch):**
Localizei 3 maletas com revendedoras ativas no momento:
• **Ana Paula Silva** (Maleta MLT-2026-08): R$ 3.850 consignados — **Vence em 4 dias** (72% vendido). Recomendado disparar lembrete via WhatsApp.
• **Beatriz Moreira** (Maleta MLT-2026-09): R$ 1.950 consignados — Vence em 18 dias (45% vendido).
• **Camila Rocha** (Maleta MLT-2026-11): R$ 5.200 consignados — Vence em 25 dias (80% vendido, apta para promoção a Líder Diamante).`;
    } else if (
      lowerPrompt.includes("descri") ||
      lowerPrompt.includes("comercial") ||
      lowerPrompt.includes("riviera") ||
      lowerPrompt.includes("colar")
    ) {
      fallbackText = `💎 **Descrição Comercial Pronta para Divulgação (Copy & WhatsApp):**

*Colar Riviera Zircônias Cristais — Banho Ouro 18k (10 Milésimos)*
SKU: \`COL-00125\`

✨ *O clássico indispensável que eleva qualquer visual.* Com cravamento contínuo em zircônias lapidação brilhante e acabamento de alta joalheria antialérgico, o Colar Riviera Aura combina sofisticação atemporal com brilho radiante.

📋 **Ficha Técnica:**
- **Banho:** Ouro 18K Premium com verniz protetor Diamond®
- **Comprimento:** 42cm + 5cm extensor
- **Garantia:** 12 meses com Certificado Digital QR
- **Ideal para:** Composição em camadas ou destaque solitário.

📲 *Link da Peça na Loja:* [Gerar Link Personalizado para Revendedora]`;
    } else if (lowerPrompt.includes("estoque") || lowerPrompt.includes("parado") || lowerPrompt.includes("giro")) {
      fallbackText = `📦 **Diagnóstico de Giro & Estoque Parado:**
• **Alerta de Curva C:** 14 unidades do *Brinco Argola Ródio Negro (BR-0089)* estão sem movimentação no estoque físico há 68 dias.
• **Sugestão Tática:** Alocar essas peças no kit de consignação promocional da próxima remessa com bonificação de +5% de comissão para as revendedoras do nível Ouro.`;
    } else {
      fallbackText = `👋 **Aura AI Copilot:** Estou monitorando a operação da **${tenant?.name || "Lumina Semijoias"}**.
Posso auxiliar em:
1. **Previsão de Acertos de Consignação** e cobrança automatizada;
2. **Geração de Copy & Argumentos de Venda** para WhatsApp e Catálogo;
3. **Auditoria de Comissões e Metas de Revendedoras**;
4. **Validação de Garantias Digitais** e histórico de pedidos.`;
    }

    return res.json({
      success: true,
      text: fallbackText,
      intent: detectedIntent,
      model: "system-heuristic-agent",
    });
  } catch (error: any) {
    console.error("AI Copilot Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Erro no processamento do assistente",
    });
  }
});

// POST /api/ai/description - AI Marketing Description Generator
router.post("/description", authMiddleware, async (req, res) => {
  try {
    const { product } = req.body;
    const ai = getAI();

    if (ai && product) {
      const prompt = `Crie 3 versões de conteúdo comercial para uma semijoia de luxo:
Produto: ${product.name}
SKU: ${product.sku}
Banho: ${product.bath}
Pedras: ${product.stones?.join(", ") || "Zircônia"}
Preço: R$ ${product.price}
Garantia: ${product.warrantyMonths} meses

Retorne JSON no seguinte formato:
{
  "ecommerceDescription": "Texto refinado para a página do produto",
  "whatsappScript": "Mensagem formatada com emojis para a revendedora enviar para clientes",
  "instagramCaption": "Legenda atraente com hashtags estratégicas"
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      return res.json({
        success: true,
        data: JSON.parse(response.text || "{}"),
      });
    }

    // Fallback response
    return res.json({
      success: true,
      data: {
        ecommerceDescription: `Exuberante ${product?.name || "Semijoia"} com acabamento refinado em banho premium e pedraria de brilho intenso. Hipoalergênica, com verniz de alta durabilidade e garantia digital de 12 meses.`,
        whatsappScript: `Oi querida! 💎 Acabou de chegar reposição do *${product?.name || "Colar Riviera"}* com acabamento impecável! É aquela peça clássica que combina com tudo. Quer que eu separe uma para você ver hoje? ✨`,
        instagramCaption: `O brilho que sua rotina merece. ✨ Conheça o ${product?.name || "Colar Riviera"}, desenvolvido para mulheres que valorizam a elegância nos mínimos detalhes. Disponível para pronta entrega e com garantia de 1 ano. 💍 #SemijoiasDeLuxo #SemijoiasFinas #GarantiaDigital`,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
