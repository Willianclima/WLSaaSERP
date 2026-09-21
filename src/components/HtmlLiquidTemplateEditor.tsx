import React, { useState } from "react";
import {
  Code2,
  Eye,
  Sparkles,
  RotateCcw,
  Copy,
  Check,
  HelpCircle,
  Braces,
  FileText,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { TenantStore, StoreSmtpConfig } from "../types";
import { DEFAULT_STORE_SMTP_CONFIG } from "../data/mockData";

interface HtmlLiquidTemplateEditorProps {
  tenant: TenantStore;
  config: StoreSmtpConfig;
  onChangeSubject: (subject: string) => void;
  onChangeTemplate: (template: string) => void;
  onResetToDefault: () => void;
}

interface TemplateVariable {
  tag: string;
  label: string;
  description: string;
  example: string;
}

const AVAILABLE_VARIABLES: { category: string; vars: TemplateVariable[] }[] = [
  {
    category: "Lojista & Marca",
    vars: [
      {
        tag: "{{ lojista.nome }}",
        label: "Nome da Marca",
        description: "Nome oficial da loja de semijoias",
        example: "Lumina Semijoias",
      },
      {
        tag: "{{ lojista.whatsapp }}",
        label: "WhatsApp de Atendimento",
        description: "Telefone formatado do suporte",
        example: "+55 (19) 98842-1100",
      },
      {
        tag: "{{ lojista.email }}",
        label: "E-mail de Contato",
        description: "Canal oficial de atendimento",
        example: "contato@luminasemijoias.com.br",
      },
      {
        tag: "{{ lojista.site }}",
        label: "URL da Loja",
        description: "Link do catálogo ou domínio próprio",
        example: "https://lumina.aura.com",
      },
    ],
  },
  {
    category: "Garantia Digital QR",
    vars: [
      {
        tag: "{{ garantia.codigo }}",
        label: "Código Único do Passaporte",
        description: "Identificador alfanumérico da garantia",
        example: "GRT-2026-9920",
      },
      {
        tag: "{{ garantia.qr_code_url }}",
        label: "URL da Imagem do QR Code",
        description: "Link direto do QR Code gerado para a peça",
        example: "https://api.qrserver.com/v1/create-qr-code/?data=GRT-2026-9920",
      },
      {
        tag: "{{ garantia.link_consulta }}",
        label: "Link de Consulta Online",
        description: "URL da página pública de conferência da garantia",
        example: "https://lumina.aura.com/garantia/GRT-2026-9920",
      },
      {
        tag: "{{ garantia.data_emissao }}",
        label: "Data de Emissão",
        description: "Data em que a garantia foi registrada",
        example: "20/09/2026",
      },
      {
        tag: "{{ garantia.data_expiracao }}",
        label: "Data de Validade",
        description: "Data final de vigência (ex: 12 meses)",
        example: "20/09/2027",
      },
      {
        tag: "{{ garantia.meses_validade }}",
        label: "Período em Meses",
        description: "Quantidade de meses de cobertura",
        example: "12 meses",
      },
    ],
  },
  {
    category: "Cliente & Compra",
    vars: [
      {
        tag: "{{ cliente.nome }}",
        label: "Nome do Cliente",
        description: "Nome completo do comprador",
        example: "Camila Rocha",
      },
      {
        tag: "{{ cliente.email }}",
        label: "E-mail do Cliente",
        description: "Endereço de e-mail do destinatário",
        example: "camila.rocha@email.com",
      },
      {
        tag: "{{ produto.nome }}",
        label: "Nome da Semijoia",
        description: "Título da joia ou colar comprado",
        example: "Colar Riviera Cravejado Ouro 18K",
      },
      {
        tag: "{{ pedido.numero }}",
        label: "Número do Pedido",
        description: "Identificador único do pedido",
        example: "ORD-2026-1920",
      },
      {
        tag: "{{ pedido.valor_total }}",
        label: "Valor Total",
        description: "Valor faturado formatado em Reais",
        example: "R$ 389,00",
      },
    ],
  },
];

/**
 * Renderiza as tags Liquid substituindo pelas variáveis de exemplo do mock
 */
export function compileLiquidTemplate(
  template: string,
  tenant: TenantStore,
  customVars?: Record<string, string>
): string {
  if (!template) return "";

  const storeSlug = tenant.slug || "loja";
  const data: Record<string, string> = {
    "lojista.nome": tenant.name || "Lumina Semijoias",
    "lojista.whatsapp": tenant.contactWhatsapp || "+55 (19) 98842-1100",
    "lojista.email": tenant.contactEmail || "contato@luminasemijoias.com.br",
    "lojista.site": tenant.customDomain ? `https://${tenant.customDomain}` : `https://${storeSlug}.aura.com`,
    "garantia.codigo": "GRT-2026-9920",
    "garantia.qr_code_url":
      "https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=https%3A%2F%2Flumina.aura.com%2Fgarantia%2FGRT-2026-9920",
    "garantia.link_consulta": tenant.customDomain ? `https://${tenant.customDomain}/garantia/GRT-2026-9920` : `https://${storeSlug}.aura.com/garantia/GRT-2026-9920`,
    "garantia.data_emissao": new Date().toLocaleDateString("pt-BR"),
    "garantia.data_expiracao": new Date(
      new Date().setFullYear(new Date().getFullYear() + 1)
    ).toLocaleDateString("pt-BR"),
    "garantia.meses_validade": "12 meses",
    "cliente.nome": "Camila Rocha",
    "cliente.email": "camila.rocha@email.com",
    "produto.nome": "Colar Riviera Cravejado Ouro 18K",
    "pedido.numero": "ORD-2026-1920",
    "pedido.valor_total": "R$ 389,00",
    ...customVars,
  };

  let rendered = template;
  for (const [key, value] of Object.entries(data)) {
    // Substitui {{ key }} e {{key}}
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    rendered = rendered.replace(regex, value);
  }

  return rendered;
}

export const HtmlLiquidTemplateEditor: React.FC<HtmlLiquidTemplateEditorProps> = ({
  tenant,
  config,
  onChangeSubject,
  onChangeTemplate,
  onResetToDefault,
}) => {
  const currentSubject =
    config.warrantyEmailSubject ||
    DEFAULT_STORE_SMTP_CONFIG.warrantyEmailSubject ||
    "Seu Passaporte de Garantia Digital QR - {{ lojista.nome }} ({{ garantia.codigo }})";

  const currentTemplate =
    config.warrantyEmailTemplate ||
    DEFAULT_STORE_SMTP_CONFIG.warrantyEmailTemplate ||
    "";

  const [activeTab, setActiveTab] = useState<"EDITOR" | "LIVE_PREVIEW">("EDITOR");
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  const handleCopyTag = (tag: string) => {
    navigator.clipboard.writeText(tag);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 2000);
  };

  const handleInsertTagAtEnd = (tag: string) => {
    onChangeTemplate(currentTemplate + "\n" + tag);
    handleCopyTag(tag);
  };

  const compiledHtml = compileLiquidTemplate(currentTemplate, tenant);
  const compiledSubject = compileLiquidTemplate(currentSubject, tenant);

  return (
    <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-xs space-y-6" id="html-liquid-editor-container">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-amber-100 text-amber-900">
              <Code2 className="w-5 h-5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
              Editor de Template HTML & Liquid
            </span>
          </div>
          <h3 className="text-xl font-serif italic font-bold text-stone-900">
            Personalização do E-mail da Garantia Digital QR
          </h3>
          <p className="text-xs text-stone-600 max-w-2xl leading-relaxed">
            Customize as cores, frases de agradecimento, logotipo e blocos visuais do e-mail que sua cliente recebe.
            Utilize tags dinâmicas no padrão <code>&#123;&#123; variavel &#125;&#125;</code> para preencher dados automáticos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onResetToDefault}
            className="px-3.5 py-2 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Restaurar template padrão de alta conversão"
          >
            <RotateCcw className="w-3.5 h-3.5 text-stone-500" />
            <span>Restaurar Padrão</span>
          </button>

          <div className="flex bg-stone-100 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab("EDITOR")}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "EDITOR"
                  ? "bg-stone-900 text-white shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Código HTML / Liquid</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("LIVE_PREVIEW")}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "LIVE_PREVIEW"
                  ? "bg-amber-400 text-stone-950 shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Prévia ao Vivo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Assunto do E-mail */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-stone-700 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-amber-600" />
            Assunto do E-mail (Subject Line com suporte a Liquid)
          </span>
          <span className="text-[11px] text-stone-400 font-normal">
            Prévia renderizada: &quot;{compiledSubject}&quot;
          </span>
        </label>
        <input
          type="text"
          value={currentSubject}
          onChange={(e) => onChangeSubject(e.target.value)}
          placeholder="Seu Passaporte de Garantia Digital QR - {{ lojista.nome }} ({{ garantia.codigo }})"
          className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 bg-white"
        />
      </div>

      {/* Main Container: Editor / Preview + Tags helper sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Editor or Preview */}
        <div className="lg:col-span-8 space-y-3">
          {activeTab === "EDITOR" ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                  <Braces className="w-3.5 h-3.5 text-amber-600" />
                  Código-Fonte do Template (HTML / CSS Inline / Liquid)
                </span>
                <span className="text-[11px] text-stone-400 font-mono">
                  {currentTemplate.length} caracteres
                </span>
              </div>

              <textarea
                rows={18}
                value={currentTemplate}
                onChange={(e) => onChangeTemplate(e.target.value)}
                placeholder="Insira aqui o código HTML e as tags Liquid..."
                className="w-full font-mono text-xs p-4 rounded-2xl bg-stone-900 text-stone-100 border border-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400 leading-relaxed resize-y selection:bg-amber-500/40"
                spellCheck={false}
              />

              <div className="flex items-center justify-between text-[11px] text-stone-500">
                <span>Dica: Use estilos inline (ex: <code>style=&quot;...&quot;</code>) para garantir compatibilidade com Gmail, Outlook e Apple Mail.</span>
                <button
                  type="button"
                  onClick={() => setActiveTab("LIVE_PREVIEW")}
                  className="text-amber-700 hover:text-amber-800 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3 h-3" />
                  <span>Ver resultado visual &rarr;</span>
                </button>
              </div>
            </div>
          ) : (
            /* Live Preview rendered in sandbox */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-emerald-600" />
                  Renderização Visual do Template Compilado
                </span>
                <span className="text-[11px] text-stone-400">Variáveis mockadas substituídas em tempo real</span>
              </div>

              <div className="rounded-2xl border border-stone-300 bg-stone-100 overflow-hidden shadow-inner p-4 sm:p-6">
                <div
                  className="max-w-2xl mx-auto shadow-md rounded-xl overflow-hidden bg-white"
                  dangerouslySetInnerHTML={{ __html: compiledHtml }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Column (4 cols): Dynamic Liquid Variables Directory */}
        <div className="lg:col-span-4 bg-stone-50 rounded-2xl border border-stone-200 p-4 space-y-4">
          <div className="border-b border-stone-200 pb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Tags Liquid Disponíveis
            </h4>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Clique em qualquer tag para copiar ou inserir no seu template HTML:
            </p>
          </div>

          <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
            {AVAILABLE_VARIABLES.map((category) => (
              <div key={category.category} className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 bg-amber-100/70 px-2 py-0.5 rounded-md inline-block">
                  {category.category}
                </span>

                <div className="space-y-1">
                  {category.vars.map((variable) => {
                    const isCopied = copiedTag === variable.tag;
                    return (
                      <div
                        key={variable.tag}
                        className="p-2 rounded-xl bg-white border border-stone-200/80 hover:border-amber-300 hover:bg-amber-50/40 transition-all text-left group"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <button
                            type="button"
                            onClick={() => handleCopyTag(variable.tag)}
                            className="font-mono text-[11px] font-bold text-stone-800 hover:text-amber-700 flex items-center gap-1 cursor-pointer"
                            title="Clique para copiar"
                          >
                            <span>{variable.tag}</span>
                            {isCopied ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3 text-stone-400 group-hover:text-amber-600" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleInsertTagAtEnd(variable.tag)}
                            className="text-[10px] text-amber-700 hover:text-amber-900 font-semibold px-1.5 py-0.5 rounded hover:bg-amber-100 cursor-pointer transition-all"
                            title="Inserir tag no código"
                          >
                            + Inserir
                          </button>
                        </div>

                        <p className="text-[10px] text-stone-500 mt-0.5 leading-tight">
                          {variable.label}: <span className="text-stone-400 italic font-mono">{variable.example}</span>
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-stone-200 text-[10px] text-stone-500 space-y-1">
            <p className="flex items-center gap-1 font-semibold text-stone-700">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Garantia Digital com QR Code Seguro
            </p>
            <p>
              A tag <code>&#123;&#123; garantia.qr_code_url &#125;&#125;</code> gera dinamicamente uma imagem com o link encriptado para a verificação pública da semijoia.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
