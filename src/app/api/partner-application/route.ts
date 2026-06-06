import { NextRequest, NextResponse } from 'next/server'
import { getApiRouteSupabase } from '@/lib/api-route-supabase'
import {
  checkRateLimit,
  getClientIP,
  partnerApplicationRateLimiter,
} from '@/lib/rate-limit'
import { parseJsonBody, jsonServerError } from '@/lib/api-request'
import { partnerApplicationSchema } from '@/lib/api-schemas'

export async function POST(request: NextRequest) {
  try {
    const db = getApiRouteSupabase()
    if (!db.ok) return db.response
    const supabaseAdmin = db.supabase
    const clientIP = getClientIP(request)
    const rateLimitResult = await checkRateLimit(partnerApplicationRateLimiter, clientIP)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Te veel aanvragen vanaf dit adres. Probeer later opnieuw.' },
        { status: 429 }
      )
    }

    const parsed = await parseJsonBody(request, partnerApplicationSchema)
    if (!parsed.ok) return parsed.response

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
    } = parsed.data

    const { data: existing } = await supabaseAdmin
      .from('partner_applications')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'Dit e-mailadres heeft al een aanvraag ingediend' },
        { status: 400 }
      )
    }

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

    console.log('✅ New partner application:', data)

    return NextResponse.json({ success: true, data })
  } catch (error: unknown) {
    console.error('Partner application error:', error)
    return jsonServerError('Er ging iets mis')
  }
}
