/**
 * POST /api/admin/z-report/correct-payment
 * Kassabon CARD ↔ CASH. Geen POS-wijziging, geen regenerate van de hele Z-dag.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'
import { logger } from '@/lib/logger'
import { businessDayForOrder, fetchOpeningHoursForTenant } from '@/lib/tenant-business-day'
import { getBelgiumDateString } from '@/lib/belgium-date-bounds'
import {
  applyZReportCashCardShift,
  canonicalKassaCashCardMethod,
  orderAllowsKassaCashCardCorrection,
  zReportCashCardShift,
  type KassaCashCardMethod,
} from '@/lib/z-report-correct-payment'

const BodySchema = z.object({
  tenantSlug: z.string().min(1),
  orderId: z.string().uuid(),
  toMethod: z.enum(['CASH', 'CARD']),
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
      return NextResponse.json({ error: 'Ongeldige aanvraag' }, { status: 400 })
    }

    const { tenantSlug, orderId, toMethod } = parsed.data
    const access = await verifyTenantOrSuperAdmin(req, tenantSlug)
    if (!access.authorized) {
      return NextResponse.json({ error: access.error || 'Niet geautoriseerd' }, { status: 403 })
    }

    const supabase = getServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database niet beschikbaar' }, { status: 503 })
    }

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select(
        'id, tenant_slug, order_number, total, payment_method, payment_split_cash, payment_split_card, payment_status, status, order_type, created_at',
      )
      .eq('tenant_slug', tenantSlug)
      .eq('id', orderId)
      .maybeSingle()

    if (orderErr) {
      logger.error('[admin/z-report/correct-payment] order load', {
        requestId,
        err: orderErr.message,
      })
      return NextResponse.json({ error: 'Bon niet geladen' }, { status: 500 })
    }
    if (!order) {
      return NextResponse.json({ error: 'Bon niet gevonden' }, { status: 404 })
    }
    if (!orderAllowsKassaCashCardCorrection(order)) {
      return NextResponse.json(
        { error: 'Alleen een betaalde kassabon met contant of kaart kan worden gewijzigd.' },
        { status: 409 },
      )
    }

    const fromMethod = canonicalKassaCashCardMethod(order.payment_method)
    if (!fromMethod) {
      return NextResponse.json({ error: 'Deze betaalmethode mag niet gewijzigd worden.' }, { status: 409 })
    }

    const shift = zReportCashCardShift(Number(order.total), fromMethod, toMethod as KassaCashCardMethod)
    if (!shift) {
      return NextResponse.json({ error: 'Bon staat al op deze betaalmethode.' }, { status: 409 })
    }

    const { data: updated, error: updErr } = await supabase
      .from('orders')
      .update({
        payment_method: toMethod,
        payment_split_cash: null,
        payment_split_card: null,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_slug', tenantSlug)
      .eq('id', orderId)
      .eq('payment_method', order.payment_method)
      .select('id, order_number, payment_method, total')
      .maybeSingle()

    if (updErr) {
      logger.error('[admin/z-report/correct-payment] order update', {
        requestId,
        err: updErr.message,
      })
      return NextResponse.json({ error: 'Bon niet bijgewerkt' }, { status: 500 })
    }
    if (!updated) {
      return NextResponse.json({ error: 'Bon is intussen gewijzigd. Vernieuw en probeer opnieuw.' }, { status: 409 })
    }

    const hours = await fetchOpeningHoursForTenant(supabase, tenantSlug)
    const reportDate =
      businessDayForOrder(String(order.created_at || ''), hours) ||
      getBelgiumDateString(new Date(String(order.created_at || Date.now())))

    const { data: zRow } = await supabase
      .from('z_reports')
      .select('id, cash_payments, card_payments')
      .eq('tenant_slug', tenantSlug)
      .eq('report_date', reportDate)
      .maybeSingle()

    let zPayments: { cash_payments: number; card_payments: number } | null = null
    if (zRow?.id) {
      zPayments = applyZReportCashCardShift(
        Number(zRow.cash_payments) || 0,
        Number(zRow.card_payments) || 0,
        shift,
      )
      const { error: zErr } = await supabase
        .from('z_reports')
        .update({
          cash_payments: zPayments.cash_payments,
          card_payments: zPayments.card_payments,
          generated_at: new Date().toISOString(),
        })
        .eq('tenant_slug', tenantSlug)
        .eq('id', zRow.id)

      if (zErr) {
        logger.error('[admin/z-report/correct-payment] z_reports update', {
          requestId,
          err: zErr.message,
        })
        return NextResponse.json(
          {
            ok: true,
            order: updated,
            warning: 'Bon gewijzigd, Z-archief niet bijgewerkt. Vernieuw het rapport.',
          },
          { status: 200 },
        )
      }
    }

    return NextResponse.json({
      ok: true,
      order: updated,
      fromMethod,
      toMethod,
      reportDate,
      zPayments,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error('[admin/z-report/correct-payment] uncaught', { requestId, err: message })
    return NextResponse.json({ error: message || 'Interne fout' }, { status: 500 })
  }
}
