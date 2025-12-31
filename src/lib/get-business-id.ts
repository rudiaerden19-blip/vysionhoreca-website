'use client'

export function getBusinessId(): string | null {
  if (typeof window === 'undefined') return null
  
  const stored = localStorage.getItem('vysion_tenant')
  if (!stored) return null
  
  try {
    const tenant = JSON.parse(stored)
    return tenant.business_id || null
  } catch {
    return null
  }
}
