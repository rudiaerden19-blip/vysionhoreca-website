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

/** Zelfde effectieve breedte als Vysion Print Agent (80 mm). */
const THERMAL_W = 42

function thermalSep(char: '-' | '=' = '-'): string {
  return char.repeat(THERMAL_W)
}

function thermalCenter(text: string): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (!t) return ''
  if (t.length >= THERMAL_W) return t.slice(0, THERMAL_W)
  const pad = Math.floor((THERMAL_W - t.length) / 2)
  return `${' '.repeat(pad)}${t}`
}

function thermalPadRow(left: string, right: string): string {
  const l = left.trim()
  const r = right.trim()
  if (l.length + r.length >= THERMAL_W) {
    return `${l.slice(0, THERMAL_W - r.length - 1)} ${r}`.slice(0, THERMAL_W)
  }
  return l + ' '.repeat(THERMAL_W - l.length - r.length) + r
}

function thermalMoney(amount: number): string {
  return `EUR ${amount.toFixed(2)}`
}

function thermalItemLine(qty: number, name: string, lineTotal: number): string {
  const price = thermalMoney(lineTotal)
  const prefix = `${qty}x `
  const maxNameLen = THERMAL_W - prefix.length - price.length - 1
  let n = name.trim()
  if (maxNameLen > 3 && n.length > maxNameLen) {
    n = `${n.slice(0, maxNameLen - 1)}.`
  }
  return thermalPadRow(`${prefix}${n}`, price)
}

function stripEmojiForThermal(text: string): string {
  return text.replace(/\p{Extended_Pictographic}/gu, '').replace(/\s+/g, ' ').trim()
}

function appendRetailLoyaltyThermalLines(
  order: KassaLastOrderReceipt,
  labels: RetailReceiptI18n,
  lines: string[],
): void {
  const L = order.retailLoyalty
  if (!L || !labels.loyaltyBalanceLine) return
  lines.push('')
  lines.push(thermalSep('-'))
  if (L.memberLabel && labels.loyaltyPassLabel) {
    lines.push(thermalCenter(stripEmojiForThermal(labels.loyaltyPassLabel(L.memberLabel))))
  }
  if (L.pointsRedeemed > 0 && labels.loyaltyRedeemedLine) {
    lines.push(thermalCenter(stripEmojiForThermal(labels.loyaltyRedeemedLine(L.pointsRedeemed))))
  }
  if (L.pointsEarned > 0 && labels.loyaltyEarnedLine) {
    lines.push(thermalCenter(stripEmojiForThermal(labels.loyaltyEarnedLine(L.pointsEarned))))
  }
  lines.push(thermalCenter(stripEmojiForThermal(labels.loyaltyBalanceLine(L.pointsBalance))))
}

