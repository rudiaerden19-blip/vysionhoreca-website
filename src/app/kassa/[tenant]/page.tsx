'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// This page redirects to the new Shop Display
// Old Kassa Display is now split into:
// - /shop/[tenant]/display - Shop Display (order management)
// - /keuken/[tenant] - Kitchen Display (for kitchen staff)

export default function KassaRedirectPage({ params }: { params: { tenant: string } }) {
  const router = useRouter()
  
  useEffect(() => {
    router.replace(`/shop/${params.tenant}/display`)
  }, [params.tenant, router])

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
      <div className="text-center">
        <div className="text-4xl mb-4 animate-spin">🔄</div>
        <p className="text-lg">Doorverwijzen naar Shop Display...</p>
      </div>
    </div>
  )
}
