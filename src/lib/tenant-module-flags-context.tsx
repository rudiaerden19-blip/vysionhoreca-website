'use client'

import { createContext, useContext, type ReactNode } from 'react'
import {
  useTenantModuleFlags,
  type TenantModuleFlagsResult,
} from '@/lib/use-tenant-modules'

type Ctx = TenantModuleFlagsResult & { refetch: () => void }

const TenantModuleFlagsContext = createContext<Ctx | null>(null)

export function TenantModuleFlagsProvider({
  tenantSlug,
  children,
}: {
  tenantSlug: string
  children: ReactNode
}) {
  const flags = useTenantModuleFlags(tenantSlug)
  return (
    <TenantModuleFlagsContext.Provider value={flags}>{children}</TenantModuleFlagsContext.Provider>
  )
}

export function useTenantModuleFlagsContext(): Ctx {
  const ctx = useContext(TenantModuleFlagsContext)
  if (!ctx) {
    throw new Error('useTenantModuleFlagsContext: buiten TenantModuleFlagsProvider')
  }
  return ctx
}
