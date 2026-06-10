'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { useLanguage } from '@/i18n'
import { normalizeRetailLoyaltyCardCode } from '@/lib/retail-loyalty/card-code'
import { RetailLoyaltyPassBarcode } from '@/components/retail-loyalty/RetailLoyaltyPassBarcode'
import { RetailLoyaltyPassPhoneSave } from '@/components/retail-loyalty/RetailLoyaltyPassPhoneSave'

type PassData = {
  card_code: string
}

function WinkelpasInner({ tenant }: { tenant: string }) {
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const rawCode = searchParams.get('c')?.trim() || ''
  const cardCode = normalizeRetailLoyaltyCardCode(rawCode)

  const [pass, setPass] = useState<PassData | null>(null)
  const [shopName, setShopName] = useState('')
  const [loading, setLoading] = useState(!!cardCode)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!cardCode) {
      setLoading(false)
      setNotFound(false)
      setPass(null)
      setShopName('')
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
        const j = (await r.json()) as { ok?: boolean; pass?: PassData; shopName?: string }
        if (j.ok && j.pass) {
          setPass(j.pass)
          setShopName(j.shopName?.trim() || tenant)
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

  if (!cardCode) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-white px-6">
        <p className="text-center text-sm text-amber-800">{t('retailLoyalty.passPageMissingCode')}</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-white px-6">
        <p className="text-center text-sm text-gray-500">{t('retailLoyalty.loading')}</p>
      </div>
    )
  }

  if (notFound || !pass) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-white px-6">
        <p className="text-center text-sm text-red-700">{t('retailLoyalty.passPageNotFound')}</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-white px-6 py-10">
      <p className="mb-10 max-w-xs text-center text-2xl font-bold uppercase tracking-wide text-gray-900 sm:text-3xl">
        {shopName}
      </p>
      <RetailLoyaltyPassBarcode
        cardCode={pass.card_code}
        large
        showCodeText={false}
        className="w-full max-w-sm"
      />
      <RetailLoyaltyPassPhoneSave cardCode={pass.card_code} minimal />
    </div>
  )
}

export default function WinkelpasPage({ params }: { params: { tenant: string } }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-white text-sm text-gray-500">…</div>
      }
    >
      <WinkelpasInner tenant={params.tenant} />
    </Suspense>
  )
}
