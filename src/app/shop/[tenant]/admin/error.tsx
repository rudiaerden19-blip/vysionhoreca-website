'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

import { useLanguage } from '@/i18n'
import { trackError } from '@/lib/monitoring'

/**
 * Next.js-route error boundary voor alle `/shop/[tenant]/admin/*`routes
 * (kassa, reserveringen, rapporten, …). Vangt renderfouten in page/layout‑kinderen
 * zodat gebruikers niet op een witte pagina terechtkomen.
 */
export default function ShopAdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const params = useParams()
  const tenant = typeof params?.tenant === 'string'? params.tenant : ''
  const { t } = useLanguage()

  useEffect(() => {
    const name = error?.name ?? ''
    const msg = error?.message ?? ''
    if (name === 'AbortError') return
    if (/the operation was aborted|signal is aborted|aborted a request/i.test(msg)) return
    trackError(error, { segment: 'shop/[tenant]/admin', tenant: tenant || undefined })
  }, [error, tenant])

  const overviewHref = tenant ? `/shop/${encodeURIComponent(tenant)}/admin`: '/'

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center px-4 py-12 text-center">
      <h1 className="mb-2 text-xl font-semibold text-red-600 sm:text-2xl">
        {t('adminPages.errorFallback.title')}
      </h1>
      <p className="mb-6 max-w-md text-sm text-gray-600 sm:text-base">
        {t('adminPages.errorFallback.description')}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          className="rounded-lg bg-orange-500 px-4 py-2 font-semibold text-white hover:bg-orange-600"
          onClick={() => reset()}
        >
          {t('adminPages.errorFallback.retry')}
        </button>
        <Link
          href={overviewHref}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-900 hover:bg-gray-50"
        >
          {t('adminPages.errorFallback.backToOverview')}
        </Link>
      </div>
    </div>
  )
}
