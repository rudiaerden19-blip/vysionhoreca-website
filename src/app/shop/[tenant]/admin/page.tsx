'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTenantModuleFlagsContext } from '@/lib/tenant-module-flags-context'
import {
  getAdminKassaEntryHref,
  getFirstAccessibleAdminPath,
} from '@/lib/tenant-modules'

/** Na login: direct naar kassa-POS — geen omzet-overzicht voor personeel op /admin. */
export default function AdminHomeRedirect({ params }: { params: { tenant: string } }) {
  const router = useRouter()
  const { moduleAccess, enabledModulesJson, loading } = useTenantModuleFlagsContext()

  useEffect(() => {
    if (loading) return
    const posHref = getAdminKassaEntryHref(
      params.tenant,
      moduleAccess,
      enabledModulesJson,
    )
    if (posHref) {
      router.replace(posHref)
      return
    }
    router.replace(
      getFirstAccessibleAdminPath(params.tenant, moduleAccess, enabledModulesJson),
    )
  }, [loading, moduleAccess, enabledModulesJson, params.tenant, router])

  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-blue-500" />
    </div>
  )
}
