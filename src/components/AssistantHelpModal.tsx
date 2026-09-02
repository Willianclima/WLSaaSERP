import React, { useState } from "react";
import {
  Sparkles,
  X,
  PlusCircle,
  Share2,
  ShoppingBag,
  ShieldCheck,
  Package,
  MessageCircle,
  Search,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  Lightbulb,
} from "lucide-react";

interface HelpTopic {
  id: string;
  title: string;
  shortDesc: string;
  icon: any;
  category: "vendas" | "produtos" | "catalogo" | "garantias" | "estoque";
  actionLabel?: string;
  actionTab?: string;
  steps: string[];
  tips: string[];
}

const HELP_TOPICS: HelpTopic[] = [
  {
    id: "como-cadastrar-peca",
    title: "Como cadastrar uma peça?",
    shortDesc: "Cadastre em 1 minuto com fotos, preço de venda e estoque inicial.",
    icon: PlusCircle,
    category: "produtos",
    actionLabel: "Cadastrar Nova Peça",
    actionTab: "catalog",
    steps: [
      "No menu superior ou na tela de Início, clique em '+ Nova Peça' (ou 'Cadastrar Produto').",
      "Informe o Nome da Semijoia (ex: Colar Riviera Cravejado), o Banho (Ouro 18K, Ródio, etc.) e o Preço de Venda.",
      "Adicione as fotos da peça (você pode arrastar ou selecionar do celular/computador).",
      "Informe o estoque disponível (ex: 5 unidades) e clique em 'Salvar Semijoia'.",
      "Pronto! A peça já entra no seu catálogo e na vitrine online automaticamente.",
    ],
    tips: [
      "Boas fotos com luz natural aumentam a conversão no WhatsApp em mais de 3x.",
      "Você pode usar a ferramenta 'AI Copy' para gerar legendas e descrições automáticas para o Instagram!",
    ],
  },
  {
    id: "como-compartilhar-catalogo",
    title: "Como compartilhar meu catálogo?",
    shortDesc: "Envie o link direto da sua vitrine pelo WhatsApp ou bio do Instagram.",
    icon: Share2,
    category: "catalogo",
    actionLabel: "Abrir Compartilhamento",
    actionTab: "storefront",
    steps: [
      "Clique no botão 'Enviar Link' ou 'Compartilhar Catálogo' no topo da página.",
      "Você verá o link exclusivo da sua loja (ex: app.lumina.com/loja/sua-loja).",
      "Escolha entre 'Copiar Link', 'Enviar no WhatsApp' com mensagem pronta ou baixar o QR Code.",
      "Cole o link na Bio do seu Instagram (@sua_loja) ou envie para suas clientes em listas VIP.",
    ],
    tips: [
      "Suas clientes não precisam criar conta nem senha para ver as peças e pedir pelo WhatsApp.",
      "Ao clicar em 'Quero este 💬', o pedido chega pronto no seu WhatsApp com o nome da peça e valor!",
    ],
  },
  {
    id: "como-registrar-venda",
    title: "Como registrar uma venda rápida?",
    shortDesc: "Faça uma venda em 3 cliques com baixa automática de estoque e PIX.",
    icon: ShoppingBag,
    category: "vendas",
    actionLabel: "Registrar Nova Venda",
    actionTab: "orders",
    steps: [
      "Clique no botão verde '+ Nova Venda' no topo da tela.",
      "Digite o nome da cliente e o WhatsApp (opcional).",
      "Selecione as peças vendidas na listagem com um clique.",
      "Escolha a forma de pagamento (PIX, Cartão ou Dinheiro) e confirme.",
      "O sistema dá baixa no estoque físico, gera a garantia digital e emite o comprovante.",
    ],
    tips: [
      "Você pode enviar o comprovante com o link da Garantia Digital direto no WhatsApp da cliente.",
    ],
  },
  {
    id: "como-emitir-garantia",
    title: "Como emitir e enviar uma garantia digital?",
    shortDesc: "Certificado de 12 meses com QR Code e link exclusivo para sua cliente.",
    icon: ShieldCheck,
    category: "garantias",
    actionLabel: "Ver Garantias Emitidas",
    actionTab: "warranties",
    steps: [
      "Toda venda registrada gera automaticamente um Certificado de Garantia Digital de 12 meses.",
      "Para consultar ou emitir uma nova avulsa, acesse a aba 'Garantias' no menu.",
      "Clique em 'Enviar no WhatsApp' ao lado do certificado para abrir a mensagem com o QR Code.",
      "A cliente guarda o link no celular e tem segurança total sobre o banho nobre e procedência da peça.",
    ],
    tips: [
      "A garantia digital elimina papéis perdidos e posiciona sua marca como uma joalheria de alto padrão.",
    ],
  },
  {
    id: "como-controlar-estoque",
    title: "Como controlar o estoque e dar entradas/saídas?",
    shortDesc: "Visão simples com farol de alertas (Disponível, Baixo, Sem Estoque).",
    icon: Package,
    category: "estoque",
    actionLabel: "Acessar Estoque",
    actionTab: "inventory",
    steps: [
      "Acesse a aba 'Estoque' no menu principal.",
      "Veja o painel simples: 🟢 Disponíveis, 🟡 Estoque Baixo e 🔴 Sem Estoque.",
      "Para ajustar qualquer peça, clique nela e use os botões rápidos '+ ENTRADA' ou '- SAÍDA'.",
      "Tudo fica registrado no Histórico auditável em segundo plano sem complicação.",
    ],
    tips: [
      "Quando uma peça atinge 3 unidades ou menos, ela é marcada em amarelo para você repor a tempo.",
    ],
  },
];

