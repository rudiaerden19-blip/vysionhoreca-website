import type { NextRequest } from 'next/server'
import { verifySuperAdminAccess } from '@/lib/verify-tenant-access'

/**
 * Beschermt gevaarlijke onderhouds-/debug-endpoints in productie.
 *
 * - **Development / test:** altijd toegestaan (lokale workflows breken niet).
 * - **Production:** alleen superadmin-sessie (headers) óf `x-internal-maintenance-secret`
 *   gelijk aan `INTERNAL_MAINTENANCE_SECRET` (optioneel, voor scripts zonder browser-sessie).
 */
export async function assertInternalToolAccess(
  request: NextRequest
): Promise<{ ok: true } | { ok: false; status: number; json: Record<string, string> }> {
  if (process.env.NODE_ENV !== 'production') {
    return { ok: true }
  }

  const secret = process.env.INTERNAL_MAINTENANCE_SECRET?.trim()
  if (secret) {
    const header = request.headers.get('x-internal-maintenance-secret')
    if (header === secret) {
      return { ok: true }
    }
  }

  const superAccess = await verifySuperAdminAccess(request)
  if (superAccess.authorized) {
    return { ok: true }
  }

  return {
    ok: false,
    status: 403,
    json: {
      error: 'Forbidden',
      hint:
        'In productie: superadmin API-headers (zoals andere superadmin-calls) of geldige x-internal-maintenance-secret.',
    },
  }
}
