import React, { useState, useMemo } from "react";
import {
  Users,
  UserPlus,
  Search,
  Building2,
  User,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  FileText,
  Copy,
  Check,
  Eye,
  Edit2,
  Trash2,
  Sparkles,
  ExternalLink,
  MessageCircle,
  Plus,
  RefreshCw,
  Download,
  AlertCircle,
  X,
  Crown,
  Briefcase,
  CheckCircle2,
  Hash,
  Archive,
  ArchiveRestore,
  ShieldAlert,
  Ban,
} from "lucide-react";
import {
  Customer,
  PersonType,
  CustomerStatus,
  CustomerTier,
  Address,
  Contact,
  CreateCustomerDTO,
  UpdateCustomerDTO,
} from "../types/customer";
import {
  validateCPF,
  validateCNPJ,
  formatCPF,
  formatCNPJ,
  formatCEP,
  formatPhoneBR,
  cleanDocument,
} from "../utils/documentValidators";

interface CustomerManagerProps {
  customers: Customer[];
  onAddCustomer?: (customer: CreateCustomerDTO) => Promise<void> | void;
  onUpdateCustomer?: (id: string, customer: UpdateCustomerDTO) => Promise<void> | void;
  onDeleteCustomer?: (id: string) => Promise<void> | void;
  onRefreshData?: () => Promise<void> | void;
  onNavigateToOrder?: (customerId: string) => void;
}

