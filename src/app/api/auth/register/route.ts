import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
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

    // Check if email already exists in business_profiles
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('business_profiles')
      .select('id')
      .ilike('email', email.trim())
      .maybeSingle()

    if (profileCheckError) {
      console.error('Error checking existing profile:', profileCheckError)
      // If table doesn't exist, continue with creation
      if (profileCheckError.code === '42P01') {
        console.warn('business_profiles table does not exist - please run migration')
      } else {
        return NextResponse.json(
          { error: 'Database fout bij controleren email' },
          { status: 500 }
        )
      }
    }

    // Check if tenant_settings exists for this email (tenant might be deleted but business_profile still exists)
    const { data: existingTenantSettings } = await supabase
      .from('tenant_settings')
      .select('tenant_slug')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle()

    if (existingProfile && existingTenantSettings) {
      // Both exist - email is really in use
      return NextResponse.json(
        { error: 'Dit email adres is al in gebruik' },
        { status: 409 }
      )
    }

    // If business_profile exists but no tenant_settings, delete the orphaned profile
    if (existingProfile && !existingTenantSettings) {
      console.log('Found orphaned business_profile, deleting it...')
      await supabase
        .from('business_profiles')
        .delete()
        .eq('id', existingProfile.id)
    }

    // Generate tenant_slug from business name
    const tenantSlug = businessName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    // Check if tenant_slug already exists
    const { data: existingTenant } = await supabase
      .from('tenant_settings')
      .select('id')
      .eq('tenant_slug', tenantSlug)
      .single()

    if (existingTenant) {
      // Add random suffix if slug exists
      const uniqueSlug = `${tenantSlug}-${Math.random().toString(36).substring(2, 7)}`
      
      // Create business_profile
      const passwordHash = await hashPassword(password)
      const { data: profile, error: profileError } = await supabase
        .from('business_profiles')
        .insert({
          name: businessName.trim(),
          email: email.trim().toLowerCase(),
          password_hash: passwordHash,
          phone: phone.trim(),
          user_id: null, // Explicitly set to null if column exists
        })
        .select()
        .single()

      if (profileError) {
        console.error('Error creating business profile:', profileError)
        if (profileError.code === '42P01') {
          return NextResponse.json(
            { error: 'Database tabel bestaat niet. Voer eerst de migratie uit: business_profiles_migration.sql in Supabase SQL Editor' },
            { status: 500 }
          )
        }
        // Check for missing column error
        if (profileError.message && profileError.message.includes('password_hash')) {
          return NextResponse.json(
            { error: 'Database kolom ontbreekt. Voer de migratie uit: supabase/business_profiles_migration.sql in Supabase SQL Editor' },
            { status: 500 }
          )
        }
        return NextResponse.json(
          { error: `Fout bij aanmaken account: ${profileError.message}` },
          { status: 500 }
        )
      }

      // Create tenant_settings
      const { error: tenantError } = await supabase
        .from('tenant_settings')
        .insert({
          tenant_slug: uniqueSlug,
          business_name: businessName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          primary_color: '#FF6B35',
          secondary_color: '#1a1a2e',
        })

      if (tenantError) {
        console.error('Error creating tenant:', tenantError)
        if (tenantError.code === '42P01') {
          return NextResponse.json(
            { error: 'Database tabel bestaat niet. Voer eerst de migratie uit: admin_tables.sql' },
            { status: 500 }
          )
        }
        return NextResponse.json(
          { error: `Fout bij aanmaken tenant: ${tenantError.message}` },
          { status: 500 }
        )
      }

      // Create subscription with 14-day trial
      const trialEndsAt = new Date()
      trialEndsAt.setDate(trialEndsAt.getDate() + 14)

      const { error: subscriptionError } = await supabase
        .from('subscriptions')
        .insert({
          tenant_slug: uniqueSlug,
          plan: 'starter',
          status: 'trial',
          price_monthly: 79,
          trial_started_at: new Date().toISOString(),
          trial_ends_at: trialEndsAt.toISOString(),
        })

      if (subscriptionError) {
        console.error('Error creating subscription:', subscriptionError)
        if (subscriptionError.code === '42P01') {
          console.warn('subscriptions table does not exist - please run superadmin_migration.sql')
        }
        // Don't fail registration if subscription creation fails
      }

      return NextResponse.json({ 
        success: true,
        tenant: {
          id: profile.id,
          name: businessName.trim(),
          email: email.trim().toLowerCase(),
          tenant_slug: uniqueSlug,
        }
      })
    }

    // Create business_profile
    const passwordHash = await hashPassword(password)
    const { data: profile, error: profileError } = await supabase
      .from('business_profiles')
      .insert({
        name: businessName.trim(),
        email: email.trim().toLowerCase(),
        password_hash: passwordHash,
        phone: phone.trim(),
        user_id: null, // Explicitly set to null if column exists
      })
      .select()
      .single()

    if (profileError) {
      console.error('Error creating business profile:', profileError)
      if (profileError.code === '42P01') {
        return NextResponse.json(
          { error: 'Database tabel bestaat niet. Voer eerst de migratie uit: business_profiles_migration.sql' },
          { status: 500 }
        )
      }
      return NextResponse.json(
        { error: `Fout bij aanmaken account: ${profileError.message}` },
        { status: 500 }
      )
    }

    // Create tenant_settings
    const { error: tenantError } = await supabase
      .from('tenant_settings')
      .insert({
        tenant_slug: tenantSlug,
        business_name: businessName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        primary_color: '#FF6B35',
        secondary_color: '#1a1a2e',
      })

    if (tenantError) {
      console.error('Error creating tenant:', tenantError)
      if (tenantError.code === '42P01') {
        return NextResponse.json(
          { error: 'Database tabel bestaat niet. Voer eerst de migratie uit: admin_tables.sql' },
          { status: 500 }
        )
      }
      return NextResponse.json(
        { error: `Fout bij aanmaken tenant: ${tenantError.message}` },
        { status: 500 }
      )
    }

    // Create subscription with 14-day trial
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 14)

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
      if (subscriptionError.code === '42P01') {
        console.warn('subscriptions table does not exist - please run superadmin_migration.sql')
      }
      // Don't fail registration if subscription creation fails
    }

    return NextResponse.json({ 
      success: true,
      tenant: {
        id: profile.id,
        name: businessName.trim(),
        email: email.trim().toLowerCase(),
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
