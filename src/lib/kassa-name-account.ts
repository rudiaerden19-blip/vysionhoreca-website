import type { KassaCartItem } from '@/lib/kassa-cart-types'
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

    const payCents = remainingCents
    remainingCents = 0
    const fullQty = Math.max(1, line.quantity)

    if (payCents < unitCents) {
      orderLines.push(lineWithGrossTotal(line, payCents / 100))
      const left = unpaidCents - payCents
      if (left > 0) {
        nextTabLines.push({ ...line, unpaidIncl: Math.round(left) / 100 })
      }
      continue
    }

    const takeQty = Math.min(fullQty, Math.floor(payCents / unitCents))
    const allocatedCents = takeQty * unitCents
    orderLines.push(cloneCartLineForOrder(line, takeQty))
    const leftUnpaidCents = unpaidCents - allocatedCents
    if (leftUnpaidCents > 0) {
      const leftQty = fullQty - takeQty
      if (leftQty > 0) {
        nextTabLines.push({
          ...line,
          quantity: leftQty,
          unpaidIncl: Math.round(leftUnpaidCents) / 100,
        })
      } else {
        nextTabLines.push({
          ...line,
          quantity: 1,
          unpaidIncl: Math.round(leftUnpaidCents) / 100,
        })
      }
    }
  }

  const appliedIncl = Math.round((paymentCents - remainingCents)) / 100
  const cleanedNext = normalizeNameTabLines(nextTabLines)
  return { orderLines, nextTabLines: cleanedNext, appliedIncl }
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
