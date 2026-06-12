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
  formatStoreDisplayName,
  retailTicketEanForOrder,
  RETAIL_RECEIPT_PRINT_STYLES,
} from '@/lib/retail-kassa/receipt-layout'
import type { VysionPrintAgentBody, VysionPrintAgentRetailBon } from '@/lib/vysion-print-agent-client'
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
  /** Regel vóór voornaam medewerker (winkelkassa bon). */
  helpedByIntro?: string
  loyaltyPassLabel?: (name: string) => string
  loyaltyEarnedLine?: (points: number) => string
  loyaltyRedeemedLine?: (points: number) => string
  loyaltyBalanceLine?: (points: number) => string
  receiptBonNrPrefix: string
  sectionOrderBar: string
  sectionTotalBar: string
  sectionVatBar: string
  receivedLabel: string
  changeLabel: string
  payPin: string
  paymentMethodLine: (method: string) => string
  vatSingleLabel: string
  vatColBtwPct: string
  vatColBtw: string
  vatColExcl: string
  vatColIncl: string
  thanksFarewell: string
  receiptDiscount: string
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
    day: 'numeric',
    month: 'numeric',
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

function payMethodShort(order: KassaLastOrderReceipt, labels: RetailReceiptI18n): string {
  if (order.paymentMethod === 'SPLIT') {
    return labels.paidSplit((order.splitCash ?? 0).toFixed(2), (order.splitCard ?? 0).toFixed(2))
  }
  if (order.paymentMethod === 'CASH') return labels.payCash
  if (order.paymentMethod === 'CARD') return labels.payPin
  if (order.paymentMethod === 'IDEAL') return labels.payIdeal
  return labels.payBancontact
}

function itemsGrossIncl(order: KassaLastOrderReceipt): number {
  return (
    Math.round(
      order.items.reduce((s, i) => {
        const choicesTotal = (i.choices || []).reduce((c, ch) => c + ch.price, 0)
        return s + (i.product.price + choicesTotal) * i.quantity
      }, 0) * 100,
    ) / 100
  )
}

function stripEmojiForThermal(text: string): string {
  return text.replace(/\p{Extended_Pictographic}/gu, '').replace(/\s+/g, ' ').trim()
}

function staffFirstName(full: string): string {
  const p = full.trim().split(/\s+/).filter(Boolean)
  return p[0] ?? full.trim()
}

