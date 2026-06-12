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

/** ZZP-centrum stijl — zwarte balken, kolommen, geen tafelregel. */
export const RETAIL_RECEIPT_PRINT_STYLES = `
      body { font-family: Helvetica, Arial, sans-serif; font-size:11px; line-height:1.35; color:#000; }
      .retail-logo { max-width:120px;max-height:64px;margin:0 auto 8px;display:block;object-fit:contain; }
      .retail-name { font-size:14px;font-weight:600;margin:2px 0;text-transform:lowercase; }
      .retail-header { text-align:center;margin-bottom:10px; }
      .retail-header .small { font-size:10px;line-height:1.4; }
      .meta-row { display:flex;justify-content:space-between;align-items:baseline;font-size:10px;margin:8px 0 4px; }
      .rule-thin { border:none;border-top:1px solid #000;margin:6px 0; }
      .rule-double { border:none;border-top:3px double #000;margin:10px 0 8px; }
      .retail-item { display:grid;grid-template-columns:22px 1fr auto;gap:4px;align-items:baseline;margin:3px 0;font-size:11px; }
      .retail-item-qty { text-align:left; }
      .retail-item-name { text-align:left;word-break:break-word; }
      .retail-item-price { font-weight:800;text-align:right;white-space:nowrap; }
      .retail-bar { background:#000;color:#fff;font-weight:700;font-size:11px;padding:5px 8px;margin:10px 0 6px;text-align:left;letter-spacing:0.02em; }
      .retail-grand { display:flex;justify-content:space-between;align-items:baseline;font-size:22px;font-weight:900;margin:4px 0 8px;letter-spacing:-0.02em; }
      .retail-grand .amount { font-weight:900; }
      .pay-row { display:flex;justify-content:space-between;font-size:11px;margin:2px 0; }
      .vat-head, .vat-row { display:grid;grid-template-columns:1.1fr 0.9fr 1fr 1fr;gap:4px;font-size:9px;margin:2px 0; }
      .vat-head { font-weight:700;margin-bottom:4px; }
      .vat-total-line { font-size:10px;margin-top:6px; }
      .footer-thanks { text-align:center;font-size:10px;margin-top:12px;line-height:1.45; }
      .footer-website { text-align:center;font-size:10px;margin-top:4px; }
      .loyalty-block { font-size:10px;margin:8px 0;text-align:center; }
      .barcode-wrap { margin-top:14px;text-align:center; }
      .draft-banner { text-align:center;font-weight:700;font-size:10px;margin:6px 0;color:#b45309; }
`.trim()

export type RetailVatDisplayRow = {
  rate: number
  tax: number
  excl: number
  incl: number
}

function formatAmountComma(amount: number): string {
  return amount.toFixed(2).replace('.', ',')
}

function formatAmountEuroHtml(amount: number): string {
  return `€&nbsp;${formatAmountComma(amount)}`
}

function thermalSepThin(): string {
  return '-'.repeat(RETAIL_THERMAL_W)
}

function thermalBlackBar(label: string): string[] {
  const fill = '#'.repeat(RETAIL_THERMAL_W)
  const text = ` ${label.trim()}`.slice(0, RETAIL_THERMAL_W)
  return [fill, text.padEnd(RETAIL_THERMAL_W, ' '), fill]
}

function thermalPadRow(left: string, right: string): string {
  const l = left.trim()
  const r = right.trim()
  if (l.length + r.length >= RETAIL_THERMAL_W) {
    return `${l.slice(0, RETAIL_THERMAL_W - r.length - 1)} ${r}`.slice(0, RETAIL_THERMAL_W)
  }
  return l + ' '.repeat(RETAIL_THERMAL_W - l.length - r.length) + r
}

function thermalCenter(text: string): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (!t) return ''
  if (t.length >= RETAIL_THERMAL_W) return t.slice(0, RETAIL_THERMAL_W)
  const pad = Math.floor((RETAIL_THERMAL_W - t.length) / 2)
  return `${' '.repeat(pad)}${t}`
}

