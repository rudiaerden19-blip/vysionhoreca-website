'use client'

import type { TenantSettings } from '@/lib/admin-api'
import type { KassaLastOrderReceipt } from '@/lib/kassa-cart-types'
import { appLocaleToBcp47 } from '@/lib/print-receipt-html'
import type { RetailReceiptI18n } from '@/lib/retail-kassa-receipt'
import { buildRetailKassaReceiptHtmlBody } from '@/lib/retail-kassa/receipt-layout'

/** Winkelkassa bonvoorbeeld — zelfde layout als print/mail. */
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
    day: '2-digit',
    month: '2-digit',
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
      className="bg-white text-black p-4 rounded-lg max-w-[300px] mx-auto font-mono text-sm leading-snug [&_.row]:flex [&_.row]:justify-between [&_.row]:gap-2 [&_.center]:text-center [&_.small]:text-xs [&_.bold]:font-bold [&_.divider]:border-t [&_.divider]:border-dashed [&_.divider]:border-gray-400 [&_.divider]:my-2 [&_.divider-solid]:border-t [&_.divider-solid]:border-gray-800 [&_.divider-solid]:my-2 [&_.col-head]:text-[10px] [&_.col-head]:font-bold [&_.col-head]:uppercase [&_.total-big]:text-lg [&_.total-big]:font-black [&_.total-big]:border-y-2 [&_.total-big]:border-black [&_.total-big]:py-2 [&_.total-big]:my-2 [&_.item-sub]:text-xs [&_.item-sub]:text-gray-600 [&_.footer-block]:text-[10px] [&_.footer-block]:leading-relaxed [&_.retail-header-rule]:border-t-2 [&_.retail-header-rule]:border-gray-800 [&_.retail-header-rule]:w-2/5 [&_.retail-header-rule]:mx-auto [&_.retail-header-rule]:my-2 [&_.retail-tagline]:text-xs [&_.retail-tagline]:italic [&_.retail-name]:font-bold [&_.retail-name]:text-base [&_.retail-logo]:mx-auto [&_.retail-logo]:mb-2 [&_.retail-logo]:max-h-16 [&_.retail-logo]:max-w-[140px] [&_.retail-logo]:object-contain [&_.barcode-wrap_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: innerHtml }}
    />
  )
}
