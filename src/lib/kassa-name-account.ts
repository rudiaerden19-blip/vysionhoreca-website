import type { KassaCartItem, KassaRegisterOrderType } from '@/lib/kassa-cart-types'
import type { FloorPlanZone } from '@/lib/kassa-floor-plan-zone'
import { mergeCartLinesForTable } from '@/lib/kassa-table-cart-merge'
import { onAccountCustomerKey, normalizeOnAccountCustomerName } from '@/lib/kassa-on-account'

/** Regel op tab met openstaand bedrag incl. BTW (≤ regeltotaal). */
export type KassaNameTabLine = KassaCartItem & { unpaidIncl: number }

export type KassaNameTabRow = {
  id: string
  tenant_slug: string
  customer_name: string
  customer_key: string
  items: KassaNameTabLine[]
  updated_at?: string
  /** BTW-context van laatste mand op tab (kassa orderType bij «op rekening»). */
  order_type?: KassaRegisterOrderType | string | null
  table_number?: string | number | null
  floor_plan_zone?: FloorPlanZone | string | null
}

export function resolveNameTabOrderContext(tab: KassaNameTabRow): {
  orderType: KassaRegisterOrderType
  tableNumber: string
  floorPlanZone?: FloorPlanZone
} {
  const raw = (tab.order_type || 'DINE_IN').toString().toUpperCase()
  const orderType: KassaRegisterOrderType =
    raw === 'TAKEAWAY' || raw === 'DELIVERY' ? raw : 'DINE_IN'
  const tableNumber = String(tab.table_number ?? '').trim()
  const zoneRaw = tab.floor_plan_zone
  const floorPlanZone =
    zoneRaw === 'terrace' || zoneRaw === 'inside' ? (zoneRaw as FloorPlanZone) : undefined
  return { orderType, tableNumber, floorPlanZone }
}

/** Bruto incl. BTW uit toegewezen orderregels (controle allocation ↔ order). */
export function orderLinesGrossIncl(lines: KassaCartItem[]): number {
  return Math.round(lines.reduce((s, l) => s + kassaCartLineTotalIncl(l), 0) * 100) / 100
}

export function kassaCartLineUnitIncl(line: KassaCartItem): number {
  const extras = (line.choices ?? []).reduce((s, c) => s + (Number(c.price) || 0), 0)
  const base = Number(line.product?.price) || 0
  return Math.round((base + extras) * 100) / 100
}

export function kassaCartLineTotalIncl(line: KassaCartItem): number {
  const q = Number(line.quantity) || 1
  return Math.round(kassaCartLineUnitIncl(line) * q * 100) / 100
}

export function cartLinesToTabLines(cart: KassaCartItem[]): KassaNameTabLine[] {
  return cart.map((line) => ({
    ...line,
    product: { ...line.product },
    choices: line.choices?.map((c) => ({ ...c })),
    unpaidIncl: kassaCartLineTotalIncl(line),
  }))
}

export function mergeIntoTabLines(existing: KassaNameTabLine[], cartRound: KassaCartItem[]): KassaNameTabLine[] {
  const merged = mergeCartLinesForTable(
    existing.map(({ unpaidIncl: _u, ...rest }) => rest),
    cartRound,
  )
  const unpaidByKey = new Map<string, number>()
  for (const line of existing) {
    if (!line.cartKey) continue
    unpaidByKey.set(line.cartKey, (unpaidByKey.get(line.cartKey) ?? 0) + line.unpaidIncl)
  }
  for (const line of cartRound) {
    if (!line.cartKey) continue
    const add = kassaCartLineTotalIncl(line)
    unpaidByKey.set(line.cartKey, (unpaidByKey.get(line.cartKey) ?? 0) + add)
  }
  return merged.map((line) => ({
    ...line,
    unpaidIncl: Math.round((unpaidByKey.get(line.cartKey) ?? kassaCartLineTotalIncl(line)) * 100) / 100,
  }))
}