export const CustomerManager: React.FC<CustomerManagerProps> = ({
  customers = [],
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  onRefreshData,
  onNavigateToOrder,
}) => {
  // Filters and Search State
  const [searchTerm, setSearchTerm] = useState("");
  const [personTypeFilter, setPersonTypeFilter] = useState<"ALL" | "PF" | "PJ">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | CustomerStatus>("ALL");
  const [tierFilter, setTierFilter] = useState<"ALL" | CustomerTier>("ALL");

  // Selection and Modals
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [copiedDocId, setCopiedDocId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Form State for Create / Edit
  const [formPersonType, setFormPersonType] = useState<PersonType>("PF");
  const [formFullName, setFormFullName] = useState("");
  const [formCpf, setFormCpf] = useState("");
  const [formRg, setFormRg] = useState("");
  const [formBirthDate, setFormBirthDate] = useState("");
  const [formGender, setFormGender] = useState<"M" | "F" | "OTHER" | "NOT_INFORMED">("F");

  const [formCompanyName, setFormCompanyName] = useState("");
  const [formTradeName, setFormTradeName] = useState("");
  const [formCnpj, setFormCnpj] = useState("");
  const [formStateRegistration, setFormStateRegistration] = useState("");
  const [formIsStateExempt, setFormIsStateExempt] = useState(false);

  // Document Inline Validation Errors & Touched States
  const [cpfError, setCpfError] = useState<string | null>(null);
  const [cnpjError, setCnpjError] = useState<string | null>(null);
  const [cpfTouched, setCpfTouched] = useState(false);
  const [cnpjTouched, setCnpjTouched] = useState(false);

  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formWhatsapp, setFormWhatsapp] = useState("");
  const [formStatus, setFormStatus] = useState<CustomerStatus>("ACTIVE");
  const [formTier, setFormTier] = useState<CustomerTier>("STANDARD");
  const [formNotes, setFormNotes] = useState("");

  // Address in Form
  const [formZipCode, setFormZipCode] = useState("");
  const [formStreet, setFormStreet] = useState("");
  const [formNumber, setFormNumber] = useState("");
  const [formComplement, setFormComplement] = useState("");
  const [formNeighborhood, setFormNeighborhood] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formState, setFormState] = useState("SP");
  const [formAddressType, setFormAddressType] = useState<"MAIN" | "SHIPPING" | "BILLING">("MAIN");

  // Secondary Contact in Form (for PJ / B2B)
  const [formContactName, setFormContactName] = useState("");
  const [formContactLabel, setFormContactLabel] = useState("Comprador Responsável");
  const [formContactEmail, setFormContactEmail] = useState("");
  const [formContactPhone, setFormContactPhone] = useState("");
  const [formContactNfe, setFormContactNfe] = useState(true);

  const showNotification = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDocId(id);
    showNotification(`Documento ${text} copiado para a área de transferência!`);
    setTimeout(() => setCopiedDocId(null), 2000);
  };

  const handleRefresh = async () => {
    if (!onRefreshData) return;
    setIsRefreshing(true);
    try {
      await onRefreshData();
      showNotification("Dados de clientes sincronizados com o PostgreSQL!");
    } catch (e) {
      showNotification("Erro ao sincronizar clientes com o banco de dados.");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handlers for CPF & CNPJ validation and formatting
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = formatCPF(raw);
    setFormCpf(formatted);
    setCpfTouched(true);
    const digits = cleanDocument(raw);
    if (digits.length === 0) {
      setCpfError(null);
    } else if (digits.length < 11) {
      setCpfError(`CPF incompleto (${digits.length}/11 dígitos)`);
    } else {
      const res = validateCPF(formatted);
      setCpfError(res.isValid ? null : (res.error || "CPF inválido"));
    }
  };

  const handleCpfBlur = () => {
    setCpfTouched(true);
    if (formCpf.trim()) {
      const res = validateCPF(formCpf);
      setCpfError(res.isValid ? null : (res.error || "CPF inválido"));
    } else {
      setCpfError(null);
    }
  };

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = formatCNPJ(raw);
    setFormCnpj(formatted);
    setCnpjTouched(true);
    const digits = cleanDocument(raw);
    if (digits.length === 0) {
      setCnpjError(null);
    } else if (digits.length < 14) {
      setCnpjError(`CNPJ incompleto (${digits.length}/14 dígitos)`);
    } else {
      const res = validateCNPJ(formatted);
      setCnpjError(res.isValid ? null : (res.error || "CNPJ inválido"));
    }
  };

  const handleCnpjBlur = () => {
    setCnpjTouched(true);
    if (formCnpj.trim()) {
      const res = validateCNPJ(formCnpj);
      setCnpjError(res.isValid ? null : (res.error || "CNPJ inválido"));
    } else {
      setCnpjError(null);
    }
  };

  // Open Form for New Customer
  const handleOpenCreateModal = () => {
    setEditingCustomer(null);
    setFormPersonType("PF");
    setFormFullName("");
    setFormCpf("");
    setCpfError(null);
    setCpfTouched(false);
    setFormRg("");
    setFormBirthDate("");
    setFormGender("F");
    setFormCompanyName("");
    setFormTradeName("");
    setFormCnpj("");
    setCnpjError(null);
    setCnpjTouched(false);
    setFormStateRegistration("");
    setFormIsStateExempt(false);
    setFormEmail("");
    setFormPhone("");
    setFormWhatsapp("");
    setFormStatus("ACTIVE");
    setFormTier("STANDARD");
    setFormNotes("");
    setFormZipCode("");
    setFormStreet("");
    setFormNumber("");
    setFormComplement("");
    setFormNeighborhood("");
    setFormCity("");
    setFormState("SP");
    setFormAddressType("MAIN");
    setFormContactName("");
    setFormContactLabel("Comprador Responsável");
    setFormContactEmail("");
    setFormContactPhone("");
    setFormContactNfe(true);
    setIsFormModalOpen(true);
  };

  // Open Form for Editing Customer
  const handleOpenEditModal = (cust: Customer) => {
    setEditingCustomer(cust);
    setFormPersonType(cust.personType);
    setFormFullName(cust.fullName || cust.name || "");
    const initialCpf = cust.cpf || (cust.personType === "PF" ? cust.document || "" : "");
    const initialCnpj = cust.cnpj || (cust.personType === "PJ" ? cust.document || "" : "");
    setFormCpf(initialCpf ? formatCPF(initialCpf) : "");
    setCpfError(null);
    setCpfTouched(false);
    setFormRg(cust.rg || "");
    setFormBirthDate(cust.birthDate || "");
    setFormGender(cust.gender || "F");
    setFormCompanyName(cust.companyName || "");
    setFormTradeName(cust.tradeName || cust.name || "");
    setFormCnpj(initialCnpj ? formatCNPJ(initialCnpj) : "");
    setCnpjError(null);
    setCnpjTouched(false);
    setFormStateRegistration(cust.stateRegistration || "");
    setFormIsStateExempt(cust.isStateRegistrationExempt || false);
    setFormEmail(cust.primaryEmail || cust.email || "");
    setFormPhone(cust.primaryPhone || cust.phone || "");
    setFormWhatsapp(cust.whatsapp || cust.primaryPhone || "");
    setFormStatus(cust.status || "ACTIVE");
    setFormTier(cust.customerTier || "STANDARD");
    setFormNotes(cust.notes || "");

    const primaryAddr = cust.address || (cust.addresses && cust.addresses[0]);
    if (primaryAddr) {
      setFormZipCode(primaryAddr.zipCode || "");
      setFormStreet(primaryAddr.street || "");
      setFormNumber(primaryAddr.number || "");
      setFormComplement(primaryAddr.complement || "");
      setFormNeighborhood(primaryAddr.neighborhood || "");
      setFormCity(primaryAddr.city || "");
      setFormState(primaryAddr.state || "SP");
      setFormAddressType((primaryAddr.type as any) || "MAIN");
    } else {
      setFormZipCode("");
      setFormStreet("");
      setFormNumber("");
      setFormComplement("");
      setFormNeighborhood("");
      setFormCity("");
      setFormState("SP");
    }

    const primaryContact = cust.contacts && cust.contacts[0];
    if (primaryContact) {
      setFormContactName(primaryContact.contactName || "");
      setFormContactLabel(primaryContact.label || "Comprador Responsável");
      setFormContactEmail(primaryContact.email || "");
      setFormContactPhone(primaryContact.phone || "");
      setFormContactNfe(primaryContact.isNfeRecipient ?? true);
    } else {
      setFormContactName("");
      setFormContactEmail("");
      setFormContactPhone("");
    }

    setIsFormModalOpen(true);
  };

  // Quick CEP Autofill
  const handleFetchCep = async () => {
    const cleanCep = formZipCode.replace(/\D/g, "");
    if (cleanCep.length !== 8) {
      showNotification("Digite um CEP válido com 8 dígitos.");
      return;
    }
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (data.erro) {
        showNotification("CEP não encontrado.");
        return;
      }
      setFormStreet(data.logradouro || "");
      setFormNeighborhood(data.bairro || "");
      setFormCity(data.localidade || "");
      setFormState(data.uf || "SP");
      showNotification(`Endereço preenchido: ${data.localidade}/${data.uf}`);
    } catch (err) {
      showNotification("Erro ao consultar serviço de CEP.");
    }
  };

  // Submit Create or Edit
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Mandatory Names
    if (formPersonType === "PF" && !formFullName.trim()) {
      showNotification("O nome completo da Pessoa Física é obrigatório.");
      return;
    }
    if (formPersonType === "PJ" && !formCompanyName.trim() && !formFullName.trim()) {
      showNotification("A Razão Social da Pessoa Jurídica é obrigatória.");
      return;
    }

    // 2. Validate CPF / CNPJ with algorithm check before sending to backend
    if (formPersonType === "PF" && formCpf.trim()) {
      const cpfCheck = validateCPF(formCpf);
      if (!cpfCheck.isValid) {
        setCpfError(cpfCheck.error || "CPF inválido.");
        setCpfTouched(true);
        showNotification(`Validação Fiscal: ${cpfCheck.error || "CPF inválido. Verifique o documento."}`);
        return;
      }
    }

    if (formPersonType === "PJ" && formCnpj.trim()) {
      const cnpjCheck = validateCNPJ(formCnpj);
      if (!cnpjCheck.isValid) {
        setCnpjError(cnpjCheck.error || "CNPJ inválido.");
        setCnpjTouched(true);
        showNotification(`Validação Fiscal: ${cnpjCheck.error || "CNPJ inválido. Verifique o documento."}`);
        return;
      }
    }

    // 3. Contacts
    if (!formEmail.trim() || !formPhone.trim()) {
      showNotification("E-mail e Telefone são obrigatórios para cadastro e notificações.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateCustomerDTO = {
        personType: formPersonType,
        fullName:
          formPersonType === "PF"
            ? formFullName.trim()
            : formTradeName.trim() || formCompanyName.trim() || formFullName.trim(),
        cpf: formPersonType === "PF" && formCpf.trim() ? formatCPF(formCpf.trim()) : undefined,
        rg: formPersonType === "PF" ? formRg.trim() : undefined,
        birthDate: formPersonType === "PF" && formBirthDate ? formBirthDate : undefined,
        gender: formPersonType === "PF" ? formGender : undefined,
        companyName: formPersonType === "PJ" ? formCompanyName.trim() : undefined,
        tradeName: formPersonType === "PJ" ? formTradeName.trim() : undefined,
        cnpj: formPersonType === "PJ" && formCnpj.trim() ? formatCNPJ(formCnpj.trim()) : undefined,
        stateRegistration: formPersonType === "PJ" ? formStateRegistration.trim() : undefined,
        isStateRegistrationExempt: formPersonType === "PJ" ? formIsStateExempt : false,
        primaryEmail: formEmail.trim().toLowerCase(),
        primaryPhone: formPhone.trim(),
        whatsapp: formWhatsapp.trim() || formPhone.trim(),
        status: formStatus,
        customerTier: formTier,
        notes: formNotes.trim(),
      };

      if (formZipCode && formStreet && formCity) {
        payload.initialAddress = {
          type: formAddressType,
          recipientName: payload.fullName,
          zipCode: formZipCode.trim(),
          street: formStreet.trim(),
          number: formNumber.trim() || "S/N",
          complement: formComplement.trim() || undefined,
          neighborhood: formNeighborhood.trim() || "Centro",
          city: formCity.trim(),
          state: formState.trim().toUpperCase(),
          country: "BRA",
          isDefault: true,
        };
      }

      if (formPersonType === "PJ" && formContactName.trim()) {
        payload.initialContact = {
          label: formContactLabel.trim() || "Comprador",
          contactName: formContactName.trim(),
          email: formContactEmail.trim() || undefined,
          phone: formContactPhone.trim() || undefined,
          isNfeRecipient: formContactNfe,
        };
      }

      if (editingCustomer && onUpdateCustomer) {
        await onUpdateCustomer(editingCustomer.id, payload);
        showNotification(`Cliente ${payload.fullName} atualizado com sucesso!`);
      } else if (onAddCustomer) {
        await onAddCustomer(payload);
        showNotification(`Cliente ${payload.fullName} cadastrado no PostgreSQL com sucesso!`);
      }

      setIsFormModalOpen(false);
    } catch (err: any) {
      showNotification(err.message || "Erro ao salvar cliente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update Customer Status Handler (Lifecycle: ACTIVE -> INACTIVE -> BLOCKED -> ARCHIVED)
  const handleStatusChange = async (id: string, newStatus: CustomerStatus, name?: string) => {
    if (onUpdateCustomer) {
      try {
        await onUpdateCustomer(id, { status: newStatus });
        showNotification(`Status de ${name || "cliente"} alterado para ${newStatus}.`);
        if (selectedCustomer && selectedCustomer.id === id) {
          setSelectedCustomer({ ...selectedCustomer, status: newStatus });
        }
      } catch (e) {
        showNotification("Erro ao atualizar status do cliente.");
      }
    }
  };

  // Archive / Soft-Delete Handler
  const handleArchiveCustomer = async (id: string, name: string, isCurrentlyArchived: boolean) => {
    const actionLabel = isCurrentlyArchived ? "desarquivar / reativar" : "arquivar";
    if (
      window.confirm(
        `Deseja ${actionLabel} o cliente "${name}"?\n\nO histórico de pedidos, garantias e notas fiscais permanecerá 100% íntegro no banco de dados.`
      )
    ) {
      if (isCurrentlyArchived) {
        await handleStatusChange(id, "ACTIVE", name);
      } else if (onDeleteCustomer) {
        try {
          await onDeleteCustomer(id);
          showNotification(`Cliente "${name}" arquivado com sucesso. Histórico preservado.`);
        } catch (e) {
          showNotification("Erro ao arquivar cliente.");
        }
      } else {
        await handleStatusChange(id, "ARCHIVED", name);
      }
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredCustomers.length === 0) {
      showNotification("Nenhum cliente disponível para exportação.");
      return;
    }
    const headers = [
      "ID",
      "Tipo",
      "Nome / Razao Social",
      "Nome Fantasia",
      "Documento (CPF/CNPJ)",
      "Email",
      "Telefone",
      "WhatsApp",
      "Cidade",
      "UF",
      "CEP",
      "Tier",
      "Status",
      "Data Cadastro",
    ];

    const rows = filteredCustomers.map((c) => {
      const addr = c.address || (c.addresses && c.addresses[0]);
      return [
        c.id,
        c.personType,
        `"${(c.fullName || c.name || "").replace(/"/g, '""')}"`,
        `"${(c.tradeName || "").replace(/"/g, '""')}"`,
        `"${c.cpf || c.cnpj || c.document || ""}"`,
        c.primaryEmail || c.email || "",
        c.primaryPhone || c.phone || "",
        c.whatsapp || "",
        `"${addr?.city || ""}"`,
        addr?.state || "",
        addr?.zipCode || "",
        c.customerTier || "STANDARD",
        c.status || "ACTIVE",
        c.createdAt || "",
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `clientes_lumina_erp_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification("Exportação CSV concluída com sucesso!");
  };

  // Filtered List
  const filteredCustomers = useMemo(() => {
    return customers.filter((cust) => {
      // Person Type Filter
      if (personTypeFilter !== "ALL" && cust.personType !== personTypeFilter) {
        return false;
      }
      // Status Filter
      if (statusFilter === "ALL") {
        // By default in ERP, hide ARCHIVED customers to prevent cluttering operational lists
        if (cust.status === "ARCHIVED") return false;
      } else if (cust.status !== statusFilter) {
        return false;
      }
      // Tier Filter
      if (tierFilter !== "ALL" && cust.customerTier !== tierFilter) {
        return false;
      }
      // Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const name = (cust.fullName || cust.name || cust.tradeName || cust.companyName || "").toLowerCase();
        const doc = (cust.cpf || cust.cnpj || cust.document || "").toLowerCase();
        const email = (cust.primaryEmail || cust.email || "").toLowerCase();
        const phone = (cust.primaryPhone || cust.phone || "").toLowerCase();
        const addr = cust.address || (cust.addresses && cust.addresses[0]);
        const city = (addr?.city || "").toLowerCase();
        const state = (addr?.state || "").toLowerCase();

        return (
          name.includes(q) ||
          doc.includes(q) ||
          email.includes(q) ||
          phone.includes(q) ||
          city.includes(q) ||
          state.includes(q)
        );
      }
      return true;
    });
  }, [customers, personTypeFilter, statusFilter, tierFilter, searchTerm]);

  // Metrics Summary
  const metrics = useMemo(() => {
    const total = customers.length;
    const pfCount = customers.filter((c) => c.personType === "PF").length;
    const pjCount = customers.filter((c) => c.personType === "PJ").length;
    const vipCount = customers.filter((c) => c.customerTier === "VIP").length;
    const wholesaleCount = customers.filter((c) => c.customerTier === "WHOLESALE").length;
    const activeCount = customers.filter((c) => c.status === "ACTIVE").length;

    // Distinct Cities
    const cities = new Set<string>();
    customers.forEach((c) => {
      const addr = c.address || (c.addresses && c.addresses[0]);
      if (addr?.city) cities.add(`${addr.city}/${addr.state || "UF"}`);
    });

    return {
      total,
      pfCount,
      pjCount,
      vipCount,
      wholesaleCount,
      activeCount,
      citiesCount: cities.size,
    };
  }, [customers]);

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 border border-stone-800 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-xs font-medium animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Header & KPI Summary */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-serif font-bold text-stone-900 flex items-center gap-2">
                  Gestão Unificada de Clientes
                  <span className="text-xs font-sans font-semibold px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 border border-stone-200">
                    Sprint 3 Foundation
                  </span>
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Base cadastral multi-tenant com suporte nativo a Pessoa Física (CPF) e Pessoa Jurídica (CNPJ/IE).
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 transition-colors cursor-pointer"
              title="Sincronizar com PostgreSQL"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-amber-600" : ""}`} />
              <span>Sincronizar BD</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </button>

            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition-all shadow-xs cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Novo Cliente</span>
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5">
          <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-100">
            <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Total de Clientes</div>
            <div className="text-xl font-serif font-bold text-stone-900 mt-1">{metrics.total}</div>
            <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
              {metrics.activeCount} ativos ({Math.round((metrics.activeCount / (metrics.total || 1)) * 100)}%)
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-100">
            <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider flex items-center justify-between">
              <span>Pessoa Física</span>
              <User className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="text-xl font-serif font-bold text-blue-900 mt-1">{metrics.pfCount}</div>
            <div className="text-[10px] text-blue-600 font-medium mt-0.5">Consumidor Final (B2C)</div>
          </div>

          <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-100">
            <div className="text-[10px] font-bold text-purple-700 uppercase tracking-wider flex items-center justify-between">
              <span>Pessoa Jurídica</span>
              <Building2 className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <div className="text-xl font-serif font-bold text-purple-900 mt-1">{metrics.pjCount}</div>
            <div className="text-[10px] text-purple-600 font-medium mt-0.5">Lojas & Atacado (B2B)</div>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-100">
            <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider flex items-center justify-between">
              <span>Clientes VIP</span>
              <Crown className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-xl font-serif font-bold text-amber-900 mt-1">{metrics.vipCount}</div>
            <div className="text-[10px] text-amber-600 font-medium mt-0.5">Alta Recorrência & Fidelidade</div>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-100">
            <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider flex items-center justify-between">
              <span>Compradores Atacado</span>
              <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-xl font-serif font-bold text-emerald-900 mt-1">{metrics.wholesaleCount}</div>
            <div className="text-[10px] text-emerald-600 font-medium mt-0.5">Tabelas Especiais</div>
          </div>

          <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-100">
            <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider flex items-center justify-between">
              <span>Cidades Atendidas</span>
              <MapPin className="w-3.5 h-3.5 text-stone-500" />
            </div>
            <div className="text-xl font-serif font-bold text-stone-900 mt-1">{metrics.citiesCount}</div>
            <div className="text-[10px] text-stone-500 font-medium mt-0.5">Distribuição Geográfica</div>
          </div>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por Nome, CPF, CNPJ, E-mail ou Cidade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9.5 pr-4 py-2 text-xs border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-stone-800 placeholder:text-stone-400 bg-stone-50/50"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs"
            >
              Limpar
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {/* Person Type */}
          <div className="flex items-center bg-stone-100 p-1 rounded-xl text-xs font-semibold text-stone-600 shrink-0">
            <button
              onClick={() => setPersonTypeFilter("ALL")}
              className={`px-3 py-1 rounded-lg transition-all ${
                personTypeFilter === "ALL" ? "bg-white text-stone-900 shadow-xs font-bold" : "hover:text-stone-900"
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setPersonTypeFilter("PF")}
              className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 ${
                personTypeFilter === "PF" ? "bg-blue-600 text-white shadow-xs font-bold" : "hover:text-stone-900"
              }`}
            >
              <User className="w-3 h-3" />
              <span>PF</span>
            </button>
            <button
              onClick={() => setPersonTypeFilter("PJ")}
              className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 ${
                personTypeFilter === "PJ" ? "bg-purple-600 text-white shadow-xs font-bold" : "hover:text-stone-900"
              }`}
            >
              <Building2 className="w-3 h-3" />
              <span>PJ</span>
            </button>
          </div>

          {/* Tier Filter */}
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value as any)}
            className="text-xs font-medium px-3 py-1.5 rounded-xl border border-stone-200 bg-white text-stone-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="ALL">Todos os Tiers</option>
            <option value="VIP">⭐ VIP</option>
            <option value="WHOLESALE">📦 Atacado</option>
            <option value="RESELLER">💎 Revenda</option>
            <option value="STANDARD">Padrão</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs font-medium px-3 py-1.5 rounded-xl border border-stone-200 bg-white text-stone-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="ALL">Status: Todos (Exceto Arquivados)</option>
            <option value="ACTIVE">🟢 Ativos</option>
            <option value="INACTIVE">🟡 Inativos</option>
            <option value="BLOCKED">🔴 Bloqueados</option>
            <option value="ARCHIVED">🗄️ Arquivados (Histórico)</option>
          </select>
        </div>
      </div>

      {/* Customers Data Table */}
      <div className="bg-white border border-stone-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Cliente / Razão Social</th>
                <th className="py-3.5 px-4">Documento (CPF/CNPJ)</th>
                <th className="py-3.5 px-4">Contatos & WhatsApp</th>
                <th className="py-3.5 px-4">Endereço Principal</th>
                <th className="py-3.5 px-4">Classificação</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-xs text-stone-700">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <Users className="w-8 h-8 text-stone-300 mx-auto" />
                      <p className="font-medium text-stone-600">Nenhum cliente encontrado</p>
                      <p className="text-[11px]">
                        Tente ajustar os filtros ou cadastre um novo cliente Pessoa Física ou Jurídica.
                      </p>
                      <button
                        onClick={handleOpenCreateModal}
                        className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Cadastrar Primeiro Cliente
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const isPF = cust.personType === "PF";
                  const displayName = cust.fullName || cust.name || cust.companyName || "Cliente Sem Nome";
                  const displayDoc = cust.cpf || cust.cnpj || cust.document || "Não Informado";
                  const primaryAddr = cust.address || (cust.addresses && cust.addresses[0]);
                  const initials = displayName
                    .split(" ")
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase();

                  return (
                    <tr
                      key={cust.id}
                      className="hover:bg-stone-50/80 transition-colors group cursor-pointer"
                      onClick={() => {
                        setSelectedCustomer(cust);
                        setIsDetailsModalOpen(true);
                      }}
                    >
                      {/* Cliente Name & Type */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                              isPF
                                ? "bg-blue-100 text-blue-800 border border-blue-200"
                                : "bg-purple-100 text-purple-800 border border-purple-200"
                            }`}
                          >
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-stone-900 flex items-center gap-1.5">
                              <span>{displayName}</span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md ${
                                  isPF
                                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                                    : "bg-purple-50 text-purple-700 border border-purple-200"
                                }`}
                              >
                                {isPF ? "PF" : "PJ"}
                              </span>
                            </div>
                            {/* Secondary Name / Trade Name */}
                            {!isPF && cust.tradeName && (
                              <div className="text-[11px] text-stone-500 font-medium">
                                Fantasia: {cust.tradeName}
                              </div>
                            )}
                            {cust.notes && (
                              <div className="text-[10px] text-stone-400 truncate max-w-xs">{cust.notes}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Document CPF / CNPJ with Copy */}
                      <td className="py-3.5 px-4 font-mono text-[11px]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-stone-800">{displayDoc}</span>
                          <button
                            onClick={() => handleCopy(displayDoc, cust.id)}
                            className="p-1 text-stone-400 hover:text-stone-700 rounded-md hover:bg-stone-100 transition-colors"
                            title="Copiar Documento"
                          >
                            {copiedDocId === cust.id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        {isPF && cust.rg && <div className="text-[10px] text-stone-400 font-sans">RG: {cust.rg}</div>}
                        {!isPF && (
                          <div className="text-[10px] text-stone-400 font-sans">
                            {cust.isStateRegistrationExempt
                              ? "IE: Isento"
                              : cust.stateRegistration
                              ? `IE: ${cust.stateRegistration}`
                              : "IE: Não Informada"}
                          </div>
                        )}
                      </td>

                      {/* Contacts & WhatsApp Direct Link */}
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-stone-800 font-medium">
                            <Mail className="w-3 h-3 text-stone-400 shrink-0" />
                            <a
                              href={`mailto:${cust.primaryEmail || cust.email}`}
                              className="hover:underline hover:text-amber-700 truncate max-w-[180px]"
                            >
                              {cust.primaryEmail || cust.email || "Sem e-mail"}
                            </a>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 text-stone-600 text-[11px]">
                              <Phone className="w-3 h-3 text-stone-400 shrink-0" />
                              <span>{cust.primaryPhone || cust.phone || "Sem telefone"}</span>
                            </div>
                            {cust.whatsapp && (
                              <a
                                href={`https://wa.me/${cust.whatsapp.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[10px] font-bold border border-emerald-200"
                                title="Conversar no WhatsApp"
                              >
                                <MessageCircle className="w-2.5 h-2.5" />
                                <span>WhatsApp</span>
                              </a>
                            )}
                          </div>
                          {cust.contacts && cust.contacts.length > 0 && (
                            <div className="text-[10px] text-stone-400">
                              +{cust.contacts.length} contato(s) adicional(is)
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Address */}
                      <td className="py-3.5 px-4">
                        {primaryAddr ? (
                          <div className="space-y-0.5">
                            <div className="font-semibold text-stone-800 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>
                                {primaryAddr.city} - {primaryAddr.state}
                              </span>
                            </div>
                            <div className="text-[11px] text-stone-500 truncate max-w-[200px]">
                              {primaryAddr.street}, {primaryAddr.number}
                              {primaryAddr.neighborhood ? ` (${primaryAddr.neighborhood})` : ""}
                            </div>
                            <div className="text-[10px] text-stone-400 font-mono">CEP: {primaryAddr.zipCode}</div>
                          </div>
                        ) : (
                          <span className="text-stone-400 italic text-[11px]">Sem endereço cadastrado</span>
                        )}
                      </td>

                      {/* Tier / Classification */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            cust.customerTier === "VIP"
                              ? "bg-amber-100 text-amber-800 border border-amber-300"
                              : cust.customerTier === "WHOLESALE"
                              ? "bg-purple-100 text-purple-800 border border-purple-300"
                              : cust.customerTier === "RESELLER"
                              ? "bg-blue-100 text-blue-800 border border-blue-300"
                              : "bg-stone-100 text-stone-700 border border-stone-200"
                          }`}
                        >
                          {cust.customerTier === "VIP" && <Crown className="w-2.5 h-2.5" />}
                          {cust.customerTier === "WHOLESALE" && <Briefcase className="w-2.5 h-2.5" />}
                          {cust.customerTier === "VIP"
                            ? "VIP 💎"
                            : cust.customerTier === "WHOLESALE"
                            ? "Atacado"
                            : cust.customerTier === "RESELLER"
                            ? "Revenda"
                            : "Padrão"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            cust.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : cust.status === "INACTIVE"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : cust.status === "BLOCKED"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-stone-100 text-stone-600 border border-stone-300"
                          }`}
                        >
                          {cust.status === "ACTIVE"
                            ? "Ativo"
                            : cust.status === "INACTIVE"
                            ? "Inativo"
                            : cust.status === "BLOCKED"
                            ? "Bloqueado"
                            : "Arquivado"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setSelectedCustomer(cust);
                              setIsDetailsModalOpen(true);
                            }}
                            className="p-1.5 text-stone-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title="Ver Perfil 360°"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleOpenEditModal(cust)}
                            className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                            title="Editar Cadastro"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Lifecycle Action: Archive or Restore */}
                          {cust.status === "ARCHIVED" ? (
                            <button
                              onClick={() => handleArchiveCustomer(cust.id, displayName, true)}
                              className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="Reativar Cliente no ERP"
                            >
                              <ArchiveRestore className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleArchiveCustomer(cust.id, displayName, false)}
                              className="p-1.5 text-stone-400 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                              title="Arquivar Cliente (Preserva Histórico)"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-4 border-t border-stone-200 bg-stone-50/50 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-2">
          <div>
            Exibindo <span className="font-bold text-stone-900">{filteredCustomers.length}</span> de{" "}
            <span className="font-bold text-stone-900">{customers.length}</span> clientes cadastrados.
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 font-medium text-stone-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              PostgreSQL RLS Multi-Tenant Ativo
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: NOVO / EDITAR CLIENTE                                             */}
      {/* ========================================================================= */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 max-w-3xl w-full max-h-[92vh] overflow-y-auto animate-scale-up">
            <div className="sticky top-0 bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h3 className="text-lg font-serif font-bold text-stone-900">
                  {editingCustomer ? "Editar Cadastro de Cliente" : "Novo Cadastro de Cliente"}
                </h3>
                <p className="text-xs text-stone-500">
                  Cadastre dados completos para emissão fiscal, checkout de vendas e garantias digitais.
                </p>
              </div>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-6 space-y-6">
              {/* Segmented Switch: PF vs PJ */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                  Tipo de Pessoa *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormPersonType("PF")}
                    className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                      formPersonType === "PF"
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100"
                    }`}
                  >
                    <User className="w-4 h-4" />
                    <span>Pessoa Física (PF - CPF)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormPersonType("PJ")}
                    className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                      formPersonType === "PJ"
                        ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                        : "bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100"
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Pessoa Jurídica (PJ - CNPJ)</span>
                  </button>
                </div>
              </div>

              {/* DADOS PRINCIPAIS (PF) */}
              {formPersonType === "PF" && (
                <div className="p-4 bg-blue-50/40 border border-blue-100 rounded-2xl space-y-4">
                  <div className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    <span>Identificação Pessoa Física</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-stone-700 mb-1">Nome Completo *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Camila Guimarães Rocha"
                        value={formFullName}
                        onChange={(e) => setFormFullName(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs border border-stone-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-stone-700">CPF (000.000.000-00)</label>
                        {formCpf && !cpfError && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md flex items-center gap-1 border border-emerald-200">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Válido (DV Ok)
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        maxLength={14}
                        placeholder="000.000.000-00"
                        value={formCpf}
                        onChange={handleCpfChange}
                        onBlur={handleCpfBlur}
                        className={`w-full px-3.5 py-2 text-xs font-mono border rounded-xl bg-white transition-colors ${
                          cpfError
                            ? "border-rose-400 bg-rose-50/20 text-rose-900 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                            : formCpf && !cpfError
                            ? "border-emerald-400 bg-emerald-50/10 text-stone-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                            : "border-stone-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        }`}
                      />
                      {cpfError && (
                        <div className="flex items-center gap-1.5 text-[11px] text-rose-600 font-medium mt-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                          <span>{cpfError}</span>
                        </div>
                      )}
                      {!cpfError && formCpf && (
                        <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium mt-1">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                          <span>Dígitos verificadores calculados e validados.</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">RG</label>
                      <input
                        type="text"
                        placeholder="Ex: 44.921.802-X"
                        value={formRg}
                        onChange={(e) => setFormRg(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs border border-stone-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">Data de Nascimento</label>
                      <input
                        type="date"
                        value={formBirthDate}
                        onChange={(e) => setFormBirthDate(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs border border-stone-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">Gênero</label>
                      <select
                        value={formGender}
                        onChange={(e) => setFormGender(e.target.value as any)}
                        className="w-full px-3.5 py-2 text-xs border border-stone-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      >
                        <option value="F">Feminino</option>
                        <option value="M">Masculino</option>
                        <option value="OTHER">Outro</option>
                        <option value="NOT_INFORMED">Prefere não informar</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* DADOS PRINCIPAIS (PJ) */}
              {formPersonType === "PJ" && (
                <div className="p-4 bg-purple-50/40 border border-purple-100 rounded-2xl space-y-4">
                  <div className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Identificação Pessoa Jurídica (Empresa / Loja)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">Razão Social *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Boutique Elegance Joias Ltda"
                        value={formCompanyName}
                        onChange={(e) => setFormCompanyName(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs border border-stone-200 rounded-xl bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">Nome Fantasia</label>
                      <input
                        type="text"
                        placeholder="Ex: Boutique Elegance Campinas"
                        value={formTradeName}
                        onChange={(e) => setFormTradeName(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs border border-stone-200 rounded-xl bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-stone-700">CNPJ (00.000.000/0000-00)</label>
                        {formCnpj && !cnpjError && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md flex items-center gap-1 border border-emerald-200">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Válido (DV Ok)
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        maxLength={18}
                        placeholder="00.000.000/0000-00"
                        value={formCnpj}
                        onChange={handleCnpjChange}
                        onBlur={handleCnpjBlur}
                        className={`w-full px-3.5 py-2 text-xs font-mono border rounded-xl bg-white transition-colors ${
                          cnpjError
                            ? "border-rose-400 bg-rose-50/20 text-rose-900 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                            : formCnpj && !cnpjError
                            ? "border-emerald-400 bg-emerald-50/10 text-stone-900 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                            : "border-stone-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                        }`}
                      />
                      {cnpjError && (
                        <div className="flex items-center gap-1.5 text-[11px] text-rose-600 font-medium mt-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                          <span>{cnpjError}</span>
                        </div>
                      )}
                      {!cnpjError && formCnpj && (
                        <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium mt-1">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                          <span>CNPJ validado segundo algoritmo da Receita Federal.</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-stone-700">Inscrição Estadual (IE)</label>
                        <label className="flex items-center gap-1 text-[11px] text-stone-500 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formIsStateExempt}
                            onChange={(e) => setFormIsStateExempt(e.target.checked)}
                            className="rounded border-stone-300 text-purple-600 focus:ring-purple-500"
                          />
                          <span>Isento de IE</span>
                        </label>
                      </div>
                      <input
                        type="text"
                        disabled={formIsStateExempt}
                        placeholder={formIsStateExempt ? "ISENTO" : "Ex: 244.891.023.110"}
                        value={formIsStateExempt ? "" : formStateRegistration}
                        onChange={(e) => setFormStateRegistration(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs font-mono border border-stone-200 rounded-xl bg-white disabled:bg-stone-100 disabled:text-stone-400 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* CONTATOS PRINCIPAIS */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  <span>Contatos & Notificações</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">E-mail Principal *</label>
                    <input
                      type="email"
                      required
                      placeholder="cliente@email.com"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Telefone Principal *</label>
                    <input
                      type="text"
                      required
                      placeholder="+55 (19) 3234-8899"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">WhatsApp</label>
                    <input
                      type="text"
                      placeholder="+55 (19) 99123-4567"
                      value={formWhatsapp}
                      onChange={(e) => setFormWhatsapp(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* ENDEREÇO PRINCIPAL (com Busca Automática de CEP) */}
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-600" />
                    <span>Endereço Principal de Entrega / Cobrança</span>
                  </div>
                  <span className="text-[10px] text-stone-400">Autopreenchimento por ViaCEP</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">CEP</label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="13480-010"
                        value={formZipCode}
                        onChange={(e) => setFormZipCode(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono border border-stone-200 rounded-xl bg-white"
                      />
                      <button
                        type="button"
                        onClick={handleFetchCep}
                        className="px-2.5 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-bold rounded-xl shrink-0 cursor-pointer"
                        title="Buscar CEP"
                      >
                        Buscar
                      </button>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-stone-700 mb-1">Logradouro / Rua</label>
                    <input
                      type="text"
                      placeholder="Rua Santa Cruz"
                      value={formStreet}
                      onChange={(e) => setFormStreet(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs border border-stone-200 rounded-xl bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Número</label>
                    <input
                      type="text"
                      placeholder="450"
                      value={formNumber}
                      onChange={(e) => setFormNumber(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs border border-stone-200 rounded-xl bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Complemento</label>
                    <input
                      type="text"
                      placeholder="Apto 82"
                      value={formComplement}
                      onChange={(e) => setFormComplement(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs border border-stone-200 rounded-xl bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Bairro</label>
                    <input
                      type="text"
                      placeholder="Centro"
                      value={formNeighborhood}
                      onChange={(e) => setFormNeighborhood(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs border border-stone-200 rounded-xl bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Cidade</label>
                    <input
                      type="text"
                      placeholder="Limeira"
                      value={formCity}
                      onChange={(e) => setFormCity(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs border border-stone-200 rounded-xl bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Estado (UF)</label>
                    <input
                      type="text"
                      maxLength={2}
                      placeholder="SP"
                      value={formState}
                      onChange={(e) => setFormState(e.target.value.toUpperCase())}
                      className="w-full px-3.5 py-2 text-xs font-mono uppercase border border-stone-200 rounded-xl bg-white text-center font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* CLASSIFICAÇÃO & OBSERVAÇÕES */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Classificação / Tier</label>
                  <select
                    value={formTier}
                    onChange={(e) => setFormTier(e.target.value as any)}
                    className="w-full px-3.5 py-2 text-xs border border-stone-200 rounded-xl bg-white font-semibold"
                  >
                    <option value="STANDARD">Padrão (Consumidor Varejo)</option>
                    <option value="VIP">⭐ VIP (Alta Recorrência & Fidelidade)</option>
                    <option value="WHOLESALE">📦 Atacado (Preço & Volume)</option>
                    <option value="RESELLER">💎 Revendedora Autorizada</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Status Cadastral</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2 text-xs border border-stone-200 rounded-xl bg-white font-semibold"
                  >
                    <option value="ACTIVE">🟢 Ativo (Apto a compras e garantias)</option>
                    <option value="INACTIVE">🟡 Inativo</option>
                    <option value="BLOCKED">🔴 Bloqueado (Restrição financeira/cadastro)</option>
                    <option value="ARCHIVED">🗄️ Arquivado (Histórico preservado)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Notas Internas & Preferências de Joias
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ex: Aprecia banho em ouro 18k, colares riviera, aro 16..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs border border-stone-200 rounded-xl bg-white"
                  />
                </div>
              </div>

              {/* Botões do Form */}
              <div className="pt-4 border-t border-stone-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-xs font-bold text-stone-600 hover:bg-stone-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting
                    ? "Salvando no PostgreSQL..."
                    : editingCustomer
                    ? "Atualizar Cliente"
                    : "Salvar Cliente no Banco de Dados"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DETALHES DO CLIENTE (PERFIL 360°)                                  */}
      {/* ========================================================================= */}
      {isDetailsModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-up">
            <div className="p-6 border-b border-stone-200 flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-base ${
                    selectedCustomer.personType === "PF"
                      ? "bg-blue-100 text-blue-800 border border-blue-200"
                      : "bg-purple-100 text-purple-800 border border-purple-200"
                  }`}
                >
                  {(selectedCustomer.fullName || selectedCustomer.name || "CL")
                    .split(" ")
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-serif font-bold text-stone-900">
                      {selectedCustomer.fullName || selectedCustomer.name}
                    </h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        selectedCustomer.personType === "PF"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-purple-50 text-purple-700 border border-purple-200"
                      }`}
                    >
                      {selectedCustomer.personType === "PF" ? "Pessoa Física (PF)" : "Pessoa Jurídica (PJ)"}
                    </span>
                  </div>
                  <div className="text-xs text-stone-500 mt-0.5">
                    Cadastrado em {selectedCustomer.createdAt || "2026-08"} • ID: {selectedCustomer.id}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Document & Classification Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                  <div className="text-[10px] font-bold text-stone-500 uppercase">Documento</div>
                  <div className="text-xs font-mono font-bold text-stone-900 mt-0.5">
                    {selectedCustomer.cpf || selectedCustomer.cnpj || selectedCustomer.document || "Não informado"}
                  </div>
                </div>

                <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                  <div className="text-[10px] font-bold text-stone-500 uppercase">
                    {selectedCustomer.personType === "PF" ? "RG" : "Inscrição Estadual"}
                  </div>
                  <div className="text-xs font-mono font-bold text-stone-900 mt-0.5">
                    {selectedCustomer.personType === "PF"
                      ? selectedCustomer.rg || "—"
                      : selectedCustomer.isStateRegistrationExempt
                      ? "Isento"
                      : selectedCustomer.stateRegistration || "—"}
                  </div>
                </div>

                <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                  <div className="text-[10px] font-bold text-stone-500 uppercase">Tier / Segmento</div>
                  <div className="text-xs font-bold text-amber-700 mt-0.5">
                    {selectedCustomer.customerTier || "STANDARD"}
                  </div>
                </div>

                <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                  <div className="text-[10px] font-bold text-stone-500 uppercase">Status</div>
                  <div className="text-xs font-bold mt-0.5">
                    {selectedCustomer.status === "ACTIVE" ? (
                      <span className="text-emerald-700">🟢 Ativo</span>
                    ) : selectedCustomer.status === "INACTIVE" ? (
                      <span className="text-amber-700">🟡 Inativo</span>
                    ) : selectedCustomer.status === "BLOCKED" ? (
                      <span className="text-rose-700">🔴 Bloqueado</span>
                    ) : (
                      <span className="text-stone-600">🗄️ Arquivado</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Lifecycle Control & ERP Audit Guard */}
              <div className="p-4 bg-stone-50/80 rounded-2xl border border-stone-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800 uppercase tracking-wider">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                    <span>Ciclo de Vida do Cliente (ERP Audit Guard)</span>
                  </div>
                  <span className="text-[11px] text-stone-500">Histórico de pedidos e notas preservado</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => handleStatusChange(selectedCustomer.id, "ACTIVE", selectedCustomer.fullName)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      selectedCustomer.status === "ACTIVE"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-white border border-stone-200 text-stone-700 hover:bg-emerald-50 hover:text-emerald-800"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Ativo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStatusChange(selectedCustomer.id, "INACTIVE", selectedCustomer.fullName)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      selectedCustomer.status === "INACTIVE"
                        ? "bg-amber-600 text-white shadow-xs"
                        : "bg-white border border-stone-200 text-stone-700 hover:bg-amber-50 hover:text-amber-800"
                    }`}
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Inativo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStatusChange(selectedCustomer.id, "BLOCKED", selectedCustomer.fullName)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      selectedCustomer.status === "BLOCKED"
                        ? "bg-rose-600 text-white shadow-xs"
                        : "bg-white border border-stone-200 text-stone-700 hover:bg-rose-50 hover:text-rose-800"
                    }`}
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Bloqueado</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStatusChange(selectedCustomer.id, "ARCHIVED", selectedCustomer.fullName)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      selectedCustomer.status === "ARCHIVED"
                        ? "bg-stone-800 text-white shadow-xs"
                        : "bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 hover:text-stone-900"
                    }`}
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>Arquivado</span>
                  </button>
                </div>
              </div>

              {/* Direct Contacts */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">Contatos Diretos</h4>
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-stone-500 text-[11px] block">E-mail:</span>
                    <a
                      href={`mailto:${selectedCustomer.primaryEmail || selectedCustomer.email}`}
                      className="font-semibold text-stone-900 hover:underline"
                    >
                      {selectedCustomer.primaryEmail || selectedCustomer.email}
                    </a>
                  </div>

                  <div>
                    <span className="text-stone-500 text-[11px] block">Telefone:</span>
                    <span className="font-semibold text-stone-900">
                      {selectedCustomer.primaryPhone || selectedCustomer.phone}
                    </span>
                  </div>

                  {selectedCustomer.whatsapp && (
                    <div className="sm:col-span-2 flex items-center justify-between pt-2 border-t border-stone-200">
                      <span className="text-stone-500">Canal WhatsApp Oficial:</span>
                      <a
                        href={`https://wa.me/${selectedCustomer.whatsapp.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Abrir WhatsApp ({selectedCustomer.whatsapp})</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Endereços */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">Endereços Cadastrados</h4>
                {selectedCustomer.addresses && selectedCustomer.addresses.length > 0 ? (
                  <div className="space-y-2">
                    {selectedCustomer.addresses.map((addr) => (
                      <div key={addr.id} className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-stone-900 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-amber-600" />
                            {addr.street}, {addr.number} {addr.complement ? `- ${addr.complement}` : ""}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-200 text-stone-700">
                            {addr.type || "Principal"}
                          </span>
                        </div>
                        <div className="text-stone-600 mt-1">
                          {addr.neighborhood} • {addr.city} - {addr.state} • CEP: {addr.zipCode}
                        </div>
                        {addr.referencePoint && (
                          <div className="text-[11px] text-stone-400 mt-0.5">Ref: {addr.referencePoint}</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : selectedCustomer.address ? (
                  <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 text-xs">
                    <div className="font-bold text-stone-900 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-600" />
                      {selectedCustomer.address.street}, {selectedCustomer.address.number}{" "}
                      {selectedCustomer.address.complement ? `- ${selectedCustomer.address.complement}` : ""}
                    </div>
                    <div className="text-stone-600 mt-1">
                      {selectedCustomer.address.neighborhood} • {selectedCustomer.address.city} -{" "}
                      {selectedCustomer.address.state} • CEP: {selectedCustomer.address.zipCode}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-stone-400 italic">Nenhum endereço cadastrado.</p>
                )}
              </div>

              {/* Contatos Adicionais (PJ) */}
              {selectedCustomer.contacts && selectedCustomer.contacts.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                    Contatos Organizacionais / NFe
                  </h4>
                  <div className="space-y-2">
                    {selectedCustomer.contacts.map((ct) => (
                      <div
                        key={ct.id}
                        className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-stone-900">
                            {ct.contactName} ({ct.label})
                          </div>
                          <div className="text-[11px] text-stone-500">
                            {ct.email} • {ct.phone}
                          </div>
                        </div>
                        {ct.isNfeRecipient && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            Recebe NFe
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedCustomer.notes && (
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">Observações Internas</h4>
                  <div className="p-3.5 bg-amber-50/50 border border-amber-200/60 rounded-xl text-xs text-stone-800">
                    {selectedCustomer.notes}
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="pt-4 border-t border-stone-200 flex items-center justify-between">
                <button
                  onClick={() => {
                    setIsDetailsModalOpen(false);
                    handleOpenEditModal(selectedCustomer);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-stone-200 text-xs font-bold text-stone-700 hover:bg-stone-50 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Editar Cliente</span>
                </button>

                <button
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold cursor-pointer"
                >
                  Fechar Detalhes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