function thermalItemRow(qty: number, name: string, lineTotal: number): string {
  const price = formatAmountComma(lineTotal)
  const q = String(qty)
  const priceField = price.padStart(7)
  const maxName = RETAIL_THERMAL_W - q.length - 1 - priceField.length - 1
  let n = name.trim()
  if (maxName > 2 && n.length > maxName) n = `${n.slice(0, maxName - 1)}.`
  const gap = RETAIL_THERMAL_W - q.length - 1 - n.length - priceField.length
  return `${q} ${n}${' '.repeat(Math.max(1, gap))}${priceField}`
}

function thermalVatRow(row: RetailVatDisplayRow): string {
  const pct = `${formatAmountComma(row.rate)}%`.padStart(7)
  const tax = formatAmountComma(row.tax).padStart(6)
  const excl = formatAmountComma(row.excl).padStart(7)
  const incl = formatAmountComma(row.incl).padStart(7)
  return `${pct} ${tax} ${excl} ${incl}`.slice(0, RETAIL_THERMAL_W)
}

function itemsGrossIncl(order: KassaLastOrderReceipt): number {
  return Math.round(
    order.items.reduce((s, i) => {
      const choicesTotal = (i.choices || []).reduce((c, ch) => c + ch.price, 0)
      return s + (i.product.price + choicesTotal) * i.quantity
    }, 0) * 100,
  ) / 100
}

