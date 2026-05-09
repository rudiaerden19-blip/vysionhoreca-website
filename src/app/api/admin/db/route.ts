/**
 * Admin DB-proxy — vervangt direct-vanuit-de-browser writes met service-role.
 *
 *  POST  /api/admin/db
 *  Body  {
 *    table:  string                       // moet in ADMIN_DB_TABLES staan
 *    op:     'insert' | 'update' | 'upsert' | 'delete'
 *    data?:  object | object[]            // bij insert/update/upsert
 *    where?: Record<string, any>          // bij update/delete (eq-only)
 *    onConflict?: string                  // bij upsert
 *    select?: string                      // optionele kolom-projectie van de response
 *    notes?: string                       // free-text voor audit log
 *  }
 *
 *  Beveiliging:
 *   1. `verifyTenantOrSuperAdmin` (header-based, met DB-check)
 *   2. Whitelist van tabellen + ops (`admin-db-proxy-spec.ts`)
 *   3. Tenant-slug in iedere row/where MOET matchen met de geverifieerde sessie
 *   4. `forbiddenColumns` worden gestript voor de DB-call de buffer raakt
 *   5. Per-tenant rate-limit (Upstash) — voorkomt dat 1 boze admin alles flat-tikt
 *   6. Elke mutation wordt naar `audit_log` geschreven
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'
import { getTableSpec, type AdminDbOp } from '@/lib/admin-db-proxy-spec'
import { recordAudit, auditRequestMeta, type AuditActorType } from '@/lib/audit-log'
import { logger } from '@/lib/logger'
import { apiRateLimiter, checkRateLimit } from '@/lib/rate-limit'

const BodySchema = z.object({
  table: z.string().min(1).max(64),
  op: z.enum(['insert', 'update', 'upsert', 'delete']),
  data: z.any().optional(),
  where: z.record(z.any()).optional(),
  onConflict: z.string().optional(),
  select: z.string().optional(),
  tenantSlug: z.string().min(1),
  notes: z.string().max(500).optional(),
})

const normSlug = (s: string | null | undefined) =>
  (s || '').replace(/-/g, '').toLowerCase()

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID()

  try {
    // ── 1. Body parsen ────────────────────────────────────────────────────
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

    // ── 2. Whitelist check ────────────────────────────────────────────────
    const spec = getTableSpec(body.table)
    if (!spec) {
      logger.warn('[admin-db] geblokkeerde tabel', { requestId, table: body.table })
      return NextResponse.json({ error: 'Tabel niet toegestaan' }, { status: 403 })
    }
    if (!spec.allowedOps.includes(body.op as AdminDbOp)) {
      return NextResponse.json(
        { error: `Operatie ${body.op} niet toegestaan voor ${body.table}` },
        { status: 403 }
      )
    }

    // ── 3. Auth & tenant-access ───────────────────────────────────────────
    const access = await verifyTenantOrSuperAdmin(req, body.tenantSlug)
    if (!access.authorized) {
      return NextResponse.json({ error: access.error || 'Niet geautoriseerd' }, { status: 403 })
    }
    const actorType: AuditActorType = access.isSuperAdmin ? 'superadmin' : 'owner'
    const actorEmail = req.headers.get('x-auth-email') || req.headers.get('x-superadmin-email')
    const actorId = req.headers.get('x-business-id') || req.headers.get('x-superadmin-id')

    // ── 4. Per-tenant rate-limit ──────────────────────────────────────────
    const rl = await checkRateLimit(apiRateLimiter, `admin-db:${body.tenantSlug}:${actorId || 'anon'}`)
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Te veel verzoeken. Probeer het later opnieuw.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
    }

    // ── 5. Server-side Supabase ───────────────────────────────────────────
    const supabase = getServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database niet beschikbaar' }, { status: 503 })
    }

    // Helper: verwijder `forbiddenColumns` + zorg dat tenantSlugColumn klopt.
    const sanitizeRow = (row: Record<string, any>): Record<string, any> => {
      const out: Record<string, any> = {}
      for (const [k, v] of Object.entries(row)) {
        if (spec.forbiddenColumns?.includes(k)) continue
        out[k] = v
      }
      out[spec.tenantSlugColumn] = body.tenantSlug
      return out
    }

    // Helper: assert dat de WHERE binnen de tenant scope blijft.
    const assertWhereTenantSafe = (where: Record<string, any> | undefined) => {
      if (!where || Object.keys(where).length === 0) {
        throw new Error(`WHERE verplicht voor ${body.op} op ${body.table}`)
      }
      const claimed = where[spec.tenantSlugColumn]
      if (!claimed || normSlug(String(claimed)) !== normSlug(body.tenantSlug)) {
        throw new Error('Tenant mismatch in WHERE')
      }
    }

    // ── 6. Voer de operatie uit ───────────────────────────────────────────
    let result: any
    let beforeData: unknown = null

    try {
      if (body.op === 'insert') {
        const rows = Array.isArray(body.data) ? body.data : [body.data]
        if (spec.maxRows && rows.length > spec.maxRows) {
          return NextResponse.json({ error: `Te veel rijen (max ${spec.maxRows})` }, { status: 400 })
        }
        const sanitized = rows.map((r) => sanitizeRow(r || {}))
        let q = supabase.from(body.table).insert(sanitized)
        if (body.select) q = q.select(body.select) as any
        const { data, error } = (await q) as any
        if (error) throw error
        result = data ?? null
      }

      else if (body.op === 'upsert') {
        const rows = Array.isArray(body.data) ? body.data : [body.data]
        if (spec.maxRows && rows.length > spec.maxRows) {
          return NextResponse.json({ error: `Te veel rijen (max ${spec.maxRows})` }, { status: 400 })
        }
        const sanitized = rows.map((r) => sanitizeRow(r || {}))
        let q = supabase.from(body.table).upsert(sanitized, body.onConflict ? { onConflict: body.onConflict } : undefined as any)
        if (body.select) q = q.select(body.select) as any
        const { data, error } = (await q) as any
        if (error) throw error
        result = data ?? null
      }

      else if (body.op === 'update') {
        assertWhereTenantSafe(body.where)
        const data = sanitizeRow(body.data || {})
        // tenant_slug uit data weg (we matchen via where) zodat een admin de slug
        // niet per ongeluk kan flippen
        delete data[spec.tenantSlugColumn]
        // Capture "before" voor de audit log (best effort).
        try {
          const { data: existing } = (await supabase
            .from(body.table)
            .select('*')
            .match(body.where!)
            .limit(spec.maxRows ?? 100)) as any
          beforeData = existing
        } catch { /* ignore */ }

        let q = supabase.from(body.table).update(data).match(body.where!)
        if (body.select) q = q.select(body.select) as any
        const { data: updated, error } = (await q) as any
        if (error) throw error
        result = updated ?? null
      }

      else if (body.op === 'delete') {
        assertWhereTenantSafe(body.where)
        try {
          const { data: existing } = (await supabase
            .from(body.table)
            .select('*')
            .match(body.where!)
            .limit(spec.maxRows ?? 100)) as any
          beforeData = existing
        } catch { /* ignore */ }
        const { error } = await supabase.from(body.table).delete().match(body.where!)
        if (error) throw error
        result = { deleted: true }
      }
    } catch (e: any) {
      logger.warn('[admin-db] db-fout', {
        requestId,
        table: body.table,
        op: body.op,
        err: e?.message || String(e),
      })
      return NextResponse.json({ error: e?.message || 'DB-fout' }, { status: 400 })
    }

    // ── 7. Audit log (faalt nooit hard) ───────────────────────────────────
    const meta = auditRequestMeta(req)
    const resourceId =
      Array.isArray(result) && result.length > 0 && result[0]?.id
        ? String(result[0].id)
        : (body.where && (body.where as any).id) || null
    await recordAudit(supabase, {
      tenantSlug: body.tenantSlug,
      actorType,
      actorId: actorId || null,
      actorEmail: actorEmail || null,
      action: body.op,
      resourceType: body.table,
      resourceId,
      before: beforeData,
      after: result,
      ip: meta.ip,
      userAgent: meta.userAgent,
      requestId,
      notes: body.notes || null,
    })

    return NextResponse.json({ ok: true, data: result }, { status: 200 })
  } catch (err: any) {
    logger.error('[admin-db] uncaught', { requestId, err: err?.message || String(err) })
    return NextResponse.json({ error: 'Interne fout' }, { status: 500 })
  }
}
