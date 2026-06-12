import type { TenantSettings } from '@/lib/admin-api'
import type { KassaLastOrderReceipt } from '@/lib/kassa-cart-types'
import { normalizeCategoryVatPercent } from '@/lib/order-vat'
import { escapeReceiptHtml } from '@/lib/print-receipt-html'
import type { RetailReceiptI18n } from '@/lib/retail-kassa-receipt'

export const RETAIL_THERMAL_W = 42

export const RETAIL_RECEIPT_PRINT_STYLES = `
      @page { size: 80mm auto; margin: 3mm; }
      body { font-family: 'Courier New', Courier, monospace; font-size:11px; line-height:1.55; color:#000; width:72mm; max-width:72mm; margin:0 auto; padding:8px 4px; }
      .retail-header { font-family: Helvetica, Arial, sans-serif; text-align:center; margin-bottom:14px; }
      .retail-logo { max-width:120px;max-height:64px;margin:0 auto 10px;display:block;object-fit:contain; }
      .retail-name { font-size:22px;font-weight:900;color:#000;margin:6px 0 8px;text-align:center;letter-spacing:0.02em;line-height:1.2; }
      .retail-header .small { font-size:10px;line-height:1.55;text-align:center;margin:2px 0; }
      .meta-row { display:flex;justify-content:space-between;align-items:baseline;font-size:10px;margin:12px 0 10px; }
      .black-bar { background:#000;color:#fff;font-weight:700;font-size:13px;padding:5px 8px;margin:12px 0 8px;width:100%;box-sizing:border-box;text-transform:uppercase;text-align:center; }
      .black-bar:first-of-type { margin-top:6px; }
      .retail-item { display:grid;grid-template-columns:1fr auto;gap:10px;align-items:baseline;margin:7px 0;font-size:11px;line-height:1.45; }
      .retail-item-extra { padding-left:0;margin:4px 0 4px 8px;font-size:10px;line-height:1.4; }
      .amt { font-family:'Courier New',Courier,monospace;font-weight:700;white-space:nowrap; }
      .item-price-right { text-align:right; }
      .money-row { display:flex;justify-content:space-between;align-items:baseline;margin:5px 0;font-size:11px;line-height:1.45; }
      .money-row .label-strong { font-weight:900;color:#000; }
      .money-row .amt { min-width:11ch;text-align:right; }
      .retail-grand { display:flex;justify-content:space-between;align-items:baseline;font-size:24px;font-weight:900;margin:14px 0 12px;padding:6px 0;line-height:1.15;color:#000; }
      .retail-grand .amt { font-size:24px;font-weight:900;text-align:right; }
      .pay-line { margin:10px 0 8px;font-size:11px;font-weight:900;color:#000;text-align:center;line-height:1.45; }
      .footer-thanks { text-align:center;font-family:Helvetica,Arial,sans-serif;font-size:10px;margin-top:16px;line-height:1.55; }
      .footer-website { text-align:center;font-size:10px;margin-top:8px;line-height:1.45; }
      .staff-help { text-align:center;font-family:Helvetica,Arial,sans-serif;font-size:10px;margin-top:14px;line-height:1.5; }
      .staff-help-name { font-weight:700;margin-top:4px; }
      .loyalty-block { font-size:10px;margin:12px 0;line-height:1.5;text-align:center;font-family:Helvetica,Arial,sans-serif; }
      .draft-banner { text-align:center;font-weight:700;font-size:10px;margin:10px 0;line-height:1.45;color:#b45309;font-family:Helvetica,Arial,sans-serif; }
      .bold { font-weight:700; }
      .center { text-align:center; }
      @media print { body { width:auto; max-width:80mm; } .black-bar { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
`.trim()

function blackBarHtml(title: string): string {
  return `<div class="black-bar">${escapeReceiptHtml(title)}</div>`
}

function formatAmountComma(amount: number): string {
  return amount.toFixed(2).replace('.', ',')
}

