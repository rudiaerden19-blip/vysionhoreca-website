/**
 * Public guest-profile upsert — gebruikt door de klant-reserveringspagina.
 *
 *  POST  /api/public/guest-profile
 *  Body  {
 *    tenantSlug:  string
 *    name:        string
 *    phone?:      string
 *    email?:      string
 *    lastVisit?:  string  (YYYY-MM-DD)
 *  }
 *
 * Beveiliging:
 *   1. Rate-limit (5/uur per IP+tenant)  — voorkomt spam-vervuiling
 *   2. Tenant moet bestaan
 *   3. Naam verplicht; telefoon OF email verplicht (anders geen identifier)
 *   4. Server doet de upsert via service-role; anon krijgt geen direct
 *      schrijftoegang tot guest_profiles (GDPR-isolatie).
 *
 * Faalt SILENT voor de gebruiker als rate-limit raakt — een mislukt
 * gastprofiel mag de reservering nooit blokkeren.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'
import { checkRateLimit, getClientIP } from '@/lib/rate-limit'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Aparte rate-limiter (5/uur per IP+tenant) — deze flow is publiek zonder auth.
const isUpstashConfigured = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
)
const guestProfileRateLimiter = isUpstashConfigured
  ? new Ratelimit({
      redis: new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      }),
      limiter: Ratelimit.slidingWindow(5, '1 h'),
      prefix: 'ratelimit:public-guest-profile',
    })
  : null

const BodySchema = z
  .object({
    tenantSlug: z.string().min(1).max(64),
    name: z.string().min(1).max(120),
    phone: z.string().max(40).optional().nullable(),
    email: z.string().email().max(160).optional().nullable(),
    lastVisit: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })
  .refine((d) => !!(d.phone || d.email), {
    message: 'phone of email vereist',
  })

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID()
  try {
    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return NextResponse.json({ error: 'Ongeldige JSON'}, { status: 400 })
    }
    const parsed = BodySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Ongeldige aanvraag', issues: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const { tenantSlug, name, phone, email, lastVisit } = parsed.data

    // Rate-limit per IP+tenant
    const ip = getClientIP(req)
    const rl = await checkRateLimit(
      guestProfileRateLimiter,
      `public-guest:${tenantSlug}:${ip}`
    )
    if (!rl.success) {
      // Stilletjes accepteren — de reservering zelf moet hier niet aan stuk gaan.
      return NextResponse.json({ ok: true, throttled: true }, { status: 200 })
    }

    const supabase = getServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database niet beschikbaar'}, { status: 503 })
    }

    // Tenant moet bestaan (voorkomt vervuiling met onbekende tenants).
    const { data: tenant, error: tenantErr } = await supabase
      .from('tenants')
      .select('slug')
      .eq('slug', tenantSlug)
      .maybeSingle()
    if (tenantErr || !tenant) {
      return NextResponse.json({ error: 'Tenant onbekend'}, { status: 404 })
    }

    const onConflict = phone ? 'tenant_slug,phone': 'tenant_slug,email'
    const { error } = await supabase
      .from('guest_profiles')
      .upsert(
        {
          tenant_slug: tenantSlug,
          name,
          phone: phone || null,
          email: email || null,
          total_visits: 1,
          last_visit: lastVisit || null,
        },
        { onConflict, ignoreDuplicates: false }
      )
    if (error) {
      // Niet hard falen — klant moet z'n reservering kunnen voltooien.
      logger.warn('[public/guest-profile] upsert mislukt', {
        requestId,
        tenantSlug,
        err: error.message,
      })
      return NextResponse.json({ ok: false, error: error.message }, { status: 200 })
    }
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err: any) {
    logger.error('[public/guest-profile] uncaught', {
      requestId,
      err: err?.message || String(err),
    })
    // Soft-fail: 200 zodat de reservering-flow niet kapot gaat.
    return NextResponse.json({ ok: false, error: 'Interne fout'}, { status: 200 })
  }
}
