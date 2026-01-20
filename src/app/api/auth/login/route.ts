import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const getSupabase = () => {
  if (!supabaseUrl || !supabaseKey) {
    return null
  }
  return createClient(supabaseUrl, supabaseKey)
}

// Legacy SHA-256 hash for backward compatibility
async function hashPasswordLegacy(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + 'vysion_salt_2024')
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
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email en wachtwoord zijn verplicht' },
        { status: 400 }
      )
    }

    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database configuratie niet beschikbaar' },
        { status: 503 }
      )
    }

    const emailLower = email.trim().toLowerCase()

    // Find business profile by email
    const { data: profile, error: profileError } = await supabase
      .from('business_profiles')
      .select('id, name, email, password_hash, tenant_slug')
      .eq('email', emailLower)
      .maybeSingle()

    if (profileError) {
      console.error('Error finding profile:', profileError)
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
      return NextResponse.json(
        { error: 'Geen tenant gevonden voor dit account. Neem contact op met support.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      tenant: {
        id: profile.id,
        name: profile.name || profile.email,
        email: profile.email,
        business_id: profile.id,
        tenant_slug: tenantSlug
      }
    })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}