interface AssistantHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: string) => void;
  onOpenNewSale?: () => void;
  onOpenNewProduct?: () => void;
  onOpenShareModal?: () => void;
}

export const AssistantHelpModal: React.FC<AssistantHelpModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onOpenNewSale,
  onOpenNewProduct,
  onOpenShareModal,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<HelpTopic | null>(null);

  if (!isOpen) return null;

  const filteredTopics = HELP_TOPICS.filter(
    (t) =>
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.shortDesc.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.steps.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAction = (topic: HelpTopic) => {
    onClose();
    if (topic.id === "como-registrar-venda" && onOpenNewSale) {
      onOpenNewSale();
    } else if (topic.id === "como-cadastrar-peca" && onOpenNewProduct) {
      onOpenNewProduct();
    } else if (topic.id === "como-compartilhar-catalogo" && onOpenShareModal) {
      onOpenShareModal();
    } else if (topic.actionTab && onNavigateTab) {
      onNavigateTab(topic.actionTab);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scaleUp">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-stone-100 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold shadow-xs">
              <Sparkles className="w-5 h-5 text-stone-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-serif font-bold text-stone-900">
                  Assistente da Lojista
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                  ✨ Precisa de ajuda?
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5 font-sans">
                Respostas rápidas e práticas para você vender mais sem complicação.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {selectedTopic ? (
            /* Detailed Topic View */
            <div className="space-y-5 animate-fadeIn">
              <button
                onClick={() => setSelectedTopic(null)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 hover:text-amber-950 transition-colors cursor-pointer"
              >
                <span>← Voltar para todos os tópicos</span>
              </button>

              <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-amber-50/60 border border-amber-200/60">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center shrink-0">
                  <selectedTopic.icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-serif font-bold text-stone-900">
                    {selectedTopic.title}
                  </h4>
                  <p className="text-xs text-stone-600 mt-0.5">{selectedTopic.shortDesc}</p>
                </div>
              </div>

              {/* Step-by-Step Instructions */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Passo a Passo Simples:
                </h5>
                <div className="space-y-2.5">
                  {selectedTopic.steps.map((step, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 rounded-xl bg-stone-50 border border-stone-100 text-xs text-stone-700"
                    >
                      <span className="w-5 h-5 rounded-full bg-stone-900 text-amber-300 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                        {index + 1}
                      </span>
                      <span className="leading-relaxed">{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pro Tips */}
              {selectedTopic.tips.length > 0 && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 uppercase tracking-wider">
                    <Lightbulb className="w-4 h-4 text-emerald-700" />
                    <span>Dicas de Ouro para Vender Mais:</span>
                  </div>
                  <ul className="space-y-1 text-xs text-emerald-800">
                    {selectedTopic.tips.map((tip, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-emerald-600 font-bold">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Button */}
              {selectedTopic.actionLabel && (
                <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-xs text-stone-500">Pronta para começar?</span>
                  <button
                    onClick={() => handleAction(selectedTopic)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                  >
                    <span>{selectedTopic.actionLabel}</span>
                    <ChevronRight className="w-4 h-4 text-amber-400" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Topic List View */
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Qual é a sua dúvida? (ex: cadastrar peça, compartilhar catálogo...)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9.5 pr-4 py-2.5 text-xs border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-stone-800 placeholder:text-stone-400 bg-stone-50/50 font-sans"
                />
              </div>

              {/* Fast FAQ Cards */}
              <div className="space-y-2.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                  Perguntas Mais Frequentes
                </div>
                {filteredTopics.map((topic) => {
                  const Icon = topic.icon;
                  return (
                    <div
                      key={topic.id}
                      onClick={() => setSelectedTopic(topic)}
                      className="p-4 rounded-2xl border border-stone-200 hover:border-amber-300 hover:bg-amber-50/30 transition-all cursor-pointer group flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <Icon className="w-4 h-4 text-amber-800" />
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-stone-900 group-hover:text-amber-900 transition-colors">
                            {topic.title}
                          </h4>
                          <p className="text-[11px] text-stone-500 mt-0.5 line-clamp-1">
                            {topic.shortDesc}
                          </p>
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-amber-800 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </div>
                  );
                })}
              </div>

              {/* Direct WhatsApp Support Pill */}
              <div className="p-4 rounded-2xl bg-stone-900 text-white flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Prefere falar com nosso suporte?</div>
                    <div className="text-[11px] text-stone-400">Atendimento humanizado no WhatsApp</div>
                  </div>
                </div>
                <a
                  href="https://wa.me/5511999998888?text=Olá!%20Gostaria%20de%20ajuda%20com%20minha%20loja%20Lumina."
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs whitespace-nowrap"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp de Suporte</span>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-stone-100 bg-stone-50 flex items-center justify-between text-[11px] text-stone-500 font-medium">
          <span>Sistema Lumina Semijoias • Suporte Guiado</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-stone-200 hover:bg-white text-stone-700 font-bold cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