function formatEuroHtml(amount: number): string {
  return `EUR&nbsp;${formatAmountComma(amount)}`
}

function formatEuroThermal(amount: number): string {
  return `EUR ${formatAmountComma(amount)}`
}

function capitalizeProductName(name: string): string {
  const t = name.trim()
  if (!t) return t
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/** Eerste letter hoofdletter (Gamma i.p.v. gamma) — tenant-naam op bon. */
export function formatStoreDisplayName(name: string): string {
  const t = name.trim()
  if (!t) return t
  return t.charAt(0).toUpperCase() + t.slice(1)
}

function staffFirstName(full: string): string {
  const p = full.trim().split(/\s+/).filter(Boolean)
  return p[0] ?? full.trim()
}

/** Print Agent `encWithEuro` vouwt `  +` spaties samen → geen space-padding. Tabs (8 kol.) blijven staan. */
const THERMAL_TAB_WIDTH = 8

function thermalNextTabColumn(fromCol: number): number {
  return (Math.floor(fromCol / THERMAL_TAB_WIDTH) + 1) * THERMAL_TAB_WIDTH
}

function thermalTabsToColumn(fromCol: number, targetCol: number): string {
  let col = fromCol
  let tabs = ''
  let guard = 0
  while (col < targetCol && guard++ < 14) {
    tabs += '\t'
    col = thermalNextTabColumn(col)
  }
  return tabs
}

function thermalRightAlignLine(left: string, right: string): string {
  const l = left.trimEnd()
  const r = right.trim()
  const targetCol = RETAIL_THERMAL_W - r.length
  if (targetCol <= 0) return r.slice(0, RETAIL_THERMAL_W)
  if (l.length >= targetCol) {
    return `${l.slice(0, targetCol - 1)} ${r}`.slice(0, RETAIL_THERMAL_W)
  }
  return l + thermalTabsToColumn(l.length, targetCol) + r
}

function thermalPadMoney(left: string, amount: number): string {
  return thermalRightAlignLine(left, formatEuroThermal(amount))
}

function thermalPadRow(left: string, right: string): string {
  return thermalRightAlignLine(left, right)
}

function thermalCenter(text: string): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (!t) return ''
  if (t.length >= RETAIL_THERMAL_W) return t.slice(0, RETAIL_THERMAL_W)
  const startCol = Math.floor((RETAIL_THERMAL_W - t.length) / 2)
  return thermalTabsToColumn(0, startCol) + t
}

/** Print-agent herkent `Nx …` en zet extra witruimte tussen artikelregels. */
function thermalItemRow(qty: number, name: string, lineTotal: number): string {
  const price = formatEuroThermal(lineTotal)
  const prefix = `${qty}x `
  const maxNameLen = RETAIL_THERMAL_W - prefix.length - price.length - 1
  let productName = capitalizeProductName(name)
  if (maxNameLen > 0 && productName.length > maxNameLen) {
    productName = `${productName.slice(0, Math.max(1, maxNameLen - 1))}.`
  }
  return thermalRightAlignLine(`${prefix}${productName}`, price)
}

function thermalSectionTitle(title: string, lines: string[]): void {
  lines.push('')
  lines.push(title.toUpperCase())
  lines.push('')
}

function itemsGrossIncl(order: KassaLastOrderReceipt): number {
  return Math.round(
    order.items.reduce((s, i) => {
      const choicesTotal = (i.choices || []).reduce((c, ch) => c + ch.price, 0)
      return s + (i.product.price + choicesTotal) * i.quantity
    }, 0) * 100,
  ) / 100
}

