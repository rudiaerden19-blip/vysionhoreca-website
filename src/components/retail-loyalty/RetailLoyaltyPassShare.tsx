'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/i18n'
import {
  buildRetailLoyaltyPassAbsoluteUrl,
  buildRetailLoyaltyPassPath,
} from '@/lib/retail-loyalty/pass-url'
import { RetailLoyaltyPassBarcode } from '@/components/retail-loyalty/RetailLoyaltyPassBarcode'

export function RetailLoyaltyPassShare({
  tenantSlug,
  cardCode,
  shopName,
  compact = false,
}: {
  tenantSlug: string
  cardCode: string
  /** Winkelnaam zoals op telefoon (business_name). */
  shopName?: string | null
  compact?: boolean
  /** @deprecated niet meer getoond op klantweergave */
  displayName?: string | null
  /** @deprecated niet meer getoond op klantweergave */
  pointsBalance?: number
}) {
  const { t } = useLanguage()
  const [copied, setCopied] = useState(false)
  const passUrl = useMemo(() => {
    if (typeof window === 'undefined') return buildRetailLoyaltyPassAbsoluteUrl('', tenantSlug, cardCode)
    return buildRetailLoyaltyPassAbsoluteUrl(window.location.origin, tenantSlug, cardCode)
  }, [tenantSlug, cardCode])

  const title = shopName?.trim() || tenantSlug

  async function copyLink() {
    try {
      const url =
        typeof window !== 'undefined'
          ? buildRetailLoyaltyPassAbsoluteUrl(window.location.origin, tenantSlug, cardCode)
          : passUrl
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* noop */
    }
  }

  return (
    <div
      className={`rounded-xl border border-emerald-200 bg-white ${compact ? 'p-3': 'p-4'}`}
    >
      {!compact ? (
        <p className="mb-3 text-xs leading-snug text-gray-500">{t('retailLoyalty.passShareHint')}</p>
      ) : null}
      <div className="flex w-full flex-col items-center gap-6 rounded-lg bg-white py-4">
        <p className="text-center text-xl font-bold uppercase tracking-wide text-gray-900">{title.toUpperCase()}</p>
        <RetailLoyaltyPassBarcode cardCode={cardCode} large showCodeText={false} className="w-full max-w-md" />
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-2 border-t border-gray-100 pt-4">
        <button
          type="button"
          onClick={() => void copyLink()}
          className="rounded-lg border border-emerald-600 bg-white px-3 py-2 text-xs font-semibold text-emerald-800"
        >
          {copied ? t('retailLoyalty.linkCopied') : t('retailLoyalty.copyPassLink')}
        </button>
        <Link
          href={buildRetailLoyaltyPassPath(tenantSlug, cardCode)}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white no-underline"
        >
          {t('retailLoyalty.openPassOnPhone')}
        </Link>
      </div>
    </div>
  )
}