function buildVatDisplayRows(
  order: KassaLastOrderReceipt,
  fbVatRate: number,
): { rows: RetailVatDisplayRow[]; taxTotal: number } {
  const splitOk =
    Array.isArray(order.vatSplit) &&
    order.vatSplit.length > 0 &&
    typeof order.totalTax === 'number'
  if (splitOk) {
    const rows = order.vatSplit!.map((r) => {
      const excl = Math.round(r.baseExcl * 100) / 100
      const tax = Math.round(r.tax * 100) / 100
      return {
        rate: r.rate,
        tax,
        excl,
        incl: Math.round((excl + tax) * 100) / 100,
      }
    })
    const taxTotal = Math.round((order.totalTax as number) * 100) / 100
    return { rows, taxTotal }
  }
  const incl = order.total
  const excl = Math.round((incl / (1 + fbVatRate / 100)) * 100) / 100
  const tax = Math.round((incl - excl) * 100) / 100
  return {
    rows: [{ rate: fbVatRate, tax, excl, incl }],
    taxTotal: tax,
  }
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

function stripEmojiForThermal(text: string): string {
  return text.replace(/\p{Extended_Pictographic}/gu, '').replace(/\s+/g, ' ').trim()
}

function appendRetailLoyaltyThermal(
  order: KassaLastOrderReceipt,
  labels: RetailReceiptI18n,
  lines: string[],
): void {
  const L = order.retailLoyalty
  if (!L || !labels.loyaltyBalanceLine) return
  lines.push('')
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
  dateStr: string
}): string[] {
  const { tenantInfo, order, labels, dateStr } = opts
  const isDraft = !!opts.draft
  const fbVatRate = normalizeCategoryVatPercent(tenantInfo?.btw_percentage ?? 21, 21)
  const { rows: vatRows, taxTotal } = buildVatDisplayRows(order, fbVatRate)

  const receiptRefDisplay = isDraft
    ? '—'
    : order.checkoutReference ?? (order.orderNumber > 0 ? String(order.orderNumber) : '—')
  const payLabel = isDraft ? labels.draftNotPaid : payMethodShort(order, labels)
  const bizName = (tenantInfo?.business_name || labels.defaultBusinessName).trim()
  const discountEuro = Math.round((itemsGrossIncl(order) - order.total) * 100) / 100
  const lines: string[] = []

  lines.push('')
  lines.push(thermalCenter(bizName))
  if (tenantInfo?.address) lines.push(thermalCenter(tenantInfo.address.trim()))
  if (tenantInfo?.postal_code || tenantInfo?.city) {
    lines.push(
      thermalCenter(`${tenantInfo.postal_code ?? ''} ${tenantInfo.city ?? ''}`.trim()),
    )
  }
  if (tenantInfo?.phone?.trim()) {
    lines.push(thermalCenter(`${labels.telPrefix} ${tenantInfo.phone.trim()}`))
  }
  lines.push('')

  if (isDraft) {
    lines.push(thermalCenter(labels.draftBanner.toUpperCase()))
    lines.push('')
  }

  const invoice = order.retailCustomerInvoice
  if (invoice) {
    lines.push(thermalCenter(labels.invoiceTitle.toUpperCase()))
    lines.push(invoice.name.trim())
    if (invoice.addressLine) lines.push(invoice.addressLine.trim())
    if (invoice.postalCity) lines.push(invoice.postalCity.trim())
    lines.push(labels.customerVatLabel(invoice.vatNumber))
    lines.push(thermalSepThin())
  }

  lines.push(
    thermalPadRow(`${labels.receiptBonNrPrefix}${receiptRefDisplay}`, dateStr),
  )
  lines.push(thermalSepThin())

  for (const item of order.items) {
    const choicesTotal = (item.choices || []).reduce((s, c) => s + c.price, 0)
    const unitIncl = item.product.price + choicesTotal
    const lineTotal = unitIncl * item.quantity
    lines.push(thermalItemRow(item.quantity, item.product.name, lineTotal))
    for (const c of item.choices || []) {
      lines.push(thermalPadRow(`  + ${c.choiceName}`, c.price > 0 ? formatAmountComma(c.price) : ''))
    }
  }

  if (discountEuro > 0.009) {
    lines.push(thermalPadRow(labels.receiptDiscount, `-${formatAmountComma(discountEuro)}`))
  }

  lines.push(...thermalBlackBar(labels.totalsBarLabel))
  lines.push(
    thermalPadRow(
      labels.total.toUpperCase(),
      `EUR ${formatAmountComma(order.total)}`,
    ),
  )
  lines.push(thermalSepThin())
  lines.push(thermalPadRow(labels.receivedLabel, formatAmountComma(order.total)))
  lines.push(thermalPadRow(labels.changeLabel, formatAmountComma(0)))
  lines.push(thermalPadRow(labels.paymentMethodLabel, payLabel))
  lines.push(thermalSepThin())
  lines.push(thermalSepThin())

  const vh = `${labels.vatColBtwPct} ${labels.vatColBtw} ${labels.vatColExcl} ${labels.vatColIncl}`
  lines.push(vh.slice(0, RETAIL_THERMAL_W))
  for (const row of vatRows) {
    lines.push(thermalVatRow(row))
  }
  lines.push(labels.vatTotalLine(formatAmountComma(taxTotal)))

  appendRetailLoyaltyThermal(order, labels, lines)

  if (order.helpedByStaffName?.trim() && labels.helpedByLine) {
    lines.push('')
    lines.push(thermalCenter(stripEmojiForThermal(labels.helpedByLine(order.helpedByStaffName.trim()))))
  }

  lines.push('')
  lines.push(thermalCenter(isDraft ? labels.draftFooter : labels.thanks))
  if (tenantInfo?.website?.trim()) {
    lines.push(thermalCenter(tenantInfo.website.trim()))
  }

  const ean = isDraft ? null : buildRetailSaleTicketEan13(order.orderNumber)
  if (ean) {
    lines.push('')
    lines.push(thermalCenter(formatEan13Display(ean)))
  }
  lines.push('')

  return lines
}

export function retailTicketEanForOrder(order: KassaLastOrderReceipt, isDraft: boolean): string | null {
  if (isDraft) return null
  return buildRetailSaleTicketEan13(order.orderNumber)
}

