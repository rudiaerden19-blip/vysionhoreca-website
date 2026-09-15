import type { TenantSettings } from '@/lib/admin-api'
import type { KassaLastOrderReceipt } from '@/lib/kassa-cart-types'
import { sortKassaCartLinesByMenuCategory } from '@/lib/kassa-cart-grouping'
import type { MenuCategory } from '@/lib/admin-api'
import { kassaReceiptVatFromPersistedOrder } from '@/lib/kassa-receipt-vat'
import { normalizeCategoryVatPercent } from '@/lib/order-vat'
import { sendToVysionPrintAgent } from '@/lib/vysion-print-agent-client'
import { appLocaleToBcp47 } from '@/lib/print-receipt-html'

export type KassaNameAccountPrintLabels = {
  defaultBusinessName: string
  orderTypeTakeaway: string
  receiptNo: string
  subtotal: string
  vat: (rate: number) => string
  total: string
  paidWith: string
  payCash: string
  payCard: string
  thanks: string
  businessVatLabel: (vatNumber: string) => string
  telPrefix: string
  receiptCustomer: (name: string) => string
}

export type PrintNameAccountReceiptResult =
  | { ok: true }
  | { ok: false; error: string }

export function nameAccountPrintLabelsFromT(t: (key: string) => string): KassaNameAccountPrintLabels {
  return {
    defaultBusinessName: t('kassaApp.defaultBusinessName'),
    orderTypeTakeaway: t('kassaReceipt.orderTypeTakeaway'),
    receiptNo: t('kassaReceipt.receiptNo'),
    subtotal: t('kassaReceipt.subtotal'),
    vat: (rate) => t('kassaReceipt.vat').replace('{rate}', String(rate)),
    total: t('kassaReceipt.total'),
    paidWith: t('kassaReceipt.paidWith'),
    payCash: t('kassaApp.payCash'),
    payCard: t('kassaApp.payCard'),
    thanks: t('kassaReceipt.thanks'),
    businessVatLabel: (vat) => t('kassaReceipt.businessVatLabel').replace('{vatNumber}', vat),
    telPrefix: t('kassaReceipt.telPrefix'),
    receiptCustomer: (name) => t('kassaNameAccount.receiptCustomer').replace('{name}', name),
  }
}

