import { NextRequest } from 'next/server'
import { getServerSupabaseClient } from './supabase-server'
import { logger } from './logger'
import { verifySessionToken } from './session-token'

export interface TenantAccessResult {
  authorized: boolean
  tenantSlug?: string
  businessId?: string
  error?: string
}

const normTenant = (s: string) => (s || '').replace(/-/g, '').toLowerCase()

/**
 * Verifies that the request has valid access to the specified tenant.
 * 
 * This function checks that:
 * 1. The request includes valid authorization (business_id header)
 * 2. The business_id corresponds to a valid business_profile
 * 3. The business_profile has access to the requested tenant_slug
 * 
 * Usage in API routes:
 * ```ts
 * const access = await verifyTenantAccess(request, tenantSlug)
 * if (!access.authorized) {
 *   return NextResponse.json({ error: access.error }, { status: 403 })
 * }
 * ```
 */
export async function verifyTenantAccess(
  request: NextRequest,
  requestedTenantSlug: string
): Promise<TenantAccessResult> {
  const requestId = crypto.randomUUID()

  try {
    // ── 1. HMAC sessietoken (voorkeur) ──────────────────────────────────────
    // Als er een geldig owner-token mee komt, vertrouwen we de payload zonder
    // verdere DB-roundtrip. Voorkomt dat naakte (id, email)-headers volstaan.
    const token = request.headers.get('x-session-token')
    if (token) {
      const payload = verifySessionToken(token)
      if (payload && payload.k === 'owner') {
        if (normTenant(payload.tenant_slug) !== normTenant(requestedTenantSlug)) {
          logger.warn('Tenant access denied (token)', {
            requestId,
            businessId: payload.id,
            profileTenant: payload.tenant_slug,
            requestedTenant: requestedTenantSlug,
          })
          return {
            authorized: false,
            error: 'Je hebt geen toegang tot deze tenant.',
          }
        }
        return {
          authorized: true,
          tenantSlug: payload.tenant_slug,
          businessId: payload.id,
        }
      }
      // Ongeldig of verlopen token → val door naar header-mode.
    }

    // ── 2. Legacy header-mode (dual-mode tijdens migratie) ──────────────────
    // Wordt actief als geen token aanwezig is, of als token ongeldig was.
    // Wordt verwijderd zodra alle clients het token gebruiken.
    const businessId = request.headers.get('x-business-id')
    const authEmail = request.headers.get('x-auth-email')

    if (!businessId || !authEmail) {
      logger.warn('Missing auth (token + headers)', {
        requestId,
        hasToken: !!token,
        hasBusinessId: !!businessId,
        hasEmail: !!authEmail,
        tenantSlug: requestedTenantSlug,
      })
      return {
        authorized: false,
        error: 'Niet ingelogd. Log opnieuw in.',
      }
    }

    const supabase = getServerSupabaseClient()
    if (!supabase) {
      logger.error('Supabase not configured', { requestId })
      return {
        authorized: false,
        error: 'Database niet beschikbaar',
      }
    }

    const { data: profile, error: profileError } = await supabase
      .from('business_profiles')
      .select('id, email, tenant_slug')
      .eq('id', businessId)
      .eq('email', authEmail.toLowerCase())
      .maybeSingle()

    if (profileError || !profile) {
      logger.warn('Invalid business profile', {
        requestId,
        businessId,
        error: profileError?.message,
      })
      return {
        authorized: false,
        error: 'Ongeldige sessie. Log opnieuw in.',
      }
    }

    if (normTenant(profile.tenant_slug || '') !== normTenant(requestedTenantSlug)) {
      logger.warn('Tenant access denied (headers)', {
        requestId,
        businessId,
        profileTenant: profile.tenant_slug,
        requestedTenant: requestedTenantSlug,
      })
      return {
        authorized: false,
        error: 'Je hebt geen toegang tot deze tenant.',
      }
    }

    logger.debug('Tenant access verified (legacy headers)', {
      requestId,
      businessId,
      tenantSlug: requestedTenantSlug,
    })

    return {
      authorized: true,
      tenantSlug: requestedTenantSlug,
      businessId: profile.id,
    }
  } catch (error) {
    logger.error('Tenant access verification failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return {
      authorized: false,
      error: 'Verificatie mislukt',
    }
  }
}

/**
 * Verifies superadmin access from headers.
 * Superadmins can access any tenant.
 */
export async function verifySuperAdminAccess(
  request: NextRequest
): Promise<{ authorized: boolean; adminId?: string; error?: string }> {
  const requestId = crypto.randomUUID()

  try {
    // ── 1. HMAC sessietoken (voorkeur) ──────────────────────────────────────
    const token = request.headers.get('x-superadmin-session-token') || request.headers.get('x-session-token')
    if (token) {
      const payload = verifySessionToken(token)
      if (payload && payload.k === 'superadmin') {
        return { authorized: true, adminId: payload.id }
      }
      // Ongeldig/verlopen token → val door naar header-mode.
    }

    // ── 2. Legacy header-mode (dual-mode tijdens migratie) ──────────────────
    const superadminId = request.headers.get('x-superadmin-id')
    const superadminEmail = request.headers.get('x-superadmin-email')

    if (!superadminId || !superadminEmail) {
      return { authorized: false, error: 'Niet ingelogd als superadmin' }
    }

    const supabase = getServerSupabaseClient()
    if (!supabase) {
      return { authorized: false, error: 'Database niet beschikbaar' }
    }

    // Verify superadmin exists and is active
    const { data: admin, error: adminError } = await supabase
      .from('super_admins')
      .select('id, email, is_active')
      .eq('id', superadminId)
      .eq('email', superadminEmail.toLowerCase())
      .eq('is_active', true)
      .maybeSingle()

    if (adminError || !admin) {
      logger.warn('Invalid superadmin session', { 
        requestId, 
        superadminId, 
        error: adminError?.message 
      })
      return { authorized: false, error: 'Ongeldige superadmin sessie' }
    }

    return { authorized: true, adminId: admin.id }

  } catch (error) {
    logger.error('Superadmin verification failed', { 
      requestId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    return { authorized: false, error: 'Verificatie mislukt' }
  }
}

/**
 * Combined check: allows access if user owns tenant OR is superadmin.
 */
export async function verifyTenantOrSuperAdmin(
  request: NextRequest,
  requestedTenantSlug: string
): Promise<TenantAccessResult & { isSuperAdmin?: boolean }> {
  // First check regular tenant access
  const tenantAccess = await verifyTenantAccess(request, requestedTenantSlug)
  if (tenantAccess.authorized) {
    return { ...tenantAccess, isSuperAdmin: false }
  }

  // If not tenant owner, check if superadmin
  const superAdminAccess = await verifySuperAdminAccess(request)
  if (superAdminAccess.authorized) {
    return {
      authorized: true,
      tenantSlug: requestedTenantSlug,
      businessId: superAdminAccess.adminId,
      isSuperAdmin: true
    }
  }

  // Neither tenant owner nor superadmin
  return tenantAccess
}