function buildRetailPrintAgentBody(opts: {
  tenantInfo: TenantSettings | null
  order: KassaLastOrderReceipt
  labels: RetailReceiptI18n
  locale: string
  draft?: boolean
}): VysionPrintAgentBody {
  const { tenantInfo, order, labels, locale } = opts
  const isDraft = !!opts.draft
  const dateStr = retailReceiptDateStr(order, locale)
  const fbVatRate = normalizeCategoryVatPercent(tenantInfo?.btw_percentage ?? 21, 21)
  const subtotalExcl =
    typeof order.subtotalExclVat === 'number'
      ? Math.round(order.subtotalExclVat * 100) / 100
      : Math.round((order.total / (1 + fbVatRate / 100)) * 100) / 100
  const taxTotal =
    typeof order.totalTax === 'number'
      ? Math.round(order.totalTax * 100) / 100
      : Math.round((order.total - subtotalExcl) * 100) / 100

  const receiptRefDisplay = isDraft
    ? '—'
    : order.checkoutReference ?? (order.orderNumber > 0 ? String(order.orderNumber) : '—')
  const payLabel = isDraft ? labels.draftNotPaid : payMethodShort(order, labels)
  const discountEuro = Math.round((itemsGrossIncl(order) - order.total) * 100) / 100

  const agentItems = order.items.map((i) => {
    const choicesTotal = (i.choices || []).reduce((s, c) => s + c.price, 0)
    const unitIncl = i.product.price + choicesTotal
    return {
      quantity: i.quantity,
      name: i.product.name,
      price: Math.round(unitIncl * i.quantity * 100) / 100,
    }
  })

  const centerLines: string[] = []
  const L = order.retailLoyalty
  if (L && labels.loyaltyBalanceLine) {
    if (L.memberLabel && labels.loyaltyPassLabel) {
      centerLines.push(stripEmojiForThermal(labels.loyaltyPassLabel(L.memberLabel)))
    }
    if (L.pointsRedeemed > 0 && labels.loyaltyRedeemedLine) {
      centerLines.push(stripEmojiForThermal(labels.loyaltyRedeemedLine(L.pointsRedeemed)))
    }
    if (L.pointsEarned > 0 && labels.loyaltyEarnedLine) {
      centerLines.push(stripEmojiForThermal(labels.loyaltyEarnedLine(L.pointsEarned)))
    }
    centerLines.push(stripEmojiForThermal(labels.loyaltyBalanceLine(L.pointsBalance)))
  }
  const helpedRaw = order.helpedByStaffName?.trim()
  if (helpedRaw && labels.helpedByIntro) {
    centerLines.push(stripEmojiForThermal(labels.helpedByIntro))
    centerLines.push(staffFirstName(helpedRaw))
  }
  centerLines.push(stripEmojiForThermal(isDraft ? labels.draftFooter : labels.thanks))
  if (!isDraft) centerLines.push(stripEmojiForThermal(labels.thanksFarewell))

  const retailBon: VysionPrintAgentRetailBon = {
    dateStr,
    receiptRef: receiptRefDisplay,
    isDraft,
    discountEuro: discountEuro > 0.009 ? discountEuro : undefined,
    changeAmount: 0,
    payLine: labels.paymentMethodLine(payLabel).slice(0, 42),
    businessVatLine: tenantInfo?.btw_number?.trim()
      ? labels.businessVatLabel(tenantInfo.btw_number.trim())
      : undefined,
    telLine: tenantInfo?.phone?.trim()
      ? `${labels.telPrefix} ${tenantInfo.phone.trim()}`
      : undefined,
    centerLines,
    labels: {
      receiptBonNrPrefix: labels.receiptBonNrPrefix,
      sectionOrderBar: labels.sectionOrderBar,
      sectionTotalBar: labels.sectionTotalBar,
      subtotal: labels.subtotal,
      vatSingleLabel: labels.vatSingleLabel,
      total: labels.total,
      receivedLabel: labels.receivedLabel,
      changeLabel: labels.changeLabel,
      receiptDiscount: labels.receiptDiscount,
      draftBanner: labels.draftBanner,
    },
  }

  const bonLines = buildRetailThermalBonLines({
    tenantInfo,
    order,
    labels,
    locale,
    draft: isDraft,
  })

  return {
    winkelnaam: formatStoreDisplayName(tenantInfo?.business_name || labels.defaultBusinessName),
    bonInhoud: bonLines.join('\n'),
    receiptMode: 'retail',
    orderData: {
      orderNumber: order.orderNumber,
      orderType: 'RETAIL',
      items: agentItems,
      subtotal: subtotalExcl,
      tax: taxTotal,
      total: order.total,
      paymentMethod: order.paymentMethod,
    },
    businessInfo: {
      name: formatStoreDisplayName(tenantInfo?.business_name || labels.defaultBusinessName),
      address: tenantInfo?.address ?? undefined,
      postalCode: tenantInfo?.postal_code ?? undefined,
      city: tenantInfo?.city ?? undefined,
      phone: tenantInfo?.phone ?? undefined,
      vatNumber: tenantInfo?.btw_number ?? undefined,
      website: tenantInfo?.website ?? undefined,
      vatRate: fbVatRate,
    },
    retailBon,
  }
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

  const isCash =
    !isDraft && ['CASH', 'cash', 'CONTANT', 'contant'].includes(String(order.paymentMethod || ''))

  const printResult = await sendToVysionPrintAgent({
    ...buildRetailPrintAgentBody({ tenantInfo, order, labels, locale, draft: isDraft }),
    copies: isDraft ? 1 : 2,
    openDrawer: isCash,
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
