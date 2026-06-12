import type { TenantSettings } from '@/lib/admin-api'
import type { KassaCartItem, KassaLastOrderReceipt } from '@/lib/kassa-cart-types'
import { normalizeCategoryVatPercent } from '@/lib/order-vat'
import { escapeReceiptHtml } from '@/lib/print-receipt-html'
import type { RetailReceiptI18n } from '@/lib/retail-kassa-receipt'
import {
  buildRetailSaleTicketEan13,
  formatEan13Display,
} from '@/lib/retail-kassa/receipt-ticket-barcode'
import {
  buildEan13BarcodeEmailHtml,
  buildEan13BarcodeSvg,
} from '@/lib/retail-loyalty/ean13-barcode-svg'

export const RETAIL_THERMAL_W = 42

export const RETAIL_RECEIPT_PRINT_STYLES = `
      .retail-logo { max-width:128px;max-height:72px;margin:0 auto 6px;display:block;object-fit:contain; }
      .retail-name { font-size:13px;font-weight:bold;margin:4px 0; }
      .retail-tagline { font-size:9px;margin:8px auto 4px;max-width:72mm;line-height:1.35; }
      .retail-header-rule { border-top:2px solid #000;width:36%;margin:8px auto; }
      .col-head { font-weight:bold;font-size:9px;text-transform:uppercase;letter-spacing:0.02em; }
      .item-name { flex:1;padding-right:4px; }
      .item-sub { font-size:9px;color:#333;margin:0 0 2px 0;padding-left:2px; }
      .total-big { font-size:14px;font-weight:bold;margin:8px 0 4px; }
      .vat-block { margin-top:8px; }
      .footer-block { font-size:8px;line-height:1.45;margin-top:10px; }
      .barcode-wrap { margin-top:12px; }
`.trim()

function thermalSep(char: '-' | '=' = '-'): string {
  return char.repeat(RETAIL_THERMAL_W)
}

function thermalSepDashed(): string {
  let s = ''
  while (s.length < RETAIL_THERMAL_W) s += '- '
  return s.slice(0, RETAIL_THERMAL_W)
}

function thermalCenter(text: string): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (!t) return ''
  if (t.length >= RETAIL_THERMAL_W) return t.slice(0, RETAIL_THERMAL_W)
  const pad = Math.floor((RETAIL_THERMAL_W - t.length) / 2)
  return `${' '.repeat(pad)}${t}`
}

function thermalPadRow(left: string, right: string): string {
  const l = left.trim()
  const r = right.trim()
  if (l.length + r.length >= RETAIL_THERMAL_W) {
    return `${l.slice(0, RETAIL_THERMAL_W - r.length - 1)} ${r}`.slice(0, RETAIL_THERMAL_W)
  }
  return l + ' '.repeat(RETAIL_THERMAL_W - l.length - r.length) + r
}

function thermalMoney(amount: number): string {
  return `EUR ${amount.toFixed(2)}`
}

function thermalMoneySigned(amount: number): string {
  const abs = Math.abs(amount)
  const core = thermalMoney(abs)
  return amount < -0.001 ? `-${core}` : core
}

function stripEmojiForThermal(text: string): string {
  return text.replace(/\p{Extended_Pictographic}/gu, '').replace(/\s+/g, ' ').trim()
}

function itemsGrossIncl(order: KassaLastOrderReceipt): number {
  return Math.round(
    order.items.reduce((s, i) => {
      const choicesTotal = (i.choices || []).reduce((c, ch) => c + ch.price, 0)
      return s + (i.product.price + choicesTotal) * i.quantity
    }, 0) * 100,
  ) / 100
}

function retailSocialChannels(tenantInfo: TenantSettings | null): string[] {
  const ch: string[] = []
  if (tenantInfo?.instagram_url?.trim()) ch.push('Instagram')
  if (tenantInfo?.facebook_url?.trim()) ch.push('Facebook')
  if (tenantInfo?.tiktok_url?.trim()) ch.push('TikTok')
  return ch
}

function retailFooterReturnsText(
  tenantInfo: TenantSettings | null,
  labels: RetailReceiptI18n,
): string | null {
  const email = tenantInfo?.email?.trim()
  if (!email || !labels.receiptFooterReturns) return null
  return labels.receiptFooterReturns.replace('{email}', email)
}

