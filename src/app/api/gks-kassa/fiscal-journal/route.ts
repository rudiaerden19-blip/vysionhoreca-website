/**
 * GKS-kassa: server-side fiscal_journal (geen productie orders).
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'
import { apiRateLimiter, checkRateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { isGksZReportPilotTenant } from '@/lib/gks-kassa/pilot-config'
import { gksApiTimeMeta, withBelgiumTimestampFields } from '@/lib/gks-kassa/belgium-datetime'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const tenantSlug = req.nextUrl.searchParams.get('tenant_slug')?.trim()
  if (!tenantSlug) {
    return NextResponse.json({ error: 'tenant_slug_required' }, { status: 400 })
  }
  if (!isGksZReportPilotTenant(tenantSlug)) {
    return NextResponse.json({ error: 'GKS pilot niet actief voor deze tenant' }, { status: 403 })
  }
  const access = await verifyTenantOrSuperAdmin(req, tenantSlug)
  if (!access.authorized) {
    return NextResponse.json({ error: access.error || 'Niet geautoriseerd' }, { status: 403 })
  }
  const limitRaw = req.nextUrl.searchParams.get('limit')
  const limit = Math.min(Math.max(parseInt(limitRaw || '20', 10) || 20, 1), 100)
  const supabase = getServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ error: 'server_config' }, { status: 500 })
  }
  const { data, error } = await supabase
    .from('fiscal_journal')
    .select(
      'id, event_label, status, pos_fiscal_ticket_no, employee_id, created_at, updated_at, pos_date_time, booking_date',
    )
    .eq('tenant_slug', tenantSlug)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  const rows = (data ?? []).map((row) =>
    withBelgiumTimestampFields(row as Record<string, unknown>),
  )
  return NextResponse.json({ ...gksApiTimeMeta(), data: rows })
}

const EventLabelSchema = z.enum(['N', 'P', 'T', 'C', 'F', 'S', 'I', 'R'])

const OpSchema = z.discriminatedUnion('op', [
  z.object({
    op: z.literal('create_pending'),
    tenantSlug: z.string().min(1),
    eventLabel: EventLabelSchema,
    mutation: z.string().min(1),
    idempotencyKey: z.string().uuid(),
    posId: z.string().min(1),
    terminalId: z.string().min(1),
    deviceId: z.string().min(1),
    posFiscalTicketNo: z.number().int().positive(),
    posDateTime: z.string().min(1),
    bookingPeriodId: z.string().uuid(),
    bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    employeeId: z.string().regex(/^\d{11}$/),
    requestPayload: z.record(z.unknown()),
    commercialOrderId: z.string().uuid().optional(),
  }),
  z.object({
    op: z.literal('mark_success'),
    tenantSlug: z.string().min(1),
    journalId: z.string().uuid(),
    responsePayload: z.record(z.unknown()),
  }),
  z.object({
    op: z.literal('mark_failed'),
    tenantSlug: z.string().min(1),
    journalId: z.string().uuid(),
    errorPayload: z.record(z.unknown()),
  }),
])

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

    if (!isGksZReportPilotTenant(tenantSlug)) {
      return NextResponse.json({ error: 'GKS pilot niet actief voor deze tenant' }, { status: 403 })
    }

    const access = await verifyTenantOrSuperAdmin(req, tenantSlug)
    if (!access.authorized) {
      return NextResponse.json({ error: access.error || 'Niet geautoriseerd' }, { status: 403 })
    }

    const actorId =
      req.headers.get('x-business-id') || req.headers.get('x-superadmin-id') || 'anon'
    const rl = await checkRateLimit(apiRateLimiter, `gks-fiscal-journal:${tenantSlug}:${actorId}`)
    if (!rl.success) {
      return NextResponse.json({ error: 'Te veel verzoeken' }, { status: 429 })
    }

    const supabase = getServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: 'server_config' }, { status: 500 })
    }

    if (body.op === 'create_pending') {
      const row: Record<string, unknown> = {
        tenant_slug: tenantSlug,
        status: 'PENDING',
        event_label: body.eventLabel,
        mutation: body.mutation,
        idempotency_key: body.idempotencyKey,
        pos_id: body.posId,
        terminal_id: body.terminalId,
        device_id: body.deviceId,
        pos_fiscal_ticket_no: body.posFiscalTicketNo,
        pos_date_time: body.posDateTime,
        booking_period_id: body.bookingPeriodId,
        booking_date: body.bookingDate,
        employee_id: body.employeeId,
        request_payload: body.requestPayload,
      }
      if (body.commercialOrderId) {
        row.commercial_order_id = body.commercialOrderId
      }
      const { data, error } = await supabase
        .from('fiscal_journal')
        .insert(row)
        .select('id, status, idempotency_key, commercial_order_id')
        .maybeSingle()
      if (error) {
        logger.warn('gks fiscal-journal create_pending', { requestId, error: error.message })
        return NextResponse.json({ error: error.message }, { status: 409 })
      }
      return NextResponse.json({ ...gksApiTimeMeta(), data })
    }

    if (body.op === 'mark_success') {
      const { data, error } = await supabase
        .from('fiscal_journal')
        .update({
          status: 'SUCCESS',
          response_payload: body.responsePayload,
          error_payload: null,
        })
        .eq('tenant_slug', tenantSlug)
        .eq('id', body.journalId)
        .neq('status', 'SUCCESS')
        .in('status', ['PENDING', 'SENT'])
        .select('id, status')
        .maybeSingle()
      if (error) {
        logger.warn('gks fiscal-journal mark_success', { requestId, error: error.message })
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      if (!data) {
        return NextResponse.json({ error: 'Journal niet gevonden of al SUCCESS' }, { status: 404 })
      }
      return NextResponse.json({ ...gksApiTimeMeta(), data })
    }

    if (body.op === 'mark_failed') {
      const { data, error } = await supabase
        .from('fiscal_journal')
        .update({
          status: 'FAILED',
          error_payload: body.errorPayload,
        })
        .eq('tenant_slug', tenantSlug)
        .eq('id', body.journalId)
        .neq('status', 'SUCCESS')
        .in('status', ['PENDING', 'SENT'])
        .select('id, status')
        .maybeSingle()
      if (error) {
        logger.warn('gks fiscal-journal mark_failed', { requestId, error: error.message })
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      if (!data) {
        return NextResponse.json({ error: 'Journal niet gevonden of al afgerond' }, { status: 404 })
      }
      return NextResponse.json({ ...gksApiTimeMeta(), data })
    }

    return NextResponse.json({ error: 'onbekende op' }, { status: 400 })
  } catch (e) {
    logger.error('gks fiscal-journal', { requestId, e })
    return NextResponse.json({ error: 'Interne fout' }, { status: 500 })
  }
}
