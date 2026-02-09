import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      company_name,
      contact_name,
      email,
      phone,
      country,
      city,
      website,
      experience,
      motivation,
      expected_clients,
    } = body

    // Validate required fields
    if (!company_name || !contact_name || !email || !country) {
      return NextResponse.json(
        { error: 'Vul alle verplichte velden in' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const { data: existing } = await supabaseAdmin
      .from('partner_applications')
      .select('id')
      .eq('email', email)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Dit e-mailadres heeft al een aanvraag ingediend' },
        { status: 400 }
      )
    }

    // Insert application
    const { data, error } = await supabaseAdmin
      .from('partner_applications')
      .insert({
        company_name,
        contact_name,
        email,
        phone: phone || null,
        country,
        city: city || null,
        website: website || null,
        experience: experience || null,
        motivation: motivation || null,
        expected_clients: expected_clients || null,
        status: 'new',
      })
      .select()
      .single()

    if (error) {
      console.error('Partner application error:', error)
      return NextResponse.json(
        { error: 'Er ging iets mis bij het opslaan' },
        { status: 500 }
      )
    }

    // TODO: Send notification email to admin
    // TODO: Send confirmation email to applicant

    console.log('✅ New partner application:', data)

    return NextResponse.json({ success: true, data })

  } catch (error: any) {
    console.error('Partner application error:', error)
    return NextResponse.json(
      { error: 'Er ging iets mis' },
      { status: 500 }
    )
  }
}
