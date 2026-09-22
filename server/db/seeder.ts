import { query } from "./postgres";
import { dbStore, INITIAL_PLANS } from "./store";
import { TenantContext } from "./tenantContext";

export async function seedPostgresIfNeeded(): Promise<void> {
  return TenantContext.run({ isSuperAdmin: true }, async () => {
    try {
      const check = await query("SELECT count(*) as count FROM order_items");
      const count = parseInt(check.rows[0]?.count || "0", 10);
      if (count > 0) {
        console.log(`[PostgreSQL Seeder] Database already populated (${count} order items found).`);
        return;
      }

      console.log("[PostgreSQL Seeder] Seeding initial baseline data into PostgreSQL...");

    // 1. Plans
    for (const plan of INITIAL_PLANS) {
      await query(
        `INSERT INTO plans (id, name, price_monthly_brl, trial_days, max_users, max_products, max_resellers, allowed_modules, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO NOTHING`,
        [
          plan.id,
          plan.name,
          plan.priceMonthlyBrl,
          plan.trialDays,
          plan.maxUsers,
          plan.maxProducts,
          plan.maxResellers,
          JSON.stringify(plan.allowedModules),
          plan.description,
        ]
      );
    }

    // 2. Organizations
    for (const org of dbStore.organizations.values()) {
      await query(
        `INSERT INTO organizations (id, name, slug, document, segment, logo_url, city, state, contact_email, contact_whatsapp, custom_domain, custom_domain_status, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (id) DO NOTHING`,
        [
          org.id,
          org.name,
          org.slug,
          org.document,
          org.segment,
          org.logoUrl,
          org.city,
          org.state,
          org.contactEmail,
          org.contactWhatsapp,
          org.customDomain,
          org.customDomainStatus,
          org.status,
        ]
      );
    }

    // 3. Users
    for (const user of dbStore.users.values()) {
      await query(
        `INSERT INTO users (id, name, email, password_hash, avatar_url, phone, is_platform_super_admin, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [
          user.id,
          user.name,
          user.email,
          user.passwordHash,
          user.avatarUrl || null,
          user.phone || null,
          user.isPlatformSuperAdmin || false,
          user.status,
        ]
      );
    }

    // 4. Organization Members
    for (const member of dbStore.members.values()) {
      await query(
        `INSERT INTO organization_members (id, organization_id, user_id, role, custom_permissions, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [
          member.id,
          member.organizationId,
          member.userId,
          member.role,
          JSON.stringify(member.customPermissions || []),
          member.status,
        ]
      );
    }

    // 5. Subscriptions
    for (const sub of dbStore.subscriptions.values()) {
      await query(
        `INSERT INTO subscriptions (id, organization_id, plan_id, status, trial_started_at, trial_ends_at, current_period_start, current_period_end, payment_method, auto_renew)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO NOTHING`,
        [
          sub.id,
          sub.organizationId,
          sub.planId,
          sub.status,
          sub.trialStartedAt,
          sub.trialEndsAt,
          sub.currentPeriodStart,
          sub.currentPeriodEnd,
          sub.paymentMethod,
          sub.autoRenew,
        ]
      );
    }

    // 6. Organization Modules
    for (const mods of dbStore.organizationModules.values()) {
      for (const mod of mods) {
        await query(
          `INSERT INTO organization_modules (id, organization_id, module_key, is_enabled, activated_at)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (organization_id, module_key) DO NOTHING`,
          [mod.id, mod.organizationId, mod.moduleKey, mod.isEnabled, mod.activatedAt]
        );
      }
    }

    // 7. Inventory Locations
    for (const loc of dbStore.inventoryLocations.values()) {
      await query(
        `INSERT INTO inventory_locations (id, organization_id, name, type, code, description, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (organization_id, code) DO NOTHING`,
        [loc.id, loc.organizationId, loc.name, loc.type, loc.code, loc.description, loc.isActive]
      );
    }

    // 8. Products
    for (const prod of dbStore.products.values()) {
      await query(
        `INSERT INTO products (id, organization_id, sku, name, category, collection, material, bath, stones, price, cost_price, promo_price, warranty_months, is_customizable, image_url, description, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
         ON CONFLICT (organization_id, sku) DO NOTHING`,
        [
          prod.id,
          prod.organizationId,
          prod.sku,
          prod.name,
          prod.category,
          prod.collection,
          prod.material,
          prod.bath,
          JSON.stringify(prod.stones || []),
          prod.price,
          prod.costPrice,
          prod.promoPrice || null,
          prod.warrantyMonths,
          prod.isCustomizable,
          prod.imageUrl,
          prod.description,
          prod.status,
        ]
      );
    }

    // 8.1 Product Media
    for (const media of dbStore.productMedia.values()) {
      await query(
        `INSERT INTO product_media (id, organization_id, product_id, storage_key, url, cdn_url, media_type, mime_type, file_size_bytes, etag, is_primary, sort_order, title, alt_text)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (id) DO NOTHING`,
        [
          media.id,
          media.organizationId,
          media.productId,
          media.storageKey,
          media.url,
          media.cdnUrl || media.url,
          media.mediaType,
          media.mimeType,
          media.fileSizeBytes,
          media.etag || null,
          media.isPrimary,
          media.sortOrder,
          media.title || null,
          media.altText || null,
        ]
      );
    }

    // 9. Inventory Balances
    for (const bal of dbStore.inventoryBalances.values()) {
      await query(
        `INSERT INTO inventory_balances (id, organization_id, product_id, location_id, on_hand_quantity, reserved_quantity)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (organization_id, product_id, location_id) DO UPDATE
         SET on_hand_quantity = EXCLUDED.on_hand_quantity, reserved_quantity = EXCLUDED.reserved_quantity`,
        [bal.id, bal.organizationId, bal.productId, bal.locationId, bal.onHandQuantity, bal.reservedQuantity]
      );
    }

    // 10. Inventory Movements
    for (const mov of dbStore.inventoryMovements.values()) {
      await query(
        `INSERT INTO inventory_movements (id, organization_id, product_id, type, quantity_change, physical_balance_after, consigned_balance_after, location_id, reference_type, reference_id, operator_name, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO NOTHING`,
        [
          mov.id,
          mov.organizationId,
          mov.productId,
          mov.type,
          mov.quantityChange,
          mov.physicalBalanceAfter,
          mov.consignedBalanceAfter,
          mov.locationId || null,
          mov.referenceType || null,
          mov.referenceId || null,
          mov.operatorName,
          mov.notes || null,
        ]
      );
    }

    // 11. Customers
    for (const cust of dbStore.customers.values()) {
      await query(
        `INSERT INTO customers (id, organization_id, person_type, full_name, cpf, rg, birth_date, gender, company_name, trade_name, cnpj, state_registration, is_state_registration_exempt, primary_email, primary_phone, whatsapp, status, customer_tier, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
         ON CONFLICT (id) DO NOTHING`,
        [
          cust.id,
          cust.organizationId,
          cust.personType,
          cust.fullName,
          cust.cpf || null,
          cust.rg || null,
          cust.birthDate || null,
          cust.gender || null,
          cust.companyName || null,
          cust.tradeName || null,
          cust.cnpj || null,
          cust.stateRegistration || null,
          cust.isStateRegistrationExempt || false,
          cust.primaryEmail,
          cust.primaryPhone,
          cust.whatsapp || null,
          cust.status,
          cust.customerTier,
          cust.notes || null,
        ]
      );
    }

    // 12. Customer Addresses
    for (const addr of dbStore.customerAddresses.values()) {
      await query(
        `INSERT INTO customer_addresses (id, organization_id, customer_id, type, recipient_name, zip_code, street, number, complement, neighborhood, city, state, country, reference_point, is_default)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         ON CONFLICT (id) DO NOTHING`,
        [
          addr.id,
          addr.organizationId,
          addr.customerId,
          addr.type,
          addr.recipientName,
          addr.zipCode,
          addr.street,
          addr.number,
          addr.complement || null,
          addr.neighborhood,
          addr.city,
          addr.state,
          addr.country || "BRA",
          addr.referencePoint || null,
          addr.isDefault || false,
        ]
      );
    }

    // 13. Customer Contacts
    for (const cont of dbStore.customerContacts.values()) {
      await query(
        `INSERT INTO customer_contacts (id, organization_id, customer_id, label, contact_name, email, phone, is_nfe_recipient)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [
          cont.id,
          cont.organizationId,
          cont.customerId,
          cont.label,
          cont.contactName || null,
          cont.email || null,
          cont.phone || null,
          cont.isNfeRecipient || false,
        ]
      );
    }

    // 14. Orders
    for (const order of dbStore.orders.values()) {
      await query(
        `INSERT INTO orders (id, organization_id, order_number, customer_id, customer_snapshot, channel, status, shipping_address, currency, subtotal_amount, discount_amount, shipping_amount, total_amount, reseller_id, reseller_name, reseller_commission_rate, reseller_commission_amount, warranty_code, idempotency_key)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
         ON CONFLICT (id) DO NOTHING`,
        [
          order.id,
          order.organizationId,
          order.orderNumber,
          order.customerId,
          JSON.stringify(order.customerSnapshot),
          order.channel,
          order.status,
          JSON.stringify(order.shippingAddress),
          order.currency || "BRL",
          order.subtotalAmount,
          order.discountAmount,
          order.shippingAmount,
          order.totalAmount,
          order.resellerId || null,
          order.resellerName || null,
          order.resellerCommissionRate || 0,
          order.resellerCommissionAmount || 0,
          order.warrantyCode || null,
          order.idempotencyKey || null,
        ]
      );
    }

    // 15. Order Items
    for (const item of dbStore.orderItems.values()) {
      await query(
        `INSERT INTO order_items (id, organization_id, order_id, product_id, location_id, product_snapshot, quantity, unit_price, cost_price_snapshot, discount_amount, total_amount, customization_spec)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO NOTHING`,
        [
          item.id,
          item.organizationId,
          item.orderId,
          item.productId,
          item.locationId,
          JSON.stringify(item.productSnapshot),
          item.quantity,
          item.unitPrice,
          item.costPriceSnapshot,
          item.discountAmount,
          item.totalAmount,
          JSON.stringify(item.customizationSpec || null),
        ]
      );
    }

    // 16. Order Payments
    for (const pmt of dbStore.orderPayments.values()) {
      await query(
        `INSERT INTO order_payments (id, organization_id, order_id, payment_method, gateway, gateway_transaction_id, status, amount, installments, pix_qr_code, pix_qr_code_url, pix_copy_paste, pix_expiration, boleto_barcode, boleto_url, paid_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         ON CONFLICT (id) DO NOTHING`,
        [
          pmt.id,
          pmt.organizationId,
          pmt.orderId,
          pmt.paymentMethod,
          pmt.gateway || "MANUAL",
          pmt.gatewayTransactionId || null,
          pmt.status,
          pmt.amount,
          pmt.installments || 1,
          pmt.pixQrCode || null,
          pmt.pixQrCodeUrl || null,
          pmt.pixCopyPaste || null,
          pmt.pixExpiration || null,
          pmt.boletoBarcode || null,
          pmt.boletoUrl || null,
          pmt.paidAt || null,
        ]
      );
    }

    // 17. Order Transitions
    for (const trans of dbStore.orderStateTransitions.values()) {
      await query(
        `INSERT INTO order_state_transitions (id, organization_id, order_id, from_status, to_status, event, operator_id, operator_name, reason, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO NOTHING`,
        [
          trans.id,
          trans.organizationId,
          trans.orderId,
          trans.fromStatus,
          trans.toStatus,
          trans.event,
          trans.operatorId || null,
          trans.operatorName || null,
          trans.reason || null,
          JSON.stringify(trans.metadata || {}),
        ]
      );
    }

    console.log("[PostgreSQL Seeder] Baseline data seeded successfully into PostgreSQL!");
  } catch (error) {
    console.error("[PostgreSQL Seeder Error]", error);
  }
  });
}
