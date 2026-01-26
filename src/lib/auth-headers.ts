'use client'

/**
 * Gets authentication headers for API requests.
 * Uses the stored tenant info from localStorage to authenticate requests.
 * 
 * Usage:
 * ```ts
 * const response = await fetch('/api/some-endpoint', {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     ...getAuthHeaders()
 *   },
 *   body: JSON.stringify(data)
 * })
 * ```
 */
export function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  
  // Check for regular tenant auth
  const tenantData = localStorage.getItem('vysion_tenant')
  if (tenantData) {
    try {
      const tenant = JSON.parse(tenantData)
      return {
        'x-business-id': tenant.business_id || tenant.id || '',
        'x-auth-email': tenant.email || '',
        'x-tenant-slug': tenant.tenant_slug || ''
      }
    } catch {
      // Invalid JSON, clear it
      localStorage.removeItem('vysion_tenant')
    }
  }
  
  // Check for superadmin auth
  const superadminId = localStorage.getItem('superadmin_id')
  const superadminEmail = localStorage.getItem('superadmin_email')
  if (superadminId && superadminEmail) {
    return {
      'x-superadmin-id': superadminId,
      'x-superadmin-email': superadminEmail
    }
  }
  
  return {}
}

/**
 * Makes an authenticated API request.
 * Automatically includes auth headers from localStorage.
 */
export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...(options.headers || {})
  }
  
  return fetch(url, {
    ...options,
    headers
  })
}

/**
 * Checks if user is logged in as a tenant owner.
 */
export function isTenantLoggedIn(): boolean {
  if (typeof window === 'undefined') return false
  const tenantData = localStorage.getItem('vysion_tenant')
  if (!tenantData) return false
  
  try {
    const tenant = JSON.parse(tenantData)
    return !!(tenant.business_id || tenant.id)
  } catch {
    return false
  }
}

/**
 * Checks if user is logged in as superadmin.
 */
export function isSuperAdminLoggedIn(): boolean {
  if (typeof window === 'undefined') return false
  return !!(localStorage.getItem('superadmin_id') && localStorage.getItem('superadmin_email'))
}

/**
 * Gets the current tenant slug from localStorage.
 */
export function getCurrentTenantSlug(): string | null {
  if (typeof window === 'undefined') return null
  const tenantData = localStorage.getItem('vysion_tenant')
  if (!tenantData) return null
  
  try {
    const tenant = JSON.parse(tenantData)
    return tenant.tenant_slug || null
  } catch {
    return null
  }
}
