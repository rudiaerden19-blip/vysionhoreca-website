'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { useLanguage } from '@/i18n'
import { normalizeRetailLoyaltyCardCode } from '@/lib/retail-loyalty/card-code'
import { RetailLoyaltyPassBarcode } from '@/components/retail-loyalty/RetailLoyaltyPassBarcode'
import { RetailLoyaltyPassPhoneSave } from '@/components/retail-loyalty/RetailLoyaltyPassPhoneSave'

type PassData = {
  card_code: string
  display_name: string | null
  points_balance: number
}

function WinkelpasInner({ tenant }: { tenant: string }) {
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const rawCode = searchParams.get('c')?.trim() || ''
  const cardCode = normalizeRetailLoyaltyCardCode(rawCode)

  const [pass, setPass] = useState<PassData | null>(null)
  const [loading, setLoading] = useState(!!cardCode)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!cardCode) {
      setLoading(false)
      setNotFound(false)
      setPass(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setNotFound(false)
    void fetch(
      `/api/retail/loyalty/pass?tenant=${encodeURIComponent(tenant)}&code=${encodeURIComponent(cardCode)}`,
    )
      .then(async (r) => {
        if (cancelled) return
        if (!r.ok) {
          setNotFound(true)
          setPass(null)
          return
        }
        const j = (await r.json()) as { ok?: boolean; pass?: PassData }
        if (j.ok && j.pass) {
          setPass(j.pass)
          setNotFound(false)
        } else {
          setNotFound(true)
          setPass(null)
        }
      })
      .catch(() => {
        if (!cancelled) setNotFound(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [tenant, cardCode])

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col bg-gray-50 px-4 py-8">
      <h1 className="mb-2 text-center text-xl font-bold text-gray-900">{t('retailLoyalty.passPageTitle')}</h1>
      <p className="mb-6 text-center text-sm text-gray-600">{t('retailLoyalty.passPageHint')}</p>

      {!cardCode ? (
        <p className="text-center text-sm text-amber-800">{t('retailLoyalty.passPageMissingCode')}</p>
      ) : loading ? (
        <p className="text-center text-sm text-gray-500">{t('retailLoyalty.loading')}</p>
      ) : notFound || !pass ? (
        <p className="text-center text-sm text-red-700">{t('retailLoyalty.passPageNotFound')}</p>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          {pass.display_name?.trim() ? (
            <p className="text-lg font-semibold text-gray-900">{pass.display_name.trim()}</p>
          ) : null}
          <RetailLoyaltyPassBarcode cardCode={pass.card_code} className="w-full" />
          <p className="text-2xl font-bold tabular-nums text-amber-900">
            {t('retailLoyalty.passPointsLine').replace('{points}', String(pass.points_balance))}
          </p>
          <p className="text-center text-xs text-gray-500">{t('retailLoyalty.passPageScanAtPos')}</p>
          <RetailLoyaltyPassPhoneSave cardCode={pass.card_code} />
        </div>
      )}
    </div>
  )
}

export default function WinkelpasPage({ params }: { params: { tenant: string } }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-sm text-gray-500">…</div>
      }
    >
      <WinkelpasInner tenant={params.tenant} />
    </Suspense>
  )
}
