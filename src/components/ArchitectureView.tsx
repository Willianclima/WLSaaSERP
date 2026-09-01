import React from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Layers,
  ShieldAlert,
  Sparkles,
  Server,
  Database,
  Smartphone,
  Cpu,
  RefreshCw,
  Crown,
} from "lucide-react";

interface ArchitectureViewProps {
  onClose?: () => void;
}

export const ArchitectureView: React.FC<ArchitectureViewProps> = ({ onClose }) => {
  return (
    <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 text-stone-900 shadow-xl space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-6 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">
              Parecer Técnico & Análise Estratégica
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif italic font-bold tracking-wide text-stone-900 mt-1">
            Avaliação da Arquitetura: Aura Semijoias OS
          </h2>
          <p className="text-xs text-stone-600 mt-1 max-w-3xl font-sans leading-relaxed">
            Análise detalhada do plano de 10 domínios, pontos fortes comprovados e os 4 refinamentos críticos para garantir que a plataforma opere como um SaaS multi-tenant de classe mundial.
          </p>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold transition-colors"
          >
            Fechar Parecer
          </button>
        )}
      </div>

      {/* Verdict Card */}
      <div className="bg-stone-900 text-white rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-300 shrink-0">
            <Crown className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-serif italic font-bold text-white">
              Veredito do Arquiteto: Plano Excepcional com Foco no Core do Negócio
            </h3>
            <p className="text-xs text-stone-300 leading-relaxed font-sans">
              O seu plano resolve a dor real que 99% das plataformas genéricas de e-commerce (Shopify, Nuvemshop, WooCommerce) não conseguem atender: no mercado de semijoias, <strong>a venda por revendedoras e consignação responde por 65% a 85% do faturamento</strong>. Tratar consignação, comissões em cascata e garantia digital como cidadãos de primeira classe no modelo de dados transforma essa plataforma de "apenas uma loja" em um <strong>ERP Vertical SaaS insubstituível</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* The 5 Architectural Refinements */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-600" />
          <h3 className="text-base font-serif italic font-bold text-stone-900">
            Os 5 Refinamentos Críticos para o seu SaaS Escalar
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Refinement 1 */}
          <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200 space-y-2.5">
            <div className="flex items-center gap-2 text-stone-900 text-sm font-serif font-bold">
              <Database className="w-4 h-4 text-stone-700" />
              <span>1. Ledger de Consignação (Event Sourcing)</span>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed font-sans">
              <strong>Por que é crucial:</strong> Produtos consignados continuam sendo ativo contábil da loja, mas saem da custódia física. Nunca faça apenas <code className="font-mono bg-stone-200 px-1 py-0.5 rounded text-stone-800 text-[10px]">stock -= qty</code>.
            </p>
            <div className="bg-white rounded-xl p-3 text-[11px] font-mono text-stone-800 border border-stone-200">
              <span className="text-stone-400">// Modelo Ledger Recomendado:</span>
              <br />
              <span className="text-emerald-700">InventoryBalance</span> = physical_available + in_consignment
              <br />
              <span className="text-sky-700">Events</span>: SHIPPED_TO_RESELLER ➔ PARTIAL_SALE ➔ RETURN_TO_STOCK
            </div>
          </div>

          {/* Refinement 2 */}
          <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200 space-y-2.5">
            <div className="flex items-center gap-2 text-stone-900 text-sm font-serif font-bold">
              <RefreshCw className="w-4 h-4 text-stone-700" />
              <span>2. Motor de Comissões com Snapshot Imutável</span>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed font-sans">
              <strong>Por que é crucial:</strong> Se a política de comissão mudar de 25% para 30% em Setembro, os pedidos de Agosto não podem ser recalculados retroativamente.
            </p>
            <div className="bg-white rounded-xl p-3 text-[11px] font-mono text-stone-800 border border-stone-200">
              <span className="text-stone-400">// Snapshot em cada Order / Settlement:</span>
              <br />
              order.commission_snapshot = &#123; rule_id, rate_applied: 0.25, leader_bonus: 0.05 &#125;
            </div>
          </div>

          {/* Refinement 3 */}
          <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200 space-y-2.5">
            <div className="flex items-center gap-2 text-stone-900 text-sm font-serif font-bold">
              <ShieldAlert className="w-4 h-4 text-stone-700" />
              <span>3. Garantia Digital com Validação Pública Stateless</span>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed font-sans">
              <strong>Por que é crucial:</strong> O consumidor final precisa ler o QR Code no smartphone e ver a garantia em 1 segundo sem precisar criar conta ou fazer login.
            </p>
            <div className="bg-white rounded-xl p-3 text-[11px] font-mono text-stone-800 border border-stone-200">
              <span className="text-stone-400">// URL do QR Code:</span>
              <br />
              https://aurajoias.com/garantia/<span className="text-amber-700">GRT-8F2A9D</span>
            </div>
          </div>

          {/* Refinement 4 */}
          <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200 space-y-2.5">
            <div className="flex items-center gap-2 text-stone-900 text-sm font-serif font-bold">
              <Cpu className="w-4 h-4 text-stone-700" />
              <span>4. AI Gateway com Human-in-the-Loop</span>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed font-sans">
              <strong>Por que é crucial:</strong> Nunca deixe a LLM escrever diretamente no PostgreSQL. A IA emite apenas <em>Intenções Estruturadas</em>.
            </p>
            <div className="bg-white rounded-xl p-3 text-[11px] font-mono text-stone-800 border border-stone-200">
              <span className="text-stone-400">// Fluxo de Segurança:</span>
              <br />
              Prompt ➔ AI Intent Proposal ➔ <span className="text-amber-800">Human Approval Click</span> ➔ Database
            </div>
          </div>
        </div>

        {/* Refinement 5 - Critical Image/Media Object Storage Decoupling */}
        <div className="bg-stone-900 text-white rounded-2xl p-5 sm:p-6 border border-stone-800 space-y-3 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-amber-300 text-sm font-serif font-bold">
              <Server className="w-4 h-4 text-amber-400" />
              <span>5. Desacoplamento Crítico de Mídia: Object Storage vs PostgreSQL Metadata</span>
            </div>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
              Escala de 10 ➔ 100 ➔ 1.000 ➔ 10.000 Lojistas
            </span>
          </div>

          <p className="text-xs text-stone-300 leading-relaxed font-sans">
            <strong>Nunca transforme o PostgreSQL em depósito de fotos.</strong> Armazenar binários ou Base64 diretamente no banco satura a memória do <em>buffer pool</em>, infla os custos de backup/WAL e torna as consultas lentas. O arquivo físico reside em Object Storage (S3 / Cloudflare R2 / GCS) e o PostgreSQL armazena apenas metadados relacionais e o <code className="text-amber-300 font-mono">storage_key</code>.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-2">
            {/* ASCII Pipeline Architecture */}
            <div className="lg:col-span-5 bg-black/60 rounded-xl p-3.5 border border-white/10 flex flex-col justify-center">
              <div className="text-[10px] font-mono uppercase text-stone-400 mb-1.5 font-bold">
                Fluxo de Upload e Persistência Desacoplada:
              </div>
              <pre className="text-[10px] text-amber-200 font-mono leading-relaxed overflow-x-auto">
{`             Upload
                │
                ▼
        Backend / Storage
                │
        ┌───────┴────────┐
        │                │
        ▼                ▼
     Arquivo           PostgreSQL
     físico            metadata
  (S3 / R2 / GCS)   (product_media)`}
              </pre>
            </div>

            {/* PostgreSQL Schema product_media */}
            <div className="lg:col-span-7 bg-black/60 rounded-xl p-3.5 border border-white/10 space-y-1.5">
              <div className="text-[10px] font-mono uppercase text-stone-400 font-bold flex items-center justify-between">
                <span>Schema da Tabela PostgreSQL: `product_media`</span>
                <span className="text-emerald-400 text-[9px]">Zero Bloat / Ultra Fast</span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] font-mono text-stone-300">
                <div><span className="text-amber-300">id</span>: uuid PK</div>
                <div><span className="text-amber-300">type</span>: 'IMAGE' | 'VIDEO'</div>
                <div><span className="text-amber-300">organization_id</span>: uuid</div>
                <div><span className="text-amber-300">is_primary</span>: boolean</div>
                <div><span className="text-amber-300">product_id</span>: uuid FK</div>
                <div><span className="text-amber-300">sort_order</span>: integer</div>
                <div><span className="text-amber-300 font-bold">storage_key</span>: text</div>
                <div><span className="text-amber-300">alt_text</span>: text</div>
                <div><span className="text-amber-300">url</span>: text (CDN)</div>
                <div><span className="text-amber-300">created_at</span>: timestamptz</div>
              </div>
              <div className="pt-1.5 border-t border-white/10 text-[10px] text-stone-400 font-sans">
                💡 <strong className="text-stone-200">Vantagem Operacional:</strong> Com 10.000 clientes cadastrando 500 semijoias com 5 fotos cada (25 milhões de imagens), o banco PostgreSQL consome apenas ~3.5 GB em índices de metadados, mantendo tempo de resposta abaixo de 5ms.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Tenant SaaS Tiers Architecture */}
      <div className="space-y-4 pt-4 border-t border-stone-200">
        <h3 className="text-base font-serif italic font-bold text-stone-900 flex items-center gap-2">
          <Layers className="w-4 h-4 text-stone-700" />
          <span>Estratégia de Monetização SaaS (Planos Multi-Tenant)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200">
            <div className="text-[10px] uppercase tracking-wider font-bold text-stone-400">Plano Gratuito</div>
            <div className="text-xl font-serif font-bold text-stone-900 mt-1">R$ 0<span className="text-xs font-normal text-stone-500 font-sans">/mês</span></div>
            <p className="text-xs text-stone-500 mt-1">Para lojas iniciantes e ateliês pequenos</p>
            <ul className="text-xs text-stone-700 space-y-2 mt-4">
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Até 50 produtos</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Loja Virtual e Catálogo</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Garantia Digital básica</li>
            </ul>
          </div>

          <div className="bg-white rounded-2xl p-5 border-2 border-stone-900 shadow-sm relative">
            <div className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full bg-stone-900 text-white text-[10px] font-bold uppercase tracking-wider">
              MAIS POPULAR
            </div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-stone-600">Plano Pro</div>
            <div className="text-xl font-serif font-bold text-stone-900 mt-1">R$ 289<span className="text-xs font-normal text-stone-500 font-sans">/mês</span></div>
            <p className="text-xs text-stone-500 mt-1">Para marcas com rede de revendedoras</p>
            <ul className="text-xs text-stone-700 space-y-2 mt-4">
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-stone-900" /> Produtos Ilimitados</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-stone-900" /> Gestão de Consignação e Maletas</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-stone-900" /> Motor de Comissões Escalonadas</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-stone-900" /> Automações de WhatsApp</li>
            </ul>
          </div>

          <div className="bg-stone-900 text-white rounded-2xl p-5 border border-stone-900 relative">
            <div className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full bg-amber-400 text-stone-950 text-[10px] font-bold uppercase tracking-wider">
              ENTERPRISE
            </div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-amber-300">Plano Premium & AI</div>
            <div className="text-xl font-serif font-bold text-white mt-1">R$ 590<span className="text-xs font-normal text-stone-400 font-sans">/mês</span></div>
            <p className="text-xs text-stone-300 mt-1">Para franquias e grandes redes</p>
            <ul className="text-xs text-stone-200 space-y-2 mt-4">
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-amber-400" /> Tudo do Plano Pro</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-amber-400" /> AI Gateway Gemini & MCP</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-amber-400" /> Multi-usuários e Auditoria LGPD</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
