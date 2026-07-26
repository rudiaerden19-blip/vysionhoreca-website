/**
 * HTML voor Z-rapport e-mail — zelfde BTW-tabel als admin/z-rapport UI.
 */

import {
  buildZReportVatRows,
  formatZReportEuro,
  zReportAmountsFromLegacyFields,
  type ZReportAmounts,
} from '@/lib/z-report-document'

export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function sanitizeArticleLines(raw: unknown): Array<{ label: string; qty: number; total: number }> {
  if (!Array.isArray(raw)) return []
  const out: Array<{ label: string; qty: number; total: number }> = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const label = typeof o.label === 'string' ? o.label.trim().slice(0, 400) : ''
    if (!label) continue
    const qty = typeof o.qty === 'number' && Number.isFinite(o.qty) ? Math.max(0, o.qty) : 0
    const total = typeof o.total === 'number' && Number.isFinite(o.total) ? o.total : 0
    out.push({ label, qty, total })
    if (out.length >= 500) break
  }
  return out
}

function coerceMoney(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? parseFloat(raw) : NaN
  return Number.isFinite(n) ? n : 0
}

export type ZReportEmailInput = {
  businessName: string
  businessAddress?: string
  btwNumber?: string
  formattedDate: string
  amounts: ZReportAmounts
  articleLines?: unknown
  soldArticlesSectionTitle?: string
  soldArticlesPiecesShort?: string
  labels: {
    revenue: string
    orderCount: string
    subtotal: string
    vatTableTitle: string
    vatRateCol: string
    vatBaseCol: string
    vatTaxCol: string
    vatTotalRow: string
    total: string
    payments: string
    cash: string
    card: string
    online: string
    footerAuto: string
    footerGenerated: string
    footerPowered: string
  }
  generatedAtNl: string
}

function buildVatTableHtml(amounts: ZReportAmounts, labels: ZReportEmailInput['labels']): string {
  const esc = escapeHtml
  const rows = buildZReportVatRows(amounts)
  const totalTax = rows.reduce((s, r) => s + r.tax, 0)
  const bodyRows = rows
    .map(
      (r) => `
        <tr>
          <td style="padding:8px;border-top:1px solid #eee;">${r.rate}%</td>
          <td style="padding:8px;border-top:1px solid #eee;text-align:right;">${formatZReportEuro(r.baseExcl)}</td>
          <td style="padding:8px;border-top:1px solid #eee;text-align:right;font-weight:600;">${formatZReportEuro(r.tax)}</td>
        </tr>`,
    )
    .join('')

  return `
    <div class="section-title">${esc(labels.vatTableTitle)}</div>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:12px;">
      <thead>
        <tr style="background:#f8fafc;color:#475569;">
          <th style="padding:8px;text-align:left;">${esc(labels.vatRateCol)}</th>
          <th style="padding:8px;text-align:right;">${esc(labels.vatBaseCol)}</th>
          <th style="padding:8px;text-align:right;">${esc(labels.vatTaxCol)}</th>
        </tr>
      </thead>
      <tbody>
        ${bodyRows}
        <tr style="background:#f1f5f9;font-weight:bold;">
          <td style="padding:8px;border-top:2px solid #cbd5e1;">${esc(labels.vatTotalRow)}</td>
          <td style="padding:8px;border-top:2px solid #cbd5e1;text-align:right;">${formatZReportEuro(amounts.subtotalExcl)}</td>
          <td style="padding:8px;border-top:2px solid #cbd5e1;text-align:right;">${formatZReportEuro(Math.round(totalTax * 100) / 100)}</td>
        </tr>
      </tbody>
    </table>
    <p style="font-size:12px;color:#64748b;margin:0 0 12px;">${esc(labels.subtotal)}</p>`
}

function buildPaymentRows(
  cash: number,
  card: number,
  online: number,
  labels: ZReportEmailInput['labels'],
): string {
  const rows: string[] = []
  if (cash > 0) {
    rows.push(
      `<div class="row"><span>${escapeHtml(labels.cash)}:</span><span>${formatZReportEuro(cash)}</span></div>`,
    )
  }
  if (card > 0) {
    rows.push(
      `<div class="row"><span>${escapeHtml(labels.card)}:</span><span>${formatZReportEuro(card)}</span></div>`,
    )
  }
  if (online > 0) {
    rows.push(
      `<div class="row"><span>${escapeHtml(labels.online)}:</span><span>${formatZReportEuro(online)}</span></div>`,
    )
  }
  return rows.join('')
}

