import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const getSupabase = () => {
  if (!supabaseUrl || !supabaseKey) {
    return null
  }
  return createClient(supabaseUrl, supabaseKey)
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

    // Hash password and compare
    const encoder = new TextEncoder()
    const data = encoder.encode(password + 'vysion_salt_2024')
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    if (passwordHash !== profile.password_hash) {
      return NextResponse.json(
        { error: 'Onjuist wachtwoord' },
        { status: 401 }
      )
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
