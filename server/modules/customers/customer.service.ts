import { dbStore } from "../../db/store";
import {
  CustomerEntity,
  CustomerStatus,
  CustomerAddressEntity,
  CustomerContactEntity,
  CreateCustomerDTO,
  UpdateCustomerDTO,
  CustomerFilterQuery,
} from "./customer.types";
import { validateCPF, validateCNPJ, formatCPF, formatCNPJ } from "../../utils/documentValidators";

export class CustomerService {
  /**
   * List customers for an organization with optional filtering
   */
  static async listCustomers(
    organizationId: string,
    filter: CustomerFilterQuery = {}
  ): Promise<{ customers: CustomerEntity[]; total: number }> {
    let allCusts = Array.from(dbStore.customers.values()).filter(
      (c) => c.organizationId === organizationId
    );

    if (filter.personType) {
      allCusts = allCusts.filter((c) => c.personType === filter.personType);
    }
    if (filter.status) {
      allCusts = allCusts.filter((c) => c.status === filter.status);
    }
    if (filter.customerTier) {
      allCusts = allCusts.filter((c) => c.customerTier === filter.customerTier);
    }
    if (filter.search) {
      const q = filter.search.toLowerCase().trim();
      allCusts = allCusts.filter((c) => {
        const name = (c.fullName || c.tradeName || c.companyName || "").toLowerCase();
        const doc = (c.cpf || c.cnpj || "").toLowerCase();
        const email = (c.primaryEmail || "").toLowerCase();
        const phone = (c.primaryPhone || "").toLowerCase();
        return name.includes(q) || doc.includes(q) || email.includes(q) || phone.includes(q);
      });
    }

    // Hydrate addresses and contacts
    const hydratedCusts = allCusts.map((c) => {
      const addresses = Array.from(dbStore.customerAddresses.values()).filter(
        (a) => a.organizationId === organizationId && a.customerId === c.id
      );
      const contacts = Array.from(dbStore.customerContacts.values()).filter(
        (ct) => ct.organizationId === organizationId && ct.customerId === c.id
      );
      return {
        ...c,
        addresses,
        contacts,
      };
    });

    const total = hydratedCusts.length;
    const offset = filter.offset || 0;
    const limit = filter.limit || 100;
    const paginated = hydratedCusts.slice(offset, offset + limit);

    return { customers: paginated, total };
  }

  /**
   * Get single customer by ID
   */
  static async getCustomerById(
    organizationId: string,
    customerId: string
  ): Promise<CustomerEntity> {
    const customer = dbStore.customers.get(customerId);
    if (!customer || customer.organizationId !== organizationId) {
      throw new Error(`Cliente ${customerId} não encontrado para esta organização.`);
    }

    const addresses = Array.from(dbStore.customerAddresses.values()).filter(
      (a) => a.organizationId === organizationId && a.customerId === customerId
    );
    const contacts = Array.from(dbStore.customerContacts.values()).filter(
      (ct) => ct.organizationId === organizationId && ct.customerId === customerId
    );

    return {
      ...customer,
      addresses,
      contacts,
    };
  }

  /**
   * Create new customer (PF or PJ)
   */
  static async createCustomer(
    organizationId: string,
    dto: CreateCustomerDTO
  ): Promise<CustomerEntity> {
    // Validate Document if provided
    let cleanCpf = dto.cpf;
    let cleanCnpj = dto.cnpj;

    if (dto.personType === "PF" && dto.cpf) {
      const val = validateCPF(dto.cpf);
      if (!val.isValid) {
        throw new Error(val.error || "CPF inválido.");
      }
      cleanCpf = val.formattedValue;
    } else if (dto.personType === "PJ" && dto.cnpj) {
      const val = validateCNPJ(dto.cnpj);
      if (!val.isValid) {
        throw new Error(val.error || "CNPJ inválido.");
      }
      cleanCnpj = val.formattedValue;
    }

    const newId = `cust-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString().replace("T", " ").substring(0, 19);

    const displayName =
      dto.personType === "PF"
        ? dto.fullName
        : dto.tradeName || dto.companyName || dto.fullName;

    const customer: CustomerEntity = {
      id: newId,
      organizationId,
      personType: dto.personType,
      fullName: displayName,
      cpf: cleanCpf,
      rg: dto.rg,
      birthDate: dto.birthDate,
      gender: dto.gender,
      companyName: dto.companyName,
      tradeName: dto.tradeName,
      cnpj: cleanCnpj,
      stateRegistration: dto.stateRegistration,
      isStateRegistrationExempt: dto.isStateRegistrationExempt ?? false,
      primaryEmail: dto.primaryEmail,
      primaryPhone: dto.primaryPhone,
      whatsapp: dto.whatsapp,
      status: dto.status || "ACTIVE",
      customerTier: dto.customerTier || "STANDARD",
      notes: dto.notes,
      createdAt: now,
      updatedAt: now,
    };

    dbStore.customers.set(newId, customer);

    // Save initial address if provided
    if (dto.initialAddress) {
      const addrId = `addr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const addr: CustomerAddressEntity = {
        id: addrId,
        organizationId,
        customerId: newId,
        type: dto.initialAddress.type || "MAIN",
        recipientName: dto.initialAddress.recipientName || displayName,
        zipCode: dto.initialAddress.zipCode,
        street: dto.initialAddress.street,
        number: dto.initialAddress.number,
        complement: dto.initialAddress.complement,
        neighborhood: dto.initialAddress.neighborhood,
        city: dto.initialAddress.city,
        state: dto.initialAddress.state,
        country: dto.initialAddress.country || "BRA",
        referencePoint: dto.initialAddress.referencePoint,
        isDefault: dto.initialAddress.isDefault ?? true,
        createdAt: now,
      };
      dbStore.customerAddresses.set(addrId, addr);
    }

