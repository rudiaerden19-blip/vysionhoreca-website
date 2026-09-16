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
  const capped = Math.round(raw * 100) / 100
  /** Tab-snapshot zonder prijs maar wél unpaid (Supabase JSON) — vertrouw unpaid. */
  if (lineTotal <= 0.001) return capped
  return Math.min(capped, lineTotal)
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

  let remainingCents = Math.min(paymentCents, openCents)
  const orderLines: KassaCartItem[] = []
  const nextTabLines: KassaNameTabLine[] = []

  for (const line of normalized) {
    if (remainingCents <= 0) {
      if (effectiveLineUnpaidIncl(line) > 0.001) nextTabLines.push({ ...line })
      continue
    }
    const unpaidCents = Math.round(effectiveLineUnpaidIncl(line) * 100)
    if (unpaidCents <= 0) continue

    const spendCents = Math.min(remainingCents, unpaidCents)
    const { orderParts, nextLine, spentCents } = applyOpenAmountToLine(line, spendCents)
    orderLines.push(...orderParts)
    remainingCents -= spentCents
    if (nextLine) nextTabLines.push(nextLine)
  }

  if (remainingCents > 0 && paymentCents < openCents) {
    const donor =
      nextTabLines.find((l) => effectiveLineUnpaidIncl(l) > 0.001) ??
      normalized.find((l) => effectiveLineUnpaidIncl(l) > 0.001)
    if (donor) {
      const spendCents = Math.min(
        remainingCents,
        Math.round(effectiveLineUnpaidIncl(donor) * 100),
      )
      if (spendCents > 0) {
        orderLines.push(lineWithGrossTotal(donor, spendCents / 100))
        remainingCents -= spendCents
      }
    }
  }

  const appliedIncl = orderLinesGrossIncl(orderLines)
  const cleanedNext = normalizeNameTabLines(nextTabLines)
  return { orderLines, nextTabLines: cleanedNext, appliedIncl }
}

/** Besteed `budgetCents` op één tabregel; order-bruto = besteed bedrag. */
function applyOpenAmountToLine(
  line: KassaNameTabLine,
  budgetCents: number,
): { orderParts: KassaCartItem[]; nextLine: KassaNameTabLine | null; spentCents: number } {
  const unpaidCents = Math.round(effectiveLineUnpaidIncl(line) * 100)
  const spendCents = Math.min(Math.max(0, budgetCents), unpaidCents)
  if (spendCents <= 0) {
    return { orderParts: [], nextLine: line, spentCents: 0 }
  }

  const unitCents = Math.round(kassaCartLineUnitIncl(line) * 100)
  const lineTotalCents = Math.round(kassaCartLineTotalIncl(line) * 100)
  if (unitCents <= 0 || lineTotalCents <= 0) {
    const orderParts = [lineWithGrossTotal(line, spendCents / 100)]
    const leftCents = unpaidCents - spendCents
    const nextLine =
      leftCents > 0 ? { ...line, unpaidIncl: Math.round(leftCents) / 100 } : null
    return { orderParts, nextLine, spentCents: spendCents }
  }

  if (spendCents >= unpaidCents) {
    const cloned = cloneCartLineForOrder(line, line.quantity)
    const clonedCents = Math.round(kassaCartLineTotalIncl(cloned) * 100)
    if (Math.abs(clonedCents - spendCents) <= 1) {
      return { orderParts: [cloned], nextLine: null, spentCents: spendCents }
    }
  }

  return allocatePartialLinePayment(line, spendCents)
}

