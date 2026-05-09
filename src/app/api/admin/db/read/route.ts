/**
 * Admin DB-proxy READ — leest data server-side met service-role.
 *
 *  POST  /api/admin/db/read
 *  Body  {
 *    table:       string                       // moet in ADMIN_DB_TABLES staan
 *    tenantSlug:  string
 *    select?:     string                       // PostgREST select-string, default '*'
 *    match?:      Record<string, any>          // eq-filters (key/value)
 *    in?:         Record<string, any[]>        // .in() filters
 *    gte?:        Record<string, any>          // .gte() filters (datum-bounds)
 *    lte?:        Record<string, any>          // .lte() filters
 *    not?:        Array<[col, op, val]>        // .not(col, op, val)
 *    order?:      { column: string; ascending?: boolean }
 *    limit?:      number
 *    range?:      [from: number, to: number]
 *    single?:     'one' | 'maybe'              // .single() of .maybeSingle()
 *  }
 *
 *  Beveiliging:
 *   1. `verifyTenantOrSuperAdmin` — alleen eigenaar of superadmin
 *   2. Whitelist tabellen via `admin-db-proxy-spec.ts`
 *   3. Tenant-slug WORDT GEFORCEERD in de query (overschrijft elke andere
 *      `match[tenantSlugColumn]`).
 *   4. Per-tenant rate-limit
 *   5. Limit/range plafond — voorkomt full-table-leak
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'
import { getTableSpec } from '@/lib/admin-db-proxy-spec'
import { logger } from '@/lib/logger'
import { apiRateLimiter, checkRateLimit } from '@/lib/rate-limit'

const MAX_LIMIT = 5000

const BodySchema = z.object({
  table: z.string().min(1).max(64),
  tenantSlug: z.string().min(1),
  select: z.string().max(2000).optional(),
  match: z.record(z.any()).optional(),
  in: z.record(z.array(z.any()).max(500)).optional(),
  gte: z.record(z.any()).optional(),
  lte: z.record(z.any()).optional(),
  not: z.array(z.tuple([z.string(), z.string(), z.any()])).max(10).optional(),
  order: z
    .object({ column: z.string().min(1), ascending: z.boolean().optional() })
    .optional(),
  limit: z.number().int().positive().max(MAX_LIMIT).optional(),
  range: z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative()]).optional(),
  single: z.enum(['one', 'maybe']).optional(),
})

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID()
  try {
    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return NextResponse.json({ error: 'Ongeldige JSON' }, { status: 400 })
    }
    const parsed = BodySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Ongeldige aanvraag', issues: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const body = parsed.data

    // ── Whitelist ──────────────────────────────────────────────────────────
    const spec = getTableSpec(body.table)
    if (!spec) {
      logger.warn('[admin-db-read] geblokkeerde tabel', { requestId, table: body.table })
      return NextResponse.json({ error: 'Tabel niet toegestaan' }, { status: 403 })
    }

    // ── Auth ───────────────────────────────────────────────────────────────
    const access = await verifyTenantOrSuperAdmin(req, body.tenantSlug)
    if (!access.authorized) {
      return NextResponse.json({ error: access.error || 'Niet geautoriseerd' }, { status: 403 })
    }

    // ── Rate-limit ─────────────────────────────────────────────────────────
    const actorId = req.headers.get('x-business-id') || req.headers.get('x-superadmin-id') || 'anon'
    const rl = await checkRateLimit(apiRateLimiter, `admin-db-read:${body.tenantSlug}:${actorId}`)
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Te veel verzoeken. Probeer het later opnieuw.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
    }

    // ── DB-client ──────────────────────────────────────────────────────────
    const supabase = getServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database niet beschikbaar' }, { status: 503 })
    }

    // ── Query bouwen ───────────────────────────────────────────────────────
    let q: any = supabase.from(body.table).select(body.select || '*')

    // Tenant-slug ALTIJD afdwingen (ook als caller hem in match meegeeft —
    // we negeren elke andere waarde stilletjes).
    q = q.eq(spec.tenantSlugColumn, body.tenantSlug)

    if (body.match) {
      for (const [k, v] of Object.entries(body.match)) {
        if (k === spec.tenantSlugColumn) continue // al afgedwongen
        if (v === null) {
          q = q.is(k, null)
        } else {
          q = q.eq(k, v)
        }
      }
    }
    if (body.in) {
      for (const [k, arr] of Object.entries(body.in)) {
        if (Array.isArray(arr) && arr.length > 0) q = q.in(k, arr)
      }
    }
    if (body.gte) {
      for (const [k, v] of Object.entries(body.gte)) q = q.gte(k, v)
    }
    if (body.lte) {
      for (const [k, v] of Object.entries(body.lte)) q = q.lte(k, v)
    }
    if (body.not) {
      for (const [col, op, val] of body.not) q = q.not(col, op, val)
    }
    if (body.order) {
      q = q.order(body.order.column, { ascending: body.order.ascending !== false })
    }
    if (body.range) {
      const [from, to] = body.range
      const span = to - from + 1
      if (span > MAX_LIMIT) {
        return NextResponse.json(
          { error: `Range te groot (max ${MAX_LIMIT})` },
          { status: 400 }
        )
      }
      q = q.range(from, to)
    } else if (body.limit) {
      q = q.limit(body.limit)
    } else {
      // veiligheidsplafond: nooit zonder limiet teruggeven
      q = q.limit(MAX_LIMIT)
    }
    if (body.single === 'one') q = q.single()
    else if (body.single === 'maybe') q = q.maybeSingle()

    const { data, error } = await q
    if (error) {
      logger.warn('[admin-db-read] db-fout', {
        requestId,
        table: body.table,
        err: error.message,
      })
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ ok: true, data: data ?? null }, { status: 200 })
  } catch (err: any) {
    logger.error('[admin-db-read] uncaught', { requestId, err: err?.message || String(err) })
    return NextResponse.json({ error: 'Interne fout' }, { status: 500 })
  }
}
