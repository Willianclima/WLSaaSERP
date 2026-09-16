import React from "react";
import {
  X,
  CheckCircle2,
  ArrowRight,
  Store,
  Package,
  Globe,
  ShoppingBag,
  Sparkles,
  ShieldCheck,
  MessageSquare,
  CreditCard,
  Layers,
} from "lucide-react";

interface CriticalPathModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: string) => void;
  onOpenNewProduct: () => void;
  onOpenStorefront: () => void;
}

export const CriticalPathModal: React.FC<CriticalPathModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onOpenNewProduct,
  onOpenStorefront,
}) => {
  if (!isOpen) return null;

  const steps = [
    {
      num: 1,
      title: "Cadastrar Loja",
      subtitle: "Identidade, Marca, Contatos e Domínio",
      icon: Store,
      badge: "Configuração",
      color: "amber",
      actionLabel: "Abrir Marca & Loja",
      onClick: () => {
        onClose();
        onNavigateTab("storeSettings");
      },
    },
    {
      num: 2,
      title: "Cadastrar Produto",
      subtitle: "Fotos, categoria, banho nobre e preço",
      icon: Package,
      badge: "Estoque",
      color: "amber",
      actionLabel: "+ Novo Produto",
      onClick: () => {
        onClose();
        onOpenNewProduct();
      },
    },
    {
      num: 3,
      title: "Publicar Catálogo",
      subtitle: "Link público seguro para WhatsApp e Instagram",
      icon: Globe,
      badge: "Vitrine",
      color: "blue",
      actionLabel: "Ver Vitrine Online",
      onClick: () => {
        onClose();
        onNavigateTab("myStore");
      },
    },
    {
      num: 4,
      title: "Cliente Acessa & Escolhe",
      subtitle: "Navegação mobile-first com fotos e detalhes",
      icon: ShoppingBag,
      badge: "Consumidor",
      color: "purple",
      actionLabel: "Testar Loja do Cliente",
      onClick: () => {
        onClose();
        onOpenStorefront();
      },
    },
    {
      num: 5,
      title: "Faz Pedido via WhatsApp",
      subtitle: "Pedido chega à loja e reserva estoque no ERP",
      icon: MessageSquare,
      badge: "Vendas",
      color: "emerald",
      actionLabel: "Ver Pedidos Recebidos",
      onClick: () => {
        onClose();
        onNavigateTab("pedidos");
      },
    },
    {
      num: 6,
      title: "Pagamento & Baixa de Estoque",
      subtitle: "Confirmação PIX com baixa definitiva no livro caixa",
      icon: CreditCard,
      badge: "Operação",
      color: "emerald",
      actionLabel: "Painel de Vendas PDV",
      onClick: () => {
        onClose();
        onNavigateTab("vender");
      },
    },
    {
      num: 7,
      title: "Garantia Gerada & WhatsApp",
      subtitle: "Passaporte Digital com QR Code enviado ao cliente",
      icon: ShieldCheck,
      badge: "Passaporte",
      color: "amber",
      actionLabel: "Garantias Digitais",
      onClick: () => {
        onClose();
        onNavigateTab("warranties");
      },
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-stone-200 shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto animate-scaleUp">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-stone-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold uppercase tracking-wider text-[10px] border border-amber-200">
                🚨 Caminho Crítico do Negócio
              </span>
              <span className="text-[11px] font-mono text-stone-400">Fluxo Essencial</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-serif italic font-bold text-stone-900 mt-1">
              Jornada de Venda da Semijoia
            </h3>
            <p className="text-xs text-stone-600 mt-1 font-sans">
              O fluxo prioritário do SaaS: do cadastro da loja à emissão da garantia digital após o pagamento.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps Flow Timeline */}
        <div className="space-y-3">
          {steps.map((st, idx) => {
            const Icon = st.icon;
            return (
              <div
                key={st.num}
                className="flex items-center justify-between p-3.5 rounded-2xl border border-stone-200/90 hover:border-amber-400/80 bg-stone-50/50 hover:bg-amber-50/30 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-stone-900 text-amber-300 font-mono font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                    {st.num}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-900 text-xs sm:text-sm">
                        {st.title}
                      </span>
                      <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-stone-200 text-stone-700">
                        {st.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500">{st.subtitle}</p>
                  </div>
                </div>

                <button
                  onClick={st.onClick}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-stone-200 text-stone-800 text-[11px] font-bold group-hover:bg-stone-900 group-hover:text-amber-300 transition-colors shadow-2xs cursor-pointer shrink-0 ml-2"
                >
                  <span>{st.actionLabel}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer Note */}
        <div className="pt-2 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <span className="text-stone-500 text-[11px]">
            Toda venda confirmada gera automaticamente o passaporte digital com QR code rastreável.
          </span>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold uppercase tracking-wider text-xs transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
