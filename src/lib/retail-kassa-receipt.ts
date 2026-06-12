import type { TenantSettings } from '@/lib/admin-api'
import type { KassaCartItem, KassaLastOrderReceipt, KassaPaymentMethod } from '@/lib/kassa-cart-types'
import { normalizeCategoryVatPercent } from '@/lib/order-vat'
import {
  appLocaleToBcp47,
  escapeReceiptHtml,
  KASSA_PRINT_RECEIPT_STYLES,
  printReceiptHtmlDocument,
} from '@/lib/print-receipt-html'
import type { RetailCartLine } from '@/lib/retail-kassa-pos'
import {
  buildRetailKassaReceiptHtmlBody,
  buildRetailThermalBonLines as buildRetailThermalBonLinesCore,
  retailTicketEanForOrder,
  RETAIL_RECEIPT_PRINT_STYLES,
} from '@/lib/retail-kassa/receipt-layout'
import { isAndroidTabletPrintClient, sendToVysionPrintAgent } from '@/lib/vysion-print-agent-client'

export type RetailReceiptI18n = {
  defaultBusinessName: string
  orderTypeTakeaway: string
  receiptNo: string
  invoiceTitle: string
  invoiceNo: string
  customerVatLabel: (vatNumber: string) => string
  telPrefix: string
  subtotal: string
  vatLabel: (rate: number) => string
  total: string
  paidWith: string
  payCash: string
  payCard: string
  payIdeal: string
  payBancontact: string
  paidSplit: (cash: string, card: string) => string
  businessVatLabel: (vatNumber: string) => string
  thanks: string
  draftBanner: string
  draftNotPaid: string
  draftFooter: string
  helpedByLine?: (name: string) => string
  loyaltyPassLabel?: (name: string) => string
  loyaltyEarnedLine?: (points: number) => string
  loyaltyRedeemedLine?: (points: number) => string
  loyaltyBalanceLine?: (points: number) => string
  receiptColOrder: string
  receiptColDateTime: string
  receiptColProduct: string
  receiptColPrice: string
  receiptColVatRate: string
  receiptVatSectionTotal: string
  receiptDiscount: string
  receiptFooterReturns: string
  receiptFooterSocial: string
}

function retailLineToCartItem(line: RetailCartLine): KassaCartItem {
  return {
    product: {
      tenant_slug: '',
      category_id: null,
      name: line.sku.name,
      description: '',
      price: line.sku.price,
      image_url: '',
      is_active: true,
      is_popular: false,
      sort_order: 0,
      allergens: [],
      id: line.sku.productId,
      article_number: line.sku.article_number,
      barcode: line.sku.barcode,
      size_label: line.sku.size_label,
      color_label: line.sku.color_label,
    },
    quantity: line.quantity,
    cartKey: line.sku.lineKey,
  }
}

export function buildRetailLastOrderReceipt(
  lines: RetailCartLine[],
  method: KassaPaymentMethod,
  orderNumber: number,
  tenantDefaultBtw: number,
  splitAmounts?: { cash: number; card: number },
  loyaltyDiscountEuro?: number,
  helpedByStaffName?: string | null,
): KassaLastOrderReceipt {
  const gross = Math.round(lines.reduce((s, l) => s + l.sku.price * l.quantity, 0) * 100) / 100
  const discount = Math.round(Math.min(Math.max(0, loyaltyDiscountEuro ?? 0), gross) * 100) / 100
  const total = Math.round((gross - discount) * 100) / 100
  const vatRate = normalizeCategoryVatPercent(tenantDefaultBtw, 21)
  const subtotal = Math.round((total / (1 + vatRate / 100)) * 100) / 100
  const tax = Math.round((total - subtotal) * 100) / 100
  return {
    orderNumber,
    items: lines.map(retailLineToCartItem),
    total,
    subtotalExclVat: subtotal,
    totalTax: tax,
    vatSplit: [{ rate: vatRate, baseExcl: subtotal, tax }],
    paymentMethod: method,
    splitCash: method === 'SPLIT' ? splitAmounts?.cash : undefined,
    splitCard: method === 'SPLIT' ? splitAmounts?.card : undefined,
    orderType: 'TAKEAWAY',
    tableNumber: '',
    createdAt: new Date(),
    helpedByStaffName: helpedByStaffName?.trim() || null,
  }
}

function retailReceiptDateStr(order: KassaLastOrderReceipt, locale: string): string {
  return order.createdAt.toLocaleString(appLocaleToBcp47(locale), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function buildRetailThermalBonLines(opts: {
  tenantInfo: TenantSettings | null
  order: KassaLastOrderReceipt
  labels: RetailReceiptI18n
  locale: string
  draft?: boolean
}): string[] {
  return buildRetailThermalBonLinesCore({
    ...opts,
    dateStr: retailReceiptDateStr(opts.order, opts.locale),
  })
}

export type RetailPrintReceiptResult =
  | { ok: true }
  | { ok: false; error: string; fallbackHtml: string }

export function buildRetailKassaReceiptHtmlDocument(opts: {
  tenantInfo: TenantSettings | null
  order: KassaLastOrderReceipt
  labels: RetailReceiptI18n
  locale: string
  draft?: boolean
}): string {
  const { tenantInfo, order, labels, locale } = opts
  const isDraft = !!opts.draft
  const invoice = order.retailCustomerInvoice
  const receiptRefDisplay = isDraft
    ? '—'
    : order.checkoutReference ?? (order.orderNumber > 0 ? String(order.orderNumber) : '—')
  const refLabel = invoice ? labels.invoiceNo : labels.receiptNo
  const docTitle = `${refLabel}${receiptRefDisplay}`
  const body = buildRetailKassaReceiptHtmlBody({
    tenantInfo,
    order,
    labels,
    isDraft,
    dateStr: retailReceiptDateStr(order, locale),
  })
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${escapeReceiptHtml(docTitle)}</title><style>${KASSA_PRINT_RECEIPT_STYLES}\n${RETAIL_RECEIPT_PRINT_STYLES}</style></head><body>${body}</body></html>`
}

export async function printRetailKassaReceipt(opts: {
  tenantInfo: TenantSettings | null
  order: KassaLastOrderReceipt
  labels: RetailReceiptI18n
  locale: string
  draft?: boolean
}): Promise<RetailPrintReceiptResult> {
  const { tenantInfo, order, labels, locale } = opts
  const isDraft = !!opts.draft

  const bonLines = buildRetailThermalBonLines({
    tenantInfo,
    order,
    labels,
    locale,
    draft: isDraft,
  })

  const isCash =
    !isDraft && ['CASH', 'cash', 'CONTANT', 'contant'].includes(String(order.paymentMethod || ''))

  const printResult = await sendToVysionPrintAgent({
    winkelnaam: tenantInfo?.business_name || labels.defaultBusinessName,
    bonInhoud: bonLines.join('\n'),
    copies: isDraft ? 1 : 2,
    openDrawer: isCash,
    receiptMode: 'kassa',
  })

  if (printResult.ok) return { ok: true }

  const receiptHtml = buildRetailKassaReceiptHtmlDocument({
    tenantInfo,
    order,
    labels,
    locale,
    draft: isDraft,
  })

  return { ok: false, error: printResult.error, fallbackHtml: receiptHtml }
}

export function tryBrowserPrintFallback(html: string): void {
  if (!html || isAndroidTabletPrintClient()) return
  printReceiptHtmlDocument(html)
}

export { retailTicketEanForOrder } from '@/lib/retail-kassa/receipt-layout'