    // Save initial contact if provided
    if (dto.initialContact) {
      const contId = `cont-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const contact: CustomerContactEntity = {
        id: contId,
        organizationId,
        customerId: newId,
        label: dto.initialContact.label || "Contato Principal",
        contactName: dto.initialContact.contactName,
        email: dto.initialContact.email,
        phone: dto.initialContact.phone,
        isNfeRecipient: dto.initialContact.isNfeRecipient ?? false,
        createdAt: now,
      };
      dbStore.customerContacts.set(contId, contact);
    }

    return this.getCustomerById(organizationId, newId);
  }

  /**
   * Update existing customer
   */
  static async updateCustomer(
    organizationId: string,
    customerId: string,
    dto: UpdateCustomerDTO
  ): Promise<CustomerEntity> {
    const existing = await this.getCustomerById(organizationId, customerId);
    const now = new Date().toISOString().replace("T", " ").substring(0, 19);

    const targetPersonType = dto.personType || existing.personType;
    let cleanCpf = dto.cpf !== undefined ? dto.cpf : existing.cpf;
    let cleanCnpj = dto.cnpj !== undefined ? dto.cnpj : existing.cnpj;

    if (targetPersonType === "PF" && dto.cpf) {
      const val = validateCPF(dto.cpf);
      if (!val.isValid) {
        throw new Error(val.error || "CPF inválido.");
      }
      cleanCpf = val.formattedValue;
    } else if (targetPersonType === "PJ" && dto.cnpj) {
      const val = validateCNPJ(dto.cnpj);
      if (!val.isValid) {
        throw new Error(val.error || "CNPJ inválido.");
      }
      cleanCnpj = val.formattedValue;
    }

    const updated: CustomerEntity = {
      ...existing,
      ...dto,
      cpf: cleanCpf,
      cnpj: cleanCnpj,
      id: existing.id,
      organizationId: existing.organizationId,
      updatedAt: now,
    };

    dbStore.customers.set(customerId, updated);
    return this.getCustomerById(organizationId, customerId);
  }

  /**
   * Update Customer Status (ACTIVE, INACTIVE, BLOCKED, ARCHIVED)
   * Preserves full relational and transactional history.
   */
  static async updateStatus(
    organizationId: string,
    customerId: string,
    status: CustomerStatus
  ): Promise<CustomerEntity> {
    const existing = await this.getCustomerById(organizationId, customerId);
    const now = new Date().toISOString().replace("T", " ").substring(0, 19);

    const updated: CustomerEntity = {
      ...existing,
      status,
      updatedAt: now,
    };

    dbStore.customers.set(customerId, updated);
    return this.getCustomerById(organizationId, customerId);
  }

  /**
   * Soft-Delete / Archive Customer
   * Strictly preserves all past Orders, Warranties, Consignments, Payments, and Audit logs.
   * Changes customer status to 'ARCHIVED' instead of physical database deletion.
   */
  static async deleteCustomer(organizationId: string, customerId: string): Promise<CustomerEntity> {
    const customer = dbStore.customers.get(customerId);
    if (!customer || customer.organizationId !== organizationId) {
      throw new Error("Cliente não encontrado.");
    }

    const now = new Date().toISOString().replace("T", " ").substring(0, 19);
    const archivedCustomer: CustomerEntity = {
      ...customer,
      status: "ARCHIVED",
      updatedAt: now,
    };

    dbStore.customers.set(customerId, archivedCustomer);
    return archivedCustomer;
  }
}
