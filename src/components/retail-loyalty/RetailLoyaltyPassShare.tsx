'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import QRCode from '@/components/QRCode'
import { useLanguage } from '@/i18n'
import {
  buildRetailLoyaltyPassAbsoluteUrl,
  buildRetailLoyaltyPassPath,
} from '@/lib/retail-loyalty/pass-url'
import { RetailLoyaltyPassBarcode } from '@/components/retail-loyalty/RetailLoyaltyPassBarcode'

export function RetailLoyaltyPassShare({
  tenantSlug,
  cardCode,
  displayName,
  pointsBalance,
  compact = false,
}: {
  tenantSlug: string
  cardCode: string
  displayName?: string | null
  pointsBalance?: number
  compact?: boolean
}) {
  const { t } = useLanguage()
  const [copied, setCopied] = useState(false)
  const passUrl = useMemo(() => {
    if (typeof window === 'undefined') return buildRetailLoyaltyPassAbsoluteUrl('', tenantSlug, cardCode)
    return buildRetailLoyaltyPassAbsoluteUrl(window.location.origin, tenantSlug, cardCode)
  }, [tenantSlug, cardCode])

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
      className={`rounded-xl border border-emerald-200 bg-emerald-50/80 ${compact ? 'p-3' : 'p-4'}`}
    >
      {!compact ? (
        <p className="mb-2 text-sm font-semibold text-emerald-900">{t('retailLoyalty.passShareTitle')}</p>
      ) : null}
      <p className="mb-3 text-xs leading-snug text-emerald-800">{t('retailLoyalty.passShareHint')}</p>
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:justify-center">
        <RetailLoyaltyPassBarcode cardCode={cardCode} />
        <div className="flex flex-col items-center gap-2">
          <QRCode url={passUrl} size={compact ? 120 : 140} />
          <span className="text-[10px] text-gray-500">{t('retailLoyalty.passQrCaption')}</span>
        </div>
      </div>
      {displayName?.trim() ? (
        <p className="mt-3 text-center text-sm font-semibold text-gray-900">{displayName.trim()}</p>
      ) : null}
      {pointsBalance != null ? (
        <p className="text-center text-sm text-amber-900">
          {t('retailLoyalty.passPointsLine').replace('{points}', String(pointsBalance))}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap justify-center gap-2">
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
