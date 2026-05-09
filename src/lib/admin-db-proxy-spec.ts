/**
 * Whitelist + per-tabel-policy voor de admin-DB-proxy (`/api/admin/db`).
 *
 * Iedere INSERT/UPDATE/UPSERT/DELETE die admin-pagina's willen doen MOET
 * hier expliciet vermeld zijn. Zonder vermelding → 403.
 *
 *  · `tenantSlugColumn` zegt welk veld de proxy MOET checken (bv. 'tenant_slug').
 *    Komt het niet voor in de payload of klopt het niet met `verifyTenantAccess`,
 *    dan wijst de proxy af.
 *  · `allowedOps`: welke operaties (insert/update/upsert/delete) zijn toegestaan.
 *  · `forbiddenColumns`: kolommen die NOOIT vanuit de browser geschreven mogen
 *    worden (bv. id, created_at, password_hash, …).
 *
 *  Houd deze lijst klein, expliciet en review-baar.
 */

export type AdminDbOp = 'insert' | 'update' | 'upsert' | 'delete'

export interface AdminDbTableSpec {
  /** Naam van de kolom die de tenant identificeert. Dit veld moet in alle
   *  WHERE-clauses én alle nieuwe rijen aanwezig zijn én moet matchen
   *  met de geverifieerde sessie. Sommige tabellen gebruiken een ander
   *  veld dan `tenant_slug` (bv. `qr_codes` heeft slug + business_id). */
  tenantSlugColumn: string
  /** Welke ops mogen via de proxy. */
  allowedOps: AdminDbOp[]
  /** Kolommen die NOOIT vanuit client geschreven mogen worden (server-only). */
  forbiddenColumns?: readonly string[]
  /** Optioneel: maximaal aantal rows in 1 call (bv. om bulk-misbruik te beperken). */
  maxRows?: number
}

/**
 * Whitelist. Tabellen die hier NIET in staan kunnen niet via /api/admin/db
 * worden gemuteerd. Voeg ze pas toe na security-review.
 */
