import React, { useState } from "react";
import {
  Webhook,
  Plus,
  Send,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  Eye,
  EyeOff,
  Trash2,
  Edit2,
  ExternalLink,
  Shield,
  Clock,
  Activity,
  Code,
  Sparkles,
  Search,
  Filter,
  ArrowRight,
  Key,
  Layers,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import confetti from "canvas-confetti";
import {
  WebhookEndpointConfig,
  WebhookDeliveryLog,
  WebhookEventTopic,
  TenantStore,
} from "../types";
import {
  INITIAL_WEBHOOK_ENDPOINTS,
  INITIAL_WEBHOOK_LOGS,
} from "../data/mockData";

interface WebhooksManagerProps {
  tenant: TenantStore;
}

const EVENT_TOPIC_CONFIG: Record<
  WebhookEventTopic,
  {
    label: string;
    description: string;
    category: "SALES" | "CONSIGNMENT" | "WARRANTY";
    badgeColor: string;
  }
> = {
  "order.placed": {
    label: "Venda Realizada (order.placed)",
    description: "Disparado imediatamente quando um cliente finaliza um pedido no E-commerce ou PDV.",
    category: "SALES",
    badgeColor: "bg-amber-100 text-amber-900 border-amber-300",
  },
  "order.paid": {
    label: "Pagamento Confirmado (order.paid)",
    description: "Disparado quando o pagamento via PIX, Cartão ou Boleto é aprovado pelo gateway.",
    category: "SALES",
    badgeColor: "bg-emerald-100 text-emerald-900 border-emerald-300",
  },
  "order.cancelled": {
    label: "Pedido Cancelado (order.cancelled)",
    description: "Disparado caso o pedido seja estornado ou cancelado pelo operador.",
    category: "SALES",
    badgeColor: "bg-rose-100 text-rose-900 border-rose-300",
  },
  "consignment.issued": {
    label: "Maleta Liberada (consignment.issued)",
    description: "Disparado quando uma nova maleta de semijoias é emitida e entregue para a revendedora.",
    category: "CONSIGNMENT",
    badgeColor: "bg-indigo-100 text-indigo-900 border-indigo-300",
  },
  "consignment.settled": {
    label: "Acerto de Consignação (consignment.settled)",
    description: "Disparado no fechamento da maleta com cálculo de peças vendidas, devoluções e comissões.",
    category: "CONSIGNMENT",
    badgeColor: "bg-purple-100 text-purple-900 border-purple-300",
  },
  "consignment.item_sold": {
    label: "Peça Consignada Baixada (consignment.item_sold)",
    description: "Disparado quando a revendedora registra a venda avulsa de um item da maleta.",
    category: "CONSIGNMENT",
    badgeColor: "bg-blue-100 text-blue-900 border-blue-300",
  },
  "warranty.generated": {
    label: "Garantia Digital QR Emitida (warranty.generated)",
    description: "Disparado ao criar o passaporte criptográfico de garantia de 1 ano para o comprador.",
    category: "WARRANTY",
    badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
  },
  "customer.registered": {
    label: "Novo Cliente Cadastrado (customer.registered)",
    description: "Disparado no primeiro cadastro de um cliente para sincronização com CRM.",
    category: "WARRANTY",
    badgeColor: "bg-stone-100 text-stone-800 border-stone-300",
  },
};

export const WebhooksManager: React.FC<WebhooksManagerProps> = ({ tenant }) => {
  const [endpoints, setEndpoints] = useState<WebhookEndpointConfig[]>(INITIAL_WEBHOOK_ENDPOINTS);
  const [logs, setLogs] = useState<WebhookDeliveryLog[]>(INITIAL_WEBHOOK_LOGS);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});

  // Modal / Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEndpoint, setEditingEndpoint] = useState<WebhookEndpointConfig | null>(null);
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formEvents, setFormEvents] = useState<WebhookEventTopic[]>([
    "order.placed",
    "consignment.issued",
    "consignment.settled",
  ]);
  const [formSecret, setFormSecret] = useState("");
  const [formCustomHeaderKey, setFormCustomHeaderKey] = useState("");
  const [formCustomHeaderVal, setFormCustomHeaderVal] = useState("");
  const [formDescription, setFormDescription] = useState("");

  // Test Dispatcher State
  const [testEndpointId, setTestEndpointId] = useState<string>(endpoints[0]?.id || "");
  const [testEventTopic, setTestEventTopic] = useState<WebhookEventTopic>("order.placed");
  const [isDispatchingTest, setIsDispatchingTest] = useState(false);
  const [testDispatchResult, setTestDispatchResult] = useState<{
    success: boolean;
    httpStatus: number;
    latencyMs: number;
    dispatchedAt: string;
    deliveryId: string;
    endpointUrl: string;
    signature: string;
    payload: Record<string, any>;
    responseBody: string;
  } | null>(null);

  // Inspector State
  const [inspectedLog, setInspectedLog] = useState<WebhookDeliveryLog | null>(null);
  const [activeTab, setActiveTab] = useState<"ENDPOINTS" | "DISPATCHER" | "LOGS" | "DOCS">("ENDPOINTS");
  const [logFilterCategory, setLogFilterCategory] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleSecretReveal = (endpointId: string) => {
    setRevealedSecrets((prev) => ({ ...prev, [endpointId]: !prev[endpointId] }));
  };

  const generateRandomSecret = () => {
    const chars = "abcdef0123456789";
    let rand = "";
    for (let i = 0; i < 32; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `whsec_aura_${rand}`;
  };

  const handleOpenCreateModal = () => {
    setEditingEndpoint(null);
    setFormName("");
    setFormUrl("https://api.seuerp.com.br/webhooks/vendas");
    setFormEvents(["order.placed", "consignment.issued", "consignment.settled"]);
    setFormSecret(generateRandomSecret());
    setFormCustomHeaderKey("Authorization");
    setFormCustomHeaderVal("Bearer tok_live_123456");
    setFormDescription("Endpoint para receber eventos de vendas e consignações em tempo real.");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (endpoint: WebhookEndpointConfig) => {
    setEditingEndpoint(endpoint);
    setFormName(endpoint.name);
    setFormUrl(endpoint.url);
    setFormEvents([...endpoint.events]);
    setFormSecret(endpoint.secret);
    setFormDescription(endpoint.description || "");
    const headers = endpoint.customHeaders || {};
    const firstKey = Object.keys(headers)[0] || "";
    setFormCustomHeaderKey(firstKey);
    setFormCustomHeaderVal(firstKey ? headers[firstKey] : "");
    setIsModalOpen(true);
  };

  const handleSaveEndpoint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formUrl) return;

    const customHeaders: Record<string, string> = {};
    if (formCustomHeaderKey.trim() && formCustomHeaderVal.trim()) {
      customHeaders[formCustomHeaderKey.trim()] = formCustomHeaderVal.trim();
    }

    if (editingEndpoint) {
      setEndpoints((prev) =>
        prev.map((ep) =>
          ep.id === editingEndpoint.id
            ? {
                ...ep,
                name: formName,
                url: formUrl,
                events: formEvents,
                secret: formSecret,
                description: formDescription,
                customHeaders: Object.keys(customHeaders).length > 0 ? customHeaders : undefined,
              }
            : ep
        )
      );
    } else {
      const newEndpoint: WebhookEndpointConfig = {
        id: `wh-endpoint-${Date.now()}`,
        name: formName,
        url: formUrl,
        status: "ACTIVE",
        secret: formSecret || generateRandomSecret(),
        events: formEvents,
        contentType: "application/json",
        retryPolicy: "EXPONENTIAL_BACKOFF",
        customHeaders: Object.keys(customHeaders).length > 0 ? customHeaders : undefined,
        createdAt: new Date().toISOString().replace("T", " ").substring(0, 16),
        deliveryCount: 0,
        successRate: 100,
        description: formDescription,
      };
      setEndpoints((prev) => [newEndpoint, ...prev]);
    }

    setIsModalOpen(false);
    confetti({
      particleCount: 35,
      spread: 60,
      origin: { y: 0.6 },
    });
  };

  const handleDeleteEndpoint = (id: string) => {
    if (window.confirm("Deseja realmente desativar e excluir este endpoint de Webhook?")) {
      setEndpoints((prev) => prev.filter((ep) => ep.id !== id));
    }
  };

  const handleToggleEndpointStatus = (id: string) => {
    setEndpoints((prev) =>
      prev.map((ep) =>
        ep.id === id
          ? {
              ...ep,
              status: ep.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
            }
          : ep
      )
    );
  };

  // Generate Sample JSON Payload for Test Dispatcher
  const getSamplePayload = (topic: WebhookEventTopic) => {
    const timestamp = new Date().toISOString();
    const eventId = `evt_${Date.now()}`;

    if (topic === "order.placed" || topic === "order.paid" || topic === "order.cancelled") {
      return {
        event: topic,
        event_id: eventId,
        created_at: timestamp,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          document: tenant.document,
          domain: "loja.aura.com",
        },
        data: {
          order_id: `ORD-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          channel: "ECOMMERCE_VITRINE",
          status: topic === "order.paid" ? "PAGO" : topic === "order.cancelled" ? "CANCELADO" : "CRIADO_AGUARDANDO_PAGAMENTO",
          currency: "BRL",
          total_amount: 589.90,
          subtotal: 589.90,
          discount_amount: 0.00,
          shipping_amount: 0.00,
          customer: {
            name: "Camila Guimarães Rocha",
            email: "camila.rocha@gmail.com",
            phone: "+55 (19) 99871-2244",
            document: "329.841.098-11",
            shipping_address: {
              street: "Avenida Campinas",
              number: "1420",
              neighborhood: "Vila Nova",
              city: "Limeira",
              state: "SP",
              zipcode: "13480-000",
            },
          },
          payment: {
            method: "PIX",
            installments: 1,
            gateway_transaction_id: `pix_tx_${Date.now()}`,
            paid_at: topic === "order.paid" ? timestamp : null,
          },
          items: [
            {
              sku: "LUM-COL-001",
              name: "Colar Riviera Cravejado Zircônias 40cm",
              category: "COLARES",
              bath: "OURO_18K",
              quantity: 1,
              unit_price: 389.90,
              total_price: 389.90,
              digital_warranty_qr: "https://loja.aura.com/w/WAR-2026-9041-A",
            },
            {
              sku: "LUM-BRI-002",
              name: "Brinco Gota Esmeralda Fusion",
              category: "BRINCOS",
              bath: "RODIO_BRANCO",
              quantity: 1,
              unit_price: 200.00,
              total_price: 200.00,
              digital_warranty_qr: "https://loja.aura.com/w/WAR-2026-9041-B",
            },
          ],
          reseller: null,
        },
      };
    }

    if (topic === "consignment.issued") {
      return {
        event: "consignment.issued",
        event_id: eventId,
        created_at: timestamp,
        tenant: {
          id: tenant.id,
          name: tenant.name,
        },
        data: {
          maleta_id: `MALETA-2026-${Math.floor(10 + Math.random() * 90)}`,
          status: "EM_CONSIGNACAO",
          issued_date: timestamp.substring(0, 10),
          due_date: new Date(Date.now() + 30 * 86400000).toISOString().substring(0, 10),
          reseller: {
            id: "reseller-carla",
            name: "Carla Silveira",
            email: "carla.semijoias@gmail.com",
            whatsapp: "+55 (19) 98765-4321",
            commission_tier: "DIAMANTE_40",
            commission_rate_percentage: 40.0,
          },
          items_count: 24,
          total_consigned_value: 4850.00,
          items: [
            { sku: "LUM-COL-001", name: "Colar Riviera Cravejado", qty: 4, unit_price: 389.90 },
            { sku: "LUM-BRI-002", name: "Brinco Gota Esmeralda", qty: 6, unit_price: 200.00 },
            { sku: "LUM-ANE-003", name: "Anel Solitário Ouro 18k", qty: 8, unit_price: 180.00 },
            { sku: "LUM-PUL-004", name: "Pulseira Elo Português", qty: 6, unit_price: 110.00 },
          ],
          terms_acceptance_hash: "sha256_e8f9021b3ca489",
        },
      };
    }

    if (topic === "consignment.settled") {
      return {
        event: "consignment.settled",
        event_id: eventId,
        created_at: timestamp,
        data: {
          maleta_id: `MALETA-2026-015`,
          reseller_name: "Juliana Mendes",
          reseller_whatsapp: "+55 (19) 99123-8877",
          total_consigned_value: 3900.00,
          total_sold_value: 3120.00,
          total_returned_value: 780.00,
          commission_percentage: 35.0,
          reseller_commission_payout: 1092.00,
          store_net_revenue: 2028.00,
          settlement_method: "PIX_IMEDIATO",
          ledger_transaction_id: `LEDGER-SETTLE-${Math.floor(10000 + Math.random() * 90000)}`,
        },
      };
    }

    if (topic === "warranty.generated") {
      return {
        event: "warranty.generated",
        event_id: eventId,
        created_at: timestamp,
        data: {
          warranty_code: `WAR-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          product_name: "Colar Riviera Cravejado Zircônias",
          sku: "LUM-COL-001",
          bath: "OURO_18K_10_MILESIMOS",
          buyer_name: "Camila Guimarães Rocha",
          issued_date: timestamp.substring(0, 10),
          valid_until: "2027-08-20",
          certificate_verification_url: "https://loja.aura.com/w/WAR-2026-9041-A",
          qr_authenticity_hash: "sha256_9941a02bd8",
        },
      };
    }

    return {
      event: topic,
      event_id: eventId,
      created_at: timestamp,
      data: {
        message: "Sample event payload",
      },
    };
  };

  const handleExecuteTestDispatch = () => {
    const targetEndpoint = endpoints.find((ep) => ep.id === testEndpointId) || endpoints[0];
    if (!targetEndpoint) return;

    setIsDispatchingTest(true);
    setTestDispatchResult(null);

    const payload = getSamplePayload(testEventTopic);
    const signature = `t=${Math.floor(Date.now() / 1000)},v1=${Math.random().toString(16).substring(2)}${Math.random().toString(16).substring(2)}`;
    const deliveryId = `del_${Math.random().toString(16).substring(2, 10)}`;

    setTimeout(() => {
      const latency = Math.floor(65 + Math.random() * 110);
      const newLog: WebhookDeliveryLog = {
        id: `wh-log-${Date.now()}`,
        endpointId: targetEndpoint.id,
        endpointName: targetEndpoint.name,
        endpointUrl: targetEndpoint.url,
        event: testEventTopic,
        timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
        httpStatus: 200,
        status: "DELIVERED",
        durationMs: latency,
        requestHeaders: {
          "Content-Type": "application/json",
          "User-Agent": "Aura-WebhookEngine/2.4",
          "X-Aura-Event": testEventTopic,
          "X-Aura-Delivery": deliveryId,
          "X-Aura-Signature": signature,
          ...(targetEndpoint.customHeaders || {}),
        },
        requestPayload: payload,
        responseHeaders: {
          "content-type": "application/json",
          "x-powered-by": "Express / WebhookReceiver",
        },
        responseBody: JSON.stringify({
          success: true,
          status: "received",
          processed_at: new Date().toISOString(),
          event: testEventTopic,
        }),
        attempt: 1,
        signatureHeader: signature,
      };

      setLogs((prev) => [newLog, ...prev]);
      setTestDispatchResult({
        success: true,
        httpStatus: 200,
        latencyMs: latency,
        dispatchedAt: new Date().toLocaleTimeString("pt-BR"),
        deliveryId,
        endpointUrl: targetEndpoint.url,
        signature,
        payload,
        responseBody: newLog.responseBody || "{}",
      });
      setIsDispatchingTest(false);

      // Update endpoint delivery stats
      setEndpoints((prev) =>
        prev.map((ep) =>
          ep.id === targetEndpoint.id
            ? {
                ...ep,
                deliveryCount: ep.deliveryCount + 1,
                lastDeliveredAt: new Date().toISOString().replace("T", " ").substring(0, 16),
                lastDeliveryStatus: "SUCCESS",
              }
            : ep
        )
      );

      confetti({
        particleCount: 45,
        spread: 70,
        origin: { y: 0.65 },
      });
    }, 1100);
  };

  const handleRetryLog = (log: WebhookDeliveryLog) => {
    alert(`Reenviando evento ${log.event} para ${log.endpointUrl}...`);
    setTimeout(() => {
      alert(`Disparo reenviado com sucesso! Código HTTP 200 OK (84ms)`);
    }, 600);
  };

  const totalDeliveries = endpoints.reduce((acc, ep) => acc + ep.deliveryCount, 0);
  const activeEndpointsCount = endpoints.filter((ep) => ep.status === "ACTIVE").length;

  const filteredLogs = logs.filter((log) => {
    if (logFilterCategory !== "ALL") {
      const conf = EVENT_TOPIC_CONFIG[log.event];
      if (conf && conf.category !== logFilterCategory) return false;
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      return (
        log.event.toLowerCase().includes(term) ||
        log.endpointName.toLowerCase().includes(term) ||
        log.endpointUrl.toLowerCase().includes(term) ||
        log.id.toLowerCase().includes(term)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner Overview */}
      <div className="bg-gradient-to-br from-stone-900 via-stone-950 to-stone-900 rounded-3xl p-6 sm:p-8 text-stone-100 border border-stone-800 shadow-lg space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-2xl bg-amber-400/20 text-amber-300 border border-amber-400/30">
                <Webhook className="w-5 h-5" />
              </span>
              <span className="text-xs font-mono font-bold tracking-wider uppercase text-amber-400">
                Event-Driven Architecture & Real-Time Sync
              </span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-serif italic font-bold text-white">
              Webhooks Externos & Eventos de Venda
            </h3>
            <p className="text-xs sm:text-sm text-stone-300 max-w-2xl font-light leading-relaxed">
              Dispare notificações instantâneas em formato JSON para os seus sistemas externos (ERP Bling/Tiny, CRM, n8n, Zapier ou WhatsApp Bot) sempre que novos pedidos de venda forem criados ou consignações forem movimentadas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="flex-1 md:flex-none px-5 py-2.5 rounded-full bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Endpoint</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("DISPATCHER")}
              className="flex-1 md:flex-none px-4 py-2.5 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4 text-amber-400" />
              <span>Testar Disparo</span>
            </button>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3.5 rounded-2xl bg-stone-850/80 border border-stone-700/60 space-y-1">
            <span className="text-[10px] font-mono uppercase text-stone-400 block">Endpoints Ativos</span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-mono font-bold text-white">{activeEndpointsCount}</span>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                100% Online
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-stone-850/80 border border-stone-700/60 space-y-1">
            <span className="text-[10px] font-mono uppercase text-stone-400 block">Total de Entregas</span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-mono font-bold text-amber-300">{totalDeliveries}</span>
              <span className="text-[10px] text-stone-400 font-mono">requisições</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-stone-850/80 border border-stone-700/60 space-y-1">
            <span className="text-[10px] font-mono uppercase text-stone-400 block">Taxa de Sucesso</span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-mono font-bold text-emerald-400">99.8%</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-stone-850/80 border border-stone-700/60 space-y-1">
            <span className="text-[10px] font-mono uppercase text-stone-400 block">Assinatura HMAC</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-mono font-bold text-indigo-300">SHA-256</span>
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Subtabs */}
      <div className="flex space-x-2 border-b border-stone-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("ENDPOINTS")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === "ENDPOINTS"
              ? "bg-stone-900 text-amber-300 shadow-xs border border-amber-400/40"
              : "bg-white text-stone-700 hover:bg-stone-100 border border-stone-200"
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          <span>Endpoints Cadastrados ({endpoints.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("DISPATCHER")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === "DISPATCHER"
              ? "bg-stone-900 text-amber-300 shadow-xs border border-amber-400/40"
              : "bg-white text-stone-700 hover:bg-stone-100 border border-stone-200"
          }`}
        >
          <Send className="w-3.5 h-3.5 text-amber-400" />
          <span>Simulador de Disparo (JSON Payload)</span>
        </button>

        <button
          onClick={() => setActiveTab("LOGS")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === "LOGS"
              ? "bg-stone-900 text-amber-300 shadow-xs border border-amber-400/40"
              : "bg-white text-stone-700 hover:bg-stone-100 border border-stone-200"
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-amber-400" />
          <span>Histórico & Logs de Entrega ({logs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("DOCS")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === "DOCS"
              ? "bg-stone-900 text-amber-300 shadow-xs border border-amber-400/40"
              : "bg-white text-stone-700 hover:bg-stone-100 border border-stone-200"
          }`}
        >
          <Code className="w-3.5 h-3.5 text-amber-400" />
          <span>Documentação Técnica HMAC</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: LISTA DE ENDPOINTS CADASTRADOS                                     */}
      {/* ========================================================================= */}
      {activeTab === "ENDPOINTS" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-serif italic font-bold text-lg text-stone-900">
                Endpoints de Destino Configurados
              </h4>
              <p className="text-xs text-stone-500">
                Gerencie as URLs receptoras que recebem os payloads via POST autenticado.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="px-4 py-2 rounded-full bg-stone-900 hover:bg-stone-800 text-amber-300 font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Endpoint</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {endpoints.map((ep) => {
              const isRevealed = !!revealedSecrets[ep.id];
              return (
                <div
                  key={ep.id}
                  className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs hover:border-amber-400/60 transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800 shrink-0">
                        <Webhook className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="font-bold text-sm text-stone-900">{ep.name}</h5>
                          <span
                            className={`text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full ${
                              ep.status === "ACTIVE"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : "bg-stone-100 text-stone-600 border border-stone-200"
                            }`}
                          >
                            {ep.status === "ACTIVE" ? "🟢 Ativo" : "⚪ Pausado"}
                          </span>
                        </div>
                        {ep.description && <p className="text-xs text-stone-500 mt-0.5">{ep.description}</p>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setTestEndpointId(ep.id);
                          setActiveTab("DISPATCHER");
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                        title="Enviar evento de teste para este endpoint"
                      >
                        <Send className="w-3.5 h-3.5 text-amber-700" />
                        <span>Testar Disparo</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleEndpointStatus(ep.id)}
                        className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-all cursor-pointer"
                      >
                        {ep.status === "ACTIVE" ? "Pausar" : "Ativar"}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(ep)}
                        className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-all cursor-pointer"
                        title="Editar Endpoint"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteEndpoint(ep.id)}
                        className="p-2 rounded-xl text-rose-400 hover:text-rose-700 hover:bg-rose-50 transition-all cursor-pointer"
                        title="Excluir Endpoint"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* URL Display & Secret Key */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                    <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between">
                      <div className="truncate mr-2">
                        <span className="text-[10px] text-stone-400 block font-sans font-semibold uppercase">
                          ENDPOINT URL (POST)
                        </span>
                        <span className="font-bold text-stone-900 truncate block">{ep.url}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(ep.url, `url_${ep.id}`)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 shrink-0"
                        title="Copiar URL"
                      >
                        {copiedKey === `url_${ep.id}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between">
                      <div className="truncate mr-2">
                        <span className="text-[10px] text-stone-400 block font-sans font-semibold uppercase">
                          SEGREDO DE ASSINATURA HMAC (X-Aura-Signature)
                        </span>
                        <span className="font-bold text-indigo-900 truncate block">
                          {isRevealed ? ep.secret : "••••••••••••••••••••••••••••••••"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleSecretReveal(ep.id)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/50"
                          title={isRevealed ? "Ocultar segredo" : "Revelar segredo"}
                        >
                          {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(ep.secret, `sec_${ep.id}`)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/50"
                          title="Copiar Chave Secreta"
                        >
                          {copiedKey === `sec_${ep.id}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Subscribed Events List */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                      Tópicos de Eventos Inscritos:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {ep.events.map((evt) => {
                        const conf = EVENT_TOPIC_CONFIG[evt];
                        return (
                          <span
                            key={evt}
                            className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold border flex items-center gap-1 ${
                              conf ? conf.badgeColor : "bg-stone-100 text-stone-800 border-stone-200"
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                            <span>{evt}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Footer Stats & Info */}
                  <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between text-xs text-stone-500">
                    <div className="flex items-center gap-3">
                      <span>
                        Criado em: <strong className="text-stone-700 font-mono">{ep.createdAt}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Última Entrega:{" "}
                        <strong className="text-stone-700 font-mono">{ep.lastDeliveredAt || "Nunca"}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-lg border border-emerald-200 font-bold">
                        {ep.deliveryCount} envios efetuados ({ep.successRate}% sucesso)
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: SIMULADOR DE DISPARO DE TESTE (JSON PAYLOAD)                       */}
      {/* ========================================================================= */}
      {activeTab === "DISPATCHER" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Column (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl border border-stone-200 p-6 space-y-5 shadow-xs">
              <div>
                <h4 className="font-serif italic font-bold text-lg text-stone-900">
                  Simulador de Disparo de Webhook
                </h4>
                <p className="text-xs text-stone-500">
                  Selecione o endpoint de destino e o tipo de evento para gerar o payload JSON real e executar o teste.
                </p>
              </div>

              {/* Endpoint Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-600 block">
                  Endpoint de Destino:
                </label>
                <select
                  value={testEndpointId}
                  onChange={(e) => setTestEndpointId(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-semibold text-stone-900 focus:outline-none focus:border-amber-500"
                >
                  {endpoints.map((ep) => (
                    <option key={ep.id} value={ep.id}>
                      {ep.name} ({ep.url})
                    </option>
                  ))}
                </select>
              </div>

              {/* Event Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-600 block">
                  Evento a Disparar:
                </label>
                <div className="space-y-2">
                  {(Object.keys(EVENT_TOPIC_CONFIG) as WebhookEventTopic[]).map((topic) => {
                    const conf = EVENT_TOPIC_CONFIG[topic];
                    const isSelected = testEventTopic === topic;
                    return (
                      <button
                        key={topic}
                        type="button"
                        onClick={() => setTestEventTopic(topic)}
                        className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-amber-50/80 border-amber-400 shadow-xs ring-1 ring-amber-400"
                            : "bg-stone-50/50 border-stone-200 hover:bg-stone-100/60"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-stone-900">{topic}</span>
                          <span
                            className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              conf.category === "SALES"
                                ? "bg-amber-100 text-amber-900"
                                : conf.category === "CONSIGNMENT"
                                ? "bg-indigo-100 text-indigo-900"
                                : "bg-stone-200 text-stone-800"
                            }`}
                          >
                            {conf.category === "SALES"
                              ? "Vendas"
                              : conf.category === "CONSIGNMENT"
                              ? "Consignação"
                              : "Garantia"}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-600 mt-1 leading-snug">{conf.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleExecuteTestDispatch}
                disabled={isDispatchingTest || endpoints.length === 0}
                className="w-full py-3.5 px-6 rounded-2xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send className={`w-4 h-4 ${isDispatchingTest ? "animate-spin" : ""}`} />
                <span>{isDispatchingTest ? "Transmitindo Payload HTTP..." : "Disparar Webhook de Teste Agora"}</span>
              </button>
            </div>
          </div>

          {/* Payload & Result Preview (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Live Result Feedback Banner if just tested */}
            {testDispatchResult && (
              <div className="bg-emerald-950 border border-emerald-500/40 rounded-3xl p-5 text-emerald-100 shadow-md space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-emerald-800/60">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <span className="font-bold text-xs text-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Requisição Entregue com Sucesso (HTTP 200 OK)</span>
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400">
                    {testDispatchResult.latencyMs}ms • {testDispatchResult.dispatchedAt}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2 rounded-xl bg-black/40 border border-emerald-500/20">
                    <span className="text-[9px] text-stone-400 block uppercase">DESTINO</span>
                    <span className="text-emerald-200 truncate block">{testDispatchResult.endpointUrl}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-black/40 border border-emerald-500/20">
                    <span className="text-[9px] text-stone-400 block uppercase">SIGNATURE HEADER</span>
                    <span className="text-emerald-200 truncate block">{testDispatchResult.signature}</span>
                  </div>
                </div>

                <p className="text-[11px] text-emerald-200 font-light leading-relaxed">
                  O endpoint receptor respondeu positivamente e o evento foi gravado na trilha de logs imutável.
                </p>
              </div>
            )}

            {/* JSON Payload Viewer */}
            <div className="bg-stone-950 rounded-3xl border border-stone-800 p-6 text-stone-100 shadow-lg space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                <div className="flex items-center gap-2">
                  <Code className="w-4 h-4 text-amber-400" />
                  <span className="font-mono text-xs font-bold text-amber-300">
                    JSON Payload Body (application/json)
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      JSON.stringify(getSamplePayload(testEventTopic), null, 2),
                      "payload_copy"
                    )
                  }
                  className="px-3 py-1 rounded-xl bg-stone-850 hover:bg-stone-750 text-stone-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {copiedKey === "payload_copy" ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedKey === "payload_copy" ? "Copiado!" : "Copiar JSON"}</span>
                </button>
              </div>

              <pre className="p-4 rounded-2xl bg-stone-900 text-amber-200/90 font-mono text-xs overflow-x-auto max-h-96 leading-relaxed border border-stone-800 select-all">
                {JSON.stringify(getSamplePayload(testEventTopic), null, 2)}
              </pre>

              <div className="pt-2 border-t border-stone-800/80 flex flex-wrap items-center justify-between text-[11px] font-mono text-stone-400">
                <span>Content-Type: application/json</span>
                <span>User-Agent: Aura-WebhookEngine/2.4</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: HISTÓRICO & LOGS DE ENTREGA                                        */}
      {/* ========================================================================= */}
      {activeTab === "LOGS" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-serif italic font-bold text-lg text-stone-900">
                Histórico de Requisições & Logs de Entrega
              </h4>
              <p className="text-xs text-stone-500">
                Consulte os eventos transmitidos com detalhes de headers, assinatura HMAC e tempo de resposta.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Category Filter */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-stone-200">
                <button
                  type="button"
                  onClick={() => setLogFilterCategory("ALL")}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    logFilterCategory === "ALL"
                      ? "bg-stone-900 text-amber-300"
                      : "text-stone-600 hover:bg-stone-100"
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setLogFilterCategory("SALES")}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    logFilterCategory === "SALES"
                      ? "bg-amber-400 text-stone-950"
                      : "text-stone-600 hover:bg-stone-100"
                  }`}
                >
                  🛍️ Vendas
                </button>
                <button
                  type="button"
                  onClick={() => setLogFilterCategory("CONSIGNMENT")}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    logFilterCategory === "CONSIGNMENT"
                      ? "bg-indigo-600 text-white"
                      : "text-stone-600 hover:bg-stone-100"
                  }`}
                >
                  💼 Consignações
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar logs..."
                  className="bg-white border border-stone-200 rounded-2xl pl-8 pr-3 py-1.5 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-mono uppercase text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Status HTTP</th>
                    <th className="py-3.5 px-4 font-semibold">Tópico do Evento</th>
                    <th className="py-3.5 px-4 font-semibold">Endpoint Destino</th>
                    <th className="py-3.5 px-4 font-semibold">Timestamp</th>
                    <th className="py-3.5 px-4 font-semibold">Latência</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-mono">
                  {filteredLogs.map((log) => {
                    const conf = EVENT_TOPIC_CONFIG[log.event];
                    return (
                      <tr key={log.id} className="hover:bg-stone-50/70 transition-all">
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                              log.httpStatus >= 200 && log.httpStatus < 300
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : "bg-rose-100 text-rose-800 border border-rose-200"
                            }`}
                          >
                            <Check className="w-3 h-3" />
                            <span>{log.httpStatus} OK</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${
                              conf ? conf.badgeColor : "bg-stone-100 text-stone-800"
                            }`}
                          >
                            {log.event}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 max-w-xs truncate">
                          <span className="font-bold text-stone-800 block truncate font-sans text-xs">
                            {log.endpointName}
                          </span>
                          <span className="text-[10px] text-stone-400 truncate block">{log.endpointUrl}</span>
                        </td>

                        <td className="py-3.5 px-4 text-stone-500 text-[11px] whitespace-nowrap">
                          {log.timestamp}
                        </td>

                        <td className="py-3.5 px-4 text-stone-700 font-bold">
                          {log.durationMs}ms
                        </td>

                        <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setInspectedLog(log)}
                            className="px-3 py-1 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-300 text-xs font-sans font-bold transition-all cursor-pointer"
                          >
                            Inspecionar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRetryLog(log)}
                            className="px-2.5 py-1 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-sans font-semibold transition-all cursor-pointer"
                            title="Reenviar Payload"
                          >
                            <RefreshCw className="w-3 h-3 inline mr-1" />
                            Retry
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 4: GUIA DE DOCUMENTAÇÃO TÉCNICA (ASSINATURA HMAC)                    */}
      {/* ========================================================================= */}
      {activeTab === "DOCS" && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-6 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-indigo-100 text-indigo-800">
                <Shield className="w-4 h-4" />
              </span>
              <span className="text-xs font-mono font-bold uppercase text-indigo-800">
                Guia de Segurança & Verificação de Assinatura
              </span>
            </div>
            <h4 className="font-serif italic font-bold text-xl text-stone-900 mt-1">
              Como Validar a Assinatura HMAC SHA-256 no Seu Backend
            </h4>
            <p className="text-xs text-stone-600 max-w-3xl leading-relaxed mt-1">
              Todas as requisições enviadas pelo Aura Webhook Engine incluem o cabeçalho{" "}
              <code className="bg-stone-100 px-1.5 py-0.5 rounded text-amber-800 font-mono font-bold">
                X-Aura-Signature
              </code>
              . Esse cabeçalho contém um timestamp Unix (<code className="font-mono">t</code>) e a assinatura criptográfica (
              <code className="font-mono">v1</code>) calculada sobre o body bruto da requisição utilizando a sua chave secreta.
            </p>
          </div>

          <div className="space-y-4">
            <h5 className="font-bold text-sm text-stone-900">Exemplo em Node.js (Express / Fastify):</h5>
            <pre className="p-4 rounded-2xl bg-stone-950 text-amber-200/90 font-mono text-xs overflow-x-auto leading-relaxed border border-stone-800">
{`const crypto = require('crypto');

function verifyAuraWebhook(rawBody, signatureHeader, secretKey) {
  // 1. Extrair timestamp e hash v1
  const parts = Object.fromEntries(signatureHeader.split(',').map(kv => kv.split('=')));
  const timestamp = parts.t;
  const receivedSignature = parts.v1;

  // 2. Prevenir replay attacks (tolerância de 5 minutos)
  const currentTimestamp = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTimestamp - timestamp) > 300) {
    throw new Error("Webhook expirado (possível replay attack)");
  }

  // 3. Recalcular HMAC-SHA256
  const payloadToSign = \`\${timestamp}.\${rawBody}\`;
  const computedSignature = crypto
    .createHmac('sha256', secretKey)
    .update(payloadToSign, 'utf8')
    .digest('hex');

  // 4. Comparar assinaturas de forma segura (timing safe)
  return crypto.timingSafeEqual(
    Buffer.from(receivedSignature),
    Buffer.from(computedSignature)
  );
}`}
            </pre>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CRIAR / EDITAR ENDPOINT                                            */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-stone-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-stone-200 max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800">
                  <Webhook className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-serif italic font-bold text-lg text-stone-900">
                    {editingEndpoint ? "Editar Endpoint de Webhook" : "Novo Endpoint de Webhook"}
                  </h4>
                  <p className="text-xs text-stone-500">
                    Configure a URL e os tópicos de eventos a serem despachados.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEndpoint} className="space-y-4">
              {/* Nome amigável */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-700 block">
                  Nome Amigável do Destino:
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: ERP Bling! (Faturamento), Zapier / n8n, CRM VIP"
                  className="w-full bg-stone-50 border border-stone-300 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-semibold text-stone-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Endpoint URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-700 block">
                  URL de Destino (HTTPS Obrigatório):
                </label>
                <input
                  type="url"
                  required
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="https://api.seusistema.com.br/webhooks/orders"
                  className="w-full bg-stone-50 border border-stone-300 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-mono font-bold text-amber-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Tópicos de Eventos */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-700 block">
                  Eventos Assinados:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-stone-50 p-4 rounded-2xl border border-stone-200">
                  {(Object.keys(EVENT_TOPIC_CONFIG) as WebhookEventTopic[]).map((topic) => {
                    const isChecked = formEvents.includes(topic);
                    const conf = EVENT_TOPIC_CONFIG[topic];
                    return (
                      <label
                        key={topic}
                        className="flex items-start gap-2 text-xs p-2 rounded-xl hover:bg-white transition-all cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormEvents((prev) => [...prev, topic]);
                            } else {
                              setFormEvents((prev) => prev.filter((t) => t !== topic));
                            }
                          }}
                          className="mt-0.5 rounded text-amber-500 focus:ring-amber-400"
                        />
                        <div>
                          <span className="font-mono font-bold text-stone-900 block">{topic}</span>
                          <span className="text-[10px] text-stone-500 block leading-tight">
                            {conf.category === "SALES" ? "🛍️ Vendas" : conf.category === "CONSIGNMENT" ? "💼 Consignação" : "🛡️ Garantia"}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Chave Secreta HMAC */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
                    Chave Secreta HMAC SHA-256:
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormSecret(generateRandomSecret())}
                    className="text-[11px] font-bold text-amber-700 hover:text-amber-900 cursor-pointer"
                  >
                    Regerar Chave
                  </button>
                </div>
                <input
                  type="text"
                  value={formSecret}
                  onChange={(e) => setFormSecret(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-2xl px-4 py-2.5 text-xs font-mono font-bold text-indigo-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Cabeçalho Customizado Opcional */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-700 block">
                  Cabeçalho de Autenticação Opcional (Custom Header):
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={formCustomHeaderKey}
                    onChange={(e) => setFormCustomHeaderKey(e.target.value)}
                    placeholder="Authorization"
                    className="bg-stone-50 border border-stone-300 rounded-2xl px-3 py-2 text-xs font-mono text-stone-800"
                  />
                  <input
                    type="text"
                    value={formCustomHeaderVal}
                    onChange={(e) => setFormCustomHeaderVal(e.target.value)}
                    placeholder="Bearer tok_live_..."
                    className="bg-stone-50 border border-stone-300 rounded-2xl px-3 py-2 text-xs font-mono text-stone-800"
                  />
                </div>
              </div>

              {/* Descrição */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-700 block">
                  Finalidade / Observações:
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Ex: Integração direta com Bling para faturamento fiscal automático das semijoias vendidas."
                  className="w-full bg-stone-50 border border-stone-300 rounded-2xl px-4 py-2 text-xs text-stone-800 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-full border border-stone-200 text-stone-600 hover:bg-stone-100 font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
                >
                  {editingEndpoint ? "Salvar Alterações" : "Criar Endpoint"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: INSPECIONAR LOG DE ENTREGA                                         */}
      {/* ========================================================================= */}
      {inspectedLog && (
        <div className="fixed inset-0 bg-stone-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-stone-200 max-w-3xl w-full p-6 sm:p-8 space-y-5 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-stone-900 flex items-center justify-center text-amber-300">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-serif italic font-bold text-lg text-stone-900">
                    Detalhes da Requisição #{inspectedLog.id}
                  </h4>
                  <p className="text-xs text-stone-500">
                    Disparo realizado em {inspectedLog.timestamp} ({inspectedLog.durationMs}ms)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectedLog(null)}
                className="p-2 text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Request Headers */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-700 block">
                Headers HTTP Enviados:
              </span>
              <pre className="p-3.5 rounded-2xl bg-stone-900 text-stone-200 font-mono text-xs overflow-x-auto leading-relaxed border border-stone-800">
                {JSON.stringify(inspectedLog.requestHeaders, null, 2)}
              </pre>
            </div>

            {/* Request Body */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Request Payload Body:
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(JSON.stringify(inspectedLog.requestPayload, null, 2), "modal_payload")
                  }
                  className="text-xs font-bold text-amber-700 hover:text-amber-900 cursor-pointer flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedKey === "modal_payload" ? "Copiado!" : "Copiar"}</span>
                </button>
              </div>
              <pre className="p-4 rounded-2xl bg-stone-950 text-amber-200/90 font-mono text-xs overflow-x-auto max-h-72 leading-relaxed border border-stone-800 select-all">
                {JSON.stringify(inspectedLog.requestPayload, null, 2)}
              </pre>
            </div>

            {/* Response Body */}
            {inspectedLog.responseBody && (
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-700 block">
                  Resposta do Servidor Receptor (HTTP {inspectedLog.httpStatus}):
                </span>
                <pre className="p-3.5 rounded-2xl bg-stone-100 text-stone-800 font-mono text-xs overflow-x-auto leading-relaxed border border-stone-200">
                  {inspectedLog.responseBody}
                </pre>
              </div>
            )}

            <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleRetryLog(inspectedLog)}
                className="px-4 py-2 rounded-full bg-stone-900 hover:bg-stone-800 text-amber-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reenviar Disparo (Retry)</span>
              </button>

              <button
                type="button"
                onClick={() => setInspectedLog(null)}
                className="px-5 py-2 rounded-full border border-stone-200 text-stone-700 hover:bg-stone-100 font-bold text-xs cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
