import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import bcrypt from 'bcryptjs'
import {
  checkRateLimit,
  getClientIP,
  pinVerifyIpRateLimiter,
  pinVerifyTenantRateLimiter,
} from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

/**
 * Eigenaars-PIN check (kassa, sluit-rapport, dagstart). Een PIN is slechts
 * 4 cijfers; zonder rate-limit is brute-force in <1 min mogelijk. Twee
 * sloten:
 *   1) per IP — 5 pogingen / minuut (afdichting van een enkele aanvaller).
 *   2) per tenant — 30 pogingen / uur (verdedigt tegen distributed brute
 *      force via meerdere IPs/proxies).
 *
 * Beide sloten worden ALLEEN verbruikt bij een ECHTE poging (PIN ingevuld
 * en gewogen). Geldige PINs verbruiken óók een teller — dat is bewust:
 * 30 succesvolle inloggingen/uur op één tenant is sowieso te veel.
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  const { tenant, pin } = await request.json()
  if (!tenant || !pin) return NextResponse.json({ valid: false }, { status: 400 })

  const ip = getClientIP(request)

  const ipResult = await checkRateLimit(pinVerifyIpRateLimiter, `pin-verify-ip:${ip}`)
  if (!ipResult.success) {
    logger.warn('pin/verify: rate-limit IP', { requestId, ip, tenant })
    return NextResponse.json(
      { valid: false, error: 'Te veel pogingen. Wacht een minuut.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    )
  }

  const tenantResult = await checkRateLimit(pinVerifyTenantRateLimiter, `pin-verify-tenant:${tenant}`)
  if (!tenantResult.success) {
    logger.warn('pin/verify: rate-limit tenant', { requestId, tenant })
    return NextResponse.json(
      { valid: false, error: 'PIN tijdelijk geblokkeerd na te veel pogingen. Probeer over een uur opnieuw.' },
      { status: 429, headers: { 'Retry-After': '3600' } }
    )
  }

  const supabase = getServerSupabaseClient()
  if (!supabase) return NextResponse.json({ valid: false }, { status: 500 })

  const { data } = await supabase
    .from('tenant_settings')
    .select('owner_pin_hash')
    .eq('tenant_slug', tenant)
    .maybeSingle()

  if (!data?.owner_pin_hash) return NextResponse.json({ valid: false })

  const valid = await bcrypt.compare(String(pin), data.owner_pin_hash)
  return NextResponse.json({ valid })
}