function retailFooterSocialText(
  tenantInfo: TenantSettings | null,
  labels: RetailReceiptI18n,
): string | null {
  const channels = retailSocialChannels(tenantInfo)
  if (channels.length === 0 || !labels.receiptFooterSocial) return null
  return labels.receiptFooterSocial.replace('{channels}', channels.join(', '))
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

function appendRetailFooterThermal(
  tenantInfo: TenantSettings | null,
  labels: RetailReceiptI18n,
  isDraft: boolean,
  lines: string[],
): void {
  const tagline = tenantInfo?.tagline?.trim()
  lines.push('')
  lines.push(thermalSep('-'))
  if (tagline) {
    lines.push(thermalCenter(stripEmojiForThermal(tagline)))
    lines.push('')
  }
  if (tenantInfo?.btw_number) {
    lines.push(thermalCenter(labels.businessVatLabel(tenantInfo.btw_number)))
  }
  const thanks = isDraft ? labels.draftFooter : labels.thanks
  lines.push(thermalCenter(stripEmojiForThermal(thanks)))
  const returns = retailFooterReturnsText(tenantInfo, labels)
  if (returns) {
    lines.push('')
    for (const part of wrapThermalCenterParagraph(returns, RETAIL_THERMAL_W - 2)) {
      lines.push(thermalCenter(part))
    }
  }
  const social = retailFooterSocialText(tenantInfo, labels)
  if (social) {
    lines.push('')
    for (const part of wrapThermalCenterParagraph(social, RETAIL_THERMAL_W - 2)) {
      lines.push(thermalCenter(part))
    }
  }
  if (tenantInfo?.website?.trim()) {
    lines.push('')
    lines.push(thermalCenter(tenantInfo.website.trim()))
  }
}

function wrapThermalCenterParagraph(text: string, maxLen: number): string[] {
  const words = text.split(/\s+/)
  const out: string[] = []
  let line = ''
  for (const w of words) {
    const next = line ? `${line} ${w}` : w
    if (next.length <= maxLen) {
      line = next
    } else {
      if (line) out.push(line)
      line = w.length > maxLen ? w.slice(0, maxLen - 1) + '.' : w
    }
  }
  if (line) out.push(line)
  return out
}

function thermalItemLines(item: KassaCartItem): string[] {
  const lines: string[] = []
  const choicesTotal = (item.choices || []).reduce((s, c) => s + c.price, 0)
  const unitIncl = item.product.price + choicesTotal
  const lineTotal = unitIncl * item.quantity
  const name = item.product.name.trim()
  lines.push(thermalPadRow(name, thermalMoney(lineTotal)))
  if (item.quantity > 1) {
    lines.push(thermalPadRow(`  ${item.quantity}x ${unitIncl.toFixed(2)}`, ''))
  }
  for (const c of item.choices || []) {
    const label = c.choiceName
    const extra = c.price > 0 ? thermalMoney(c.price) : ''
    lines.push(thermalPadRow(`  + ${label}`, extra))
  }
  return lines
}

export function buildRetailThermalBonLines(opts: {
  tenantInfo: TenantSettings | null
  order: KassaLastOrderReceipt
  labels: RetailReceiptI18n
  locale: string
  draft?: boolean
  dateStr: string
}): string[] {
  const { tenantInfo, order, labels, dateStr } = opts
  const isDraft = !!opts.draft
  const fbVatRate = normalizeCategoryVatPercent(tenantInfo?.btw_percentage ?? 21, 21)
  const splitOk =
    Array.isArray(order.vatSplit) &&
    order.vatSplit.length > 0 &&
    typeof order.subtotalExclVat === 'number' &&
    typeof order.totalTax === 'number'
  let tax: number
  const vatRows: { rate: number; tax: number }[] = []
  if (splitOk) {
    tax = Math.round((order.totalTax as number) * 100) / 100
    for (const row of order.vatSplit!) {
      vatRows.push({ rate: row.rate, tax: row.tax })
    }
  } else {
    tax = Math.round((order.total - order.total / (1 + fbVatRate / 100)) * 100) / 100
    vatRows.push({ rate: fbVatRate, tax })
  }

  const invoice = order.retailCustomerInvoice
  const receiptRefDisplay = isDraft
    ? '—'
    : order.checkoutReference ?? (order.orderNumber > 0 ? String(order.orderNumber) : '—')
  const payLabel = isDraft ? labels.draftNotPaid : payLabelFromOrder(order, labels)

  const bizName = (tenantInfo?.business_name || labels.defaultBusinessName).trim()
  const lines: string[] = []
  const discountEuro = Math.round((itemsGrossIncl(order) - order.total) * 100) / 100

  lines.push('')
  lines.push(thermalCenter(bizName))
  if (tenantInfo?.address) lines.push(thermalCenter(tenantInfo.address.trim()))
  if (tenantInfo?.postal_code || tenantInfo?.city) {
    lines.push(thermalCenter(`${tenantInfo.postal_code ?? ''} ${tenantInfo.city ?? ''}`.trim()))
  }
  lines.push('')
  lines.push(thermalCenter('='.repeat(12)))

  const tagline = tenantInfo?.tagline?.trim()
  if (isDraft) {
    lines.push(thermalCenter(labels.draftBanner.toUpperCase()))
  } else if (tagline) {
    lines.push(thermalCenter(stripEmojiForThermal(tagline)))
  }
  lines.push('')

  if (invoice) {
    lines.push(thermalCenter(labels.invoiceTitle.toUpperCase()))
    lines.push(thermalSep('-'))
    lines.push(invoice.name.trim())
    if (invoice.addressLine) lines.push(invoice.addressLine.trim())
    if (invoice.postalCity) lines.push(invoice.postalCity.trim())
    lines.push(labels.customerVatLabel(invoice.vatNumber))
    lines.push(thermalSep('-'))
  }

  lines.push(thermalPadRow(labels.receiptColOrder, labels.receiptColDateTime))
  lines.push(thermalPadRow(String(receiptRefDisplay), dateStr))
  lines.push(thermalSep('-'))
  lines.push(thermalPadRow(labels.receiptColProduct, labels.receiptColPrice))

  for (const item of order.items) {
    lines.push(...thermalItemLines(item))
  }

  if (discountEuro > 0.009) {
    lines.push(thermalPadRow(labels.receiptDiscount, thermalMoneySigned(-discountEuro)))
  }

  lines.push(thermalSepDashed())
  lines.push(thermalPadRow(labels.total.toUpperCase(), thermalMoney(order.total)))
  lines.push(thermalSep('-'))
  lines.push(thermalCenter(`${labels.paidWith} ${payLabel}`))

  appendRetailLoyaltyThermalLines(order, labels, lines)

  if (order.helpedByStaffName?.trim() && labels.helpedByLine) {
    lines.push('')
    const staffLine = stripEmojiForThermal(labels.helpedByLine(order.helpedByStaffName.trim()))
    lines.push(thermalCenter(staffLine.length <= RETAIL_THERMAL_W ? staffLine : order.helpedByStaffName.trim()))
  }

  lines.push('')
  lines.push(thermalSep('-'))
  lines.push(thermalPadRow(labels.receiptColVatRate, labels.receiptColPrice))
  for (const row of vatRows) {
    lines.push(thermalPadRow(`${row.rate}%`, thermalMoney(row.tax)))
  }
  lines.push(thermalPadRow(labels.receiptVatSectionTotal, thermalMoney(tax)))

  appendRetailFooterThermal(tenantInfo, labels, isDraft, lines)

  const ean = isDraft ? null : buildRetailSaleTicketEan13(order.orderNumber)
  if (ean) {
    lines.push('')
    lines.push(thermalCenter(formatEan13Display(ean)))
  }
  lines.push('')

  return lines
}

function payLabelFromOrder(order: KassaLastOrderReceipt, labels: RetailReceiptI18n): string {
  if (order.paymentMethod === 'SPLIT') {
    return labels.paidSplit((order.splitCash ?? 0).toFixed(2), (order.splitCard ?? 0).toFixed(2))
  }
  if (order.paymentMethod === 'CASH') return labels.payCash
  if (order.paymentMethod === 'CARD') return labels.payCard
  if (order.paymentMethod === 'IDEAL') return labels.payIdeal
  return labels.payBancontact
}

export function retailTicketEanForOrder(order: KassaLastOrderReceipt, isDraft: boolean): string | null {
  if (isDraft) return null
  return buildRetailSaleTicketEan13(order.orderNumber)
}

export function retailTicketBarcodeHtmlBlock(ean: string): string {
  const svg = buildEan13BarcodeSvg(ean, { barHeight: 64, moduleWidth: 2, showCodeText: true })
  if (svg) {
    return `<div class="center barcode-wrap">${svg}</div>`
  }
  const table = buildEan13BarcodeEmailHtml(ean, { barHeightPx: 64, moduleWidthPx: 2 })
  if (table) {
    return `<div class="center barcode-wrap">${table}</div>`
  }
  return `<div class="center small">${escapeReceiptHtml(formatEan13Display(ean))}</div>`
}

export function buildRetailKassaReceiptHtmlBody(opts: {
  tenantInfo: TenantSettings | null
  order: KassaLastOrderReceipt
  labels: RetailReceiptI18n
  isDraft: boolean
  dateStr: string
}): string {
  const { tenantInfo, order, labels, isDraft, dateStr } = opts
  const fbVatRate = normalizeCategoryVatPercent(tenantInfo?.btw_percentage ?? 21, 21)
  const splitOk =
    Array.isArray(order.vatSplit) &&
    order.vatSplit.length > 0 &&
    typeof order.totalTax === 'number'
  const vatRows: { rate: number; tax: number }[] = []
  let tax: number
  if (splitOk) {
    tax = Math.round((order.totalTax as number) * 100) / 100
    for (const row of order.vatSplit!) {
      vatRows.push({ rate: row.rate, tax: row.tax })
    }
  } else {
    tax = Math.round((order.total - order.total / (1 + fbVatRate / 100)) * 100) / 100
    vatRows.push({ rate: fbVatRate, tax })
  }

  const invoice = order.retailCustomerInvoice
  const receiptRefDisplay = isDraft
    ? '—'
    : order.checkoutReference ?? (order.orderNumber > 0 ? String(order.orderNumber) : '—')
  const payLabel = isDraft ? labels.draftNotPaid : payLabelFromOrder(order, labels)
  const discountEuro = Math.round((itemsGrossIncl(order) - order.total) * 100) / 100
  const bizName = escapeReceiptHtml(tenantInfo?.business_name || labels.defaultBusinessName)
  const logoUrl = tenantInfo?.logo_url?.trim()
  const tagline = tenantInfo?.tagline?.trim()

  const itemsHtml = order.items
    .map((i) => {
      const choicesTotal = (i.choices || []).reduce((s, c) => s + c.price, 0)
      const unitIncl = i.product.price + choicesTotal
      const lineTotal = unitIncl * i.quantity
      const subs: string[] = []
      if (i.quantity > 1) {
        subs.push(`<div class="item-sub">${i.quantity}x ${unitIncl.toFixed(2)}</div>`)
      }
      for (const c of i.choices || []) {
        const label = escapeReceiptHtml(c.choiceName)
        const price =
          c.price > 0 ? `<span>€${c.price.toFixed(2)}</span>` : ''
        subs.push(`<div class="row item-sub"><span class="item-name">+ ${label}</span>${price}</div>`)
      }
      return `<div class="row"><span class="item-name">${escapeReceiptHtml(i.product.name)}</span><span>€${lineTotal.toFixed(2)}</span></div>${subs.join('')}`
    })
    .join('')

  const loyaltyHtml =
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

  const returns = retailFooterReturnsText(tenantInfo, labels)
  const social = retailFooterSocialText(tenantInfo, labels)
  const ticketEan = retailTicketEanForOrder(order, isDraft)

  return `
      <div class="center">
        ${
          logoUrl
            ? `<img class="retail-logo" src="${String(logoUrl).replace(/&/g, '&amp;').replace(/"/g, '&quot;')}" alt="" />`
            : ''
        }
        <div class="retail-name">${bizName}</div>
        ${tenantInfo?.address ? `<div class="small">${escapeReceiptHtml(tenantInfo.address)}</div>` : ''}
        ${
          tenantInfo?.postal_code || tenantInfo?.city
            ? `<div class="small">${escapeReceiptHtml(tenantInfo.postal_code ?? '')} ${escapeReceiptHtml(tenantInfo.city ?? '')}</div>`
            : ''
        }
      </div>
      <div class="retail-header-rule"></div>
      ${
        isDraft
          ? `<div class="center bold small">${escapeReceiptHtml(labels.draftBanner)}</div>`
          : tagline
            ? `<div class="center retail-tagline">${escapeReceiptHtml(tagline)}</div>`
            : ''
      }
      ${
        invoice
          ? `<div class="divider-solid"></div>
      <div class="center bold">${escapeReceiptHtml(labels.invoiceTitle)}</div>
      <div class="small">${escapeReceiptHtml(invoice.name)}</div>
      ${invoice.addressLine ? `<div class="small">${escapeReceiptHtml(invoice.addressLine)}</div>` : ''}
      ${invoice.postalCity ? `<div class="small">${escapeReceiptHtml(invoice.postalCity)}</div>` : ''}
      <div class="small bold">${escapeReceiptHtml(labels.customerVatLabel(invoice.vatNumber))}</div>
      <div class="divider-solid"></div>`
          : ''
      }
      <div class="row col-head"><span>${escapeReceiptHtml(labels.receiptColOrder)}</span><span>${escapeReceiptHtml(labels.receiptColDateTime)}</span></div>
      <div class="row"><span>${escapeReceiptHtml(String(receiptRefDisplay))}</span><span>${escapeReceiptHtml(dateStr)}</span></div>
      <div class="divider-solid"></div>
      <div class="row col-head"><span>${escapeReceiptHtml(labels.receiptColProduct)}</span><span>${escapeReceiptHtml(labels.receiptColPrice)}</span></div>
      ${itemsHtml}
      ${
        discountEuro > 0.009
          ? `<div class="row"><span>${escapeReceiptHtml(labels.receiptDiscount)}</span><span>-€${discountEuro.toFixed(2)}</span></div>`
          : ''
      }
      <div class="divider"></div>
      <div class="row total-big"><span>${escapeReceiptHtml(labels.total)}</span><span>€${order.total.toFixed(2)}</span></div>
      <div class="divider-solid"></div>
      <div class="center small">${escapeReceiptHtml(labels.paidWith)} ${escapeReceiptHtml(payLabel)}</div>
      ${loyaltyHtml}
      ${
        order.helpedByStaffName?.trim() && labels.helpedByLine
          ? `<div class="center small bold">${escapeReceiptHtml(labels.helpedByLine(order.helpedByStaffName.trim()))}</div>`
          : ''
      }
      <div class="vat-block">
        <div class="row col-head"><span>${escapeReceiptHtml(labels.receiptColVatRate)}</span><span>${escapeReceiptHtml(labels.receiptColPrice)}</span></div>
        ${vatRows
          .map(
            (row) =>
              `<div class="row"><span>${row.rate}%</span><span>€${row.tax.toFixed(2)}</span></div>`,
          )
          .join('')}
        <div class="row bold"><span>${escapeReceiptHtml(labels.receiptVatSectionTotal)}</span><span>€${tax.toFixed(2)}</span></div>
      </div>
      <div class="divider-solid"></div>
      <div class="center footer-block">
        ${tenantInfo?.btw_number ? `<div>${escapeReceiptHtml(labels.businessVatLabel(tenantInfo.btw_number))}</div>` : ''}
        <div>${escapeReceiptHtml(isDraft ? labels.draftFooter : labels.thanks)}</div>
        ${returns ? `<div style="margin-top:6px;">${escapeReceiptHtml(returns)}</div>` : ''}
        ${social ? `<div style="margin-top:6px;">${escapeReceiptHtml(social)}</div>` : ''}
        ${tenantInfo?.website?.trim() ? `<div style="margin-top:4px;">${escapeReceiptHtml(tenantInfo.website.trim())}</div>` : ''}
      </div>
      ${ticketEan ? retailTicketBarcodeHtmlBlock(ticketEan) : ''}`
}
