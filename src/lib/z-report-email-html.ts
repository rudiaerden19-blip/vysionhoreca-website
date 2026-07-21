/**
 * HTML voor Z-rapport e-mail — zelfde BTW-opdeling als admin/z-rapport UI.
 */

export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function fmtEuro(n: number): string {
  return `€${n.toFixed(2)}`
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
  orderCount: number
  subtotal: number
  taxLow: number
  taxMid: number
  taxHigh: number
  total: number
  cashPayments: number
  cardPayments: number
  onlinePayments: number
  articleLines?: unknown
  soldArticlesSectionTitle?: string
  soldArticlesPiecesShort?: string
  labels: {
    revenue: string
    orderCount: string
    subtotal: string
    vat: string
    vatMidRates: string
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

function buildVatRows(
  taxLow: number,
  taxMid: number,
  taxHigh: number,
  labels: ZReportEmailInput['labels'],
): string {
  const rows: string[] = []
  if (taxLow > 0) {
    rows.push(
      `<div class="row"><span>${escapeHtml(labels.vat)} 6%:</span><span>${fmtEuro(taxLow)}</span></div>`,
    )
  }
  if (taxMid > 0) {
    rows.push(
      `<div class="row"><span>${escapeHtml(labels.vat)} ${escapeHtml(labels.vatMidRates)}:</span><span>${fmtEuro(taxMid)}</span></div>`,
    )
  }
  if (taxHigh > 0) {
    rows.push(
      `<div class="row"><span>${escapeHtml(labels.vat)} 21%:</span><span>${fmtEuro(taxHigh)}</span></div>`,
    )
  }
  return rows.join('')
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
      `<div class="row"><span>${escapeHtml(labels.cash)}:</span><span>${fmtEuro(cash)}</span></div>`,
    )
  }
  if (card > 0) {
    rows.push(
      `<div class="row"><span>${escapeHtml(labels.card)}:</span><span>${fmtEuro(card)}</span></div>`,
    )
  }
  if (online > 0) {
    rows.push(
      `<div class="row"><span>${escapeHtml(labels.online)}:</span><span>${fmtEuro(online)}</span></div>`,
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
                <span>${r.qty} ${piecesShort} · ${fmtEuro(r.total)}</span>
              </div>`,
                )
                .join('')}
            </div>`

  const vatRows = buildVatRows(p.taxLow, p.taxMid, p.taxHigh, p.labels)
  const paymentRows = buildPaymentRows(
    p.cashPayments,
    p.cardPayments,
    p.onlinePayments,
    p.labels,
  )

  return `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
          .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
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
                <span>${p.orderCount}</span>
              </div>
              <div class="row">
                <span>${esc(p.labels.subtotal)}:</span>
                <span>${fmtEuro(p.subtotal)}</span>
              </div>
              ${vatRows}
              <div class="row total">
                <span>${esc(p.labels.total)}:</span>
                <span class="amount">${fmtEuro(p.total)}</span>
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

/** Parse body fields from /api/send-z-report — ondersteunt legacy `tax` + `btwPercentage`. */
export function parseZReportEmailAmounts(body: Record<string, unknown>): {
  subtotal: number
  taxLow: number
  taxMid: number
  taxHigh: number
  total: number
  cashPayments: number
  cardPayments: number
  onlinePayments: number
} {
  const subtotal = coerceMoney(body.subtotal)
  const total = coerceMoney(body.total)
  const taxLow = coerceMoney(body.taxLow)
  const taxMid = coerceMoney(body.taxMid)
  const taxHigh = coerceMoney(body.taxHigh)

  if (taxLow > 0 || taxMid > 0 || taxHigh > 0) {
    return {
      subtotal,
      taxLow,
      taxMid,
      taxHigh,
      total,
      cashPayments: coerceMoney(body.cashPayments),
      cardPayments: coerceMoney(body.cardPayments),
      onlinePayments: coerceMoney(body.onlinePayments),
    }
  }

  const legacyTax = coerceMoney(body.tax)
  if (legacyTax > 0) {
    const pct = coerceMoney(body.btwPercentage)
    if (pct === 21) {
      return {
        subtotal,
        taxLow: 0,
        taxMid: 0,
        taxHigh: legacyTax,
        total,
        cashPayments: coerceMoney(body.cashPayments),
        cardPayments: coerceMoney(body.cardPayments),
        onlinePayments: coerceMoney(body.onlinePayments),
      }
    }
    if (pct === 9 || pct === 12) {
      return {
        subtotal,
        taxLow: 0,
        taxMid: legacyTax,
        taxHigh: 0,
        total,
        cashPayments: coerceMoney(body.cashPayments),
        cardPayments: coerceMoney(body.cardPayments),
        onlinePayments: coerceMoney(body.onlinePayments),
      }
    }
    return {
      subtotal,
      taxLow: legacyTax,
      taxMid: 0,
      taxHigh: 0,
      total,
      cashPayments: coerceMoney(body.cashPayments),
      cardPayments: coerceMoney(body.cardPayments),
      onlinePayments: coerceMoney(body.onlinePayments),
    }
  }

  const derivedTax = Math.max(0, Math.round((total - subtotal) * 100) / 100)
  return {
    subtotal,
    taxLow: derivedTax,
    taxMid: 0,
    taxHigh: 0,
    total,
    cashPayments: coerceMoney(body.cashPayments),
    cardPayments: coerceMoney(body.cardPayments),
    onlinePayments: coerceMoney(body.onlinePayments),
  }
}
