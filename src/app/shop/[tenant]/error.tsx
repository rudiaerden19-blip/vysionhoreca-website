'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

import { trackError } from '@/lib/monitoring'

function isReactRemoveChildNoise(error: Error) {
  return (
    (error.name === 'NotFoundError' || /NotFoundError/i.test(error.message)) &&
    /removeChild/i.test(error.message) &&
    /not a child of this node/i.test(error.message)
  )
}

export default function ShopTenantError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const params = useParams()
  const tenant = typeof params?.tenant === 'string'? params.tenant : ''
  const removeChildNoise = isReactRemoveChildNoise(error)

  useEffect(() => {
    if (removeChildNoise) {
      reset()
      return
    }
    const name = error?.name ?? ''
    const msg = error?.message ?? ''
    if (name === 'AbortError') return
    if (/the operation was aborted|signal is aborted|aborted a request/i.test(msg)) return
    trackError(error, { segment: 'shop/[tenant]', tenant: tenant || undefined })
  }, [error, tenant, reset, removeChildNoise])

  const homeHref = tenant ? `/shop/${encodeURIComponent(tenant)}`: '/'

  if (removeChildNoise) return null

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-red-600 mb-2">Er ging iets mis</h1>
      <p className="text-gray-600 mb-6 max-w-md">
        Probeer het opnieuw of ga terug naar de webshop.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          type="button"
          className="rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4"
          onClick={() => reset()}
        >
          Probeer opnieuw
        </button>
        <Link
          href={homeHref}
          className="rounded-lg border border-gray-300 bg-white hover:bg-gray-50 font-semibold py-2 px-4 text-gray-900"
        >
          Naar webshop
        </Link>
      </div>
    </div>
  )
}
