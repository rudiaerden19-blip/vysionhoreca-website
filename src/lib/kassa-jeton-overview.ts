import { orderCountsTowardRevenueAndZReport } from '@/lib/admin-api-order-helpers'
import { addDaysToBelgiumYMD } from '@/lib/belgium-date-bounds'
import {
  kassaJetonBreakdownFromCents,
  type KassaJetonDenominations,
} from '@/lib/kassa-jeton-math'
import { isTheLagoonTenant } from '@/lib/lagoon-kitchen-screen'
import {
  orderReportDateForShift,
  type ShiftReportClose,
  type TenantHourRow,
} from '@/lib/tenant-business-day'
import { hasExplicitEnabledModules } from '@/lib/tenant-modules'

export const JETON_OVERVIEW_SUBMENU_ID = 'sm_rpt_jetons'

/** Alleen The Lagoon, en alleen zolang Rapporten voor die zaak aan staat. */
export function jetonOverviewSubmenuVisible(
  tenantSlug: string,
  enabledJson: Record<string, boolean> | null | undefined,
): boolean {
  if (!isTheLagoonTenant(tenantSlug)) return false
  if (enabledJson?.sm_rpt_jetons === false) return false
  if (!enabledJson || !hasExplicitEnabledModules(enabledJson)) return true
  if (enabledJson.sm_rpt_jetons === true) return true
  return (
    enabledJson.rapporten === true ||
    enabledJson.sm_rpt_rapporten === true ||
    enabledJson.sm_rpt_overzicht === true ||
    enabledJson.sm_rpt_z === true
  )
}

/** Artikel dat een jeton/munt is. «Munt thee» telt niet. */
export function isJetonSaleItemName(name: string): boolean {
  return /\bjetons?\b/i.test(String(name ?? ''))
}

export type JetonOverviewItem = {
  name?: string | null
  quantity?: number | null
  price?: number | null
}

export type JetonOverviewOrder = {
  status?: string | null
  payment_status?: string | null
  payment_method?: string | null
  order_type?: string | null
  total?: number | null
  payment_split_cash?: number | null
  payment_split_card?: number | null
  created_at: string
  items?: JetonOverviewItem[] | null
}

export type JetonDayRow = {
  date: string
  soldPieces: number
  soldCashPieces: number
  soldPinPieces: number
  soldCashEuro: number
  soldPinEuro: number
  receivedPieces: number
  receivedBlack: number
  receivedWhite: number
  receivedEuro: number
  receivedReceipts: number
}

export type JetonOverview = {
  days: JetonDayRow[]
  totals: Omit<JetonDayRow, 'date'>
}

function emptyDay(date: string): JetonDayRow {
  return {
    date,
    soldPieces: 0,
    soldCashPieces: 0,
    soldPinPieces: 0,
    soldCashEuro: 0,
    soldPinEuro: 0,
    receivedPieces: 0,
    receivedBlack: 0,
    receivedWhite: 0,
    receivedEuro: 0,
    receivedReceipts: 0,
  }
}

function money(n: number): number {
  return Math.round(n * 100) / 100
}

function eachYmd(from: string, to: string): string[] {
  const out: string[] = []
  let d = from
  let guard = 0
  while (d <= to && guard < 400) {
    out.push(d)
    d = addDaysToBelgiumYMD(d, 1)
    guard += 1
  }
  return out
}

function cashPinOfOrder(order: JetonOverviewOrder): { cash: number; pin: number } {
  const pm = String(order.payment_method || '').toUpperCase()
  const total = Number(order.total) || 0
  if (pm === 'SPLIT') {
    const cash = Number(order.payment_split_cash)
    const pin = Number(order.payment_split_card)
    return {
      cash: Number.isFinite(cash) ? cash : 0,
      pin: Number.isFinite(pin) ? pin : 0,
    }
  }
  if (pm === 'CASH' || pm === 'CONTANT') return { cash: total, pin: 0 }
  if (pm === 'CARD' || pm === 'PIN' || pm === 'KAART' || pm === 'BANCONTACT') {
    return { cash: 0, pin: total }
  }
  return { cash: 0, pin: 0 }
}

function allocatePieces(qty: number, cashEuro: number, pinEuro: number): { cash: number; pin: number } {
  const q = Math.max(0, Math.round(qty))
  const sum = cashEuro + pinEuro
  if (q === 0 || sum <= 0) return { cash: 0, pin: 0 }
  const cash = Math.min(q, Math.max(0, Math.round((q * cashEuro) / sum)))
  return { cash, pin: q - cash }
}

/**
 * Verkocht = jeton-artikelen betaald met cash of pin.
 * Binnengekomen = bonnen met betaalwijze JETON, in stuks via de jetonwaarde.
 * Dagen volgen de shift (open na middernacht blijft op dezelfde dag).
 */
