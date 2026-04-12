'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/i18n'
import { kioskShopHref } from '@/lib/kiosk-mode'
import { writeSchoolShopSession } from '@/lib/school-shop-session'

export default function SchoolShopEntryPage({
  params,
}: {
  params: { tenant: string }
}) {
  const { t } = useLanguage()
  const router = useRouter()
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  function shopHome() {
    return kioskShopHref(params.tenant, 'home', { kiosk: false, shortUrls: false })
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      const res = await fetch('/api/school-shop/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_slug: params.tenant, access_code: code }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErr(data.error || t('schoolShop.errorInvalid'))
        return
      }
      writeSchoolShopSession(params.tenant, {
        weekId: data.weekId,
        accessCode: data.accessCode,
        productIds: data.productIds,
        orderDeadline: data.orderDeadline,
        title: data.title,
      })
      router.push(`/shop/${params.tenant}/menu?school_week=${data.weekId}`)
    } catch {
      setErr(t('schoolShop.errorInvalid'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">{t('schoolShop.publicTitle')}</h1>
        <p className="text-slate-600 text-sm mb-6">{t('schoolShop.publicSubtitle')}</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="school-code" className="block text-sm font-medium text-slate-700 mb-1">
              {t('schoolShop.codeLabel')}
            </label>
            <input
              id="school-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              autoComplete="one-time-code"
              inputMode="text"
              placeholder={t('schoolShop.codePlaceholder')}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono tracking-widest text-lg uppercase"
              maxLength={16}
            />
          </div>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <button
            type="submit"
            disabled={loading || code.trim().length < 2}
            className="w-full py-3 rounded-xl bg-orange-500 text-white font-semibold hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('schoolShop.submitting') : t('schoolShop.submit')}
          </button>
        </form>
        <Link href={shopHome()} className="mt-6 inline-block text-sm text-slate-500 hover:text-slate-800">
          ← {t('schoolShop.backHome')}
        </Link>
      </div>
    </div>
  )
}
