/**
 * Geïsoleerde order-ops voor /admin/gks-kassa — alleen gks_commercial_orders.
 * Raakt productie `orders` niet.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'
import { apiRateLimiter, checkRateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { gksApiTimeMeta, withBelgiumTimestampFields } from '@/lib/gks-kassa/belgium-datetime'
import { enforcePaidCommercialInsertGuard } from '@/lib/gks-kassa/gks-fiscal-server-guards'
import { sanitizeGksCommercialOrderRow } from '@/lib/gks-kassa/sanitize-commercial-order-row'

const OpSchema = z.discriminatedUnion('op', [
  z.object({
    op: z.literal('select'),
    tenantSlug: z.string().min(1),
    statusIn: z.array(z.string()).optional(),
    match: z.record(z.unknown()).optional(),
    limit: z.number().int().min(1).max(500).optional(),
  }),
  z.object({
    op: z.literal('insert'),
    tenantSlug: z.string().min(1),
    row: z.record(z.unknown()),
    select: z.string().optional(),
    /** Verplicht bij payment_status=paid — koppeling aan lopend signSale-journal (N). */
    fiscalJournalId: z.string().uuid().optional(),
  }),
  z.object({
    op: z.literal('update'),
    tenantSlug: z.string().min(1),
    row: z.record(z.unknown()),
    match: z.record(z.unknown()),
    fiscalJournalId: z.string().uuid().optional(),
  }),
  z.object({
    op: z.literal('delete'),
    tenantSlug: z.string().min(1),
    match: z.record(z.unknown()),
  }),
  z.object({
    op: z.literal('order_number_by_uuid'),
    tenantSlug: z.string().min(1),
    kassaClientUuid: z.string().uuid(),
  }),
])

async function nextOrderNumber(
  supabase: NonNullable<ReturnType<typeof getServerSupabaseClient>>,
  tenantSlug: string,
): Promise<number> {
  const { data, error } = await supabase
    .from('gks_commercial_orders')
    .select('order_number')
    .eq('tenant_slug', tenantSlug)
    .order('order_number', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  const prev = data?.order_number != null ? Number(data.order_number) : 1000
  return Math.max(prev, 1000) + 1
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID()
  try {
    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return NextResponse.json({ error: 'Ongeldige JSON' }, { status: 400 })
    }
    const parsed = OpSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Ongeldige aanvraag' }, { status: 400 })
    }
    const body = parsed.data
    const tenantSlug = body.tenantSlug

    const access = await verifyTenantOrSuperAdmin(req, tenantSlug)
    if (!access.authorized) {
      return NextResponse.json({ error: access.error || 'Niet geautoriseerd' }, { status: 403 })
    }

    const actorId =
      req.headers.get('x-business-id') || req.headers.get('x-superadmin-id') || 'anon'
    const rl = await checkRateLimit(apiRateLimiter, `gks-commercial-orders:${tenantSlug}:${actorId}`)
    if (!rl.success) {
      return NextResponse.json({ error: 'Te veel verzoeken' }, { status: 429 })
    }

    const supabase = getServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: 'server_config' }, { status: 500 })
    }

    if (body.op === 'select') {
      let q = supabase.from('gks_commercial_orders').select('*').eq('tenant_slug', tenantSlug)
      if (body.statusIn?.length) {
        q = q.in('status', body.statusIn)
      }
      if (body.match) {
        for (const [k, v] of Object.entries(body.match)) {
          q = q.eq(k, v as string)
        }
      }
      q = q.limit(body.limit ?? 500)
      const { data, error } = await q
      if (error) {
        logger.warn('gks commercial-orders select', { requestId, error: error.message })
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      const rows = (data ?? []).map((row) =>
        withBelgiumTimestampFields(row as Record<string, unknown>),
      )
      return NextResponse.json({ ...gksApiTimeMeta(), data: rows })
    }

    if (body.op === 'order_number_by_uuid') {
      const { data, error } = await supabase
        .from('gks_commercial_orders')
        .select('order_number')
        .eq('tenant_slug', tenantSlug)
        .eq('kassa_client_uuid', body.kassaClientUuid)
        .maybeSingle()
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ data })
    }

    if (body.op === 'insert') {
      const sanitized = sanitizeGksCommercialOrderRow(body.row, tenantSlug)
      if ('error' in sanitized) {
        return NextResponse.json({ error: sanitized.error }, { status: 400 })
      }
      const row = sanitized.row
      const paidGuard = await enforcePaidCommercialInsertGuard(
        supabase,
        tenantSlug,
        row,
        body.fiscalJournalId,
      )
      if (!paidGuard.ok) {
        return NextResponse.json({ error: paidGuard.error }, { status: paidGuard.status })
      }
      const needsNum =
        row.payment_status === 'paid' &&
        ['DINE_IN', 'TAKEAWAY', 'DELIVERY'].includes(String(row.order_type || '')) &&
        row.status !== 'open'
      if (needsNum && (row.order_number == null || row.order_number === 0)) {
        row.order_number = await nextOrderNumber(supabase, tenantSlug)
      }
      row.updated_at = new Date().toISOString()
      const sel = body.select ?? '*'
      const { data, error } = await supabase
        .from('gks_commercial_orders')
        .insert(row)
        .select(sel)
      if (error) {
        logger.warn('gks commercial-orders insert', { requestId, error: error.message })
        return NextResponse.json({ error: error.message }, { status: 409 })
      }
      const inserted = Array.isArray(data) ? data[0] : data
      if (!inserted) {
        return NextResponse.json({ error: 'insert_returned_empty' }, { status: 500 })
      }
      return NextResponse.json({
        ...gksApiTimeMeta(),
        data: withBelgiumTimestampFields(inserted as unknown as Record<string, unknown>),
      })
    }

    if (body.op === 'update') {
      const row = { ...body.row, updated_at: new Date().toISOString() }
      const paidGuard = await enforcePaidCommercialInsertGuard(
        supabase,
        tenantSlug,
        row,
        body.fiscalJournalId,
      )
      if (!paidGuard.ok) {
        return NextResponse.json({ error: paidGuard.error }, { status: paidGuard.status })
      }
      let q = supabase.from('gks_commercial_orders').update(row).eq('tenant_slug', tenantSlug)
      for (const [k, v] of Object.entries(body.match)) {
        q = q.eq(k, v as string)
      }
      const { data, error } = await q.select('*').maybeSingle()
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ data })
    }

    if (body.op === 'delete') {
      let q = supabase.from('gks_commercial_orders').delete().eq('tenant_slug', tenantSlug)
      for (const [k, v] of Object.entries(body.match)) {
        q = q.eq(k, v as string)
      }
      const { error } = await q
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'onbekende op' }, { status: 400 })
  } catch (e) {
    logger.error('gks commercial-orders', { requestId, e })
    return NextResponse.json({ error: 'Interne fout' }, { status: 500 })
  }
}