export function retailTicketBarcodeHtmlBlock(ean: string): string {
  const svg = buildEan13BarcodeSvg(ean, { barHeight: 64, moduleWidth: 2, showCodeText: true })
  if (svg) {
    return `<div class="barcode-wrap">${svg}</div>`
  }
  const table = buildEan13BarcodeEmailHtml(ean, { barHeightPx: 64, moduleWidthPx: 2 })
  if (table) {
    return `<div class="barcode-wrap">${table}</div>`
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
  const { rows: vatRows, taxTotal } = buildVatDisplayRows(order, fbVatRate)
  const receiptRefDisplay = isDraft
    ? '—'
    : order.checkoutReference ?? (order.orderNumber > 0 ? String(order.orderNumber) : '—')
  const payLabel = isDraft ? labels.draftNotPaid : payMethodShort(order, labels)
  const discountEuro = Math.round((itemsGrossIncl(order) - order.total) * 100) / 100
  const bizName = escapeReceiptHtml(tenantInfo?.business_name || labels.defaultBusinessName)
  const logoUrl = tenantInfo?.logo_url?.trim()
  const ticketEan = retailTicketEanForOrder(order, isDraft)

  const itemsHtml = order.items
    .map((i) => {
      const choicesTotal = (i.choices || []).reduce((s, c) => s + c.price, 0)
      const unitIncl = i.product.price + choicesTotal
      const lineTotal = unitIncl * i.quantity
      const extras = (i.choices || [])
        .map(
          (c) =>
            `<div class="retail-item" style="grid-template-columns:22px 1fr auto;"><span></span><span class="retail-item-name">+ ${escapeReceiptHtml(c.choiceName)}</span><span class="retail-item-price">${c.price > 0 ? formatAmountComma(c.price) : ''}</span></div>`,
        )
        .join('')
      return `<div class="retail-item"><span class="retail-item-qty">${i.quantity}</span><span class="retail-item-name">${escapeReceiptHtml(i.product.name)}</span><span class="retail-item-price">${formatAmountComma(lineTotal)}</span></div>${extras}`
    })
    .join('')

  const loyaltyHtml =
    order.retailLoyalty && labels.loyaltyBalanceLine
      ? (() => {
          const L = order.retailLoyalty!
          const parts: string[] = ['<div class="loyalty-block">']
          if (L.memberLabel && labels.loyaltyPassLabel) {
            parts.push(`<div class="bold">${escapeReceiptHtml(labels.loyaltyPassLabel(L.memberLabel))}</div>`)
          }
          if (L.pointsRedeemed > 0 && labels.loyaltyRedeemedLine) {
            parts.push(`<div>${escapeReceiptHtml(labels.loyaltyRedeemedLine(L.pointsRedeemed))}</div>`)
          }
          if (L.pointsEarned > 0 && labels.loyaltyEarnedLine) {
            parts.push(`<div>${escapeReceiptHtml(labels.loyaltyEarnedLine(L.pointsEarned))}</div>`)
          }
          parts.push(`<div class="bold">${escapeReceiptHtml(labels.loyaltyBalanceLine(L.pointsBalance))}</div></div>`)
          return parts.join('')
        })()
      : ''

  const invoice = order.retailCustomerInvoice

  return `
      <div class="retail-header">
        ${
          logoUrl
            ? `<img class="retail-logo" src="${String(logoUrl).replace(/&/g, '&amp;').replace(/"/g, '&quot;')}" alt="" />`
            : ''
        }
        <div class="retail-name">${bizName}</div>
        ${tenantInfo?.address ? `<div class="small">${escapeReceiptHtml(tenantInfo.address)}</div>` : ''}
        ${
          tenantInfo?.postal_code || tenantInfo?.city
            ? `<div class="small">${escapeReceiptHtml(`${tenantInfo.postal_code ?? ''} ${tenantInfo.city ?? ''}`.trim())}</div>`
            : ''
        }
        ${
          tenantInfo?.phone?.trim()
            ? `<div class="small">${escapeReceiptHtml(labels.telPrefix)} ${escapeReceiptHtml(tenantInfo.phone.trim())}</div>`
            : ''
        }
      </div>
      ${isDraft ? `<div class="draft-banner">${escapeReceiptHtml(labels.draftBanner)}</div>` : ''}
      ${
        invoice
          ? `<hr class="rule-thin" />
      <div class="bold center">${escapeReceiptHtml(labels.invoiceTitle)}</div>
      <div class="small">${escapeReceiptHtml(invoice.name)}</div>
      ${invoice.addressLine ? `<div class="small">${escapeReceiptHtml(invoice.addressLine)}</div>` : ''}
      ${invoice.postalCity ? `<div class="small">${escapeReceiptHtml(invoice.postalCity)}</div>` : ''}
      <div class="small bold">${escapeReceiptHtml(labels.customerVatLabel(invoice.vatNumber))}</div>`
          : ''
      }
      <div class="meta-row">
        <span>${escapeReceiptHtml(labels.receiptBonNrPrefix)}${escapeReceiptHtml(String(receiptRefDisplay))}</span>
        <span>${escapeReceiptHtml(dateStr)}</span>
      </div>
      <hr class="rule-thin" />
      ${itemsHtml}
      ${
        discountEuro > 0.009
          ? `<div class="pay-row"><span>${escapeReceiptHtml(labels.receiptDiscount)}</span><span>-${formatAmountComma(discountEuro)}</span></div>`
          : ''
      }
      <div class="retail-bar">${escapeReceiptHtml(labels.totalsBarLabel)}</div>
      <div class="retail-grand">
        <span>${escapeReceiptHtml(labels.total.toUpperCase())}</span>
        <span class="amount">${formatAmountEuroHtml(order.total)}</span>
      </div>
      <hr class="rule-thin" />
      <div class="pay-row"><span>${escapeReceiptHtml(labels.receivedLabel)}</span><span>${formatAmountComma(order.total)}</span></div>
      <div class="pay-row"><span>${escapeReceiptHtml(labels.changeLabel)}</span><span>${formatAmountComma(0)}</span></div>
      <div class="pay-row"><span>${escapeReceiptHtml(labels.paymentMethodLabel)}</span><span>${escapeReceiptHtml(payLabel)}</span></div>
      <hr class="rule-double" />
      <div class="vat-head">
        <span>${escapeReceiptHtml(labels.vatColBtwPct)}</span>
        <span>${escapeReceiptHtml(labels.vatColBtw)}</span>
        <span>${escapeReceiptHtml(labels.vatColExcl)}</span>
        <span>${escapeReceiptHtml(labels.vatColIncl)}</span>
      </div>
      ${vatRows
        .map(
          (row) =>
            `<div class="vat-row"><span>${formatAmountComma(row.rate)}%</span><span>${formatAmountComma(row.tax)}</span><span>${formatAmountComma(row.excl)}</span><span>${formatAmountComma(row.incl)}</span></div>`,
        )
        .join('')}
      <div class="vat-total-line">${escapeReceiptHtml(labels.vatTotalLine(formatAmountComma(taxTotal)))}</div>
      ${loyaltyHtml}
      ${
        order.helpedByStaffName?.trim() && labels.helpedByLine
          ? `<div class="footer-thanks bold">${escapeReceiptHtml(labels.helpedByLine(order.helpedByStaffName.trim()))}</div>`
          : ''
      }
      <div class="footer-thanks">${escapeReceiptHtml(isDraft ? labels.draftFooter : labels.thanks)}</div>
      ${tenantInfo?.website?.trim() ? `<div class="footer-website">${escapeReceiptHtml(tenantInfo.website.trim())}</div>` : ''}
      ${ticketEan ? retailTicketBarcodeHtmlBlock(ticketEan) : ''}`
}