export function summarizeJetonOverview(
  orders: JetonOverviewOrder[],
  fromYmd: string,
  toYmd: string,
  denoms: KassaJetonDenominations,
  hours: TenantHourRow[] = [],
  shifts: ShiftReportClose[] = [],
): JetonOverview {
  const byDate = new Map<string, JetonDayRow>()
  for (const ymd of eachYmd(fromYmd, toYmd)) byDate.set(ymd, emptyDay(ymd))

  for (const order of orders) {
    if (
      !orderCountsTowardRevenueAndZReport({
        order_type: order.order_type ?? '',
        status: order.status ?? '',
        payment_status: order.payment_status ?? '',
      })
    ) {
      continue
    }
    const ymd = orderReportDateForShift(order.created_at, hours, shifts)
    if (!ymd || ymd < fromYmd || ymd > toYmd) continue
    const day = byDate.get(ymd)
    if (!day) continue

    const pm = String(order.payment_method || '').toUpperCase()
    if (pm === 'JETON') {
      const euros = Number(order.total) || 0
      day.receivedEuro += euros
      day.receivedReceipts += 1
      const breakdown = kassaJetonBreakdownFromCents(Math.round(euros * 100), denoms)
      if (breakdown) {
        day.receivedBlack += breakdown.black
        day.receivedWhite += breakdown.white
        day.receivedPieces += breakdown.black + breakdown.white
      }
      continue
    }

    const pay = cashPinOfOrder(order)
    const paySum = pay.cash + pay.pin
    if (paySum <= 0) continue
    for (const item of order.items || []) {
      if (!isJetonSaleItemName(String(item.name || ''))) continue
      const qty = Number(item.quantity) || 0
      const price = Number(item.price) || 0
      if (qty <= 0) continue
      const lineEuro = price * qty
      const pieces = allocatePieces(qty, pay.cash, pay.pin)
      day.soldCashPieces += pieces.cash
      day.soldPinPieces += pieces.pin
      day.soldPieces += pieces.cash + pieces.pin
      day.soldCashEuro += lineEuro * (pay.cash / paySum)
      day.soldPinEuro += lineEuro * (pay.pin / paySum)
    }
  }

  const days = Array.from(byDate.values()).map((row) => ({
    ...row,
    soldCashEuro: money(row.soldCashEuro),
    soldPinEuro: money(row.soldPinEuro),
    receivedEuro: money(row.receivedEuro),
  }))
  const totals = days.reduce<Omit<JetonDayRow, 'date'>>((acc, row) => {
    acc.soldPieces += row.soldPieces
    acc.soldCashPieces += row.soldCashPieces
    acc.soldPinPieces += row.soldPinPieces
    acc.soldCashEuro = money(acc.soldCashEuro + row.soldCashEuro)
    acc.soldPinEuro = money(acc.soldPinEuro + row.soldPinEuro)
    acc.receivedPieces += row.receivedPieces
    acc.receivedBlack += row.receivedBlack
    acc.receivedWhite += row.receivedWhite
    acc.receivedEuro = money(acc.receivedEuro + row.receivedEuro)
    acc.receivedReceipts += row.receivedReceipts
    return acc
  }, emptyDay(''))

  return { days, totals }
}

/** Handmatig ingevuld per dag: jetons verkocht, cash en pin. */
export type JetonDaySale = {
  jetonsSold: number
  cashEuro: number
  pinEuro: number
}

export function emptyJetonDaySale(): JetonDaySale {
  return { jetonsSold: 0, cashEuro: 0, pinEuro: 0 }
}

export function parseJetonDayAmount(raw: string): number {
  const n = Number(String(raw ?? '').trim().replace(',', '.'))
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.round(n * 100) / 100
}

export function parseJetonDayCount(raw: string): number {
  const n = Math.round(Number(String(raw ?? '').trim().replace(',', '.')))
  if (!Number.isFinite(n) || n < 0) return 0
  return n
}

export function jetonDaySaleTotalEuro(sale: Pick<JetonDaySale, 'cashEuro' | 'pinEuro'>): number {
  return money(Math.max(0, sale.cashEuro) + Math.max(0, sale.pinEuro))
}

/** Cash + pin min de jetons die de kassa al telde. Jetons zelf blijven onaangeroerd. */
export function jetonKassaWaardeEuro(cashEuro: number, pinEuro: number, jetonEuro: number): number {
  return money(cashEuro + pinEuro - jetonEuro)
}

export function sumJetonDaySales(sales: JetonDaySale[]): JetonDaySale & { totalEuro: number } {
  const acc = sales.reduce(
    (sum, sale) => {
      sum.jetonsSold += Math.max(0, Math.round(sale.jetonsSold))
      sum.cashEuro += Math.max(0, sale.cashEuro)
      sum.pinEuro += Math.max(0, sale.pinEuro)
      return sum
    },
    { jetonsSold: 0, cashEuro: 0, pinEuro: 0 },
  )
  return {
    jetonsSold: acc.jetonsSold,
    cashEuro: money(acc.cashEuro),
    pinEuro: money(acc.pinEuro),
    totalEuro: money(acc.cashEuro + acc.pinEuro),
  }
}
