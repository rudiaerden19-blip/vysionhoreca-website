import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { apiRateLimiter, checkRateLimit, getClientIP } from '@/lib/rate-limit'
import { parseJsonBody } from '@/lib/api-request'
import { setInitialOwnerPasswordBodySchema } from '@/lib/api-schemas'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'

function ownerPasswordNeedsInitialSet(storedHash: string | null | undefined): boolean {
  const h = (storedHash || '').trim()
  if (!h || h === 'RESET_REQUIRED') return true
  return !h.startsWith('$2')
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  try {
    const clientIP = getClientIP(request)
    const rateLimitResult = await checkRateLimit(apiRateLimiter, clientIP)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Te veel verzoeken. Probeer het later opnieuw.' },
        { status: 429 },
      )
    }

    const parsedBody = await parseJsonBody(request, setInitialOwnerPasswordBodySchema)
    if (!parsedBody.ok) return parsedBody.response
    const { email, password } = parsedBody.data
    const emailLower = email.toLowerCase()

    const supabase = getServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Service tijdelijk niet beschikbaar' },
        { status: 503 },
      )
    }

    const { data: profile, error: findErr } = await supabase
      .from('business_profiles')
      .select('id, email, password_hash, tenant_slug')
      .eq('email', emailLower)
      .maybeSingle()

    if (findErr) {
      logger.error('set-initial-owner-password lookup', { requestId, error: findErr.message })
      return NextResponse.json({ error: 'Database fout' }, { status: 500 })
    }

    if (!profile) {
      return NextResponse.json(
        { error: 'Geen account gevonden met dit email adres' },
        { status: 404 },
      )
    }

    if (!ownerPasswordNeedsInitialSet(profile.password_hash)) {
      return NextResponse.json(
        {
          error:
            'Dit account heeft al een wachtwoord. Log in of gebruik wachtwoord vergeten.',
        },
        { status: 400 },
      )
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const { error: updateErr } = await supabase
      .from('business_profiles')
      .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
      .eq('id', profile.id)

    if (updateErr) {
      logger.error('set-initial-owner-password update', { requestId, error: updateErr.message })
      return NextResponse.json(
        { error: 'Kon wachtwoord niet opslaan. Probeer opnieuw.' },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      tenant_slug: profile.tenant_slug,
    })
  } catch (err) {
    logger.error('set-initial-owner-password', { requestId, error: String(err) })
    return NextResponse.json({ error: 'Er is iets misgegaan' }, { status: 500 })
  }
}
