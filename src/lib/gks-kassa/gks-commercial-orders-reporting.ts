import type { SupabaseClient } from '@supabase/supabase-js'
import { isKassaPosOrder } from '@/lib/admin-api-order-helpers'
import { isGksZReportPilotTenant } from '@/lib/gks-kassa/pilot-config'

const GKS_PAGE_SIZE = 1000
const GKS_MAX_PAGES = 500

const STATUS_EXCLUDE = '("cancelled","rejected","CANCELLED","REJECTED")' as const

/** Zelfde velden als `orders` voor dashboard / Z / analyse / rapporten. */
export function mapGksCommercialRowToReportOrder(
  row: Record<string, unknown>,
): Record<string, unknown> {
  return {
    id: row.id,
    tenant_slug: row.tenant_slug,
    order_number: row.order_number,
    customer_name: row.customer_name ?? null,
    customer_email: null,
    status: row.status ?? 'confirmed',
    payment_status: row.payment_status ?? 'paid',
    payment_method: row.payment_method,
    payment_split_cash: row.payment_split_cash,
    payment_split_card: row.payment_split_card,
    order_type: row.order_type ?? 'DINE_IN',
    subtotal: row.subtotal,
    tax: row.tax,
    discount_amount: 0,
    total: row.total,
    items: row.items ?? [],
    created_at: row.created_at,
    table_number: row.table_number,
    floor_plan_zone: row.floor_plan_zone,
    kassa_staff_id: row.kassa_staff_id,
    _gks_commercial_reporting: true,
  }
}

function projectSelectColumns(
  row: Record<string, unknown>,
  selectColumns: string,
): Record<string, unknown> {
  const trimmed = selectColumns.trim()
  if (trimmed === '*') return row
  const out: Record<string, unknown> = {}
  for (const key of trimmed.split(',').map((s) => s.trim()).filter(Boolean)) {
    if (key in row) out[key] = row[key]
  }
  return out
}

export async function fetchGksCommercialOrdersInCreatedAtRange(
  client: SupabaseClient,
  tenantSlug: string,
  startUTC: string,
  endUTC: string,
  selectColumns: string,
): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = []
  let from = 0
  for (let page = 0; page < GKS_MAX_PAGES; page++) {
    const { data, error } = await client
      .from('gks_commercial_orders')
      .select('*')
      .eq('tenant_slug', tenantSlug)
      .gte('created_at', startUTC)
      .lte('created_at', endUTC)
      .not('status', 'in', STATUS_EXCLUDE)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + GKS_PAGE_SIZE - 1)

    if (error) {
      console.error('fetchGksCommercialOrdersInCreatedAtRange:', error)
      break
    }
    const chunk = (data || []) as Record<string, unknown>[]
    for (const raw of chunk) {
      const mapped = mapGksCommercialRowToReportOrder(raw)
      all.push(projectSelectColumns(mapped, selectColumns))
    }
    if (chunk.length < GKS_PAGE_SIZE) break
    from += GKS_PAGE_SIZE
  }
  return all
}

export async function fetchAllGksCommercialOrdersNewestFirst(
  client: SupabaseClient,
  tenantSlug: string,
  selectColumns: string,
): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = []
  let from = 0
  for (let page = 0; page < GKS_MAX_PAGES; page++) {
    const { data, error } = await client
      .from('gks_commercial_orders')
      .select('*')
      .eq('tenant_slug', tenantSlug)
      .not('status', 'in', STATUS_EXCLUDE)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(from, from + GKS_PAGE_SIZE - 1)

    if (error) {
      console.error('fetchAllGksCommercialOrdersNewestFirst:', error)
      break
    }
    const chunk = (data || []) as Record<string, unknown>[]
    for (const raw of chunk) {
      const mapped = mapGksCommercialRowToReportOrder(raw)
      all.push(projectSelectColumns(mapped, selectColumns))
    }
    if (chunk.length < GKS_PAGE_SIZE) break
    from += GKS_PAGE_SIZE
  }
  return all
}

/** Pilot: POS-omzet uit GKS-tabel; webshop/online blijft uit productie `orders`. */
export function mergePilotReportingOrderRows(
  tenantSlug: string,
  productionRows: Record<string, unknown>[],
  gksRows: Record<string, unknown>[],
  sort: 'asc' | 'desc',
): Record<string, unknown>[] {
  if (!isGksZReportPilotTenant(tenantSlug)) return productionRows
  const nonKassaProduction = productionRows.filter(
    (o) => !isKassaPosOrder({ order_type: String(o.order_type ?? '') }),
  )
  const merged = [...nonKassaProduction, ...gksRows]
  merged.sort((a, b) => {
    const ta = String(a.created_at ?? '')
    const tb = String(b.created_at ?? '')
    const cmp = ta.localeCompare(tb)
    if (cmp !== 0) return sort === 'asc' ? cmp : -cmp
    const ia = String(a.id ?? '')
    const ib = String(b.id ?? '')
    return sort === 'asc' ? ia.localeCompare(ib) : ib.localeCompare(ia)
  })
  return merged
}
