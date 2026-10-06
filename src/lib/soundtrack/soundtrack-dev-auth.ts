import type { NextRequest } from 'next/server'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'

/** Alleen lokaal testen: Soundtrack BFF zonder tenant-login (nooit op Vercel production). */
export function isLocalDevSoundtrackBypass(request: NextRequest): boolean {
  if (process.env.NODE_ENV !== 'development') return false
  if (process.env.VYSION_MUSIC_DEV_BYPASS_AUTH !== '1') return false
  const host = (request.headers.get('host') || '').toLowerCase()
  return (
    host.startsWith('localhost:') ||
    host.startsWith('127.0.0.1:') ||
    host === 'localhost' ||
    host === '127.0.0.1'
  )
}

export async function authorizeSoundtrackTenantRequest(
  request: NextRequest,
  tenantSlug: string,
): Promise<{ authorized: true } | { authorized: false; error: string }> {
  if (isLocalDevSoundtrackBypass(request)) {
    return { authorized: true }
  }
  const access = await verifyTenantOrSuperAdmin(request, tenantSlug)
  if (!access.authorized) {
    return { authorized: false, error: access.error || 'Forbidden' }
  }
  return { authorized: true }
}
