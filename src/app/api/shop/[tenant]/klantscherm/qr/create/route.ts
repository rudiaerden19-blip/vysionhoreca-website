import { NextRequest, NextResponse } from 'next/server'
import {
  authorizeKassaTerminalTenant,
  isMissingRelationError,
  loadTenantTerminalSecrets,
} from '@/lib/kassa-payment-terminal-server'
import { createKlantschermMollieQrPayment } from '@/lib/klantscherm-mollie-qr-pay'
import { eurosToCents } from '@/lib/kassa-payment-terminal'

export const dynamic = 'force-dynamic'

type RouteContext = { params: { tenant: string } }

export async function POST(request: NextRequest, context: RouteContext) {
  const tenantSlug = context.params.tenant?.trim()
  if (!tenantSlug) {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }

  let body: { amount?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }

  const auth = await authorizeKassaTerminalTenant(request, tenantSlug)
  if (!auth.ok) return auth.response

  const { data: settings } = await auth.supabase
    .from('tenant_settings')
    .select('klantscherm_enabled, business_name')
    .eq('tenant_slug', auth.tenantSlug)
    .maybeSingle()

  if (settings?.klantscherm_enabled !== true) {
    return NextResponse.json({ ok: false, error: 'klantscherm_disabled' }, { status: 403 })
  }

  const amountCents = eurosToCents(Number(body.amount))
  if (amountCents < 1) {
    return NextResponse.json({ ok: false, error: 'invalid_amount' }, { status: 400 })
  }

  const secrets = await loadTenantTerminalSecrets(auth.supabase, auth.tenantSlug)
  const origin = request.nextUrl.origin
  const redirectUrl = `${origin}/shop/${encodeURIComponent(auth.tenantSlug)}/klantscherm?paid=1`
  const description = `${settings?.business_name || auth.tenantSlug} klantscherm`

  const created = await createKlantschermMollieQrPayment({
    secrets,
    amountCents,
    description,
    redirectUrl,
  })
  if (!created.ok) {
    return NextResponse.json({ ok: false, error: created.error }, { status: 400 })
  }

  const { data: payment, error: pErr } = await auth.supabase
    .from('kassa_terminal_payments')
    .insert({
      tenant_slug: auth.tenantSlug,
      terminal_id: null,
      provider: 'mollie',
      provider_payment_id: created.providerPaymentId,
      provider_reader_id: 'klantscherm_qr',
      amount_cents: amountCents,
      currency: 'eur',
      status: 'pending',
      payment_method: 'BANCONTACT',
    })
    .select('id')
    .single()

  if (pErr && !isMissingRelationError(pErr.message)) {
    console.error('[shop/klantscherm/qr/create]', pErr)
  }

  return NextResponse.json({
    ok: true,
    provider_payment_id: created.providerPaymentId,
    qr_checkout_url: created.qrCheckoutUrl,
    amount_cents: amountCents,
  })
}
