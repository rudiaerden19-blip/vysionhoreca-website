/**
 * HTML voor Z-rapport maandmail — maandtotaal + dagelijks overzicht met BTW per tarief.
 */

import { CATEGORY_VAT_PERCENT_OPTIONS } from '@/lib/order-vat'
import {
  buildZReportVatRows,
  formatZReportEuro,
  type ZReportAmounts,
} from '@/lib/z-report-document'
import type { ZReportMonthDayRow } from '@/lib/z-report-month'
import { escapeHtml } from '@/lib/z-report-email-html'

export type ZReportMonthEmailLabels = {
  monthTitle: string
  monthSummary: string
  dailyOverview: string
  dateCol: string
  orderCount: string
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
  dayTotalCol: string
  fiscalNote: string
  footerAuto: string
  footerGenerated: string
  footerPowered: string
}

function buildVatTableHtml(amounts: ZReportAmounts, labels: ZReportMonthEmailLabels): string {
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
    </table>`
}

function buildDailyTableHtml(days: ZReportMonthDayRow[], labels: ZReportMonthEmailLabels): string {
  const esc = escapeHtml
  if (!days.length) return ''

  const headerRates = CATEGORY_VAT_PERCENT_OPTIONS.filter((rate) =>
    days.some((d) => (d.taxByRate[rate] || 0) > 0 || (d.baseByRate[rate] || 0) > 0),
  )

  const head = `
    <tr style="background:#f8fafc;color:#475569;font-size:13px;">
      <th style="padding:8px;text-align:left;">${esc(labels.dateCol)}</th>
      <th style="padding:8px;text-align:center;">${esc(labels.orderCount)}</th>
      ${headerRates
        .map(
          (r) =>
            `<th style="padding:8px;text-align:right;">${r}% ${esc(labels.vatTaxCol)}</th>`,
        )
        .join('')}
      <th style="padding:8px;text-align:right;">${esc(labels.dayTotalCol)}</th>
    </tr>`

  const body = days
    .map((day) => {
      const dateLabel = new Date(`${day.date}T12:00:00`).toLocaleDateString('nl-BE')
      return `
      <tr>
        <td style="padding:8px;border-top:1px solid #eee;">${esc(dateLabel)}</td>
        <td style="padding:8px;border-top:1px solid #eee;text-align:center;">${day.orderCount}</td>
        ${headerRates
          .map(
            (r) =>
              `<td style="padding:8px;border-top:1px solid #eee;text-align:right;">${formatZReportEuro(day.taxByRate[r] || 0)}</td>`,
          )
          .join('')}
        <td style="padding:8px;border-top:1px solid #eee;text-align:right;font-weight:600;">${formatZReportEuro(day.totalIncl)}</td>
      </tr>`
    })
    .join('')

  return `
    <div class="section-title">${esc(labels.dailyOverview)}</div>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px;">
      <thead>${head}</thead>
      <tbody>${body}</tbody>
    </table>`
}

export function buildZReportMonthEmailHtml(input: {
  businessName: string
  businessAddress?: string
  btwNumber?: string
  monthLabel: string
  amounts: ZReportAmounts
  days: ZReportMonthDayRow[]
  labels: ZReportMonthEmailLabels
  generatedAtNl: string
}): string {
  const esc = escapeHtml
  const vatTable = buildVatTableHtml(input.amounts, input.labels)
  const dailyTable = buildDailyTableHtml(input.days, input.labels)

  const paymentRows = [
    input.amounts.cashPayments > 0
      ? `<div class="row"><span>${esc(input.labels.cash)}:</span><span>${formatZReportEuro(input.amounts.cashPayments)}</span></div>`
      : '',
    input.amounts.cardPayments > 0
      ? `<div class="row"><span>${esc(input.labels.card)}:</span><span>${formatZReportEuro(input.amounts.cardPayments)}</span></div>`
      : '',
    input.amounts.onlinePayments > 0
      ? `<div class="row"><span>${esc(input.labels.online)}:</span><span>${formatZReportEuro(input.amounts.onlinePayments)}</span></div>`
      : '',
  ].join('')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 640px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background: #1a1a2e; color: white; padding: 28px; text-align: center; }
    .header h1 { margin: 0 0 6px 0; font-size: 22px; }
    .header p { margin: 0; opacity: 0.85; font-size: 14px; }
    .content { padding: 28px; }
    .section { margin-bottom: 24px; }
    .section-title { font-weight: bold; color: #1a1a2e; border-bottom: 2px solid #eee; padding-bottom: 8px; margin-bottom: 12px; }
    .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 15px; }
    .row.total { font-weight: bold; font-size: 18px; border-top: 2px solid #1a1a2e; padding-top: 12px; margin-top: 8px; }
    .row .amount { color: #22c55e; font-weight: 600; }
    .footer { background: #f9f9f9; padding: 18px 28px; text-align: center; font-size: 12px; color: #666; }
    .badge { display: inline-block; background: #6366f1; color: white; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-top: 10px; }
    .note { font-size: 12px; color: #64748b; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${esc(input.businessName)}</h1>
      ${input.businessAddress ? `<p>${esc(input.businessAddress)}</p>` : ''}
      ${input.btwNumber ? `<p>BTW: ${esc(input.btwNumber)}</p>` : ''}
      <span class="badge">Z-RAPPORT MAAND</span>
      <p style="margin-top:12px;font-weight:bold;font-size:16px;">${esc(input.monthLabel)}</p>
    </div>
    <div class="content">
      <div class="section">
        <div class="section-title">${esc(input.labels.monthSummary)}</div>
        <div class="row"><span>${esc(input.labels.orderCount)}:</span><span>${input.amounts.orderCount}</span></div>
        ${vatTable}
        <div class="row total">
          <span>${esc(input.labels.total)}:</span>
          <span class="amount">${formatZReportEuro(input.amounts.totalIncl)}</span>
        </div>
      </div>
      <div class="section">
        <div class="section-title">${esc(input.labels.payments)}</div>
        ${paymentRows}
      </div>
      ${dailyTable}
      <p class="note">${esc(input.labels.fiscalNote)}</p>
    </div>
    <div class="footer">
      <p>${esc(input.labels.footerAuto)}</p>
      <p>${esc(input.labels.footerGenerated)} ${esc(input.generatedAtNl)}</p>
      <p style="margin-top:8px;">${esc(input.labels.footerPowered)}</p>
    </div>
  </div>
</body>
</html>`
}
