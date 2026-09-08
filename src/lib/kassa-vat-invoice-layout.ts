import type { KassaCartItem } from '@/lib/kassa-cart-types'
import type { CategoryVatPercent } from '@/lib/order-vat'

export type KassaVatInvoiceCustomer = {
  name: string
  vatNumber: string
  addressLine: string
  postalCode: string
  city: string
}

export type KassaVatInvoiceItemRow = {
  quantity: number
  name: string
  extras: string[]
  excl: number
  tax: number
  incl: number
  rate: number
}

export type KassaVatInvoiceRateRow = {
  rate: number
  baseExcl: number
  tax: number
}

export type KassaVatInvoiceLabels = {
  title: string
  deliveryDate: string
  invoiceNo: string
  sellerVat: string
  customerHeading: string
  customerVat: string
  lineAmounts: string
  totalExcl: string
  totalVat: string
  totalIncl: string
  vatRateSplit: string
}

function money(n: number): string {
  return n.toFixed(2)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Uniek per tenant via ordernummer; zelfde nummer bij herprint. */
export function formatKassaVatInvoiceNumber(orderNumber: number, createdAt: Date, fallbackRef?: string): string {
  const year = createdAt.getFullYear()
  if (orderNumber > 0) {
    return `${year}-${String(orderNumber).padStart(6, '0')}`
  }
  const ref = String(fallbackRef ?? '').replace(/[^A-Za-z0-9]/g, '').slice(-8).toUpperCase()
  return ref ? `${year}-${ref}` : `${year}-000000`
}

export function buildKassaVatInvoiceItemRows(
  lines: KassaCartItem[],
  resolveRate: (item: KassaCartItem) => CategoryVatPercent | number,
): KassaVatInvoiceItemRow[] {
  return lines.map((line) => {
    const extras = (line.choices || []).map((c) => c.choiceName).filter(Boolean)
    const choicesTotal = (line.choices || []).reduce((s, c) => s + c.price, 0)
    const incl = round2((line.product.price + choicesTotal) * line.quantity)
    const rate = resolveRate(line)
    const excl = round2(incl / (1 + Number(rate) / 100))
    const tax = round2(incl - excl)
    return {
      quantity: line.quantity,
      name: line.product.name,
      extras,
      excl,
      tax,
      incl,
      rate: Number(rate),
    }
  })
}

export function buildKassaVatInvoiceThermalLines(input: {
  labels: KassaVatInvoiceLabels
  sellerName: string
  sellerAddress?: string
  sellerPostalCity?: string
  sellerVat?: string
  customer?: KassaVatInvoiceCustomer | null
  invoiceNumber: string
  deliveryDate: string
  orderMeta: string
  items: KassaVatInvoiceItemRow[]
  rates: KassaVatInvoiceRateRow[]
  totalExcl: number
  totalVat: number
  totalIncl: number
  paidWith: string
}): string[] {
  const lines: string[] = []
  const L = input.labels
  lines.push(input.sellerName)
  if (input.sellerAddress) lines.push(input.sellerAddress)
  if (input.sellerPostalCity) lines.push(input.sellerPostalCity)
  lines.push(L.sellerVat.replace('{vatNumber}', input.sellerVat?.trim() || '—'))
  lines.push('--------------------------------')
  lines.push(L.title)
  lines.push(`${L.invoiceNo}${input.invoiceNumber}`)
  lines.push(L.deliveryDate.replace('{date}', input.deliveryDate))
  if (input.orderMeta) lines.push(input.orderMeta)
  const customer = input.customer
  const postalCity = `${customer?.postalCode ?? ''} ${customer?.city ?? ''}`.trim()
  const hasCustomer = Boolean(
    customer?.name?.trim() ||
      customer?.addressLine?.trim() ||
      postalCity ||
      customer?.vatNumber?.trim(),
  )
  if (hasCustomer && customer) {
    lines.push('--------------------------------')
    lines.push(L.customerHeading)
    if (customer.name.trim()) lines.push(customer.name.trim())
    if (customer.addressLine.trim()) lines.push(customer.addressLine.trim())
    if (postalCity) lines.push(postalCity)
    if (customer.vatNumber.trim()) {
      lines.push(L.customerVat.replace('{vatNumber}', customer.vatNumber.trim()))
    }
  }
  lines.push('--------------------------------')
  for (const item of input.items) {
    lines.push(`${item.quantity}x ${item.name}`)
    for (const extra of item.extras) {
      lines.push(` + ${extra}`)
    }
    lines.push(
      L.lineAmounts
        .replace('{excl}', money(item.excl))
        .replace('{rate}', String(item.rate))
        .replace('{tax}', money(item.tax))
        .replace('{incl}', money(item.incl)),
    )
  }
  lines.push('--------------------------------')
  lines.push(`${L.totalExcl}  EUR ${money(input.totalExcl)}`)
  for (const row of input.rates) {
    lines.push(
      L.vatRateSplit
        .replace('{rate}', String(row.rate))
        .replace('{excl}', money(row.baseExcl))
        .replace('{tax}', money(row.tax)),
    )
  }
  lines.push(`${L.totalVat}  EUR ${money(input.totalVat)}`)
  lines.push(`${L.totalIncl}  EUR ${money(input.totalIncl)}`)
  lines.push(input.paidWith)
  return lines
}
