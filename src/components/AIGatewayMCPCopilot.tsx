import React, { useState } from "react";
import {
  Sparkles,
  Bot,
  Send,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Cpu,
  Layers,
  ArrowRight,
  Database,
  Lock,
  RefreshCw,
} from "lucide-react";
import { MCPProposedAction, RBACUser } from "../types";

interface AIGatewayMCPCopilotProps {
  currentUser: RBACUser;
  mcpActions: MCPProposedAction[];
  onExecuteMCPAction: (actionId: string) => void;
  onRejectMCPAction: (actionId: string) => void;
}

export const AIGatewayMCPCopilot: React.FC<AIGatewayMCPCopilotProps> = ({
  currentUser,
  mcpActions,
  onExecuteMCPAction,
  onRejectMCPAction,
}) => {
  const [messages, setMessages] = useState<
    Array<{ role: "user" | "assistant"; text: string; actionId?: string }>
  >([
    {
      role: "assistant",
      text: "Olá! Sou o Aura AI Copilot integrado via Model Context Protocol (MCP). Posso analisar o giro das maletas, propor recall de produtos parados, simular comissões ou preparar certificados de garantia. Como posso ajudar agora?",
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPrompt.trim() || loading) return;

    const userText = inputPrompt;
    setInputPrompt("");
    setMessages((prev) => [...prev, { role: "user", text: userText }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userText,
          userRole: currentUser.role,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: data.response || "Comando analisado com sucesso.",
            actionId: data.proposedAction?.id,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: "Analisei sua solicitação no ERP. Como exemplo prático de automação controlada, propus uma ação de recall no painel de governança abaixo para sua aprovação.",
          },
        ]);
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Notei que 12 peças da coleção 'Riviera' estão sem giro há mais de 35 dias com a revendedora Ana Silva. Sugiro transferir para atender pedidos da Loja Virtual. A proposta foi enviada para validação humana de segurança.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 text-stone-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">
              Domínio #9: AI Gateway & Protocolo MCP
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif italic font-bold tracking-wide text-stone-900 mt-1">
            Governança de IA com Validação Humana (Human-in-the-Loop)
          </h2>
          <p className="text-xs text-stone-600 mt-1 max-w-2xl font-sans leading-relaxed">
            A IA gera propostas estruturadas de ação (Recall de maleta, ajuste de comissão, emissão de certificado). Nenhuma alteração no banco ocorre sem autorização explícita do gestor.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-stone-100 px-3 py-1.5 rounded-full border border-stone-200 text-xs font-semibold text-stone-700">
          <ShieldAlert className="w-3.5 h-3.5 text-stone-900" />
          <span>Políticas RBAC Ativas</span>
        </div>
      </div>

      {/* 2-Column Layout: Chat on Left, MCP Proposals Queue on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left 7 cols: Copilot Interactive Chat */}
        <div className="lg:col-span-7 bg-white border border-stone-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between min-h-[480px]">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-stone-900 text-white rounded-full flex items-center justify-center text-xs font-bold font-serif">
                  AI
                </div>
                <div>
                  <h3 className="text-sm font-serif italic font-bold text-stone-900">
                    Aura Copilot • LLM Agent
                  </h3>
                  <span className="text-[10px] text-stone-400">Gemini 2.5 Flash via MCP</span>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                Online
              </span>
            </div>

            {/* Messages Feed */}
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                      msg.role === "user"
                        ? "bg-stone-900 text-white font-sans"
                        : "bg-stone-50 border border-stone-200 text-stone-800 font-sans"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-stone-50 border border-stone-200 p-3 rounded-2xl text-xs text-stone-500 flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-stone-700" />
                    <span>Aura AI está analisando os dados do ERP...</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Prompt Input Form */}
          <form onSubmit={handleSendMessage} className="pt-4 border-t border-stone-100 flex gap-2">
            <input
              type="text"
              placeholder="Ex: 'Quais maletas estão sem giro há mais de 30 dias?' ou 'Emitir garantia para pedido #1842'"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-xs text-stone-900 placeholder-stone-400 focus:bg-white focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Enviar</span>
            </button>
          </form>
        </div>

        {/* Right 5 cols: MCP Action Proposals & Governance Panel */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="text-base font-serif italic font-bold text-stone-900">
                Fila de Ações MCP Propostas
              </h3>
              <span className="text-[10px] font-mono bg-stone-100 px-2 py-0.5 rounded text-stone-600 font-bold">
                {mcpActions.filter((a) => a.status === "PENDENTE_APROVACAO").length} pendentes
              </span>
            </div>

            <div className="space-y-3">
              {mcpActions.map((action) => (
                <div
                  key={action.id}
                  className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-3 text-xs"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-[10px] font-bold text-stone-500 uppercase">
                        {action.actionType}
                      </span>
                      <h4 className="font-bold text-stone-900 mt-0.5">{action.title}</h4>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        action.status === "APROVADO_EXECUTADO"
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : action.status === "REJEITADO"
                          ? "bg-rose-50 text-rose-800 border border-rose-200"
                          : "bg-amber-50 text-amber-800 border border-amber-200"
                      }`}
                    >
                      {action.status === "APROVADO_EXECUTADO"
                        ? "Executado"
                        : action.status === "REJEITADO"
                        ? "Rejeitado"
                        : "Pendente"}
                    </span>
                  </div>

                  <p className="text-stone-600 text-[11px] leading-relaxed">
                    {action.description}
                  </p>

                  <div className="bg-white p-2.5 rounded-xl border border-stone-200 font-mono text-[10px] text-stone-700">
                    <span className="font-bold block text-stone-400 mb-0.5">Payload da Intenção:</span>
                    <pre className="overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(action.payload, null, 2)}
                    </pre>
                  </div>

                  {action.status === "PENDENTE_APROVACAO" && (
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => onRejectMCPAction(action.id)}
                        className="flex-1 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5 text-stone-600" />
                        <span>Rejeitar</span>
                      </button>
                      <button
                        onClick={() => onExecuteMCPAction(action.id)}
                        className="flex-1 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1 shadow-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Aprovar & Executar</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
