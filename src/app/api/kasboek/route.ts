import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  addAdjustment,
  addMovement,
  closeCashbookDay,
  loadCashbookDay,
  loadCashbookRange,
  loadPendingCloseDays,
  logCashbookEvent,
  saveOpening,
} from '@/lib/cashbook-store'
import { eurosToCents } from '@/lib/cashbook-calc'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { fetchOpeningHoursForTenant, getCurrentBusinessDay } from '@/lib/tenant-business-day'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'

const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

function actorOf(access: { businessId?: string }, request: NextRequest): string {
  return access.businessId || request.headers.get('x-auth-email') || 'owner'
}

export async function GET(request: NextRequest) {
  const tenantSlug = request.nextUrl.searchParams.get('tenantSlug') || ''
  const date = request.nextUrl.searchParams.get('date') || ''
  const from = request.nextUrl.searchParams.get('from') || ''
  const to = request.nextUrl.searchParams.get('to') || ''
  const pending = request.nextUrl.searchParams.get('pending') === '1'
  if (!tenantSlug) return NextResponse.json({ error: 'Zaak ontbreekt.' }, { status: 400 })
  const access = await verifyTenantOrSuperAdmin(request, tenantSlug)
  if (!access.authorized) {
    return NextResponse.json({ error: access.error || 'Niet geautoriseerd' }, { status: 403 })
  }
  const client = getServerSupabaseClient()
  if (!client) return NextResponse.json({ error: 'Database niet beschikbaar' }, { status: 503 })
  if (pending) {
    const hours = await fetchOpeningHoursForTenant(client, tenantSlug)
    const today = getCurrentBusinessDay(new Date(), hours)
    const openDays = await loadPendingCloseDays(client, tenantSlug, today)
    return NextResponse.json(openDays)
  }
  if (from && to && DateSchema.safeParse(from).success && DateSchema.safeParse(to).success) {
    const rows = await loadCashbookRange(client, tenantSlug, from, to)
    return NextResponse.json({ rows })
  }
  let bookDate = date
  if (!DateSchema.safeParse(bookDate).success) {
    const hours = await fetchOpeningHoursForTenant(client, tenantSlug)
    bookDate = getCurrentBusinessDay(new Date(), hours)
  }
  const day = await loadCashbookDay(client, tenantSlug, bookDate)
  return NextResponse.json(day)
}

const OpeningSchema = z.object({
  action: z.literal('opening'),
  tenantSlug: z.string().min(1),
  date: DateSchema,
  openingEuros: z.number().min(0),
})

const MovementSchema = z.object({
  action: z.literal('movement'),
  tenantSlug: z.string().min(1),
  date: DateSchema,
  type: z.string().min(1),
  amountEuros: z.number().positive(),
  description: z.string().min(1),
  reason: z.string().optional().default(''),
  staffName: z.string().optional().default(''),
  reference: z.string().optional().default(''),
})

const CloseSchema = z.object({
  action: z.literal('close'),
  tenantSlug: z.string().min(1),
  date: DateSchema,
  countedEuros: z.number().min(0),
  note: z.string().optional().default(''),
})

const AdjustmentSchema = z.object({
  action: z.literal('adjustment'),
  tenantSlug: z.string().min(1),
  date: DateSchema,
  fieldName: z.enum(['counted', 'opening', 'movement']),
  movementId: z.string().optional().default(''),
  correctedEuros: z.number().min(0),
  reason: z.string().min(1),
})

const AuditSchema = z.object({
  action: z.literal('audit'),
  tenantSlug: z.string().min(1),
  date: DateSchema,
  event: z.enum(['report_printed', 'report_exported', 'report_emailed']),
  detail: z.record(z.string(), z.unknown()).optional().default({}),
})

const BodySchema = z.discriminatedUnion('action', [OpeningSchema, MovementSchema, CloseSchema, AdjustmentSchema, AuditSchema])

export async function POST(request: NextRequest) {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ongeldige JSON' }, { status: 400 })
  }
  const parsed = BodySchema.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: 'Ongeldige aanvraag' }, { status: 400 })
  const body = parsed.data
  const access = await verifyTenantOrSuperAdmin(request, body.tenantSlug)
  if (!access.authorized) {
    return NextResponse.json({ error: access.error || 'Niet geautoriseerd' }, { status: 403 })
  }
  const client = getServerSupabaseClient()
  if (!client) return NextResponse.json({ error: 'Database niet beschikbaar' }, { status: 503 })
  const actor = actorOf(access, request)

  if (body.action === 'opening') {
    const result = await saveOpening(client, body.tenantSlug, body.date, eurosToCents(body.openingEuros), actor)
    return NextResponse.json(result.ok ? { ok: true } : { error: result.error }, { status: result.ok ? 200 : result.status })
  }
  if (body.action === 'movement') {
    const result = await addMovement(
      client,
      body.tenantSlug,
      body.date,
      {
        type: body.type,
        amountCents: eurosToCents(body.amountEuros),
        description: body.description,
        reason: body.reason,
        staffName: body.staffName,
        reference: body.reference,
      },
      actor,
    )
    return NextResponse.json(result.ok ? { ok: true } : { error: result.error }, { status: result.ok ? 200 : result.status })
  }
  if (body.action === 'close') {
    const result = await closeCashbookDay(
      client,
      body.tenantSlug,
      body.date,
      eurosToCents(body.countedEuros),
      body.note,
      actor,
    )
    return NextResponse.json(
      result.ok ? { ok: true, differenceCents: result.differenceCents } : { error: result.error },
      { status: result.ok ? 200 : result.status },
    )
  }
  if (body.action === 'audit') {
    await logCashbookEvent(client, body.tenantSlug, actor, body.date, body.event, body.detail)
    return NextResponse.json({ ok: true })
  }
  const result = await addAdjustment(
    client,
    body.tenantSlug,
    body.date,
    {
      fieldName: body.fieldName,
      correctedCents: eurosToCents(body.correctedEuros),
      reason: body.reason,
      movementId: body.movementId || undefined,
    },
    actor,
  )
  return NextResponse.json(result.ok ? { ok: true } : { error: result.error }, { status: result.ok ? 200 : result.status })
}