/** Tab na betaling: open saldo verlagen (FIFO op unpaid, onafhankelijk van order-regels). */
export function reduceNameTabLinesAfterPayment(
  lines: KassaNameTabLine[],
  paidIncl: number,
): KassaNameTabLine[] {
  const normalized = normalizeNameTabLines(lines)
  let remainingCents = Math.round(Math.max(0, paidIncl) * 100)
  if (remainingCents <= 0) return normalized

  const next: KassaNameTabLine[] = []
  for (const line of normalized) {
    if (remainingCents <= 0) {
      next.push({ ...line })
      continue
    }
    const unpaidCents = Math.round(effectiveLineUnpaidIncl(line) * 100)
    if (unpaidCents <= 0) continue
    const take = Math.min(remainingCents, unpaidCents)
    remainingCents -= take
    const leftCents = unpaidCents - take
    if (leftCents > 0) {
      next.push({ ...line, unpaidIncl: Math.round(leftCents) / 100 })
    }
  }
  return normalizeNameTabLines(next)
}

/** Eén orderregel met exact betaald bedrag (fallback bij stale menu-snapshot op tab). */
export function nameTabPaymentOrderLineForAmount(
  lines: KassaNameTabLine[],
  paidIncl: number,
): KassaCartItem | null {
  const normalized = normalizeNameTabLines(lines)
  if (!normalized.length || paidIncl <= 0) return null
  return lineWithGrossTotal(normalized[0], paidIncl)
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
  const spendCents = Math.min(budgetCents, unpaidCents)
  if (unitCents <= 0) {
    if (spendCents <= 0) return { orderParts: [], nextLine: line, spentCents: 0 }
    const orderParts = [lineWithGrossTotal(line, spendCents / 100)]
    const leftCents = unpaidCents - spendCents
    const nextLine =
      leftCents > 0 ? { ...line, unpaidIncl: Math.round(leftCents) / 100 } : null
    return { orderParts, nextLine, spentCents: spendCents }
  }

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

export const NAME_ACCOUNT_PARTIAL_PRODUCT_ID = 'custom-name-account-partial'

export function isNameTabFullSettlement(payIncl: number, openIncl: number): boolean {
  return payIncl >= openIncl - 0.02
}

/** Orderregel voor Z/BTW bij deelbetaling — niet tonen op kassabon. */
export function nameTabPartialPaymentOrderLine(amountIncl: number): KassaCartItem {
  const price = Math.round(Math.max(0, amountIncl) * 100) / 100
  return {
    cartKey: 'name-account-partial',
    quantity: 1,
    product: {
      id: NAME_ACCOUNT_PARTIAL_PRODUCT_ID,
      name: 'Op rekening deelbetaling',
      price,
    } as KassaCartItem['product'],
  }
}

export type NameTabPaymentOrderPlan = {
  orderLines: KassaCartItem[]
  nextTabLines: KassaNameTabLine[]
  showProductsOnReceipt: boolean
}

/** Deelbetaling: alleen bedrag op bon; volledige afrekening: tab-regels (catalogus op bon). */
export function resolveNameTabPaymentOrderPlan(
  lines: KassaNameTabLine[],
  payIncl: number,
): NameTabPaymentOrderPlan {
  const normalized = normalizeNameTabLines(lines)
  const open = tabOpenTotalIncl(normalized)
  const pay = Math.round(payIncl * 100) / 100
  const full = isNameTabFullSettlement(pay, open)

  if (full) {
    const orderLines: KassaCartItem[] = []
    for (const line of normalized) {
      const unpaidCents = Math.round(effectiveLineUnpaidIncl(line) * 100)
      if (unpaidCents <= 0) continue
      const { orderParts } = applyOpenAmountToLine(line, unpaidCents)
      orderLines.push(...orderParts)
    }
    return {
      orderLines,
      nextTabLines: [],
      showProductsOnReceipt: true,
    }
  }
  return {
    orderLines: [nameTabPartialPaymentOrderLine(pay)],
    nextTabLines: reduceNameTabLinesAfterPayment(lines, pay),
    showProductsOnReceipt: false,
  }
}

/** Eén regel waarvan het regeltotaal incl. BTW exact `grossIncl` is (deelbetaling). */
function lineWithGrossTotal(line: KassaCartItem, grossIncl: number): KassaCartItem {
  const total = Math.round(Math.max(0, grossIncl) * 100) / 100
  return {
    ...line,
    product: { ...line.product, price: total },
    quantity: 1,
    choices: undefined,
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
