'use client'

import { useAuth } from './auth-context'

export function useBusinessId() {
  const { businessId, tenant, loading } = useAuth()
  
  return {
    businessId,
    tenantName: tenant?.name || null,
    loading,
  }
}