/** Openstaand per regel (fallback als unpaidIncl ontbreekt in JSON). */
export function effectiveLineUnpaidIncl(line: KassaNameTabLine): number {
  const lineTotal = kassaCartLineTotalIncl(line)
  const raw = line.unpaidIncl
  if (!Number.isFinite(raw) || raw <= 0) return lineTotal
  return Math.min(Math.round(raw * 100) / 100, lineTotal)
}

export function normalizeNameTabLines(lines: KassaNameTabLine[]): KassaNameTabLine[] {
  return lines
    .map((line) => ({
      ...line,
      unpaidIncl: effectiveLineUnpaidIncl(line),
    }))
    .filter((l) => l.unpaidIncl > 0.001)
}

export function tabOpenTotalIncl(lines: KassaNameTabLine[]): number {
  return Math.round(lines.reduce((s, l) => s + effectiveLineUnpaidIncl(l), 0) * 100) / 100
}

export type NameTabPaymentAllocation = {
  orderLines: KassaCartItem[]
  nextTabLines: KassaNameTabLine[]
  appliedIncl: number
}

/** FIFO incl. BTW; deelregels mogelijk (qty verlaagd of deellijn). */
export function allocateNameTabPayment(
  lines: KassaNameTabLine[],
  paymentIncl: number,
): NameTabPaymentAllocation {
  const normalized = normalizeNameTabLines(lines)
  const openCents = Math.round(tabOpenTotalIncl(normalized) * 100)
  const paymentCents = Math.round(Math.max(0, paymentIncl) * 100)

  if (openCents <= 0 || paymentCents <= 0) {
    return { orderLines: [], nextTabLines: normalized, appliedIncl: 0 }
  }

  /** Volledige afrekening: open bedrag in UI = tab leeg (geen cent-resten door qty/unpaid mismatch). */
  if (paymentCents >= openCents) {
    const orderLines = normalized.map((line) => cloneCartLineForOrder(line, line.quantity))
    return { orderLines, nextTabLines: [], appliedIncl: openCents / 100 }
  }

  let remainingCents = paymentCents
  const orderLines: KassaCartItem[] = []
  const nextTabLines: KassaNameTabLine[] = []

  for (const line of normalized) {
    if (remainingCents <= 0) {
      if (effectiveLineUnpaidIncl(line) > 0.001) nextTabLines.push({ ...line })
      continue
    }
    const unpaidCents = Math.round(effectiveLineUnpaidIncl(line) * 100)
    if (unpaidCents <= 0) continue

    const unitCents = Math.round(kassaCartLineUnitIncl(line) * 100)
    if (unitCents <= 0) continue

    if (remainingCents >= unpaidCents) {
      orderLines.push(cloneCartLineForOrder(line, line.quantity))
      remainingCents -= unpaidCents
      continue
    }

    const spendCents = remainingCents
    const { orderParts, nextLine, spentCents } = allocatePartialLinePayment(line, spendCents)
    orderLines.push(...orderParts)
    remainingCents -= spentCents
    if (nextLine) nextTabLines.push(nextLine)
  }

  const appliedIncl = Math.round((paymentCents - remainingCents)) / 100
  const cleanedNext = normalizeNameTabLines(nextTabLines)
  return { orderLines, nextTabLines: cleanedNext, appliedIncl }
}