export const ADMIN_DB_TABLES: Record<string, AdminDbTableSpec> = {
  // --- Menu ---
  menu_categories: {
    tenantSlugColumn: 'tenant_slug',
    allowedOps: ['insert', 'update', 'upsert', 'delete'],
    forbiddenColumns: ['id', 'created_at'],
    maxRows: 200,
  },
  menu_products: {
    tenantSlugColumn: 'tenant_slug',
    allowedOps: ['insert', 'update', 'upsert', 'delete'],
    forbiddenColumns: ['id', 'created_at'],
    maxRows: 1000,
  },
  product_options: {
    tenantSlugColumn: 'tenant_slug',
    allowedOps: ['insert', 'update', 'upsert', 'delete'],
    forbiddenColumns: ['id', 'created_at'],
    maxRows: 500,
  },
  product_option_choices: {
    tenantSlugColumn: 'tenant_slug',
    allowedOps: ['insert', 'update', 'upsert', 'delete'],
    forbiddenColumns: ['id', 'created_at'],
    maxRows: 1000,
  },
  product_option_links: {
    tenantSlugColumn: 'tenant_slug',
    allowedOps: ['insert', 'update', 'upsert', 'delete'],
    forbiddenColumns: ['id'],
    maxRows: 5000,
  },

  // --- Settings ---
  tenant_settings: {
    tenantSlugColumn: 'tenant_slug',
    allowedOps: ['insert', 'update', 'upsert'],
    forbiddenColumns: ['id', 'created_at'],
    maxRows: 1,
  },
  delivery_settings: {
    tenantSlugColumn: 'tenant_slug',
    allowedOps: ['insert', 'update', 'upsert'],
    forbiddenColumns: ['id', 'created_at'],
    maxRows: 1,
  },
  opening_hours: {
    tenantSlugColumn: 'tenant_slug',
    allowedOps: ['insert', 'update', 'upsert', 'delete'],
    forbiddenColumns: ['id', 'created_at'],
    maxRows: 50,
  },
  exceptional_closings: {
    tenantSlugColumn: 'tenant_slug',
    allowedOps: ['insert', 'update', 'delete'],
    forbiddenColumns: ['id', 'created_at'],
    maxRows: 200,
  },
  reservation_settings: {
    tenantSlugColumn: 'tenant_slug',
    allowedOps: ['insert', 'update', 'upsert'],
    forbiddenColumns: ['id', 'created_at'],
    maxRows: 1,
  },
  tenant_texts: {
    tenantSlugColumn: 'tenant_slug',
    allowedOps: ['insert', 'update', 'upsert', 'delete'],
    forbiddenColumns: ['id', 'created_at'],
    maxRows: 200,
  },
  tenant_media: {
    tenantSlugColumn: 'tenant_slug',
    allowedOps: ['insert', 'delete'],
    forbiddenColumns: ['id', 'created_at'],
    maxRows: 50,
  },

  // --- Orders / Reservations / Reviews (admin updates) ---
  orders: {
    tenantSlugColumn: 'tenant_slug',
    // INSERT gaat via klantpaden (RLS allow). DELETE alleen voor kassa-flow
    // (open-order overschrijven). UPDATE voor admin-correcties.
    allowedOps: ['update', 'delete'],
    forbiddenColumns: ['id', 'created_at', 'tenant_slug'],
    maxRows: 50,
  },
  order_items: {
    tenantSlugColumn: 'tenant_slug',
    allowedOps: ['update'],
    forbiddenColumns: ['id', 'created_at'],
    maxRows: 100,
  },
  reservations: {
    tenantSlugColumn: 'tenant_slug',
    allowedOps: ['update', 'delete'],
    forbiddenColumns: ['id', 'created_at'],
    maxRows: 50,
  },
  reviews: {
    tenantSlugColumn: 'tenant_slug',
    allowedOps: ['update', 'delete'],
    forbiddenColumns: ['id', 'created_at'],
    maxRows: 1,
  },

  // --- Personeel / uren ---
  staff: {
    tenantSlugColumn: 'tenant_slug',
    allowedOps: ['insert', 'update', 'upsert', 'delete'],
    forbiddenColumns: ['id', 'created_at'],
    maxRows: 100,
  },
  timesheet_entries: {
    tenantSlugColumn: 'tenant_slug',
    allowedOps: ['insert', 'update', 'upsert', 'delete'],
    forbiddenColumns: ['id', 'created_at'],
    maxRows: 200,
  },
  monthly_timesheets: {
    tenantSlugColumn: 'tenant_slug',
    allowedOps: ['insert', 'update', 'upsert', 'delete'],
    forbiddenColumns: ['id', 'created_at'],
    maxRows: 100,
  },

  // --- Promo / Loyalty / Gift cards ---
  promotions: {
    tenantSlugColumn: 'tenant_slug',
    allowedOps: ['insert', 'update', 'upsert', 'delete'],
    forbiddenColumns: ['id', 'created_at'],
    maxRows: 100,
  },
  gift_cards: {
    tenantSlugColumn: 'tenant_slug',
    allowedOps: ['insert', 'update', 'delete'],
    forbiddenColumns: ['id', 'created_at'],
    maxRows: 100,
  },
  loyalty_rewards: {
    tenantSlugColumn: 'tenant_slug',
    allowedOps: ['insert', 'update', 'upsert', 'delete'],
    forbiddenColumns: ['id', 'created_at'],
    maxRows: 100,
  },
  loyalty_redemptions: {
    tenantSlugColumn: 'tenant_slug',
    allowedOps: ['update', 'delete'],   // INSERT via klantpad
    forbiddenColumns: ['id', 'created_at'],
    maxRows: 1,
  },

  // --- Klanten ---
  shop_customers: {
    tenantSlugColumn: 'tenant_slug',
    allowedOps: ['update', 'delete'],   // INSERT via klantpad (registratie)
    forbiddenColumns: ['id', 'created_at'],
    maxRows: 1,
  },
  guest_profiles: {
    tenantSlugColumn: 'tenant_slug',
    allowedOps: ['insert', 'update', 'upsert', 'delete'],
    forbiddenColumns: ['id', 'created_at'],
    maxRows: 200,
  },

  // --- Marketing ---
  marketing_campaigns: {
    tenantSlugColumn: 'tenant_slug',
    allowedOps: ['insert', 'update', 'upsert', 'delete'],
    forbiddenColumns: ['id', 'created_at'],
    maxRows: 50,
  },

  // --- QR / Team / Media-meta ---
  qr_codes: {
    tenantSlugColumn: 'tenant_slug',
    allowedOps: ['insert', 'update', 'upsert', 'delete'],
    forbiddenColumns: ['id', 'created_at'],
    maxRows: 200,
  },
  team_members: {
    tenantSlugColumn: 'tenant_slug',
    allowedOps: ['insert', 'update', 'upsert', 'delete'],
    forbiddenColumns: ['id', 'created_at'],
    maxRows: 100,
  },

  // --- Kosten / kasboek ---
  fixed_costs: {
    tenantSlugColumn: 'tenant_slug',
    allowedOps: ['insert', 'update', 'upsert', 'delete'],
    forbiddenColumns: ['id', 'created_at'],
    maxRows: 200,
  },
  variable_costs: {
    tenantSlugColumn: 'tenant_slug',
    allowedOps: ['insert', 'update', 'upsert', 'delete'],
    forbiddenColumns: ['id', 'created_at'],
    maxRows: 500,
  },
  cost_categories: {
    tenantSlugColumn: 'tenant_slug',
    allowedOps: ['insert', 'update', 'upsert', 'delete'],
    forbiddenColumns: ['id', 'created_at'],
    maxRows: 100,
  },
  ingredients: {
    tenantSlugColumn: 'tenant_slug',
    allowedOps: ['insert', 'update', 'upsert', 'delete'],
    forbiddenColumns: ['id', 'created_at'],
    maxRows: 1000,
  },
  product_ingredients: {
    tenantSlugColumn: 'tenant_slug',
    allowedOps: ['insert', 'update', 'upsert', 'delete'],
    forbiddenColumns: ['id', 'created_at'],
    maxRows: 5000,
  },
  supplier_products: {
    tenantSlugColumn: 'tenant_slug',
    allowedOps: ['insert', 'update', 'upsert', 'delete'],
    forbiddenColumns: ['id', 'created_at'],
    maxRows: 500,
  },
  invoice_scans: {
    tenantSlugColumn: 'tenant_slug',
    allowedOps: ['insert', 'update', 'delete'],
    forbiddenColumns: ['id', 'created_at'],
    maxRows: 50,
  },
  invoice_scan_items: {
    tenantSlugColumn: 'tenant_slug',
    allowedOps: ['insert', 'update', 'delete'],
    forbiddenColumns: ['id', 'created_at'],
    maxRows: 200,
  },
  business_targets: {
    tenantSlugColumn: 'tenant_slug',
    allowedOps: ['insert', 'update', 'upsert', 'delete'],
    forbiddenColumns: ['id', 'created_at'],
    maxRows: 50,
  },
  tenant_kasboek_manual_lines: {
    tenantSlugColumn: 'tenant_slug',
    allowedOps: ['insert', 'update', 'delete'],
    forbiddenColumns: ['id', 'created_at'],
    maxRows: 100,
  },

  // --- Z-rapport (handmatige correctie alleen) ---
  z_reports: {
    tenantSlugColumn: 'tenant_slug',
    allowedOps: ['insert', 'update', 'upsert', 'delete'],
    forbiddenColumns: ['id', 'created_at'],
    maxRows: 5,
  },
  daily_sales: {
    tenantSlugColumn: 'tenant_slug',
    allowedOps: ['insert', 'update', 'upsert', 'delete'],
    forbiddenColumns: ['id', 'created_at'],
    maxRows: 100,
  },

  // --- Floor plan ---
  floor_plan_tables: {
    tenantSlugColumn: 'tenant_slug',
    allowedOps: ['insert', 'update', 'upsert', 'delete'],
    forbiddenColumns: ['id', 'created_at'],
    maxRows: 200,
  },
  floor_plan_decor: {
    tenantSlugColumn: 'tenant_slug',
    allowedOps: ['insert', 'update', 'upsert', 'delete'],
    forbiddenColumns: ['id', 'created_at'],
    maxRows: 200,
  },
} as const

export function getTableSpec(table: string): AdminDbTableSpec | null {
  return Object.prototype.hasOwnProperty.call(ADMIN_DB_TABLES, table)
    ? ADMIN_DB_TABLES[table]
    : null
}
