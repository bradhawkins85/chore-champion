import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../config/database.js';

export interface SubscriptionPricingOverride {
  tenantId: string;
  pricePerChildAUD: number;
}

const GLOBAL_PRICING_TENANT_ID = 'global';

export async function getGlobalPricePerChild(): Promise<number | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT price_per_child_aud
     FROM subscription_pricing_settings
     WHERE scope = 'global' AND tenant_id = ?
     LIMIT 1`,
    [GLOBAL_PRICING_TENANT_ID]
  );

  if (rows.length === 0) {
    return null;
  }

  const value = Number(rows[0].price_per_child_aud);
  return Number.isNaN(value) ? null : value;
}

export async function getTenantPricePerChild(tenantId: string): Promise<number | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT price_per_child_aud
     FROM subscription_pricing_settings
     WHERE scope = 'tenant' AND tenant_id = ?
     LIMIT 1`,
    [tenantId]
  );

  if (rows.length === 0) {
    return null;
  }

  const value = Number(rows[0].price_per_child_aud);
  return Number.isNaN(value) ? null : value;
}

export async function getEffectivePricePerChild(
  tenantId: string | null,
  fallbackPrice: number
): Promise<number> {
  if (tenantId) {
    const tenantPrice = await getTenantPricePerChild(tenantId);
    if (tenantPrice !== null) {
      return tenantPrice;
    }
  }

  const globalPrice = await getGlobalPricePerChild();
  if (globalPrice !== null) {
    return globalPrice;
  }

  return fallbackPrice;
}

export async function getPricingOverview(): Promise<{
  globalPricePerChildAUD: number | null;
  tenantOverrides: SubscriptionPricingOverride[];
}> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT scope, tenant_id, price_per_child_aud
     FROM subscription_pricing_settings
     ORDER BY scope, tenant_id`
  );

  let globalPrice: number | null = null;
  const tenantOverrides: SubscriptionPricingOverride[] = [];

  rows.forEach((row) => {
    const value = Number(row.price_per_child_aud);
    const price = Number.isNaN(value) ? null : value;

    if (row.scope === 'global') {
      globalPrice = price;
      return;
    }

    if (row.scope === 'tenant' && row.tenant_id) {
      if (price !== null) {
        tenantOverrides.push({ tenantId: row.tenant_id, pricePerChildAUD: price });
      }
    }
  });

  return {
    globalPricePerChildAUD: globalPrice,
    tenantOverrides,
  };
}

export async function upsertGlobalPricePerChild(pricePerChildAUD: number): Promise<void> {
  await pool.query<ResultSetHeader>(
    `INSERT INTO subscription_pricing_settings (id, scope, tenant_id, price_per_child_aud)
     VALUES (?, 'global', ?, ?)
     ON DUPLICATE KEY UPDATE price_per_child_aud = VALUES(price_per_child_aud), updated_at = CURRENT_TIMESTAMP`,
    [uuidv4(), GLOBAL_PRICING_TENANT_ID, pricePerChildAUD]
  );
}

export async function clearGlobalPricePerChild(): Promise<void> {
  await pool.query<ResultSetHeader>(
    `DELETE FROM subscription_pricing_settings WHERE scope = 'global' AND tenant_id = ?`,
    [GLOBAL_PRICING_TENANT_ID]
  );
}

export async function upsertTenantPricePerChild(tenantId: string, pricePerChildAUD: number): Promise<void> {
  await pool.query<ResultSetHeader>(
    `INSERT INTO subscription_pricing_settings (id, scope, tenant_id, price_per_child_aud)
     VALUES (?, 'tenant', ?, ?)
     ON DUPLICATE KEY UPDATE price_per_child_aud = VALUES(price_per_child_aud), updated_at = CURRENT_TIMESTAMP`,
    [uuidv4(), tenantId, pricePerChildAUD]
  );
}

export async function clearTenantPricePerChild(tenantId: string): Promise<void> {
  await pool.query<ResultSetHeader>(
    `DELETE FROM subscription_pricing_settings WHERE scope = 'tenant' AND tenant_id = ?`,
    [tenantId]
  );
}
