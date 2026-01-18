import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isProtectedTenant } from '@/lib/protected-tenants'

// Simple hash function - in production use bcrypt
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + 'vysion_salt_2024')
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

const getSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase config:', { url: !!supabaseUrl, key: !!supabaseKey })
    return null
  }
  
  return createClient(supabaseUrl, supabaseKey)
}

export async function POST(request: NextRequest) {
  try {
    const { businessName, email, phone, password } = await request.json()

    if (!businessName || !email || !phone || !password) {
      return NextResponse.json(
        { error: 'Alle velden zijn verplicht' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Wachtwoord moet minimaal 8 tekens zijn' },
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

    // Check if email already exists
    const { data: existingTenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('email', emailLower)
      .maybeSingle()

    if (existingTenant) {
      return NextResponse.json(
        { error: 'Dit email adres is al in gebruik' },
        { status: 409 }
      )
    }

    // Generate tenant_slug from business name
    let tenantSlug = businessName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    // Check if slug already exists, add number if needed
    const { data: existingSlug } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', tenantSlug)
      .maybeSingle()

    if (existingSlug) {
      // Find a unique slug by adding a number
      let counter = 2
      let newSlug = `${tenantSlug}-${counter}`
      
      while (true) {
        const { data: checkSlug } = await supabase
          .from('tenants')
          .select('id')
          .eq('slug', newSlug)
          .maybeSingle()
        
        if (!checkSlug) {
          tenantSlug = newSlug
          break
        }
        counter++
        newSlug = `${tenantSlug}-${counter}`
        
        if (counter > 100) {
          return NextResponse.json(
            { error: 'Kon geen unieke slug genereren. Probeer een andere bedrijfsnaam.' },
            { status: 400 }
          )
        }
      }
    }

    const passwordHash = await hashPassword(password)
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 14)

    // ========================================
    // 1. CREATE TENANT (main table)
    // ========================================
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: businessName.trim(),
        slug: tenantSlug,
        email: emailLower,
        phone: phone.trim(),
        plan: 'starter',
        subscription_status: 'trial',
        trial_ends_at: trialEndsAt.toISOString(),
      })
      .select()
      .single()

    if (tenantError) {
      console.error('Error creating tenant:', tenantError)
      return NextResponse.json(
        { error: `Fout bij aanmaken tenant: ${tenantError.message}` },
        { status: 500 }
      )
    }

    console.log('Tenant created:', tenant)

    // ========================================
    // 2. CREATE BUSINESS PROFILE (login account)
    // ========================================
    const { data: profile, error: profileError } = await supabase
      .from('business_profiles')
      .insert({
        name: businessName.trim(),
        email: emailLower,
        password_hash: passwordHash,
        phone: phone.trim(),
        tenant_slug: tenantSlug,
      })
      .select()
      .single()

    if (profileError) {
      console.error('Error creating business profile:', profileError)
      // Rollback tenant (maar alleen als het geen beschermde tenant is)
      if (!isProtectedTenant(tenantSlug)) {
        await supabase.from('tenants').delete().eq('id', tenant.id)
      }
      return NextResponse.json(
        { error: `Fout bij aanmaken account: ${profileError.message}` },
        { status: 500 }
      )
    }

    console.log('Business profile created:', profile)

    // ========================================
    // 3. CREATE TENANT SETTINGS (shop settings)
    // ========================================
    const { error: settingsError } = await supabase
      .from('tenant_settings')
      .insert({
        tenant_slug: tenantSlug,
        business_name: businessName.trim(),
        email: emailLower,
        phone: phone.trim(),
        primary_color: '#FF6B35',
        secondary_color: '#1a1a2e',
      })

    if (settingsError) {
      console.error('Error creating tenant_settings:', settingsError)
      // Don't fail - this is secondary
    }

    // ========================================
    // 4. CREATE SUBSCRIPTION
    // ========================================
    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert({
        tenant_slug: tenantSlug,
        plan: 'starter',
        status: 'trial',
        price_monthly: 79,
        trial_started_at: new Date().toISOString(),
        trial_ends_at: trialEndsAt.toISOString(),
      })

    if (subscriptionError) {
      console.error('Error creating subscription:', subscriptionError)
      // Don't fail - this is secondary
    }

    // ========================================
    // SUCCESS
    // ========================================
    return NextResponse.json({ 
      success: true,
      tenant: {
        id: tenant.id,
        name: businessName.trim(),
        email: emailLower,
        tenant_slug: tenantSlug,
      }
    })

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}
