import type { SupabaseClient } from '@supabase/supabase-js'
import type { MenuCategory, MenuProduct } from '@/lib/admin-api'

const LAGOON_KITCHEN_SCREEN_SLUG = 'thelagoon'

/** Lagoon bar-keuken: alleen dranken die in cocktail/mocktail-categorieën zitten. */
export function isLagoonKitchenScreenTenant(tenantSlug: string): boolean {
  return String(tenantSlug ?? '').trim().toLowerCase() === LAGOON_KITCHEN_SCREEN_SLUG
}

export function isLagoonKitchenMenuCategoryName(categoryName: string): boolean {
  const n = String(categoryName ?? '').trim().toLowerCase()
  if (!n) return false
  if (n.includes('mocktail')) return true
  if (n.includes('cocktail')) return true
  return false
}

export type LagoonKitchenCategoryContext = {
  categoryNameById: Map<string, string>
  productCategoryByProductId: Map<string, string | null>
}

export async function loadLagoonKitchenCategoryContext(
  client: SupabaseClient,
  tenantSlug: string,
): Promise<LagoonKitchenCategoryContext> {
  const [catRes, prodRes] = await Promise.all([
    client.from('menu_categories').select('id,name').eq('tenant_slug', tenantSlug),
    client.from('menu_products').select('id,category_id').eq('tenant_slug', tenantSlug),
  ])
  const categoryNameById = new Map<string, string>()
  for (const row of catRes.data ?? []) {
    if (row?.id && row.name) categoryNameById.set(String(row.id), String(row.name))
  }
  const productCategoryByProductId = new Map<string, string | null>()
  for (const row of prodRes.data ?? []) {
    if (row?.id) {
      productCategoryByProductId.set(String(row.id), row.category_id ? String(row.category_id) : null)
    }
  }
  return { categoryNameById, productCategoryByProductId }
}

type OrderLineLike = {
  product?: { id?: string; category_id?: string | null; name?: string } | null
  product_id?: string | null
}

function resolveOrderLineCategoryName(
  line: OrderLineLike,
  ctx: LagoonKitchenCategoryContext,
): string | null {
  const fromProduct = line.product?.category_id
  const categoryId =
    fromProduct != null && String(fromProduct).trim() !== ''
      ? String(fromProduct)
      : line.product_id
        ? ctx.productCategoryByProductId.get(String(line.product_id)) ?? null
        : line.product?.id
          ? ctx.productCategoryByProductId.get(String(line.product.id)) ?? null
          : null
  if (!categoryId) return null
  return ctx.categoryNameById.get(categoryId) ?? null
}

export function isLagoonKitchenOrderLine(
  line: unknown,
  ctx: LagoonKitchenCategoryContext,
): boolean {
  const name = resolveOrderLineCategoryName((line ?? {}) as OrderLineLike, ctx)
  return name != null && isLagoonKitchenMenuCategoryName(name)
}

export function filterOrderItemsForLagoonKitchen(
  items: unknown[],
  ctx: LagoonKitchenCategoryContext,
): unknown[] {
  const list = Array.isArray(items) ? items : []
  return list.filter((line) => isLagoonKitchenOrderLine(line, ctx))
}

export function filterLagoonKitchenQueueOrder(
  tenantSlug: string,
  order: Record<string, unknown>,
  ctx: LagoonKitchenCategoryContext | null,
): Record<string, unknown> | null {
  if (!isLagoonKitchenScreenTenant(tenantSlug) || !ctx) return order
  const items = filterOrderItemsForLagoonKitchen(
    Array.isArray(order.items) ? order.items : [],
    ctx,
  )
  if (items.length === 0) return null
  return { ...order, items }
}

export function filterCartLinesForLagoonKitchen<
  T extends { product: Pick<MenuProduct, 'category_id'> },
>(lines: T[], categories: Pick<MenuCategory, 'id' | 'name'>[]): T[] {
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]))
  return lines.filter((line) => {
    const cid = line.product?.category_id
    if (!cid) return false
    const name = categoryNameById.get(cid)
    return name != null && isLagoonKitchenMenuCategoryName(name)
  })
}
