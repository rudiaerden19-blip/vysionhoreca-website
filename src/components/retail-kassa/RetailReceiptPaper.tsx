'use client'

import type { TenantSettings } from '@/lib/admin-api'
import type { KassaLastOrderReceipt } from '@/lib/kassa-cart-types'
import { appLocaleToBcp47 } from '@/lib/print-receipt-html'
import type { RetailReceiptI18n } from '@/lib/retail-kassa-receipt'
import { buildRetailKassaReceiptHtmlBody } from '@/lib/retail-kassa/receipt-layout'

/** Winkelkassa bon — ZZP-centrum layout (zelfde als print/mail HTML). */
export function RetailReceiptPaper({
  order,
  tenantInfo,
  labels,
  locale,
  draft = false,
}: {
  order: KassaLastOrderReceipt
  tenantInfo: TenantSettings | null
  labels: RetailReceiptI18n
  locale: string
  draft?: boolean
}) {
  const dateStr = order.createdAt.toLocaleString(appLocaleToBcp47(locale), {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const innerHtml = buildRetailKassaReceiptHtmlBody({
    tenantInfo,
    order,
    labels,
    isDraft: draft,
    dateStr,
  })

  return (
    <div
      className="mx-auto max-w-[300px] rounded-lg bg-white p-4 font-sans text-black text-[11px] leading-snug shadow-sm ring-1 ring-gray-200"
      dangerouslySetInnerHTML={{ __html: innerHtml }}
    />
  )
}