/** Thermal bon na op-rekening betaling (zelfde agent-pad als kassa). */
export async function printNameAccountPaymentReceipt(opts: {
  tenantSlug: string
  tenantInfo: TenantSettings | null
  order: KassaLastOrderReceipt
  categories: MenuCategory[]
  locale: string
  labels: KassaNameAccountPrintLabels
}): Promise<PrintNameAccountReceiptResult> {
  const { tenantSlug, tenantInfo, order, categories, locale, labels } = opts
  const fbVatRate = normalizeCategoryVatPercent(tenantInfo?.btw_percentage ?? 6, 21)
  const receiptVatComputed = kassaReceiptVatFromPersistedOrder(order)
  const subtotal = receiptVatComputed
    ? receiptVatComputed.subtotalExcl
    : Math.round((order.total / (1 + fbVatRate / 100)) * 100) / 100
  const tax = receiptVatComputed ? receiptVatComputed.totalTax : Math.round((order.total - subtotal) * 100) / 100
  const receiptVatRows = receiptVatComputed?.byRate ?? []

  const payLabel =
    order.paymentMethod === 'SPLIT'
      ? `${labels.payCash} / ${labels.payCard}`
      : order.paymentMethod === 'CASH'
        ? labels.payCash
        : order.paymentMethod === 'CARD'
          ? labels.payCard
          : String(order.paymentMethod)

  const receiptRefDisplay = order.orderNumber > 0 ? String(order.orderNumber) : '—'
  const dateStr = order.createdAt.toLocaleString(appLocaleToBcp47(locale), {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

  const sellerPostalCity = `${tenantInfo?.postal_code ?? ''} ${tenantInfo?.city ?? ''}`.trim()
  const bonLines: string[] = []
  bonLines.push(tenantInfo?.business_name || labels.defaultBusinessName)
  if (tenantInfo?.address) bonLines.push(tenantInfo.address)
  if (sellerPostalCity) bonLines.push(sellerPostalCity)
  if (tenantInfo?.phone) bonLines.push(`${labels.telPrefix} ${tenantInfo.phone}`)
  bonLines.push('--------------------------------')
  bonLines.push(labels.orderTypeTakeaway)
  if (order.onAccountCustomerName) {
    bonLines.push(labels.receiptCustomer(order.onAccountCustomerName))
  }
  bonLines.push(`${labels.receiptNo}${receiptRefDisplay}  ${dateStr}`)
  bonLines.push('--------------------------------')

  for (const i of sortKassaCartLinesByMenuCategory(order.items, categories)) {
    const choicesTotal = (i.choices || []).reduce((s, c) => s + c.price, 0)
    const lineTotal = (i.product.price + choicesTotal) * i.quantity
    bonLines.push(`${i.quantity}x ${i.product.name}  EUR ${lineTotal.toFixed(2)}`)
    for (const c of i.choices || []) {
      bonLines.push(` + ${c.choiceName}${c.price > 0 ? ` EUR ${c.price.toFixed(2)}` : ''}`)
    }
  }

  bonLines.push('--------------------------------')
  bonLines.push(`${labels.subtotal}  EUR ${subtotal.toFixed(2)}`)
  if (receiptVatRows.length >= 1) {
    for (const row of receiptVatRows) {
      bonLines.push(`${labels.vat(row.rate)}  EUR ${row.tax.toFixed(2)}`)
    }
  } else {
    bonLines.push(`${labels.vat(fbVatRate)}  EUR ${tax.toFixed(2)}`)
  }
  bonLines.push(`${labels.total}  EUR ${order.total.toFixed(2)}`)
  bonLines.push(`${labels.paidWith} ${payLabel}`)
  if (tenantInfo?.btw_number) {
    bonLines.push(labels.businessVatLabel(tenantInfo.btw_number))
  }
  bonLines.push(labels.thanks)
  if (tenantInfo?.website) bonLines.push(tenantInfo.website)

  const isCash = ['CASH', 'cash', 'CONTANT', 'contant'].includes(String(order.paymentMethod || ''))

  const printResult = await sendToVysionPrintAgent({
    winkelnaam: tenantInfo?.business_name || labels.defaultBusinessName,
    bonInhoud: bonLines.join('\n'),
    copies: 2,
    openDrawer: isCash,
    receiptMode: 'kassa',
    reviewUrl: `https://www.vysion-kassa.com/shop/${tenantSlug}/review`,
    orderData: {
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      tableNumber: null,
      items: order.items.map((i) => ({
        quantity: i.quantity,
        name: i.product.name,
        price: (i.product.price + (i.choices || []).reduce((s, c) => s + c.price, 0)) * i.quantity,
        choices: (i.choices || []).map((c) => ({ name: c.choiceName, price: c.price })),
      })),
      subtotal,
      tax,
      total: order.total,
      paymentMethod: order.paymentMethod,
      ...(order.onAccountCustomerName ? { customerName: order.onAccountCustomerName } : {}),
      ...(receiptVatRows.length > 0
        ? { vatLines: receiptVatRows.map((row) => ({ rate: row.rate, tax: row.tax })) }
        : {}),
    },
    businessInfo: {
      name: tenantInfo?.business_name,
      address: tenantInfo?.address ?? undefined,
      postalCode: tenantInfo?.postal_code ?? undefined,
      city: tenantInfo?.city ?? undefined,
      phone: tenantInfo?.phone ?? undefined,
      vatNumber: tenantInfo?.btw_number ?? undefined,
      website: tenantInfo?.website ?? undefined,
      vatRate: receiptVatRows[0]?.rate ?? fbVatRate,
    },
  })

  if (!printResult.ok) {
    return { ok: false, error: printResult.error || 'print_failed' }
  }
  return { ok: true }
}
