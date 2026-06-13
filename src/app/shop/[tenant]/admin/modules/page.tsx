'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Modules worden alleen in superadmin beheerd — geen klantportaal. */
export default function TenantModulesPageRedirect({ params }: { params: { tenant: string } }) {
  const router = useRouter()

  useEffect(() => {
    router.replace(`/shop/${params.tenant}/admin`)
  }, [params.tenant, router])

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#3C4D6B] border-t-transparent" />
    </div>
  )
}
