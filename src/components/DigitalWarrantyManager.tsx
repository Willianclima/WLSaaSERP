import React, { useState } from "react";
import {
  ShieldCheck,
  QrCode,
  Search,
  Plus,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Printer,
  Copy,
  Check,
} from "lucide-react";
import { DigitalWarranty, UnifiedOrder } from "../types";

interface DigitalWarrantyManagerProps {
  warranties: DigitalWarranty[];
  orders: UnifiedOrder[];
  onCreateWarranty: (warranty: DigitalWarranty) => void;
}

export const DigitalWarrantyManager: React.FC<DigitalWarrantyManagerProps> = ({
  warranties,
  orders,
  onCreateWarranty,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWarranty, setSelectedWarranty] = useState<DigitalWarranty | null>(
    warranties[0] || null
  );
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Validation simulator
  const [verifyCodeInput, setVerifyCodeInput] = useState("");
  const [verifyResult, setVerifyResult] = useState<DigitalWarranty | "NOT_FOUND" | null>(null);

  const filteredWarranties = warranties.filter(
    (w) =>
      w.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.productName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const found = warranties.find(
      (w) => w.code.toLowerCase() === verifyCodeInput.trim().toLowerCase()
    );
    if (found) {
      setVerifyResult(found);
    } else {
      setVerifyResult("NOT_FOUND");
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-8 text-stone-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">
              Domínio #7: Garantia Digital & QR Code Público
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif italic font-bold tracking-wide text-stone-900 mt-1">
            Certificados Digitais de Garantia & Portal de Validação
          </h2>
          <p className="text-xs text-stone-600 mt-1 max-w-2xl font-sans leading-relaxed">
            Geração instantânea de QR Code para clientes finais com validade de 12 meses para banho metálico e cravamento de pedras.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-stone-100 px-3 py-1.5 rounded-full border border-stone-200 text-xs font-semibold text-stone-700">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>{warranties.length} Garantias Ativas</span>
        </div>
      </div>

      {/* 2-Column Grid: List & Active Certificate */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left 7 cols: Warranties List & Verification Tool */}
        <div className="lg:col-span-7 space-y-6">
          {/* Public Verification Box */}
          <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-stone-100">
              <QrCode className="w-4 h-4 text-stone-800" />
              <h3 className="text-sm font-serif italic font-bold text-stone-900">
                Portal de Validação Pública (Simulador do QR Code)
              </h3>
            </div>

            <form onSubmit={handleVerify} className="flex gap-2">
              <input
                type="text"
                placeholder="Insira o código de garantia (ex: GRT-8F2A9D)..."
                value={verifyCodeInput}
                onChange={(e) => setVerifyCodeInput(e.target.value.toUpperCase())}
                className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs text-stone-900 placeholder-stone-400 font-mono focus:bg-white focus:outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-stone-800 transition-colors"
              >
                Validar
              </button>
            </form>

            {verifyResult === "NOT_FOUND" && (
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Certificado não localizado ou código inválido no banco de dados.</span>
              </div>
            )}

            {verifyResult && verifyResult !== "NOT_FOUND" && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1.5">
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>Garantia Autêntica & Ativa!</span>
                  </span>
                  <span className="font-mono text-[11px]">{verifyResult.code}</span>
                </div>
                <div className="text-emerald-800 text-[11px]">
                  Cliente: <span className="font-semibold">{verifyResult.customerName}</span> • Peça:{" "}
                  <span className="font-semibold">{verifyResult.productName}</span> ({verifyResult.bathType})
                </div>
              </div>
            )}
          </div>

          {/* Warranties List */}
          <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="text-base font-serif italic font-bold text-stone-900">
                Certificados Emitidos
              </h3>
              <input
                type="text"
                placeholder="Buscar por cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-1 text-xs text-stone-800"
              />
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {filteredWarranties.map((w) => (
                <div
                  key={w.id}
                  onClick={() => setSelectedWarranty(w)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                    selectedWarranty?.id === w.id
                      ? "bg-stone-900 text-white border-stone-900 shadow-md"
                      : "bg-stone-50 border-stone-200 text-stone-800 hover:bg-stone-100"
                  }`}
                >
                  <div>
                    <div className="font-mono font-bold text-xs">{w.code}</div>
                    <div className="font-semibold mt-0.5">{w.productName}</div>
                    <div className="text-[11px] opacity-75">{w.customerName} • {w.channel}</div>
                  </div>

                  <div className="text-right">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      selectedWarranty?.id === w.id
                        ? "bg-stone-800 text-emerald-300"
                        : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    }`}>
                      12 Meses
                    </span>
                    <div className="text-[10px] opacity-75 mt-1">
                      Até {new Date(w.expirationDate).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 5 cols: Luxury Editorial Certificate Preview */}
        <div className="lg:col-span-5">
          {selectedWarranty ? (
            <div className="bg-white border-2 border-stone-200 rounded-3xl p-8 shadow-md space-y-6 relative overflow-hidden">
              <div className="border-b-2 border-stone-900 pb-4 text-center">
                <span className="text-[10px] uppercase font-bold tracking-[0.3em] text-stone-400">
                  Certificado Oficial
                </span>
                <h3 className="text-2xl font-serif italic font-bold text-stone-900 mt-1">
                  Aura Semijoias & Alta Joalheria
                </h3>
                <p className="text-[10px] text-stone-500 uppercase tracking-widest mt-0.5">
                  Garantia Internacional de Qualidade
                </p>
              </div>

              <div className="flex justify-center py-2">
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-2xl flex flex-col items-center gap-1 text-center">
                  <QrCode className="w-20 h-20 text-stone-900" />
                  <span className="font-mono font-bold text-xs text-stone-900">{selectedWarranty.code}</span>
                </div>
              </div>

              <div className="space-y-2 text-xs text-stone-800 border-y border-stone-100 py-4">
                <div className="flex justify-between">
                  <span className="text-stone-500 font-medium">Titular:</span>
                  <span className="font-bold text-stone-900">{selectedWarranty.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500 font-medium">Peça:</span>
                  <span className="font-semibold text-stone-900">{selectedWarranty.productName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500 font-medium">Banho Nobre:</span>
                  <span className="font-semibold text-stone-900">{selectedWarranty.bathType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500 font-medium">Data Emissão:</span>
                  <span className="font-mono text-stone-700">{new Date(selectedWarranty.issueDate).toLocaleDateString("pt-BR")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500 font-medium">Válido até:</span>
                  <span className="font-mono font-bold text-emerald-800">{new Date(selectedWarranty.expirationDate).toLocaleDateString("pt-BR")}</span>
                </div>
              </div>

              <p className="text-[10px] text-stone-500 leading-relaxed text-center font-sans">
                {selectedWarranty.terms}
              </p>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handleCopy(selectedWarranty.code, selectedWarranty.id)}
                  className="flex-1 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                >
                  {copiedCode === selectedWarranty.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode === selectedWarranty.id ? "Copiado!" : "Copiar Link"}</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
