import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Server-side Supabase client - alleen aanmaken als env vars beschikbaar zijn
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

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

    // Zoek op email in business_profiles
    const { data: profiles, error: profileError } = await supabase
      .from('business_profiles')
      .select('id, name, email, password_hash')
      .ilike('email', email.trim())

    if (profileError) {
      return NextResponse.json(
        { error: `Database fout: ${profileError.message}` },
        { status: 500 }
      )
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json(
        { error: 'Geen handelaar gevonden met dit email adres' },
        { status: 404 }
      )
    }

    // Hash password and compare
    const encoder = new TextEncoder()
    const data = encoder.encode(password + 'vysion_salt_2024')
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // Check wachtwoord
    if (passwordHash !== profiles[0].password_hash) {
      return NextResponse.json(
        { error: 'Onjuist wachtwoord' },
        { status: 401 }
      )
    }

    const tenant = {
      id: profiles[0].id,
      name: profiles[0].name || profiles[0].email,
      email: profiles[0].email,
      business_id: profiles[0].id
    }

    return NextResponse.json({ tenant })

  } catch (error) {
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}
