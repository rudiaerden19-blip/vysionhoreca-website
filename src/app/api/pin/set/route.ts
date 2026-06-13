import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import bcrypt from 'bcryptjs'
import {
  checkRateLimit,
  getClientIP,
  pinVerifyIpRateLimiter,
  pinVerifyTenantRateLimiter,
} from '@/lib/rate-limit'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'
import { logger } from '@/lib/logger'

/**
 * Eigenaars-PIN zetten/wijzigen.
 *
 * Twee paden:
 *   1) Eerste keer (tenant heeft nog geen PIN): vereist een ingelogde
 *      zaak-eigenaar (HMAC sessie of legacy headers). Voorkomt dat een
 *      anonieme bezoeker de PIN initialiseert voor een net-aangemaakte
 *      tenant zonder PIN.
 *   2) Vervolg-wijziging: óf currentPin (bcrypt-vergelijken) óf email-
 *      match. Beide paden tellen mee voor dezelfde rate-limits als
 *      pin/verify omdat ze allebei brute-forceable zouden zijn.
 *
 * Geldige sessie omzeilt de rate-limit niet — een gestolen sessie + brute
 * force op currentPin moet ook tegengehouden worden.
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  const { tenant, pin, email, currentPin } = await request.json()
  if (!tenant || !pin) return NextResponse.json({ error: 'Ongeldige invoer'}, { status: 400 })
  if (String(pin).length !== 4 || !/^\d{4}$/.test(String(pin))) {
    return NextResponse.json({ error: 'PIN moet 4 cijfers zijn'}, { status: 400 })
  }

  const supabase = getServerSupabaseClient()
  if (!supabase) return NextResponse.json({ error: 'DB niet beschikbaar'}, { status: 500 })

  const { data: settings } = await supabase
    .from('tenant_settings')
    .select('owner_pin_hash')
    .eq('tenant_slug', tenant)
    .maybeSingle()

  const hasExistingPin = !!settings?.owner_pin_hash

  // ── Pad 1: nog geen PIN → eis een ingelogde zaak ───────────────────────
  // Dit is veilig zonder rate-limit-tellers af te boeken (er is niets om
  // brute-te-forcen). De auth-laag blokkeert anonieme requests.
  if (!hasExistingPin) {
    const access = await verifyTenantOrSuperAdmin(request, tenant)
    if (!access.authorized) {
      logger.warn('pin/set first-time: unauthorized', { requestId, tenant })
      return NextResponse.json(
        { error: access.error || 'Log in om de PIN in te stellen.'},
        { status: 403 }
      )
    }
  } else {
    // ── Pad 2: bestaande PIN wijzigen → rate-limit + bewijs ──────────────
    const ip = getClientIP(request)
    const ipResult = await checkRateLimit(pinVerifyIpRateLimiter, `pin-verify-ip:${ip}`)
    if (!ipResult.success) {
      return NextResponse.json(
        { error: 'Te veel pogingen. Wacht een minuut.'},
        { status: 429, headers: { 'Retry-After': '60'} }
      )
    }
    const tenantResult = await checkRateLimit(pinVerifyTenantRateLimiter, `pin-verify-tenant:${tenant}`)
    if (!tenantResult.success) {
      return NextResponse.json(
        { error: 'PIN tijdelijk geblokkeerd na te veel pogingen. Probeer over een uur opnieuw.'},
        { status: 429, headers: { 'Retry-After': '3600'} }
      )
    }

    if (email) {
      const { data: profile } = await supabase
        .from('business_profiles')
        .select('email')
        .eq('tenant_slug', tenant)
        .maybeSingle()
      if (!profile || profile.email.toLowerCase() !== email.toLowerCase()) {
        return NextResponse.json({ error: 'E-mailadres komt niet overeen'}, { status: 403 })
      }
    } else if (currentPin) {
      const valid = await bcrypt.compare(String(currentPin), settings!.owner_pin_hash!)
      if (!valid) return NextResponse.json({ error: 'Huidig PIN is onjuist'}, { status: 403 })
    } else {
      return NextResponse.json({ error: 'Verificatie vereist'}, { status: 403 })
    }
  }

  const hash = await bcrypt.hash(String(pin), 10)
  const { error } = await supabase
    .from('tenant_settings')
    .upsert({ tenant_slug: tenant, owner_pin_hash: hash }, { onConflict: 'tenant_slug'})

  if (error) return NextResponse.json({ error: 'Opslaan mislukt'}, { status: 500 })
  return NextResponse.json({ success: true })
}