export function buildRetailThermalBonLines(opts: {
  tenantInfo: TenantSettings | null
  order: KassaLastOrderReceipt
  labels: RetailReceiptI18n
  locale: string
  draft?: boolean
}): string[] {
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

  const invoice = order.retailCustomerInvoice
  const receiptRefDisplay = isDraft
    ? '—'
    : order.checkoutReference ?? (order.orderNumber > 0 ? String(order.orderNumber) : '—')
  const refLabel = invoice ? labels.invoiceNo : labels.receiptNo
  const payLabel = payLabelForOrder(order, labels, isDraft)
  const dateStr = order.createdAt.toLocaleString(appLocaleToBcp47(locale), {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

  const bizName = (tenantInfo?.business_name || labels.defaultBusinessName).trim()
  const lines: string[] = []

  lines.push('')
  lines.push(thermalCenter(bizName.toUpperCase()))
  if (tenantInfo?.address) lines.push(thermalCenter(tenantInfo.address.trim()))
  if (tenantInfo?.postal_code || tenantInfo?.city) {
    lines.push(
      thermalCenter(`${tenantInfo.postal_code ?? ''} ${tenantInfo.city ?? ''}`.trim()),
    )
  }
  if (tenantInfo?.phone) {
    lines.push(thermalCenter(`${labels.telPrefix} ${tenantInfo.phone}`.trim()))
  }
  lines.push('')
  lines.push(thermalSep('='))

  if (isDraft) {
    lines.push(thermalCenter(labels.draftBanner.toUpperCase()))
    lines.push(thermalSep('-'))
  }

  if (invoice) {
    lines.push(thermalCenter(labels.invoiceTitle.toUpperCase()))
    lines.push(thermalSep('-'))
    lines.push(invoice.name.trim())
    if (invoice.addressLine) lines.push(invoice.addressLine.trim())
    if (invoice.postalCity) lines.push(invoice.postalCity.trim())
    lines.push(labels.customerVatLabel(invoice.vatNumber))
    lines.push(thermalSep('-'))
  }

  const typePlain = stripEmojiForThermal(labels.orderTypeTakeaway).toUpperCase()
  lines.push(thermalCenter(`>> ${typePlain} <<`))
  lines.push('')
  lines.push(thermalPadRow(`${refLabel}${receiptRefDisplay}`.trim(), dateStr))
  lines.push(thermalSep('-'))

  for (const i of order.items) {
    const choicesTotal = (i.choices || []).reduce((s, c) => s + c.price, 0)
    const lineTotal = (i.product.price + choicesTotal) * i.quantity
    lines.push(thermalItemLine(i.quantity, i.product.name, lineTotal))
  }

  lines.push(thermalSep('-'))
  lines.push(thermalPadRow(labels.subtotal, thermalMoney(subtotal)))
  if (splitOk && order.vatSplit!.length >= 1) {
    for (const row of order.vatSplit!) {
      lines.push(thermalPadRow(labels.vatLabel(row.rate), thermalMoney(row.tax)))
    }
  } else {
    lines.push(thermalPadRow(labels.vatLabel(fbVatRate), thermalMoney(tax)))
  }
  lines.push('')
  lines.push(thermalPadRow(labels.total.toUpperCase(), thermalMoney(order.total)))
  lines.push(thermalSep('='))
  lines.push('')
  lines.push(thermalCenter(`${labels.paidWith} ${payLabel}`))

  appendRetailLoyaltyThermalLines(order, labels, lines)

  if (order.helpedByStaffName?.trim() && labels.helpedByLine) {
    lines.push('')
    lines.push(thermalSep('-'))
    const staffLine = stripEmojiForThermal(labels.helpedByLine(order.helpedByStaffName.trim()))
    if (staffLine.length <= THERMAL_W) {
      lines.push(thermalCenter(staffLine))
    } else {
      lines.push(thermalCenter('Geholpen door:'))
      lines.push(thermalCenter(order.helpedByStaffName.trim()))
    }
  }

  lines.push('')
  lines.push(thermalSep('-'))
  if (tenantInfo?.btw_number) {
    lines.push(thermalCenter(labels.businessVatLabel(tenantInfo.btw_number)))
  }
  lines.push(thermalCenter(isDraft ? labels.draftFooter : labels.thanks))
  if (tenantInfo?.website?.trim()) {
    lines.push(thermalCenter(tenantInfo.website.trim()))
  }
  lines.push('')

  return lines
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
      ${
        order.helpedByStaffName?.trim() && labels.helpedByLine
          ? `<div class="center bold">${escapeReceiptHtml(labels.helpedByLine(order.helpedByStaffName.trim()))}</div>`
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

  const bonLines = buildRetailThermalBonLines({
    tenantInfo,
    order,
    labels,
    locale,
    draft: isDraft,
  })

  const isCash =
    !isDraft && ['CASH', 'cash', 'CONTANT', 'contant'].includes(String(order.paymentMethod || ''))

  /**
   * Geen `orderData` meesturen: de lokale print-agent kiest dan buildRichReceipt (kort)
   * en negeert loyaliteit/medewerker/bedankt uit bonInhoud. Alleen platte bonInhoud = volledige retailbon.
   */
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