/** Deelbetaling op één tabregel — besteed exact `budgetCents` (≤ open op regel). */
function allocatePartialLinePayment(
  line: KassaNameTabLine,
  budgetCents: number,
): { orderParts: KassaCartItem[]; nextLine: KassaNameTabLine | null; spentCents: number } {
  const unpaidCents = Math.round(effectiveLineUnpaidIncl(line) * 100)
  if (budgetCents <= 0 || unpaidCents <= 0) {
    return { orderParts: [], nextLine: line, spentCents: 0 }
  }

  const unitCents = Math.round(kassaCartLineUnitIncl(line) * 100)
  if (unitCents <= 0) {
    return { orderParts: [], nextLine: line, spentCents: 0 }
  }

  const spendCents = Math.min(budgetCents, unpaidCents)
  const orderParts: KassaCartItem[] = []
  let remainSpend = spendCents
  const fullQty = Math.max(1, line.quantity)

  if (remainSpend < unitCents) {
    orderParts.push(lineWithGrossTotal(line, remainSpend / 100))
    remainSpend = 0
  } else {
    const takeQty = Math.min(fullQty, Math.floor(remainSpend / unitCents))
    if (takeQty > 0) {
      orderParts.push(cloneCartLineForOrder(line, takeQty))
      remainSpend -= takeQty * unitCents
    }
    if (remainSpend > 0) {
      orderParts.push(lineWithGrossTotal(line, remainSpend / 100))
      remainSpend = 0
    }
  }

  const leftUnpaidCents = unpaidCents - spendCents
  if (leftUnpaidCents <= 0) {
    return { orderParts, nextLine: null, spentCents: spendCents }
  }

  const nextLine: KassaNameTabLine = {
    ...line,
    quantity: Math.max(1, fullQty - orderParts.reduce((s, p) => s + (p.quantity || 0), 0)),
    unpaidIncl: Math.round(leftUnpaidCents) / 100,
  }

  return { orderParts, nextLine, spentCents: spendCents }
}

function cloneCartLineForOrder(line: KassaCartItem, quantity: number): KassaCartItem {
  return {
    ...line,
    product: { ...line.product },
    quantity,
    choices: line.choices?.map((c) => ({ ...c })),
  }
}

/** Eén regel waarvan het regeltotaal incl. BTW exact `grossIncl` is (deelbetaling). */
function lineWithGrossTotal(line: KassaCartItem, grossIncl: number): KassaCartItem {
  const extras = (line.choices ?? []).reduce((s, c) => s + c.price, 0)
  const base = Math.round((grossIncl - extras) * 100) / 100
  return {
    ...line,
    product: { ...line.product, price: Math.max(0, base) },
    quantity: 1,
    choices: line.choices?.map((c) => ({ ...c })),
  }
}

export function summarizeOpenNameTabs(rows: KassaNameTabRow[]): { name: string; remaining: number; id: string }[] {
  return rows
    .map((r) => ({
      id: r.id,
      name: normalizeOnAccountCustomerName(r.customer_name),
      remaining: tabOpenTotalIncl(Array.isArray(r.items) ? r.items : []),
    }))
    .filter((x) => x.name && x.remaining > 0.001)
    .sort((a, b) => a.name.localeCompare(b.name, 'nl'))
}

export function nameTabCustomerKey(name: string): string {
  return onAccountCustomerKey(name)
}

/** Supabase zonder order_type-kolommen (oude migratie) — fallback op items-only. */
export function isNameTabContextColumnError(error?: string | null): boolean {
  if (!error) return false
  return /order_type|floor_plan_zone|table_number|column .* does not exist|schema cache/i.test(error)
}

export function nameTabItemsOnlyPayload(items: KassaNameTabLine[], updatedAt: string): Record<string, unknown> {
  return { items, updated_at: updatedAt }
}

export function nameTabFullSavePayload(
  items: KassaNameTabLine[],
  ctx: ReturnType<typeof resolveNameTabOrderContext>,
  updatedAt: string,
  displayName: string,
  key: string,
  tenant: string,
): Record<string, unknown> {
  return {
    tenant_slug: tenant,
    customer_name: displayName,
    customer_key: key,
    items,
    order_type: ctx.orderType,
    table_number: ctx.orderType === 'DINE_IN' && ctx.tableNumber ? ctx.tableNumber : null,
    floor_plan_zone: ctx.orderType === 'DINE_IN' && ctx.floorPlanZone ? ctx.floorPlanZone : null,
    updated_at: updatedAt,
  }
}
