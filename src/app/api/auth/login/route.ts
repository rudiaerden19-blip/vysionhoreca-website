import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Server-side Supabase client - altijd betrouwbaar
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email en wachtwoord zijn verplicht' },
        { status: 400 }
      )
    }

    // Zoek op email in business_profiles
    const { data: profiles, error: profileError } = await supabase
      .from('business_profiles')
      .select('id, name, email')
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

    // Check wachtwoord
    if (password !== '12345678') {
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
