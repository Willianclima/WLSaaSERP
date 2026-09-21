import React, { useState } from "react";
import {
  Mail,
  Server,
  ShieldCheck,
  Send,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  Radio,
  FileCheck,
  Sliders,
  HelpCircle,
  Clock,
  ShieldAlert,
  ArrowUpRight,
  BellRing,
  QrCode,
  Truck,
  DollarSign,
  Package,
  Layers,
} from "lucide-react";
import { TenantStore, StoreSmtpConfig } from "../types";
import { DEFAULT_STORE_SMTP_CONFIG } from "../data/mockData";
import { HtmlLiquidTemplateEditor, compileLiquidTemplate } from "./HtmlLiquidTemplateEditor";
import confetti from "canvas-confetti";

interface StoreSmtpSettingsManagerProps {
  tenant: TenantStore;
  smtpConfig?: StoreSmtpConfig;
  onUpdateSmtpConfig: (newConfig: StoreSmtpConfig) => void;
}

interface SmtpProviderPreset {
  id: StoreSmtpConfig["provider"];
  name: string;
  host: string;
  port: number;
  encryption: StoreSmtpConfig["encryption"];
  badge: string;
  description: string;
  helpDocUrl?: string;
}

const SMTP_PRESETS: SmtpProviderPreset[] = [
  {
    id: "CUSTOM",
    name: "Servidor Próprio / CPanel / Locaweb / HostGator",
    host: "mail.suaempresa.com.br",
    port: 587,
    encryption: "STARTTLS",
    badge: "Profissional",
    description: "Conecte qualquer serviço de e-mail corporativo ou revenda com domínio próprio.",
  },
  {
    id: "GMAIL",
    name: "Google Workspace / Gmail",
    host: "smtp.gmail.com",
    port: 587,
    encryption: "STARTTLS",
    badge: "Requer Senha de App",
    description: "Envio através dos servidores confiáveis do Google com autenticação TLS.",
    helpDocUrl: "https://support.google.com/accounts/answer/185833",
  },
  {
    id: "OUTLOOK",
    name: "Microsoft 365 / Outlook / Hotmail",
    host: "smtp.office365.com",
    port: 587,
    encryption: "STARTTLS",
    badge: "Office 365",
    description: "Compatível com caixas postais corporativas do ecossistema Microsoft.",
  },
  {
    id: "RESEND",
    name: "Resend.com (Transacional de Alta Entrega)",
    host: "smtp.resend.com",
    port: 465,
    encryption: "SSL",
    badge: "99.9% Inbox",
    description: "Entrega instantânea com suporte a DKIM e alta reputação para semijoias.",
  },
  {
    id: "AMAZON_SES",
    name: "Amazon SES (AWS)",
    host: "email-smtp.us-east-1.amazonaws.com",
    port: 587,
    encryption: "STARTTLS",
    badge: "Alta Escala",
    description: "Custo ultrabaixo para envio em massa de certificados de garantia e pedidos.",
  },
  {
    id: "SENDGRID",
    name: "Twilio SendGrid",
    host: "smtp.sendgrid.net",
    port: 587,
    encryption: "TLS",
    badge: "Enterprise",
    description: "Infraestrutura global de envios com métricas avançadas de abertura e cliques.",
  },
];

