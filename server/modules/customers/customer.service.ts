import { query, withTransaction } from "../../db/postgres";
import {
  CustomerEntity,
  CustomerStatus,
  CustomerAddressEntity,
  CustomerContactEntity,
  CreateCustomerDTO,
  UpdateCustomerDTO,
  CustomerFilterQuery,
} from "./customer.types";
import { validateCPF, validateCNPJ } from "../../utils/documentValidators";

function mapRowToAddress(row: any): CustomerAddressEntity {
  return {
    id: row.id,
    organizationId: row.organization_id,
    customerId: row.customer_id,
    type: row.type,
    recipientName: row.recipient_name,
    zipCode: row.zip_code,
    street: row.street,
    number: row.number,
    complement: row.complement || undefined,
    neighborhood: row.neighborhood,
    city: row.city,
    state: row.state,
    country: row.country || "BRA",
    referencePoint: row.reference_point || undefined,
    isDefault: Boolean(row.is_default),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

function mapRowToContact(row: any): CustomerContactEntity {
  return {
    id: row.id,
    organizationId: row.organization_id,
    customerId: row.customer_id,
    label: row.label,
    contactName: row.contact_name || undefined,
    email: row.email || undefined,
    phone: row.phone || undefined,
    isNfeRecipient: Boolean(row.is_nfe_recipient),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

function mapRowToCustomer(
  row: any,
  addresses: CustomerAddressEntity[] = [],
  contacts: CustomerContactEntity[] = []
): CustomerEntity {
  return {
    id: row.id,
    organizationId: row.organization_id,
    personType: row.person_type,
    fullName: row.full_name,
    cpf: row.cpf || undefined,
    rg: row.rg || undefined,
    birthDate: row.birth_date
      ? row.birth_date instanceof Date
        ? row.birth_date.toISOString().split("T")[0]
        : String(row.birth_date)
      : undefined,
    gender: row.gender || undefined,
    companyName: row.company_name || undefined,
    tradeName: row.trade_name || undefined,
    cnpj: row.cnpj || undefined,
    stateRegistration: row.state_registration || undefined,
    isStateRegistrationExempt: Boolean(row.is_state_registration_exempt),
    primaryEmail: row.primary_email,
    primaryPhone: row.primary_phone,
    whatsapp: row.whatsapp || undefined,
    status: row.status,
    customerTier: row.customer_tier,
    notes: row.notes || undefined,
    addresses,
    contacts,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

export class CustomerService {
  /**
   * List customers for an organization with optional filtering (PostgreSQL-backed)
   */
  static async listCustomers(
    organizationId: string,
    filter: CustomerFilterQuery = {}
  ): Promise<{ customers: CustomerEntity[]; total: number }> {
    let sql = "SELECT * FROM customers WHERE organization_id = $1";
    const params: any[] = [organizationId];
    let idx = 2;

    if (filter.personType) {
      sql += ` AND person_type = $${idx++}`;
      params.push(filter.personType);
    }
    if (filter.status) {
      sql += ` AND status = $${idx++}`;
      params.push(filter.status);
    }
    if (filter.customerTier) {
      sql += ` AND customer_tier = $${idx++}`;
      params.push(filter.customerTier);
    }
    if (filter.search) {
      const q = `%${filter.search.toLowerCase().trim()}%`;
      sql += ` AND (LOWER(full_name) LIKE $${idx} OR LOWER(trade_name) LIKE $${idx} OR LOWER(company_name) LIKE $${idx} OR LOWER(COALESCE(cpf, '')) LIKE $${idx} OR LOWER(COALESCE(cnpj, '')) LIKE $${idx} OR LOWER(primary_email) LIKE $${idx} OR LOWER(primary_phone) LIKE $${idx})`;
      params.push(q);
      idx++;
    }

    sql += " ORDER BY updated_at DESC";

    const countRes = await query(
      `SELECT count(*) as count FROM (${sql}) as filtered`,
      params
    );
    const total = parseInt(countRes.rows[0]?.count || "0", 10);

    const offset = filter.offset || 0;
    const limit = filter.limit || 100;
    sql += ` LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(limit, offset);

    const custRes = await query(sql, params);
    if (custRes.rows.length === 0) {
      return { customers: [], total: 0 };
    }

    const customerIds = custRes.rows.map((r) => r.id);

    // Fetch addresses and contacts in batch
    const [addrRes, contRes] = await Promise.all([
      query(
        "SELECT * FROM customer_addresses WHERE organization_id = $1 AND customer_id = ANY($2)",
        [organizationId, customerIds]
      ),
      query(
        "SELECT * FROM customer_contacts WHERE organization_id = $1 AND customer_id = ANY($2)",
        [organizationId, customerIds]
      ),
    ]);

    const addrMap = new Map<string, CustomerAddressEntity[]>();
    for (const a of addrRes.rows) {
      const addr = mapRowToAddress(a);
      if (!addrMap.has(addr.customerId)) addrMap.set(addr.customerId, []);
      addrMap.get(addr.customerId)!.push(addr);
    }

    const contMap = new Map<string, CustomerContactEntity[]>();
    for (const c of contRes.rows) {
      const cont = mapRowToContact(c);
      if (!contMap.has(cont.customerId)) contMap.set(cont.customerId, []);
      contMap.get(cont.customerId)!.push(cont);
    }

    const customers = custRes.rows.map((row) =>
      mapRowToCustomer(row, addrMap.get(row.id) || [], contMap.get(row.id) || [])
    );

    return { customers, total };
  }

  /**
   * Get single customer by ID
   */
  static async getCustomerById(
    organizationId: string,
    customerId: string
  ): Promise<CustomerEntity> {
    const custRes = await query(
      "SELECT * FROM customers WHERE organization_id = $1 AND id = $2",
      [organizationId, customerId]
    );

    if (custRes.rows.length === 0) {
      throw new Error(`Cliente ${customerId} não encontrado para esta organização.`);
    }

    const [addrRes, contRes] = await Promise.all([
      query(
        "SELECT * FROM customer_addresses WHERE organization_id = $1 AND customer_id = $2",
        [organizationId, customerId]
      ),
      query(
        "SELECT * FROM customer_contacts WHERE organization_id = $1 AND customer_id = $2",
        [organizationId, customerId]
      ),
    ]);

    const addresses = addrRes.rows.map(mapRowToAddress);
    const contacts = contRes.rows.map(mapRowToContact);

    return mapRowToCustomer(custRes.rows[0], addresses, contacts);
  }

  /**
   * Create new customer (PF or PJ)
   */
  static async createCustomer(
    organizationId: string,
    dto: CreateCustomerDTO
  ): Promise<CustomerEntity> {
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
    const displayName =
      dto.personType === "PF"
        ? dto.fullName
        : dto.tradeName || dto.companyName || dto.fullName;

    return await withTransaction(async (client) => {
      const custRes = await client.query(
        `INSERT INTO customers (
          id, organization_id, person_type, full_name, cpf, rg, birth_date, gender,
          company_name, trade_name, cnpj, state_registration, is_state_registration_exempt,
          primary_email, primary_phone, whatsapp, status, customer_tier, notes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW())
        RETURNING *`,
        [
          newId,
          organizationId,
          dto.personType,
          displayName,
          cleanCpf || null,
          dto.rg || null,
          dto.birthDate || null,
          dto.gender || null,
          dto.companyName || null,
          dto.tradeName || null,
          cleanCnpj || null,
          dto.stateRegistration || null,
          dto.isStateRegistrationExempt ?? false,
          dto.primaryEmail,
          dto.primaryPhone,
          dto.whatsapp || null,
          dto.status || "ACTIVE",
          dto.customerTier || "STANDARD",
          dto.notes || null,
        ]
      );

      const addresses: CustomerAddressEntity[] = [];
      if (dto.initialAddress) {
        const addrId = `addr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const addrRes = await client.query(
          `INSERT INTO customer_addresses (
            id, organization_id, customer_id, type, recipient_name, zip_code,
            street, number, complement, neighborhood, city, state, country,
            reference_point, is_default, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
          RETURNING *`,
          [
            addrId,
            organizationId,
            newId,
            dto.initialAddress.type || "MAIN",
            dto.initialAddress.recipientName || displayName,
            dto.initialAddress.zipCode,
            dto.initialAddress.street,
            dto.initialAddress.number,
            dto.initialAddress.complement || null,
            dto.initialAddress.neighborhood,
            dto.initialAddress.city,
            dto.initialAddress.state,
            dto.initialAddress.country || "BRA",
            dto.initialAddress.referencePoint || null,
            dto.initialAddress.isDefault ?? true,
          ]
        );
        addresses.push(mapRowToAddress(addrRes.rows[0]));
      }

      const contacts: CustomerContactEntity[] = [];
      if (dto.initialContact) {
        const contId = `cont-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const contRes = await client.query(
          `INSERT INTO customer_contacts (
            id, organization_id, customer_id, label, contact_name, email, phone, is_nfe_recipient, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
          RETURNING *`,
          [
            contId,
            organizationId,
            newId,
            dto.initialContact.label || "Contato Principal",
            dto.initialContact.contactName || null,
            dto.initialContact.email || null,
            dto.initialContact.phone || null,
            dto.initialContact.isNfeRecipient ?? false,
          ]
        );
        contacts.push(mapRowToContact(contRes.rows[0]));
      }

      return mapRowToCustomer(custRes.rows[0], addresses, contacts);
    });
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

    const setClauses: string[] = ["updated_at = NOW()"];
    const params: any[] = [organizationId, customerId];
    let idx = 3;

    if (dto.personType !== undefined) {
      setClauses.push(`person_type = $${idx++}`);
      params.push(dto.personType);
    }
    if (dto.fullName !== undefined) {
      setClauses.push(`full_name = $${idx++}`);
      params.push(dto.fullName);
    }
    if (cleanCpf !== undefined) {
      setClauses.push(`cpf = $${idx++}`);
      params.push(cleanCpf);
    }
    if (dto.rg !== undefined) {
      setClauses.push(`rg = $${idx++}`);
      params.push(dto.rg);
    }
    if (dto.birthDate !== undefined) {
      setClauses.push(`birth_date = $${idx++}`);
      params.push(dto.birthDate);
    }
    if (dto.gender !== undefined) {
      setClauses.push(`gender = $${idx++}`);
      params.push(dto.gender);
    }
    if (dto.companyName !== undefined) {
      setClauses.push(`company_name = $${idx++}`);
      params.push(dto.companyName);
    }
    if (dto.tradeName !== undefined) {
      setClauses.push(`trade_name = $${idx++}`);
      params.push(dto.tradeName);
    }
    if (cleanCnpj !== undefined) {
      setClauses.push(`cnpj = $${idx++}`);
      params.push(cleanCnpj);
    }
    if (dto.stateRegistration !== undefined) {
      setClauses.push(`state_registration = $${idx++}`);
      params.push(dto.stateRegistration);
    }
    if (dto.isStateRegistrationExempt !== undefined) {
      setClauses.push(`is_state_registration_exempt = $${idx++}`);
      params.push(dto.isStateRegistrationExempt);
    }
    if (dto.primaryEmail !== undefined) {
      setClauses.push(`primary_email = $${idx++}`);
      params.push(dto.primaryEmail);
    }
    if (dto.primaryPhone !== undefined) {
      setClauses.push(`primary_phone = $${idx++}`);
      params.push(dto.primaryPhone);
    }
    if (dto.whatsapp !== undefined) {
      setClauses.push(`whatsapp = $${idx++}`);
      params.push(dto.whatsapp);
    }
    if (dto.status !== undefined) {
      setClauses.push(`status = $${idx++}`);
      params.push(dto.status);
    }
    if (dto.customerTier !== undefined) {
      setClauses.push(`customer_tier = $${idx++}`);
      params.push(dto.customerTier);
    }
    if (dto.notes !== undefined) {
      setClauses.push(`notes = $${idx++}`);
      params.push(dto.notes);
    }

    const sql = `UPDATE customers SET ${setClauses.join(", ")} WHERE organization_id = $1 AND id = $2 RETURNING *`;
    await query(sql, params);

    return this.getCustomerById(organizationId, customerId);
  }

  /**
   * Update Customer Status (ACTIVE, INACTIVE, BLOCKED, ARCHIVED)
   */
  static async updateStatus(
    organizationId: string,
    customerId: string,
    status: CustomerStatus
  ): Promise<CustomerEntity> {
    await query(
      "UPDATE customers SET status = $1, updated_at = NOW() WHERE organization_id = $2 AND id = $3",
      [status, organizationId, customerId]
    );
    return this.getCustomerById(organizationId, customerId);
  }

  /**
   * Soft-Delete / Archive Customer
   */
  static async deleteCustomer(organizationId: string, customerId: string): Promise<CustomerEntity> {
    return this.updateStatus(organizationId, customerId, "ARCHIVED");
  }
}
