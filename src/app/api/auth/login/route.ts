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

    const { email, password } = await request.json()

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