export function buildZReportEmailHtml(p: ZReportEmailInput): string {
  const esc = escapeHtml
  const articlesRows = sanitizeArticleLines(p.articleLines)
  const articlesSectionTitle = p.soldArticlesSectionTitle
    ? esc(p.soldArticlesSectionTitle.trim().slice(0, 120))
    : 'Verkochte artikelen'
  const piecesShort = p.soldArticlesPiecesShort
    ? esc(p.soldArticlesPiecesShort.trim().slice(0, 16))
    : 'st.'

  const articlesHtml =
    articlesRows.length === 0
      ? ''
      : `
            <div class="section">
              <div class="section-title">${articlesSectionTitle}</div>
              ${articlesRows
                .map(
                  (r) => `
              <div class="row">
                <span>${esc(r.label)}</span>
                <span>${r.qty} ${piecesShort} · ${formatZReportEuro(r.total)}</span>
              </div>`,
                )
                .join('')}
            </div>`

  const vatTable = buildVatTableHtml(p.amounts, p.labels)
  const paymentRows = buildPaymentRows(
    p.amounts.cashPayments,
    p.amounts.cardPayments,
    p.amounts.onlinePayments,
    p.labels,
  )

  return `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
          .container { max-width: 560px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { background: #1a1a2e; color: white; padding: 30px; text-align: center; }
          .header h1 { margin: 0 0 5px 0; font-size: 24px; }
          .header p { margin: 0; opacity: 0.8; font-size: 14px; }
          .content { padding: 30px; }
          .section { margin-bottom: 25px; }
          .section-title { font-weight: bold; color: #1a1a2e; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 15px; }
          .row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 15px; }
          .row.total { font-weight: bold; font-size: 18px; border-top: 2px solid #1a1a2e; padding-top: 15px; margin-top: 10px; }
          .row .amount { color: #22c55e; font-weight: 600; }
          .footer { background: #f9f9f9; padding: 20px 30px; text-align: center; font-size: 12px; color: #666; }
          .badge { display: inline-block; background: #22c55e; color: white; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${esc(p.businessName)}</h1>
            ${p.businessAddress ? `<p>${esc(p.businessAddress)}</p>` : ''}
            ${p.btwNumber ? `<p>BTW: ${esc(p.btwNumber)}</p>` : ''}
            <div style="margin-top: 15px;">
              <span class="badge">Z-RAPPORT</span>
            </div>
            <p style="margin-top: 10px; font-weight: bold;">${esc(p.formattedDate)}</p>
          </div>
          
          <div class="content">
            <div class="section">
              <div class="section-title">${esc(p.labels.revenue)}</div>
              <div class="row">
                <span>${esc(p.labels.orderCount)}:</span>
                <span>${p.amounts.orderCount}</span>
              </div>
              ${vatTable}
              <div class="row total">
                <span>${esc(p.labels.total)}:</span>
                <span class="amount">${formatZReportEuro(p.amounts.totalIncl)}</span>
              </div>
            </div>
            
            <div class="section">
              <div class="section-title">${esc(p.labels.payments)}</div>
              ${paymentRows}
            </div>${articlesHtml}
          </div>
          
          <div class="footer">
            <p>${esc(p.labels.footerAuto)}</p>
            <p>${esc(p.labels.footerGenerated)} ${esc(p.generatedAtNl)}</p>
            <p style="margin-top: 10px;">${esc(p.labels.footerPowered)}</p>
          </div>
        </div>
      </body>
      </html>`
}

export type ParsedZReportEmailAmounts = {
  amounts: ZReportAmounts
  taxLow: number
  taxMid: number
  taxHigh: number
}

/** Parse body fields from /api/send-z-report — ondersteunt per-tarief velden en legacy taxLow/Mid/High. */
export function parseZReportEmailAmounts(body: Record<string, unknown>): ParsedZReportEmailAmounts {
  const subtotal = coerceMoney(body.subtotal)
  const total = coerceMoney(body.total)
  const cashPayments = coerceMoney(body.cashPayments)
  const cardPayments = coerceMoney(body.cardPayments)
  const onlinePayments = coerceMoney(body.onlinePayments)
  const orderCount = typeof body.orderCount === 'number' ? body.orderCount : coerceMoney(body.orderCount)

  const hasPerRate =
    body.tax6 != null ||
    body.tax9 != null ||
    body.tax12 != null ||
    body.tax21 != null ||
    body.base6 != null

  if (hasPerRate) {
    const amounts = zReportAmountsFromLegacyFields({
      orderCount,
      subtotal,
      total,
      taxLow: 0,
      taxMid: 0,
      taxHigh: 0,
      tax6: coerceMoney(body.tax6),
      tax9: coerceMoney(body.tax9),
      tax12: coerceMoney(body.tax12),
      tax21: coerceMoney(body.tax21),
      base6: coerceMoney(body.base6),
      base9: coerceMoney(body.base9),
      base12: coerceMoney(body.base12),
      base21: coerceMoney(body.base21),
      cashPayments,
      cardPayments,
      onlinePayments,
    })
    return {
      amounts,
      taxLow: amounts.taxByRate[6],
      taxMid: amounts.taxByRate[9] + amounts.taxByRate[12],
      taxHigh: amounts.taxByRate[21],
    }
  }

  const taxLow = coerceMoney(body.taxLow)
  const taxMid = coerceMoney(body.taxMid)
  const taxHigh = coerceMoney(body.taxHigh)

  if (taxLow > 0 || taxMid > 0 || taxHigh > 0) {
    const amounts = zReportAmountsFromLegacyFields({
      orderCount,
      subtotal,
      total,
      taxLow,
      taxMid,
      taxHigh,
      cashPayments,
      cardPayments,
      onlinePayments,
    })
    return { amounts, taxLow, taxMid, taxHigh }
  }

  const legacyTax = coerceMoney(body.tax)
  if (legacyTax > 0) {
    const pct = coerceMoney(body.btwPercentage)
    let tl = 0
    let tm = 0
    let th = 0
    if (pct === 21) th = legacyTax
    else if (pct === 9 || pct === 12) tm = legacyTax
    else tl = legacyTax
    const amounts = zReportAmountsFromLegacyFields({
      orderCount,
      subtotal,
      total,
      taxLow: tl,
      taxMid: tm,
      taxHigh: th,
      cashPayments,
      cardPayments,
      onlinePayments,
    })
    return { amounts, taxLow: tl, taxMid: tm, taxHigh: th }
  }

  const derivedTax = Math.max(0, Math.round((total - subtotal) * 100) / 100)
  const amounts = zReportAmountsFromLegacyFields({
    orderCount,
    subtotal,
    total,
    taxLow: derivedTax,
    taxMid: 0,
    taxHigh: 0,
    cashPayments,
    cardPayments,
    onlinePayments,
  })
  return { amounts, taxLow: derivedTax, taxMid: 0, taxHigh: 0 }
}
