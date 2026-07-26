'use client'

import {
  buildZReportVatRows,
  formatZReportEuro,
  type ZReportAmounts,
} from '@/lib/z-report-document'
import type { ZReportArticleLine } from '@/lib/z-report-aggregate-articles'

export type ZReportDocumentLabels = {
  orderCount: string
  subtotal: string
  vatTableTitle: string
  vatRateCol: string
  vatBaseCol: string
  vatTaxCol: string
  vatTotalRow: string
  total: string
  paymentMethods: string
  onlinePaid: string
  cardPaid: string
  cashPaid: string
  soldArticlesTitle: string
  soldArticlesEmpty: string
  soldArticlesPiecesShort: string
  soldArticlesVatShort: string
  soldArticlesAmountShort: string
  generatedOn: string
}

type Props = {
  amounts: ZReportAmounts
  articleLines: ZReportArticleLine[]
  labels: ZReportDocumentLabels
  generatedAt?: string
  showFooter?: boolean
  showSoldArticles?: boolean
}

export function ZReportDocumentBody({
  amounts,
  articleLines,
  labels,
  generatedAt,
  showFooter = true,
  showSoldArticles = true,
}: Props) {
  const vatRows = buildZReportVatRows(amounts)
  const totalTax = vatRows.reduce((s, r) => s + r.tax, 0)

  return (
    <div className="p-6 space-y-5">
      <div className="flex justify-between items-center py-2 border-b border-gray-100">
        <span className="text-gray-600">{labels.orderCount}</span>
        <span className="font-bold text-lg tabular-nums">{amounts.orderCount}</span>
      </div>

      <div>
        <h4 className="font-semibold text-gray-900 mb-3 uppercase tracking-wide text-sm">
          {labels.vatTableTitle}
        </h4>
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-600">
                <th className="px-3 py-2 font-medium">{labels.vatRateCol}</th>
                <th className="px-3 py-2 font-medium text-right">{labels.vatBaseCol}</th>
                <th className="px-3 py-2 font-medium text-right">{labels.vatTaxCol}</th>
              </tr>
            </thead>
            <tbody>
              {vatRows.map((row) => (
                <tr key={row.rate} className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium text-gray-800">{row.rate}%</td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                    {formatZReportEuro(row.baseExcl)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-900 font-medium">
                    {formatZReportEuro(row.tax)}
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                <td className="px-3 py-2 text-gray-900">{labels.vatTotalRow}</td>
                <td className="px-3 py-2 text-right tabular-nums text-gray-900">
                  {formatZReportEuro(amounts.subtotalExcl)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-gray-900">
                  {formatZReportEuro(Math.round(totalTax * 100) / 100)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-gray-500">{labels.subtotal}</p>
      </div>

      <div className="flex justify-between items-center py-4 bg-gray-100 -mx-6 px-6 rounded-lg">
        <span className="text-xl font-bold text-gray-900">{labels.total}</span>
        <span className="text-2xl font-bold text-green-600 tabular-nums">
          {formatZReportEuro(amounts.totalIncl)}
        </span>
      </div>

      <div className="space-y-2">
        <h4 className="font-semibold text-gray-900 mb-2">{labels.paymentMethods}</h4>
        {amounts.onlinePayments > 0 && (
          <div className="flex justify-between items-center py-1.5">
            <span className="text-gray-600">{labels.onlinePaid}</span>
            <span className="font-medium tabular-nums">{formatZReportEuro(amounts.onlinePayments)}</span>
          </div>
        )}
        {amounts.cardPayments > 0 && (
          <div className="flex justify-between items-center py-1.5">
            <span className="text-gray-600">{labels.cardPaid}</span>
            <span className="font-medium tabular-nums">{formatZReportEuro(amounts.cardPayments)}</span>
          </div>
        )}
        {amounts.cashPayments > 0 && (
          <div className="flex justify-between items-center py-1.5">
            <span className="text-gray-600">{labels.cashPaid}</span>
            <span className="font-medium tabular-nums">{formatZReportEuro(amounts.cashPayments)}</span>
          </div>
        )}
      </div>

      {showSoldArticles ? (
      <div className="space-y-2 pt-1">
        <h4 className="font-semibold text-gray-900">{labels.soldArticlesTitle}</h4>
        {articleLines.length === 0 ? (
          <p className="text-sm text-gray-500">{labels.soldArticlesEmpty}</p>
        ) : (
          <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
            <div className="flex justify-end gap-3 text-xs text-gray-500 pb-1 pr-1 tabular-nums">
              <span className="w-[4.5rem] text-right">{labels.soldArticlesPiecesShort}</span>
              <span className="w-9 text-right">{labels.soldArticlesVatShort}</span>
              <span className="w-[5.5rem] text-right">{labels.soldArticlesAmountShort}</span>
            </div>
            {articleLines.map((line, idx) => (
              <div
                key={`${line.label}-${idx}`}
                className="flex justify-between gap-3 text-sm py-1.5 border-b border-gray-100 last:border-0"
              >
                <span className="text-gray-700 min-w-0 flex-1 break-words">{line.label}</span>
                <span className="flex items-center gap-3 shrink-0 tabular-nums">
                  <span className="text-gray-600">
                    {line.qty} {labels.soldArticlesPiecesShort}
                  </span>
                  <span className="text-gray-500 w-9 text-right font-medium">{line.vatRate}%</span>
                  <span className="font-medium w-[5.5rem] text-right">
                    {formatZReportEuro(line.total)}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      ) : null}

      {showFooter && generatedAt ? (
        <div className="border-t-2 border-dashed border-gray-300 pt-4 text-center text-gray-500 text-sm">
          <p>
            {labels.generatedOn} {generatedAt}
          </p>
          <p className="mt-1">Vysion kassa&apos;s - ordervysion.com</p>
        </div>
      ) : null}
    </div>
  )
}
