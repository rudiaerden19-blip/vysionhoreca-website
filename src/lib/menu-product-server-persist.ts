import type { SupabaseClient } from '@supabase/supabase-js'
import {
  clampKassaProductImageZoom,
  type MenuProduct,
} from '@/lib/admin-api-menu-product-helpers'

function normalizeProductImageDisplayMode(raw: unknown): MenuProduct['image_display_mode'] {
  if (raw === undefined || raw === null || raw === '') return null
  const s = String(raw).trim().toLowerCase()
  if (s === 'contain') return 'contain'
  if (s === 'cover') return 'cover'
  return null
}

function normalizeMenuProductRow(data: unknown): MenuProduct | null {
  if (data == null) return null
  const row = Array.isArray(data) ? data[0] : data
  if (row == null || typeof row !== 'object') return null
  const d = row as MenuProduct
  return {
    ...d,
    kassa_image_zoom: clampKassaProductImageZoom((d as { kassa_image_zoom?: unknown }).kassa_image_zoom),
    image_display_mode: normalizeProductImageDisplayMode(
      (d as { image_display_mode?: unknown }).image_display_mode,
    ),
  }
}

type PersistOpts = {
  includeZoom: boolean
  includeRetailPackaging: boolean
  includeRetailPromo: boolean
}

function buildMenuProductPayload(product: MenuProduct, opts: PersistOpts): Record<string, unknown> {
  const { is_promo, promo_price, image_display_mode, print_label, kassa_image_zoom, ...baseProduct } = product
  const zoomForDb = kassa_image_zoom === undefined ? undefined : clampKassaProductImageZoom(kassa_image_zoom)
  const {
    retail_sale_unit,
    retail_unit_quantity,
    retail_promo_buy,
    retail_promo_free,
    retail_promo_from,
    retail_promo_until,
    retail_promo_partner_id,
    id: _id,
    ...baseWithoutRetailExtras
  } = baseProduct as MenuProduct

  const core = {
    ...baseWithoutRetailExtras,
    ...(opts.includeRetailPackaging ? { retail_sale_unit, retail_unit_quantity } : {}),
    ...(opts.includeRetailPromo
      ? {
          retail_promo_buy,
          retail_promo_free,
          retail_promo_from,
          retail_promo_until,
          retail_promo_partner_id,
        }
      : {}),
  }

  return {
    ...core,
    ...(is_promo !== undefined && { is_promo }),
    ...(promo_price !== undefined && { promo_price }),
    ...(image_display_mode !== undefined && { image_display_mode }),
    ...(print_label !== undefined && { print_label }),
    ...(opts.includeZoom && zoomForDb !== undefined && { kassa_image_zoom: zoomForDb }),
  }
}

async function runPersist(
  supabase: SupabaseClient,
  product: MenuProduct,
  opts: PersistOpts,
): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  const tenant = product.tenant_slug
  const payload = buildMenuProductPayload(product, opts)
  if (product.id) {
    const { data, error } = await supabase
      .from('menu_products')
      .update(payload)
      .eq('id', product.id)
      .eq('tenant_slug', tenant)
      .select('*')
    if (error) return { ok: false, error: error.message }
    return { ok: true, data }
  }
  const { data, error } = await supabase.from('menu_products').insert(payload).select('*')
  if (error) return { ok: false, error: error.message }
  return { ok: true, data }
}

const isMissingRetailPackagingColumn = (msg: string) => /retail_sale_unit|retail_unit_quantity/i.test(msg)
const isMissingRetailPromoColumn = (msg: string) =>
  /retail_promo_buy|retail_promo_free|retail_promo_from|retail_promo_until|retail_promo_partner_id/i.test(msg)

