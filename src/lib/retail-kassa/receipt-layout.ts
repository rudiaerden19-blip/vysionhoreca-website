import type { TenantSettings } from '@/lib/admin-api'
import type { KassaLastOrderReceipt } from '@/lib/kassa-cart-types'
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
      body { font-family: 'Courier New', Courier, monospace; font-size:11px; line-height:1.4; color:#000; }
      .retail-header { font-family: Helvetica, Arial, sans-serif; text-align:center; margin-bottom:8px; }
      .retail-logo { max-width:120px;max-height:64px;margin:0 auto 8px;display:block;object-fit:contain; }
      .retail-name { font-size:14px;font-weight:700;margin:2px 0; }
      .retail-header .small { font-size:10px;line-height:1.45; }
      .meta-row { display:flex;justify-content:space-between;align-items:baseline;font-size:10px;margin:10px 0 6px; }
      .black-bar { background:#000;color:#fff;font-weight:700;font-size:13px;padding:3px 6px;margin:8px 0 5px 0;width:100%;box-sizing:border-box;text-transform:uppercase; }
      .black-bar:first-of-type { margin-top:4px; }
      .retail-item { display:grid;grid-template-columns:20px 1fr auto;gap:6px;align-items:baseline;margin:4px 0;font-size:11px; }
      .retail-item-extra { padding-left:26px;margin:2px 0;font-size:10px; }
      .amt { font-family:'Courier New',Courier,monospace;font-weight:700;text-align:right;white-space:nowrap; }
      .money-row { display:flex;justify-content:space-between;align-items:baseline;margin:3px 0;font-size:11px; }
      .money-row .amt { min-width:9ch; }
      .retail-grand { display:flex;justify-content:space-between;align-items:baseline;font-size:24px;font-weight:900;margin:10px 0;padding:4px 0;line-height:1.1; }
      .retail-grand .amt { font-size:24px;font-weight:900; }
      .pay-line { margin:4px 0;font-size:11px; }
      .vat-head, .vat-row { display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;font-size:10px;margin:3px 0; }
      .vat-head { font-weight:700;margin-bottom:6px; }
      .vat-head span, .vat-row span { text-align:right; }
      .vat-head span:first-child, .vat-row span:first-child { text-align:left; }
      .footer-thanks { text-align:center;font-family:Helvetica,Arial,sans-serif;font-size:10px;margin-top:14px;line-height:1.5; }
      .footer-website { text-align:center;font-size:10px;margin-top:6px; }
      .loyalty-block { font-size:10px;margin:10px 0;text-align:center;font-family:Helvetica,Arial,sans-serif; }
      .barcode-wrap { margin-top:14px;text-align:center; }
      .draft-banner { text-align:center;font-weight:700;font-size:10px;margin:6px 0;color:#b45309;font-family:Helvetica,Arial,sans-serif; }
      @media print { .black-bar { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
`.trim()

function blackBarHtml(title: string): string {
  return `<div class="black-bar">${escapeReceiptHtml(title)}</div>`
}

export type RetailVatDisplayRow = {
  rate: number
  tax: number
  excl: number
  incl: number
}

function formatAmountComma(amount: number): string {
  return amount.toFixed(2).replace('.', ',')
}

function formatEuroHtml(amount: number): string {
  return `€&nbsp;${formatAmountComma(amount)}`
}

/** Thermisch / agent-veilig: ASCII EUR i.p.v. €-teken. */
function formatEuroThermal(amount: number): string {
  return `EUR ${formatAmountComma(amount)}`
}

const THERMAL_PRICE_W = 12

function thermalPadMoney(left: string, amount: number): string {
  const r = formatEuroThermal(amount).padStart(THERMAL_PRICE_W)
  const maxLeft = RETAIL_THERMAL_W - THERMAL_PRICE_W
  const l = left.trimEnd().slice(0, maxLeft)
  return l.padEnd(maxLeft, ' ') + r
}

function thermalPadRow(left: string, right: string): string {
  const l = left.trimEnd()
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
  const q = String(qty)
  const maxName = RETAIL_THERMAL_W - THERMAL_PRICE_W - q.length - 1
  let n = name.trim()
  if (maxName > 2 && n.length > maxName) n = `${n.slice(0, maxName - 1)}.`
  return thermalPadMoney(`${q} ${n}`, lineTotal)
}

function thermalVatGridRow(row: RetailVatDisplayRow): string {
  const pct = `${Math.round(row.rate)}%`.padEnd(6)
  const tax = formatAmountComma(row.tax).padStart(6)
  const excl = formatAmountComma(row.excl).padStart(8)
  const incl = formatAmountComma(row.incl).padStart(8)
  return `${pct}${tax}${excl}${incl}`.slice(0, RETAIL_THERMAL_W)
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
): { rows: RetailVatDisplayRow[]; taxTotal: number; subtotalExcl: number } {
  const splitOk =
    Array.isArray(order.vatSplit) &&
    order.vatSplit.length > 0 &&
    typeof order.totalTax === 'number' &&
    typeof order.subtotalExclVat === 'number'
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
    const subtotalExcl = Math.round((order.subtotalExclVat as number) * 100) / 100
    return { rows, taxTotal, subtotalExcl }
  }
  const incl = order.total
  const excl = Math.round((incl / (1 + fbVatRate / 100)) * 100) / 100
  const tax = Math.round((incl - excl) * 100) / 100
  return {
    rows: [{ rate: fbVatRate, tax, excl, incl }],
    taxTotal: tax,
    subtotalExcl: excl,
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

function appendItemsThermal(order: KassaLastOrderReceipt, lines: string[]): void {
  for (const item of order.items) {
    const choicesTotal = (item.choices || []).reduce((s, c) => s + c.price, 0)
    const unitIncl = item.product.price + choicesTotal
    const lineTotal = unitIncl * item.quantity
    lines.push(thermalItemRow(item.quantity, item.product.name, lineTotal))
    for (const c of item.choices || []) {
      lines.push(`   + ${c.choiceName}`.slice(0, RETAIL_THERMAL_W))
    }
  }
}

function appendItemsHtml(order: KassaLastOrderReceipt): string {
  return order.items
    .map((i) => {
      const choicesTotal = (i.choices || []).reduce((s, c) => s + c.price, 0)
      const unitIncl = i.product.price + choicesTotal
      const lineTotal = unitIncl * i.quantity
      const extras = (i.choices || [])
        .map((c) => `<div class="retail-item-extra">+ ${escapeReceiptHtml(c.choiceName)}</div>`)
        .join('')
      return `<div class="retail-item"><span>${i.quantity}</span><span>${escapeReceiptHtml(i.product.name)}</span><span class="amt">${formatEuroHtml(lineTotal)}</span></div>${extras}`
    })
    .join('')
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
  const { rows: vatRows, taxTotal, subtotalExcl } = buildVatDisplayRows(order, fbVatRate)

  const receiptRefDisplay = isDraft
    ? '—'
    : order.checkoutReference ?? (order.orderNumber > 0 ? String(order.orderNumber) : '—')
  const payLabel = isDraft ? labels.draftNotPaid : payMethodShort(order, labels)
  const bizName = (tenantInfo?.business_name || labels.defaultBusinessName).trim()
  const discountEuro = Math.round((itemsGrossIncl(order) - order.total) * 100) / 100
  const lines: string[] = []

  lines.push(thermalCenter(bizName))
  if (tenantInfo?.address) lines.push(thermalCenter(tenantInfo.address.trim()))
  if (tenantInfo?.postal_code || tenantInfo?.city) {
    lines.push(thermalCenter(`${tenantInfo.postal_code ?? ''} ${tenantInfo.city ?? ''}`.trim()))
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
    lines.push('')
  }

  lines.push(thermalPadRow(`${labels.receiptBonNrPrefix}${receiptRefDisplay}`, dateStr))
  lines.push('')

  appendItemsThermal(order, lines)
  if (discountEuro > 0.009) {
    const r = `-${formatEuroThermal(discountEuro)}`.padStart(THERMAL_PRICE_W)
    const maxLeft = RETAIL_THERMAL_W - THERMAL_PRICE_W
    lines.push(labels.receiptDiscount.slice(0, maxLeft).padEnd(maxLeft, ' ') + r)
  }
  lines.push('')

  lines.push(thermalPadMoney(labels.subtotal, subtotalExcl))
  if (vatRows.length > 1) {
    for (const row of vatRows) {
      lines.push(thermalPadMoney(labels.vatLabel(row.rate), row.tax))
    }
  } else {
    lines.push(thermalPadMoney(labels.vatSingleLabel, taxTotal))
  }
  lines.push('')
  lines.push(thermalPadMoney(labels.total.toUpperCase(), order.total))
  lines.push('')
  lines.push(thermalPadMoney(labels.receivedLabel, order.total))
  lines.push(thermalPadMoney(labels.changeLabel, 0))
  lines.push(labels.paymentMethodLine(payLabel).slice(0, RETAIL_THERMAL_W))
  lines.push('')

  const vh = `${labels.vatColBtwPct.padEnd(6)}${labels.vatColBtw.padStart(6)}${labels.vatColExcl.padStart(8)}${labels.vatColIncl.padStart(8)}`
  lines.push(vh.slice(0, RETAIL_THERMAL_W))
  for (const row of vatRows) {
    lines.push(thermalVatGridRow(row))
  }
  lines.push('')

  appendRetailLoyaltyThermal(order, labels, lines)

  if (order.helpedByStaffName?.trim() && labels.helpedByLine) {
    lines.push(thermalCenter(stripEmojiForThermal(labels.helpedByLine(order.helpedByStaffName.trim()))))
  }

  lines.push('')
  lines.push(thermalCenter(isDraft ? labels.draftFooter : labels.thanks))
  if (!isDraft) lines.push(thermalCenter(labels.thanksFarewell))
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
  const { rows: vatRows, taxTotal, subtotalExcl } = buildVatDisplayRows(order, fbVatRate)
  const receiptRefDisplay = isDraft
    ? '—'
    : order.checkoutReference ?? (order.orderNumber > 0 ? String(order.orderNumber) : '—')
  const payLabel = isDraft ? labels.draftNotPaid : payMethodShort(order, labels)
  const discountEuro = Math.round((itemsGrossIncl(order) - order.total) * 100) / 100
  const bizName = escapeReceiptHtml(tenantInfo?.business_name || labels.defaultBusinessName)
  const logoUrl = tenantInfo?.logo_url?.trim()
  const ticketEan = retailTicketEanForOrder(order, isDraft)
  const invoice = order.retailCustomerInvoice

  const vatSummaryRows =
    vatRows.length > 1
      ? vatRows
          .map(
            (row) =>
              `<div class="money-row"><span>${escapeReceiptHtml(labels.vatLabel(row.rate))}</span><span class="amt">${formatEuroHtml(row.tax)}</span></div>`,
          )
          .join('')
      : `<div class="money-row"><span>${escapeReceiptHtml(labels.vatSingleLabel)}</span><span class="amt">${formatEuroHtml(taxTotal)}</span></div>`

  const loyaltyHtml =
    order.retailLoyalty && labels.loyaltyBalanceLine
      ? (() => {
          const L = order.retailLoyalty!
          const parts: string[] = ['<div class="loyalty-block">']
          if (L.memberLabel && labels.loyaltyPassLabel) {
            parts.push(`<div><strong>${escapeReceiptHtml(labels.loyaltyPassLabel(L.memberLabel))}</strong></div>`)
          }
          if (L.pointsRedeemed > 0 && labels.loyaltyRedeemedLine) {
            parts.push(`<div>${escapeReceiptHtml(labels.loyaltyRedeemedLine(L.pointsRedeemed))}</div>`)
          }
          if (L.pointsEarned > 0 && labels.loyaltyEarnedLine) {
            parts.push(`<div>${escapeReceiptHtml(labels.loyaltyEarnedLine(L.pointsEarned))}</div>`)
          }
          parts.push(`<div><strong>${escapeReceiptHtml(labels.loyaltyBalanceLine(L.pointsBalance))}</strong></div></div>`)
          return parts.join('')
        })()
      : ''

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
          ? `<div class="bold center">${escapeReceiptHtml(labels.invoiceTitle)}</div>
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
      ${blackBarHtml(labels.sectionOrderBar)}
      ${appendItemsHtml(order)}
      ${
        discountEuro > 0.009
          ? `<div class="money-row"><span>${escapeReceiptHtml(labels.receiptDiscount)}</span><span class="amt">-${formatEuroHtml(discountEuro)}</span></div>`
          : ''
      }
      ${blackBarHtml(labels.sectionTotalBar)}
      <div class="money-row"><span>${escapeReceiptHtml(labels.subtotal)}</span><span class="amt">${formatEuroHtml(subtotalExcl)}</span></div>
      ${vatSummaryRows}
      <div class="retail-grand">
        <span>${escapeReceiptHtml(labels.total.toUpperCase())}</span>
        <span class="amt">${formatEuroHtml(order.total)}</span>
      </div>
      <div class="money-row"><span>${escapeReceiptHtml(labels.receivedLabel)}</span><span class="amt">${formatEuroHtml(order.total)}</span></div>
      <div class="money-row"><span>${escapeReceiptHtml(labels.changeLabel)}</span><span class="amt">${formatEuroHtml(0)}</span></div>
      <div class="pay-line">${escapeReceiptHtml(labels.paymentMethodLine(payLabel))}</div>
      ${blackBarHtml(labels.sectionVatBar)}
      <div class="vat-head">
        <span>${escapeReceiptHtml(labels.vatColBtwPct)}</span>
        <span>${escapeReceiptHtml(labels.vatColBtw)}</span>
        <span>${escapeReceiptHtml(labels.vatColExcl)}</span>
        <span>${escapeReceiptHtml(labels.vatColIncl)}</span>
      </div>
      ${vatRows
        .map(
          (row) =>
            `<div class="vat-row"><span>${Math.round(row.rate)}%</span><span class="amt">${formatAmountComma(row.tax)}</span><span class="amt">${formatAmountComma(row.excl)}</span><span class="amt">${formatAmountComma(row.incl)}</span></div>`,
        )
        .join('')}
      ${loyaltyHtml}
      ${
        order.helpedByStaffName?.trim() && labels.helpedByLine
          ? `<div class="footer-thanks"><strong>${escapeReceiptHtml(labels.helpedByLine(order.helpedByStaffName.trim()))}</strong></div>`
          : ''
      }
      <div class="footer-thanks">${escapeReceiptHtml(isDraft ? labels.draftFooter : labels.thanks)}</div>
      ${!isDraft ? `<div class="footer-thanks">${escapeReceiptHtml(labels.thanksFarewell)}</div>` : ''}
      ${tenantInfo?.website?.trim() ? `<div class="footer-website">${escapeReceiptHtml(tenantInfo.website.trim())}</div>` : ''}
      ${ticketEan ? retailTicketBarcodeHtmlBlock(ticketEan) : ''}`
}
