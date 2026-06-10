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

function appendRetailLoyaltyReceiptLines(
  order: KassaLastOrderReceipt,
  labels: RetailReceiptI18n,
  lines: string[],
): void {
  const L = order.retailLoyalty
  if (!L || !labels.loyaltyBalanceLine) return
  lines.push('--------------------------------')
  if (L.memberLabel && labels.loyaltyPassLabel) {
    lines.push(labels.loyaltyPassLabel(L.memberLabel))
  }
  if (L.pointsRedeemed > 0 && labels.loyaltyRedeemedLine) {
    lines.push(labels.loyaltyRedeemedLine(L.pointsRedeemed))
  }
  if (L.pointsEarned > 0 && labels.loyaltyEarnedLine) {
    lines.push(labels.loyaltyEarnedLine(L.pointsEarned))
  }
  lines.push(labels.loyaltyBalanceLine(L.pointsBalance))
}

function payLabelForOrder(order: KassaLastOrderReceipt, labels: RetailReceiptI18n, isDraft: boolean): string {
  if (isDraft) return labels.draftNotPaid
  if (order.paymentMethod === 'SPLIT') {
    return labels.paidSplit((order.splitCash ?? 0).toFixed(2), (order.splitCard ?? 0).toFixed(2))
  }
  if (order.paymentMethod === 'CASH') return labels.payCash
  if (order.paymentMethod === 'CARD') return labels.payCard
  if (order.paymentMethod === 'IDEAL') return labels.payIdeal
  return labels.payBancontact
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
  const fbVatRate = normalizeCategoryVatPercent(tenantInfo?.btw_percentage ?? 21, 21)
  const splitOk =
    Array.isArray(order.vatSplit) &&
    order.vatSplit.length > 0 &&
    typeof order.subtotalExclVat === 'number' &&
    typeof order.totalTax === 'number'
  let subtotal: number
  let tax: number
  if (splitOk) {
    subtotal = Math.round((order.subtotalExclVat as number) * 100) / 100
    tax = Math.round((order.totalTax as number) * 100) / 100
  } else {
    subtotal = Math.round((order.total / (1 + fbVatRate / 100)) * 100) / 100
    tax = Math.round((order.total - subtotal) * 100) / 100
  }

  const orderTypePlain = labels.orderTypeTakeaway
  const invoice = order.retailCustomerInvoice
  const receiptRefDisplay = isDraft
    ? '—'
    : order.checkoutReference ?? (order.orderNumber > 0 ? String(order.orderNumber) : '—')
  const refLabel = invoice ? labels.invoiceNo : labels.receiptNo
  const payLabel = payLabelForOrder(order, labels, isDraft)
  const docTitle = `${refLabel}${receiptRefDisplay}`
  const dateStr = order.createdAt.toLocaleString(appLocaleToBcp47(locale), {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

  const bizName = escapeReceiptHtml(tenantInfo?.business_name || labels.defaultBusinessName)
  const orderTypeLabel = `📦 ${orderTypePlain}`
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${escapeReceiptHtml(docTitle)}</title><style>${KASSA_PRINT_RECEIPT_STYLES}</style></head><body>
      <div class="center">
        <div class="bold big">${bizName}</div>
        ${tenantInfo?.address ? `<div class="small">${escapeReceiptHtml(tenantInfo.address)}</div>` : ''}
        ${tenantInfo?.postal_code || tenantInfo?.city ? `<div class="small">${escapeReceiptHtml(tenantInfo.postal_code ?? '')} ${escapeReceiptHtml(tenantInfo.city ?? '')}</div>` : ''}
        ${tenantInfo?.phone ? `<div class="small">${escapeReceiptHtml(labels.telPrefix)} ${escapeReceiptHtml(tenantInfo.phone)}</div>` : ''}
      </div>
      <div class="divider"></div>
      ${isDraft ? `<div class="center bold">${escapeReceiptHtml(labels.draftBanner)}</div><div class="divider-solid"></div>` : ''}
      ${
        invoice
          ? `<div class="center bold big">${escapeReceiptHtml(labels.invoiceTitle)}</div>
      <div class="divider-solid"></div>
      <div class="small">${escapeReceiptHtml(invoice.name)}</div>
      ${invoice.addressLine ? `<div class="small">${escapeReceiptHtml(invoice.addressLine)}</div>` : ''}
      ${invoice.postalCity ? `<div class="small">${escapeReceiptHtml(invoice.postalCity)}</div>` : ''}
      <div class="small bold">${escapeReceiptHtml(labels.customerVatLabel(invoice.vatNumber))}</div>
      <div class="divider-solid"></div>`
          : ''
      }
      <div class="center order-type">${escapeReceiptHtml(orderTypeLabel)}</div>
      <div class="row small">
        <span>${escapeReceiptHtml(refLabel)}${escapeReceiptHtml(receiptRefDisplay)}</span>
        <span>${escapeReceiptHtml(dateStr)}</span>
      </div>
      <div class="divider-solid"></div>
      ${order.items
        .map((i) => {
          const choicesTotal = (i.choices || []).reduce((s, c) => s + c.price, 0)
          const lineTotal = (i.product.price + choicesTotal) * i.quantity
          return `<div class="row"><span>${i.quantity}x ${escapeReceiptHtml(i.product.name)}</span><span>€${lineTotal.toFixed(2)}</span></div>`
        })
        .join('')}
      <div class="divider-solid"></div>
      <div class="row"><span>${escapeReceiptHtml(labels.subtotal)}</span><span>€${subtotal.toFixed(2)}</span></div>
      ${
        splitOk && order.vatSplit!.length >= 1
          ? order
              .vatSplit!.map(
                (l) =>
                  `<div class="row"><span>${escapeReceiptHtml(labels.vatLabel(l.rate))}</span><span>€${l.tax.toFixed(2)}</span></div>`,
              )
              .join('')
          : `<div class="row"><span>${escapeReceiptHtml(labels.vatLabel(fbVatRate))}</span><span>€${tax.toFixed(2)}</span></div>`
      }
      <div class="row total"><span>${escapeReceiptHtml(labels.total)}</span><span>€${order.total.toFixed(2)}</span></div>
      <div class="divider"></div>
      <div class="center small">${escapeReceiptHtml(labels.paidWith)} ${escapeReceiptHtml(payLabel)}</div>
      ${
        order.helpedByStaffName?.trim() && labels.helpedByLine
          ? `<div class="center bold">${escapeReceiptHtml(labels.helpedByLine(order.helpedByStaffName.trim()))}</div>`
          : ''
      }
      ${
        order.retailLoyalty && labels.loyaltyBalanceLine
          ? (() => {
              const L = order.retailLoyalty!
              const parts: string[] = ['<div class="divider-solid"></div>']
              if (L.memberLabel && labels.loyaltyPassLabel) {
                parts.push(
                  `<div class="center small bold">${escapeReceiptHtml(labels.loyaltyPassLabel(L.memberLabel))}</div>`,
                )
              }
              if (L.pointsRedeemed > 0 && labels.loyaltyRedeemedLine) {
                parts.push(
                  `<div class="center small">${escapeReceiptHtml(labels.loyaltyRedeemedLine(L.pointsRedeemed))}</div>`,
                )
              }
              if (L.pointsEarned > 0 && labels.loyaltyEarnedLine) {
                parts.push(
                  `<div class="center small">${escapeReceiptHtml(labels.loyaltyEarnedLine(L.pointsEarned))}</div>`,
                )
              }
              parts.push(
                `<div class="center small bold">${escapeReceiptHtml(labels.loyaltyBalanceLine(L.pointsBalance))}</div>`,
              )
              return parts.join('')
            })()
          : ''
      }
      <div class="divider"></div>
      <div class="center small">
        ${tenantInfo?.btw_number ? `${escapeReceiptHtml(labels.businessVatLabel(tenantInfo.btw_number))}<br/>` : ''}
        ${escapeReceiptHtml(isDraft ? labels.draftFooter : labels.thanks)}
        ${tenantInfo?.website ? `<br/>${escapeReceiptHtml(tenantInfo.website)}` : ''}
      </div>
    </body></html>`
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
  const fbVatRate = normalizeCategoryVatPercent(tenantInfo?.btw_percentage ?? 21, 21)
  const splitOk =
    Array.isArray(order.vatSplit) &&
    order.vatSplit.length > 0 &&
    typeof order.subtotalExclVat === 'number' &&
    typeof order.totalTax === 'number'
  let subtotal: number
  let tax: number
  if (splitOk) {
    subtotal = Math.round((order.subtotalExclVat as number) * 100) / 100
    tax = Math.round((order.totalTax as number) * 100) / 100
  } else {
    subtotal = Math.round((order.total / (1 + fbVatRate / 100)) * 100) / 100
    tax = Math.round((order.total - subtotal) * 100) / 100
  }

  const orderTypePlain = labels.orderTypeTakeaway
  const invoice = order.retailCustomerInvoice
  const receiptRefDisplay = isDraft
    ? '—'
    : order.checkoutReference ?? (order.orderNumber > 0 ? String(order.orderNumber) : '—')
  const refLabel = invoice ? labels.invoiceNo : labels.receiptNo
  const payLabel = payLabelForOrder(order, labels, isDraft)
  const docTitle = `${refLabel}${receiptRefDisplay}`
  const dateStr = order.createdAt.toLocaleString(appLocaleToBcp47(locale), {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

  const bonLines: string[] = []
  bonLines.push(tenantInfo?.business_name || labels.defaultBusinessName)
  if (tenantInfo?.address) bonLines.push(tenantInfo.address)
  if (tenantInfo?.postal_code || tenantInfo?.city) {
    bonLines.push(`${tenantInfo.postal_code ?? ''} ${tenantInfo.city ?? ''}`.trim())
  }
  if (tenantInfo?.phone) bonLines.push(`${labels.telPrefix} ${tenantInfo.phone}`)
  bonLines.push('--------------------------------')
  if (isDraft) {
    bonLines.push(labels.draftBanner)
    bonLines.push('--------------------------------')
  }
  if (invoice) {
    bonLines.push(labels.invoiceTitle)
    bonLines.push('--------------------------------')
    bonLines.push(invoice.name)
    if (invoice.addressLine) bonLines.push(invoice.addressLine)
    if (invoice.postalCity) bonLines.push(invoice.postalCity)
    bonLines.push(labels.customerVatLabel(invoice.vatNumber))
    bonLines.push('--------------------------------')
  }
  bonLines.push(orderTypePlain)
  bonLines.push(`${refLabel}${receiptRefDisplay}  ${dateStr}`)
  bonLines.push('--------------------------------')
  for (const i of order.items) {
    const choicesTotal = (i.choices || []).reduce((s, c) => s + c.price, 0)
    const lineTotal = (i.product.price + choicesTotal) * i.quantity
    bonLines.push(`${i.quantity}x ${i.product.name}  EUR ${lineTotal.toFixed(2)}`)
  }
  bonLines.push('--------------------------------')
  bonLines.push(`${labels.subtotal}  EUR ${subtotal.toFixed(2)}`)
  if (splitOk && order.vatSplit!.length >= 1) {
    for (const row of order.vatSplit!) {
      bonLines.push(`${labels.vatLabel(row.rate)}  EUR ${row.tax.toFixed(2)}`)
    }
  } else {
    bonLines.push(`${labels.vatLabel(fbVatRate)}  EUR ${tax.toFixed(2)}`)
  }
  bonLines.push(`${labels.total}  EUR ${order.total.toFixed(2)}`)
  bonLines.push(`${labels.paidWith} ${payLabel}`)
  if (order.helpedByStaffName?.trim() && labels.helpedByLine) {
    bonLines.push(labels.helpedByLine(order.helpedByStaffName.trim()))
  }
  appendRetailLoyaltyReceiptLines(order, labels, bonLines)
  if (tenantInfo?.btw_number) {
    bonLines.push(labels.businessVatLabel(tenantInfo.btw_number))
  }
  bonLines.push(isDraft ? labels.draftFooter : labels.thanks)
  if (tenantInfo?.website) bonLines.push(tenantInfo.website)

  const isCash =
    !isDraft && ['CASH', 'cash', 'CONTANT', 'contant'].includes(String(order.paymentMethod || ''))

  const printResult = await sendToVysionPrintAgent({
    winkelnaam: tenantInfo?.business_name || labels.defaultBusinessName,
    bonInhoud: bonLines.join('\n'),
    copies: isDraft ? 1 : 2,
    openDrawer: isCash,
    receiptMode: 'kassa',
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
    },
    businessInfo: {
      name: tenantInfo?.business_name,
      address: tenantInfo?.address ?? undefined,
      postalCode: tenantInfo?.postal_code ?? undefined,
      city: tenantInfo?.city ?? undefined,
      phone: tenantInfo?.phone ?? undefined,
      vatNumber: tenantInfo?.btw_number ?? undefined,
      website: tenantInfo?.website ?? undefined,
      vatRate: splitOk ? order.vatSplit![0].rate : fbVatRate,
    },
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