function buildTotals(
  order: KassaLastOrderReceipt,
  fbVatRate: number,
): { taxTotal: number; subtotalExcl: number } {
  const splitOk =
    Array.isArray(order.vatSplit) &&
    order.vatSplit.length > 0 &&
    typeof order.totalTax === 'number' &&
    typeof order.subtotalExclVat === 'number'
  if (splitOk) {
    return {
      taxTotal: Math.round((order.totalTax as number) * 100) / 100,
      subtotalExcl: Math.round((order.subtotalExclVat as number) * 100) / 100,
    }
  }
  const incl = order.total
  const excl = Math.round((incl / (1 + fbVatRate / 100)) * 100) / 100
  const tax = Math.round((incl - excl) * 100) / 100
  return { taxTotal: tax, subtotalExcl: excl }
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

function appendHelpedByThermal(
  order: KassaLastOrderReceipt,
  labels: RetailReceiptI18n,
  lines: string[],
): void {
  const raw = order.helpedByStaffName?.trim()
  if (!raw || !labels.helpedByIntro) return
  lines.push('')
  lines.push(thermalCenter(stripEmojiForThermal(labels.helpedByIntro)))
  lines.push(thermalCenter(staffFirstName(raw)))
}

function appendItemsThermal(order: KassaLastOrderReceipt, lines: string[]): void {
  for (const item of order.items) {
    const choicesTotal = (item.choices || []).reduce((s, c) => s + c.price, 0)
    const unitIncl = item.product.price + choicesTotal
    const lineTotal = unitIncl * item.quantity
    lines.push(thermalItemRow(item.quantity, item.product.name, lineTotal))
    for (const c of item.choices || []) {
      lines.push(`   + ${capitalizeProductName(c.choiceName)}`.slice(0, RETAIL_THERMAL_W))
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
        .map(
          (c) =>
            `<div class="retail-item-extra">+ ${escapeReceiptHtml(capitalizeProductName(c.choiceName))}</div>`,
        )
        .join('')
      return `<div class="retail-item"><span>${i.quantity}x ${escapeReceiptHtml(capitalizeProductName(i.product.name))}</span><span class="amt item-price-right">${formatEuroHtml(lineTotal)}</span></div>${extras}`
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
  const { taxTotal, subtotalExcl } = buildTotals(order, fbVatRate)

  const receiptRefDisplay = isDraft
    ? '—'
    : order.checkoutReference ?? (order.orderNumber > 0 ? String(order.orderNumber) : '—')
  const payLabel = isDraft ? labels.draftNotPaid : payMethodShort(order, labels)
  const bizName = formatStoreDisplayName(tenantInfo?.business_name || labels.defaultBusinessName)
  const discountEuro = Math.round((itemsGrossIncl(order) - order.total) * 100) / 100
  const lines: string[] = []

  /** Naam print de agent gecentreerd via `winkelnaam` — hier alleen adres/BTW/tel gecentreerd. */
  if (tenantInfo?.address) lines.push(thermalCenter(tenantInfo.address.trim()))
  if (tenantInfo?.postal_code || tenantInfo?.city) {
    lines.push(thermalCenter(`${tenantInfo.postal_code ?? ''} ${tenantInfo.city ?? ''}`.trim()))
  }
  if (tenantInfo?.btw_number?.trim()) {
    lines.push(thermalCenter(labels.businessVatLabel(tenantInfo.btw_number.trim())))
  }
  if (tenantInfo?.phone?.trim()) {
    lines.push(thermalCenter(`${labels.telPrefix} ${tenantInfo.phone.trim()}`))
  }
  lines.push('')
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
  thermalSectionTitle(labels.sectionOrderBar, lines)

  appendItemsThermal(order, lines)
  if (discountEuro > 0.009) {
    lines.push('')
    lines.push(thermalPadMoney(labels.receiptDiscount, -discountEuro))
  }
  thermalSectionTitle(labels.sectionTotalBar, lines)

  lines.push(thermalPadMoney(labels.subtotal, subtotalExcl))
  lines.push(thermalPadMoney(labels.vatSingleLabel, taxTotal))
  lines.push('')
  lines.push('')
  lines.push(thermalPadMoney(labels.total.toUpperCase(), order.total))
  lines.push('')
  lines.push(thermalPadMoney(labels.receivedLabel, order.total))
  lines.push(thermalPadMoney(labels.changeLabel, 0))
  lines.push('')
  lines.push(labels.paymentMethodLine(payLabel).slice(0, RETAIL_THERMAL_W))
  lines.push('')

  appendRetailLoyaltyThermal(order, labels, lines)
  appendHelpedByThermal(order, labels, lines)

  lines.push('')
  lines.push(thermalCenter(isDraft ? labels.draftFooter : labels.thanks))
  if (!isDraft) lines.push(thermalCenter(labels.thanksFarewell))
  if (tenantInfo?.website?.trim()) {
    lines.push(thermalCenter(tenantInfo.website.trim()))
  }
  lines.push('')

  return lines
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
  const { taxTotal, subtotalExcl } = buildTotals(order, fbVatRate)
  const receiptRefDisplay = isDraft
    ? '—'
    : order.checkoutReference ?? (order.orderNumber > 0 ? String(order.orderNumber) : '—')
  const payLabel = isDraft ? labels.draftNotPaid : payMethodShort(order, labels)
  const discountEuro = Math.round((itemsGrossIncl(order) - order.total) * 100) / 100
  const bizName = escapeReceiptHtml(
    formatStoreDisplayName(tenantInfo?.business_name || labels.defaultBusinessName),
  )
  const logoUrl = tenantInfo?.logo_url?.trim()
  const invoice = order.retailCustomerInvoice

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

  const helpedByHtml =
    order.helpedByStaffName?.trim() && labels.helpedByIntro
      ? `<div class="staff-help">${escapeReceiptHtml(labels.helpedByIntro)}<div class="staff-help-name">${escapeReceiptHtml(staffFirstName(order.helpedByStaffName.trim()))}</div></div>`
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
          tenantInfo?.btw_number?.trim()
            ? `<div class="small">${escapeReceiptHtml(labels.businessVatLabel(tenantInfo.btw_number.trim()))}</div>`
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
          ? `<div class="money-row"><span class="label-strong">${escapeReceiptHtml(labels.receiptDiscount)}</span><span class="amt">-${formatEuroHtml(discountEuro)}</span></div>`
          : ''
      }
      ${blackBarHtml(labels.sectionTotalBar)}
      <div class="money-row"><span class="label-strong">${escapeReceiptHtml(labels.subtotal)}</span><span class="amt">${formatEuroHtml(subtotalExcl)}</span></div>
      <div class="money-row"><span class="label-strong">${escapeReceiptHtml(labels.vatSingleLabel)}</span><span class="amt">${formatEuroHtml(taxTotal)}</span></div>
      <div class="retail-grand">
        <span>${escapeReceiptHtml(labels.total.toUpperCase())}</span>
        <span class="amt">${formatEuroHtml(order.total)}</span>
      </div>
      <div class="money-row"><span>${escapeReceiptHtml(labels.receivedLabel)}</span><span class="amt">${formatEuroHtml(order.total)}</span></div>
      <div class="money-row"><span>${escapeReceiptHtml(labels.changeLabel)}</span><span class="amt">${formatEuroHtml(0)}</span></div>
      <div class="pay-line">${escapeReceiptHtml(labels.paymentMethodLine(payLabel))}</div>
      ${loyaltyHtml}
      ${helpedByHtml}
      <div class="footer-thanks">${escapeReceiptHtml(isDraft ? labels.draftFooter : labels.thanks)}</div>
      ${!isDraft ? `<div class="footer-thanks">${escapeReceiptHtml(labels.thanksFarewell)}</div>` : ''}
      ${tenantInfo?.website?.trim() ? `<div class="footer-website">${escapeReceiptHtml(tenantInfo.website.trim())}</div>` : ''}`
}

/** @deprecated Barcode niet meer op bon; behouden voor eventuele API-compat. */
export function retailTicketEanForOrder(_order: KassaLastOrderReceipt, _isDraft: boolean): string | null {
  return null
}