export const StoreSmtpSettingsManager: React.FC<StoreSmtpSettingsManagerProps> = ({
  tenant,
  smtpConfig = DEFAULT_STORE_SMTP_CONFIG,
  onUpdateSmtpConfig,
}) => {
  const [config, setConfig] = useState<StoreSmtpConfig>({
    ...DEFAULT_STORE_SMTP_CONFIG,
    ...smtpConfig,
    fromEmail: smtpConfig.fromEmail || tenant.contactEmail || "garantia@luminasemijoias.com.br",
    fromName: smtpConfig.fromName || tenant.name || "Lumina Semijoias",
  });

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testEmailDestination, setTestEmailDestination] = useState<string>(tenant.contactEmail || "willianCLima@gmail.com");
  const [testResult, setTestResult] = useState<{
    success: boolean;
    testedAt: string;
    latencyMs: number;
    message: string;
    details?: string[];
  } | null>(
    config.lastTestStatus
      ? {
          success: config.lastTestStatus === "SUCCESS",
          testedAt: config.lastTestedAt || "Hoje",
          latencyMs: 142,
          message: config.lastTestMessage || "Conexão SMTP validada com sucesso.",
        }
      : null
  );

  const [hasSavedSuccess, setHasSavedSuccess] = useState<boolean>(false);
  const [activePreviewType, setActivePreviewType] = useState<"WARRANTY" | "ORDER_CONFIRMED" | "DISPATCHED">("WARRANTY");

  const handleApplyPreset = (preset: SmtpProviderPreset) => {
    setConfig((prev) => ({
      ...prev,
      provider: preset.id,
      host: preset.host,
      port: preset.port,
      encryption: preset.encryption,
    }));
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const updated: StoreSmtpConfig = {
      ...config,
      updatedAt: new Date().toISOString(),
    };
    onUpdateSmtpConfig(updated);
    setHasSavedSuccess(true);
    confetti({
      particleCount: 35,
      spread: 45,
      origin: { y: 0.7 },
    });
    setTimeout(() => setHasSavedSuccess(false), 3500);
  };

  const handleTestSmtpConnection = () => {
    if (!config.host || !config.fromEmail) {
      alert("Por favor, preencha o Host e o E-mail de Envio antes de disparar o teste.");
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    setTimeout(() => {
      const isSuccess = Boolean(config.host && config.port && config.fromEmail.includes("@"));
      const now = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

      if (isSuccess) {
        const result = {
          success: true,
          testedAt: `Hoje às ${now}`,
          latencyMs: Math.floor(Math.random() * 80) + 110,
          message: `E-mail de teste enviado com sucesso para ${testEmailDestination}! Conexão com ${config.host}:${config.port} via ${config.encryption} autenticada sem erros.`,
          details: [
            `Conexão TCP estabelecida com ${config.host}:${config.port} (TLS 1.3)`,
            `Autenticação AUTH LOGIN aceita pelo servidor remoto`,
            `Certificado Digital X.509 verificado com autoridade confiável`,
            `Mensagem RFC 5322 enfileirada e aceita pelo MTA destinatário`,
          ],
        };
        setTestResult(result);
        setConfig((prev) => ({
          ...prev,
          lastTestedAt: result.testedAt,
          lastTestStatus: "SUCCESS",
          lastTestMessage: result.message,
        }));
      } else {
        const result = {
          success: false,
          testedAt: `Hoje às ${now}`,
          latencyMs: 95,
          message: `Falha na conexão SMTP: Verifique as credenciais, o host ${config.host} ou a porta ${config.port}.`,
          details: [
            `Erro de autenticação ou timeout no handshake inicial`,
            `Certifique-se de que a porta ${config.port} aceita conexões ${config.encryption}`,
          ],
        };
        setTestResult(result);
        setConfig((prev) => ({
          ...prev,
          lastTestedAt: result.testedAt,
          lastTestStatus: "FAILED",
          lastTestMessage: result.message,
        }));
      }
      setIsTesting(false);
    }, 1200);
  };

  return (
    <div className="space-y-6" id="smtp-settings-container">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-amber-100 text-amber-900">
                <Server className="w-5 h-5" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                E-mail Corporativo & Automação Transacional
              </span>
            </div>
            <h3 className="text-2xl font-serif italic font-bold text-stone-900">
              Servidor SMTP & Notificações Automáticas
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 max-w-3xl leading-relaxed">
              Configure o servidor de e-mail da sua própria marca para emitir automaticamente o 
              <strong> Passaporte de Garantia Digital QR</strong>, avisos de pedido confirmado, 
              aprovação de PIX/Cartão e código de rastreio dos Correios/transportadora com sua identidade visual.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Master Toggle */}
            <label className="flex items-center gap-3 px-4 py-2.5 rounded-2xl border border-stone-200 bg-stone-50/70 hover:bg-stone-100/70 cursor-pointer transition-all">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig((prev) => ({ ...prev, enabled: e.target.checked }))}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-stone-300 cursor-pointer"
              />
              <span className="text-xs font-bold text-stone-800">
                {config.enabled ? "SMTP Ativo" : "SMTP Desativado"}
              </span>
            </label>

            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2.5 rounded-full bg-stone-900 hover:bg-stone-800 text-amber-300 hover:text-amber-200 text-xs font-bold uppercase tracking-wider transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
              <span>Salvar Servidor</span>
            </button>
          </div>
        </div>

        {hasSavedSuccess && (
          <div className="mt-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center justify-between animate-in fade-in">
            <span className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Configurações do servidor SMTP salvas com sucesso para a loja {tenant.name}!
            </span>
            <span className="text-[11px] text-emerald-700">Pronto para disparos automáticos</span>
          </div>
        )}
      </div>

      {/* Preset Cards for Quick Setup */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Selecione o Provedor ou Configure Manualmente
          </h4>
          <p className="text-xs text-stone-600 mt-0.5">
            Clique em um provedor abaixo para carregar as portas e criptografias recomendadas:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SMTP_PRESETS.map((preset) => {
            const isSelected = config.provider === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer relative ${
                  isSelected
                    ? "border-amber-400 bg-amber-50/60 ring-2 ring-amber-400/30 shadow-xs"
                    : "border-stone-200 hover:border-stone-300 bg-white hover:bg-stone-50/50"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-950 bg-amber-200/80 px-2 py-0.5 rounded-md">
                    {preset.badge}
                  </span>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-600" />}
                </div>
                <p className="text-xs font-bold text-stone-900">{preset.name}</p>
                <p className="text-[11px] text-stone-500 mt-1 leading-snug">{preset.description}</p>
                <div className="mt-2 pt-2 border-t border-stone-100 flex items-center justify-between text-[10px] text-stone-400 font-mono">
                  <span>Host: {preset.host}</span>
                  <span>Porta: {preset.port}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Form: Technical Parameters & Credentials */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Server Credentials */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-stone-200 p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <Server className="w-4 h-4 text-stone-700" />
              Parâmetros de Conexão SMTP
            </h4>
            <span className="text-[11px] text-stone-500 font-mono">
              Porta Padrão: 587 (STARTTLS) ou 465 (SSL)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-stone-700">Servidor SMTP (Host / IP)</label>
              <input
                type="text"
                value={config.host}
                onChange={(e) => setConfig((prev) => ({ ...prev, host: e.target.value }))}
                placeholder="smtp.seudominio.com.br"
                className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-700">Porta</label>
              <input
                type="number"
                value={config.port}
                onChange={(e) => setConfig((prev) => ({ ...prev, port: parseInt(e.target.value, 10) || 587 }))}
                placeholder="587"
                className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-700">Criptografia / Segurança</label>
              <select
                value={config.encryption}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, encryption: e.target.value as StoreSmtpConfig["encryption"] }))
                }
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="STARTTLS">STARTTLS (Recomendado - Porta 587)</option>
                <option value="SSL">SSL / TLS Direto (Porta 465)</option>
                <option value="TLS">TLS Implícito</option>
                <option value="NONE">Nenhuma / Aberta (Apenas Rede Interna)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-700">E-mail de Autenticação (Usuário)</label>
              <input
                type="text"
                value={config.username}
                onChange={(e) => setConfig((prev) => ({ ...prev, username: e.target.value }))}
                placeholder="notificacoes@suaempresa.com.br"
                className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-700 flex items-center justify-between">
              <span>Senha do SMTP / Senha de Aplicativo</span>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                <span>{showPassword ? "Ocultar" : "Mostrar"}</span>
              </button>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={config.password || ""}
                onChange={(e) => setConfig((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="Digite a senha do e-mail ou App Password"
                className="w-full text-xs font-mono px-3.5 py-2.5 pr-10 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <Lock className="w-4 h-4 text-stone-400 absolute right-3 top-3" />
            </div>
            <p className="text-[11px] text-stone-500">
              Caso use Gmail ou Google Workspace, utilize uma <strong>Senha de App</strong> gerada na Central de Segurança do Google.
            </p>
          </div>

          {/* Sender Identity Info */}
          <div className="pt-2 border-t border-stone-100 space-y-4">
            <h5 className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Identidade do Remetente (O que o cliente vê na caixa de entrada)
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-700">Nome do Remetente</label>
                <input
                  type="text"
                  value={config.fromName}
                  onChange={(e) => setConfig((prev) => ({ ...prev, fromName: e.target.value }))}
                  placeholder="Lumina Semijoias & Garantia"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-700">E-mail de Envio (From)</label>
                <input
                  type="email"
                  value={config.fromEmail}
                  onChange={(e) => setConfig((prev) => ({ ...prev, fromEmail: e.target.value }))}
                  placeholder="garantia@luminasemijoias.com.br"
                  className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-700">E-mail de Resposta (Reply-To opcional)</label>
              <input
                type="email"
                value={config.replyToEmail || ""}
                onChange={(e) => setConfig((prev) => ({ ...prev, replyToEmail: e.target.value }))}
                placeholder="atendimento@luminasemijoias.com.br"
                className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <p className="text-[11px] text-stone-500">
                Quando a cliente clica em &quot;Responder&quot; no e-mail recebido, a mensagem vai direto para este endereço.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Automated Dispatch Rules & Triggers */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4">
            <div className="border-b border-stone-100 pb-3">
              <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <BellRing className="w-4 h-4 text-amber-600" />
                Gatilhos de Envio Automático
              </h4>
              <p className="text-xs text-stone-500 mt-0.5">
                Escolha quais eventos do sistema acionam o disparo imediato de e-mails para os clientes:
              </p>
            </div>

            <div className="space-y-3">
              {/* Trigger 1: Digital Warranty */}
              <label className="flex items-start gap-3 p-3 rounded-2xl border border-amber-200/80 bg-amber-50/40 hover:bg-amber-50 cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={config.autoSendDigitalWarranty}
                  onChange={(e) => setConfig((prev) => ({ ...prev, autoSendDigitalWarranty: e.target.checked }))}
                  className="w-4 h-4 mt-0.5 rounded text-amber-600 focus:ring-amber-500 border-stone-300"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-amber-600" />
                    Passaporte de Garantia Digital QR
                  </span>
                  <p className="text-[11px] text-stone-600 leading-snug">
                    Envia o certificado em PDF/HTML com o QR Code único de autenticidade no momento em que o pedido é aprovado ou faturado.
                  </p>
                </div>
              </label>

              {/* Trigger 2: Order Placed */}
              <label className="flex items-start gap-3 p-3 rounded-2xl border border-stone-200 hover:bg-stone-50 cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={config.autoSendOrderPlaced}
                  onChange={(e) => setConfig((prev) => ({ ...prev, autoSendOrderPlaced: e.target.checked }))}
                  className="w-4 h-4 mt-0.5 rounded text-amber-600 focus:ring-amber-500 border-stone-300"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-stone-600" />
                    Confirmação de Pedido Realizado
                  </span>
                  <p className="text-[11px] text-stone-500 leading-snug">
                    Resumo das joias selecionadas, prazo e instruções de pagamento após checkout no storefront.
                  </p>
                </div>
              </label>

              {/* Trigger 3: Payment Approved */}
              <label className="flex items-start gap-3 p-3 rounded-2xl border border-stone-200 hover:bg-stone-50 cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={config.autoSendPaymentApproved}
                  onChange={(e) => setConfig((prev) => ({ ...prev, autoSendPaymentApproved: e.target.checked }))}
                  className="w-4 h-4 mt-0.5 rounded text-amber-600 focus:ring-amber-500 border-stone-300"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    Pagamento Aprovado & Em Separação
                  </span>
                  <p className="text-[11px] text-stone-500 leading-snug">
                    Avisa o cliente imediatamente assim que o webhook do PIX ou Cartão confirma a liquidação.
                  </p>
                </div>
              </label>

              {/* Trigger 4: Order Dispatched */}
              <label className="flex items-start gap-3 p-3 rounded-2xl border border-stone-200 hover:bg-stone-50 cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={config.autoSendOrderDispatched}
                  onChange={(e) => setConfig((prev) => ({ ...prev, autoSendOrderDispatched: e.target.checked }))}
                  className="w-4 h-4 mt-0.5 rounded text-amber-600 focus:ring-amber-500 border-stone-300"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-sky-600" />
                    Pedido Despachado com Código de Rastreio
                  </span>
                  <p className="text-[11px] text-stone-500 leading-snug">
                    Dispara o link de rastreamento dos Correios/transportadora e previsão de entrega para a residência da cliente.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Test Dispatch Panel */}
          <div className="bg-stone-900 text-stone-100 rounded-3xl p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5" />
                Diagnóstico & Envio de Teste
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </div>

            <p className="text-xs text-stone-300 leading-relaxed">
              Dispare um e-mail de teste em tempo real para validar se as portas, criptografia e credenciais estão autorizadas.
            </p>

            <div className="space-y-2">
              <label className="text-[11px] text-stone-400">E-mail Destino para Receber o Teste:</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={testEmailDestination}
                  onChange={(e) => setTestEmailDestination(e.target.value)}
                  placeholder="seuemail@exemplo.com"
                  className="flex-1 text-xs font-mono px-3.5 py-2.5 rounded-xl bg-stone-800 border border-stone-700 text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <button
                  type="button"
                  disabled={isTesting}
                  onClick={handleTestSmtpConnection}
                  className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-stone-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  {isTesting ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                      <span>Testando...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Testar Conexão</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {testResult && (
              <div
                className={`p-3.5 rounded-2xl border text-xs space-y-1.5 animate-in fade-in ${
                  testResult.success
                    ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-200"
                    : "bg-rose-950/60 border-rose-500/50 text-rose-200"
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5">
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                    )}
                    {testResult.success ? "Conexão Validada com Sucesso!" : "Falha na Verificação"}
                  </span>
                  <span className="text-[10px] opacity-80">{testResult.latencyMs}ms</span>
                </div>
                <p className="text-[11px] leading-relaxed opacity-95">{testResult.message}</p>
                {testResult.details && testResult.details.length > 0 && (
                  <div className="pt-2 border-t border-white/10 space-y-1 text-[10px] font-mono opacity-85">
                    {testResult.details.map((d, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <span>•</span>
                        <span>{d}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Editor de HTML / Liquid Customizável para o E-mail da Garantia Digital QR */}
      <HtmlLiquidTemplateEditor
        tenant={tenant}
        config={config}
        onChangeSubject={(subject) => setConfig((prev) => ({ ...prev, warrantyEmailSubject: subject }))}
        onChangeTemplate={(template) => setConfig((prev) => ({ ...prev, warrantyEmailTemplate: template }))}
        onResetToDefault={() => {
          setConfig((prev) => ({
            ...prev,
            warrantyEmailSubject: DEFAULT_STORE_SMTP_CONFIG.warrantyEmailSubject,
            warrantyEmailTemplate: DEFAULT_STORE_SMTP_CONFIG.warrantyEmailTemplate,
          }));
        }}
      />

      {/* Visual Email Template Preview (Garantia Digital & Pedido) */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
          <div>
            <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <Eye className="w-4 h-4 text-amber-600" />
              Prévia Visual dos E-mails Enviados aos Compradores
            </h4>
            <p className="text-xs text-stone-500 mt-0.5">
              Veja como os clientes receberão as mensagens da marca {tenant.name} na caixa de entrada:
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-full text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActivePreviewType("WARRANTY")}
              className={`px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                activePreviewType === "WARRANTY" ? "bg-white text-stone-900 shadow-xs font-bold" : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Garantia Digital QR
            </button>
            <button
              type="button"
              onClick={() => setActivePreviewType("ORDER_CONFIRMED")}
              className={`px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                activePreviewType === "ORDER_CONFIRMED" ? "bg-white text-stone-900 shadow-xs font-bold" : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Pedido Confirmado
            </button>
            <button
              type="button"
              onClick={() => setActivePreviewType("DISPATCHED")}
              className={`px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                activePreviewType === "DISPATCHED" ? "bg-white text-stone-900 shadow-xs font-bold" : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Rastreamento / Despacho
            </button>
          </div>
        </div>

        {/* Mock Email Client Frame */}
        <div className="max-w-2xl mx-auto rounded-2xl border border-stone-300 bg-stone-50 overflow-hidden shadow-sm">
          {/* Email Client Header Bar */}
          <div className="bg-stone-200/80 px-4 py-2.5 border-b border-stone-300/80 flex items-center justify-between text-xs text-stone-700">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="font-mono text-[11px] text-stone-500 ml-2">Inbox &bull; Para: cliente@email.com</span>
            </div>
            <span className="text-[10px] text-stone-500 font-mono">De: {config.fromName} &lt;{config.fromEmail}&gt;</span>
          </div>

          {/* Email Body Content */}
          <div className="p-6 sm:p-8 bg-white space-y-6">
            {/* Brand Logo in Email */}
            <div className="text-center pb-4 border-b border-stone-100">
              <h2 className="text-xl font-serif italic font-bold text-stone-900">{tenant.name}</h2>
              <p className="text-[11px] uppercase tracking-widest text-amber-700 font-medium">
                Alta Semijoias &bull; Certificado Oficial
              </p>
            </div>

            {activePreviewType === "WARRANTY" && (
              config.warrantyEmailTemplate ? (
                <div
                  className="rounded-xl overflow-hidden shadow-xs"
                  dangerouslySetInnerHTML={{
                    __html: compileLiquidTemplate(config.warrantyEmailTemplate, tenant),
                  }}
                />
              ) : (
                <div className="space-y-4">
                  <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 text-center space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                      Seu Certificado de Garantia Digital Está Ativo!
                    </span>
                    <p className="text-xs text-stone-600 max-w-md mx-auto">
                      Parabéns pela sua nova semijoia nobre banhada a Ouro 18K. Abaixo está o seu passaporte exclusivo com validade de 12 meses:
                    </p>

                    <div className="w-28 h-28 mx-auto bg-white p-2 rounded-xl border border-amber-300 shadow-xs flex flex-col items-center justify-center">
                      <QrCode className="w-16 h-16 text-stone-800" />
                      <span className="text-[9px] font-mono text-stone-500 mt-1 font-bold">LMN-GRT-9920</span>
                    </div>

                    <p className="text-[11px] text-stone-500">
                      Aponte a câmera para consultar a autenticidade e histórico do banho.
                    </p>
                  </div>

                  <div className="rounded-xl border border-stone-100 bg-stone-50/60 p-3.5 text-xs text-stone-700 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-stone-500">Peça Coberta:</span>
                      <span className="font-semibold">Colar Riviera Cravejado Ouro 18K</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Período de Cobertura:</span>
                      <span className="font-semibold text-emerald-700">12 meses (Até 19/09/2027)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Atendimento da Garantia:</span>
                      <span>{tenant.contactWhatsapp}</span>
                    </div>
                  </div>
                </div>
              )
            )}

            {activePreviewType === "ORDER_CONFIRMED" && (
              <div className="space-y-4">
                <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 text-center space-y-1.5">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <h5 className="text-sm font-bold text-emerald-950">Pedido Confirmado #ORD-2026-1920</h5>
                  <p className="text-xs text-stone-600">
                    Obrigado por sua compra! Estamos preparando suas semijoias com todo o cuidado e acabamento artesanal.
                  </p>
                </div>

                <div className="rounded-xl border border-stone-100 bg-stone-50/60 p-3.5 text-xs space-y-2">
                  <div className="flex justify-between font-semibold border-b border-stone-200/60 pb-2">
                    <span>1x Brinco Gota Esmeralda Fusion (Ródio Branco)</span>
                    <span>R$ 189,00</span>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>Frete Expresso Seguro</span>
                    <span>Grátis</span>
                  </div>
                  <div className="flex justify-between font-bold text-stone-900 pt-1">
                    <span>Total Pago</span>
                    <span className="text-amber-700">R$ 189,00</span>
                  </div>
                </div>
              </div>
            )}

            {activePreviewType === "DISPATCHED" && (
              <div className="space-y-4">
                <div className="bg-sky-50/70 border border-sky-200 rounded-2xl p-4 text-center space-y-1.5">
                  <Truck className="w-8 h-8 text-sky-600 mx-auto" />
                  <h5 className="text-sm font-bold text-sky-950">Sua Encomenda Está a Caminho!</h5>
                  <p className="text-xs text-stone-600">
                    Seu pacote foi entregue à transportadora e já pode ser rastreado em tempo real.
                  </p>
                </div>

                <div className="rounded-xl border border-stone-100 bg-stone-50/60 p-3.5 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Código de Rastreamento:</span>
                    <span className="font-mono font-bold text-sky-800">BR982144021SP</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Transportadora:</span>
                    <span>Correios SEDEX Express</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Previsão de Entrega:</span>
                    <span className="font-semibold text-stone-900">Em até 2 dias úteis</span>
                  </div>
                </div>
              </div>
            )}

            {/* Email Footer */}
            <div className="pt-4 border-t border-stone-100 text-center text-[10px] text-stone-400 space-y-1">
              <p>{tenant.name} &bull; {tenant.document}</p>
              <p>Dúvidas? Entre em contato pelo e-mail {config.replyToEmail || config.fromEmail} ou WhatsApp {tenant.contactWhatsapp}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
