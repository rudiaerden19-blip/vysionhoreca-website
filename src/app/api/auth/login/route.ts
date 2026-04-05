import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { loginRateLimiter, checkRateLimit, getClientIP } from '@/lib/rate-limit'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'

// Legacy SHA-256 hash for backward compatibility
async function hashPasswordLegacy(password: string): Promise<string> {
  const legacySalt = process.env.PASSWORD_LEGACY_SALT
  if (!legacySalt) {
    logger.error('PASSWORD_LEGACY_SALT not configured - legacy password verification will fail')
    throw new Error('Legacy password verification not configured')
  }
  const encoder = new TextEncoder()
  const data = encoder.encode(password + legacySalt)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Verify password - supports both bcrypt and legacy SHA-256
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (storedHash.startsWith('$2')) {
    return bcrypt.compare(password, storedHash)
  }
  const legacyHash = await hashPasswordLegacy(password)
  return legacyHash === storedHash
}

const normTenant = (s: string) => (s || '').replace(/-/g, '').toLowerCase()

const TARGET_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Zelfde regels als superadmin-login (bcrypt of legacy plaintext). */
async function verifySuperadminPassword(
  plain: string,
  storedHash: string,
  dummyHash: string
): Promise<boolean> {
  const hashToVerify = storedHash || dummyHash
  if (hashToVerify.startsWith('$2')) {
    return bcrypt.compare(plain, hashToVerify)
  }
  if (!storedHash) return false
  return hashToVerify === plain
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  const startTime = Date.now()
  
  try {
    // Rate limiting: 5 login attempts per minute per IP
    const clientIP = getClientIP(request)
    const rateLimitResult = await checkRateLimit(loginRateLimiter, clientIP)
    
    if (!rateLimitResult.success) {
      logger.warn('Login rate limited', { requestId, clientIP })
      return NextResponse.json(
        { error: 'Te veel login pogingen. Probeer het over een minuut opnieuw.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const email = body.email as string
    const password = body.password as string
    const targetTenantSlugRaw =
      typeof body.target_tenant_slug === 'string' ? body.target_tenant_slug.trim().toLowerCase() : ''

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email en wachtwoord zijn verplicht' },
        { status: 400 }
      )
    }

    const supabase = getServerSupabaseClient()
    if (!supabase) {
      logger.error('Login failed: Supabase not configured', { requestId })
      return NextResponse.json(
        { error: 'Database niet geconfigureerd. Neem contact op met support.' },
        { status: 503 }
      )
    }

    const emailLower = email.trim().toLowerCase()

    const dummySaHash =
      '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4uSl9.y5zq5z5z5z'

    // ── Superadmin op gemeenschappelijke tenant-login: zelfde e-mail/wachtwoord als /superadmin/login
    // Vereist target_tenant_slug (uit ?next=/shop/{slug}/…) zodat niet op “losse” /login alles wordt vrijgegeven.
    if (targetTenantSlugRaw && TARGET_SLUG_RE.test(targetTenantSlugRaw)) {
      const { data: saRow, error: saErr } = await supabase
        .from('super_admins')
        .select('id, email, name, password_hash, is_active')
        .eq('email', emailLower)
        .maybeSingle()

      if (saErr) {
        logger.error('Superadmin tenant-login lookup error', { requestId, error: saErr.message })
        return NextResponse.json({ error: 'Database fout' }, { status: 500 })
      }

      const saValid = await verifySuperadminPassword(
        password,
        saRow?.password_hash || '',
        dummySaHash
      )

      if (saRow && saValid && saRow.is_active) {
        let canonicalSlug = targetTenantSlugRaw
        const { data: tenantRow } = await supabase
          .from('tenants')
          .select('slug')
          .eq('slug', targetTenantSlugRaw)
          .maybeSingle()
        if (tenantRow?.slug) canonicalSlug = tenantRow.slug

        let { data: owner } = await supabase
          .from('business_profiles')
          .select('id, name, email, tenant_slug, email_verified')
          .eq('tenant_slug', canonicalSlug)
          .maybeSingle()

        if (!owner) {
          const { data: ownerRows, error: ownerErr } = await supabase
            .from('business_profiles')
            .select('id, name, email, tenant_slug, email_verified')
            .not('tenant_slug', 'is', null)

          if (ownerErr) {
            logger.error('Superadmin tenant-login owner fallback', { requestId, error: ownerErr.message })
            return NextResponse.json({ error: 'Database fout' }, { status: 500 })
          }

          owner =
            ownerRows?.find(
              (r) => normTenant(r.tenant_slug || '') === normTenant(targetTenantSlugRaw)
            ) ?? null
        }

        if (!owner) {
          logger.warn('Superadmin tenant-login: geen eigenaar voor tenant', {
            requestId,
            targetTenantSlugRaw,
          })
          return NextResponse.json(
            { error: 'Geen zaak-account gevonden voor deze tenant. Neem contact op met support.' },
            { status: 404 }
          )
        }

        await supabase
          .from('super_admins')
          .update({ last_login: new Date().toISOString() })
          .eq('id', saRow.id)

        logger.info('Superadmin tenant-login granted (sessie als zaak-eigenaar)', {
          requestId,
          tenantSlug: owner.tenant_slug,
          superadminId: saRow.id,
        })

        return NextResponse.json({
          tenant: {
            id: owner.id,
            name: owner.name || owner.email,
            email: owner.email,
            business_id: owner.id,
            tenant_slug: owner.tenant_slug,
            email_verified: owner.email_verified || false,
          },
          login_via_superadmin: true,
        })
      }
      // Geen geldige superadmin-credentials: val verder door naar normale zaak-login
    }

    // Find business profile by email
    const { data: profile, error: profileError } = await supabase
      .from('business_profiles')
      .select('id, name, email, password_hash, tenant_slug, email_verified')
      .eq('email', emailLower)
      .maybeSingle()

    if (profileError) {
      logger.error('Error finding profile', { requestId, error: profileError.message })
      return NextResponse.json(
        { error: 'Database fout' },
        { status: 500 }
      )
    }

    if (!profile) {
      return NextResponse.json(
        { error: 'Geen account gevonden met dit email adres' },
        { status: 404 }
      )
    }

    // Verify password using secure method (supports bcrypt and legacy SHA-256)
    const isValid = await verifyPassword(password, profile.password_hash)

    if (!isValid) {
      return NextResponse.json(
        { error: 'Onjuist wachtwoord' },
        { status: 401 }
      )
    }

    if (targetTenantSlugRaw && TARGET_SLUG_RE.test(targetTenantSlugRaw)) {
      if (normTenant(profile.tenant_slug || '') !== normTenant(targetTenantSlugRaw)) {
        logger.warn('Login geweigerd: account past niet bij gevraagde tenant', {
          requestId,
          email: emailLower,
          profileTenant: profile.tenant_slug,
          targetTenantSlugRaw,
        })
        return NextResponse.json(
          { error: 'Dit account hoort niet bij deze zaak. Controleer e-mail of open de juiste winkel-URL.' },
          { status: 403 }
        )
      }
    }

    // Auto-upgrade legacy passwords to bcrypt
    if (!profile.password_hash.startsWith('$2')) {
      const newHash = await bcrypt.hash(password, 12)
      await supabase
        .from('business_profiles')
        .update({ password_hash: newHash })
        .eq('id', profile.id)
    }

    // Get tenant_slug from profile or find it
    let tenantSlug = profile.tenant_slug

    if (!tenantSlug) {
      // Try to find tenant by email
      const { data: tenant } = await supabase
        .from('tenants')
        .select('slug')
        .eq('email', emailLower)
        .maybeSingle()

      if (tenant?.slug) {
        tenantSlug = tenant.slug
        // Update business_profile with tenant_slug
        await supabase
          .from('business_profiles')
          .update({ tenant_slug: tenantSlug })
          .eq('id', profile.id)
      }
    }

    if (!tenantSlug) {
      logger.warn('No tenant found for account', { requestId, email: emailLower })
      return NextResponse.json(
        { error: 'Geen tenant gevonden voor dit account. Neem contact op met support.' },
        { status: 404 }
      )
    }

    // ========================================
    // SELF-HEALING: Ensure tenant_settings exists
    // This fixes cases where the record was accidentally deleted
    // ========================================
    const { data: existingSettings } = await supabase
      .from('tenant_settings')
      .select('id')
      .eq('tenant_slug', tenantSlug)
      .maybeSingle()

    if (!existingSettings) {
      logger.warn('Missing tenant_settings - auto-creating', { requestId, tenantSlug })
      
      // Get tenant info for recreation
      const { data: tenantInfo } = await supabase
        .from('tenants')
        .select('name, email, phone')
        .eq('slug', tenantSlug)
        .maybeSingle()

      const { error: settingsError } = await supabase
        .from('tenant_settings')
        .insert({
          tenant_slug: tenantSlug,
          business_name: tenantInfo?.name || profile.name || tenantSlug,
          email: tenantInfo?.email || profile.email,
          phone: tenantInfo?.phone || '',
          primary_color: '#FF6B35',
          secondary_color: '#1a1a2e',
        })

      if (settingsError) {
        logger.error('Failed to auto-create tenant_settings', { requestId, tenantSlug, error: settingsError.message })
      } else {
        logger.info('Auto-created missing tenant_settings', { requestId, tenantSlug })
      }
    }

    logger.info('Login successful', { 
      requestId, 
      tenantSlug, 
      profileId: profile.id,
      duration: Date.now() - startTime 
    })

    return NextResponse.json({
      tenant: {
        id: profile.id,
        name: profile.name || profile.email,
        email: profile.email,
        business_id: profile.id,
        tenant_slug: tenantSlug,
        email_verified: profile.email_verified || false
      }
    })

  } catch (error) {
    logger.error('Login error', { 
      requestId, 
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime 
    })
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}
