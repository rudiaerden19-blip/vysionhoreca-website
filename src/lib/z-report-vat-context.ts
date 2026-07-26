import type { SupabaseClient } from '@supabase/supabase-js'
import { getMenuCategories, getMenuProducts, getTenantSettings } from '@/lib/admin-api'
import { buildCategoryVatLookup, resolveTenantCountryForVat } from '@/lib/order-vat'

function normalizeProductNameForVat(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

export type ZReportVatContext = {
  categoryById: Map<string, number | null | undefined>
  productCategoryById: Map<string, string | null>
  /** Legacy bonnen zonder product_id: match op productnaam → categorie. */
  productCategoryByNormalizedName: Map<string, string | null>
  /** NL: geen BTW-split ter plaatse vs afhalen op kassa/Z-rapport. */
  tenantCountry?: string | null
}

export function buildZReportVatContext(
  categories: ReadonlyArray<{ id?: string | null; default_btw_percentage?: number | null }>,
  products: ReadonlyArray<{ id?: string | null; category_id?: string | null; name?: string | null }>,
  tenantCountry?: string | null,
  tenantBtwNumber?: string | null,
): ZReportVatContext {
  const productCategoryByNormalizedName = new Map<string, string | null>()
  for (const p of products) {
    if (!p.name || !String(p.name).trim()) continue
    const key = normalizeProductNameForVat(String(p.name))
    if (!productCategoryByNormalizedName.has(key)) {
      productCategoryByNormalizedName.set(key, p.category_id ? String(p.category_id) : null)
    }
  }

  return {
    categoryById: buildCategoryVatLookup(
      categories as Parameters<typeof buildCategoryVatLookup>[0],
    ),
    productCategoryById: new Map(
      products
        .filter((p) => p.id)
        .map((p) => [String(p.id), p.category_id ? String(p.category_id) : null]),
    ),
    productCategoryByNormalizedName,
    tenantCountry: resolveTenantCountryForVat(tenantCountry, tenantBtwNumber),
  }
}

/** Client-side (admin Z-rapport pagina). */
export async function fetchZReportVatContextForTenant(tenantSlug: string): Promise<ZReportVatContext> {
  const [categories, products, settings] = await Promise.all([
    getMenuCategories(tenantSlug),
    getMenuProducts(tenantSlug),
    getTenantSettings(tenantSlug),
  ])
  return buildZReportVatContext(categories, products, settings?.country, settings?.btw_number)
}

/** Server-side (kassa sync, webhooks). */
export async function fetchZReportVatContextFromSupabase(
  client: SupabaseClient,
  tenantSlug: string,
): Promise<ZReportVatContext> {
  const [{ data: categories }, { data: products }, { data: settings }] = await Promise.all([
    client
      .from('menu_categories')
      .select('id, default_btw_percentage')
      .eq('tenant_slug', tenantSlug),
    client.from('menu_products').select('id, category_id, name').eq('tenant_slug', tenantSlug),
    client.from('tenant_settings').select('country, btw_number').eq('tenant_slug', tenantSlug).maybeSingle(),
  ])
  return buildZReportVatContext(
    categories ?? [],
    products ?? [],
    settings?.country,
    settings?.btw_number,
  )
}