/** Server-side zelfde fallback-kolommen als client `saveMenuProduct`. */
export async function persistMenuProductOnServer(
  supabase: SupabaseClient,
  product: MenuProduct,
): Promise<{ data: MenuProduct | null; error?: string }> {
  let r = await runPersist(supabase, product, {
    includeZoom: true,
    includeRetailPackaging: true,
    includeRetailPromo: true,
  })
  if (r.ok) {
    return { data: normalizeMenuProductRow(r.data) }
  }

  let err = r.error

  if (isMissingRetailPromoColumn(err)) {
    const wantsPromo =
      product.retail_promo_buy != null ||
      product.retail_promo_free != null ||
      product.retail_promo_from != null ||
      product.retail_promo_until != null ||
      product.retail_promo_partner_id != null
    if (!wantsPromo) {
      const rPromo = await runPersist(supabase, product, {
        includeZoom: true,
        includeRetailPackaging: true,
        includeRetailPromo: false,
      })
      if (rPromo.ok) return { data: normalizeMenuProductRow(rPromo.data) }
      err = rPromo.error
    }
  }

  if (isMissingRetailPackagingColumn(err)) {
    const rRetail = await runPersist(supabase, product, {
      includeZoom: true,
      includeRetailPackaging: false,
      includeRetailPromo: !isMissingRetailPromoColumn(err),
    })
    if (rRetail.ok) return { data: normalizeMenuProductRow(rRetail.data) }
    err = rRetail.error
  }

  if (/kassa_image_zoom/i.test(err)) {
    let r2 = await runPersist(supabase, product, {
      includeZoom: false,
      includeRetailPackaging: true,
      includeRetailPromo: true,
    })
    if (r2.ok) return { data: normalizeMenuProductRow(r2.data) }
    if (isMissingRetailPromoColumn(r2.error)) {
      r2 = await runPersist(supabase, product, {
        includeZoom: false,
        includeRetailPackaging: true,
        includeRetailPromo: false,
      })
      if (r2.ok) return { data: normalizeMenuProductRow(r2.data) }
    }
    err = r2.error
    if (isMissingRetailPackagingColumn(err)) {
      const r3 = await runPersist(supabase, product, {
        includeZoom: false,
        includeRetailPackaging: false,
        includeRetailPromo: false,
      })
      if (r3.ok) return { data: normalizeMenuProductRow(r3.data) }
      return { data: null, error: r3.error }
    }
  }

  return { data: null, error: err }
}

function sortedUniqueIds(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))].sort()
}

/** Synchroniseer optie-koppelingen; sla over als set ongewijzigd (sneller opslaan). */
export async function syncProductOptionLinksOnServer(
  supabase: SupabaseClient,
  tenantSlug: string,
  productId: string,
  optionIds: string[],
): Promise<{ ok: boolean; error?: string }> {
  const { data: prod, error: prodErr } = await supabase
    .from('menu_products')
    .select('id')
    .eq('id', productId)
    .eq('tenant_slug', tenantSlug)
    .maybeSingle()
  if (prodErr) return { ok: false, error: prodErr.message }
  if (!prod) return { ok: false, error: 'Product niet gevonden voor deze zaak' }

  const nextIds = sortedUniqueIds(optionIds)

  const { data: existingRows, error: readErr } = await supabase
    .from('product_option_links')
    .select('option_id')
    .eq('product_id', productId)
    .eq('tenant_slug', tenantSlug)
  if (readErr) return { ok: false, error: readErr.message }

  const existingIds = sortedUniqueIds((existingRows ?? []).map((r) => String(r.option_id)))
  if (
    existingIds.length === nextIds.length &&
    existingIds.every((id, i) => id === nextIds[i])
  ) {
    return { ok: true }
  }

  const { error: delErr } = await supabase
    .from('product_option_links')
    .delete()
    .eq('product_id', productId)
    .eq('tenant_slug', tenantSlug)
  if (delErr) return { ok: false, error: delErr.message }

  if (nextIds.length === 0) return { ok: true }

  const { data: validOpts, error: optErr } = await supabase
    .from('product_options')
    .select('id')
    .eq('tenant_slug', tenantSlug)
    .in('id', nextIds)
  if (optErr) return { ok: false, error: optErr.message }

  const allowed = new Set((validOpts ?? []).map((o) => String(o.id)))
  const rows = nextIds
    .filter((id) => allowed.has(id))
    .map((option_id) => ({
      product_id: productId,
      option_id,
      tenant_slug: tenantSlug,
    }))

  if (rows.length === 0) return { ok: true }

  const { error: insErr } = await supabase.from('product_option_links').insert(rows)
  if (insErr) return { ok: false, error: insErr.message }
  return { ok: true }
}
