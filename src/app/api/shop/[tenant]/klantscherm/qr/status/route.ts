import { NextRequest, NextResponse } from 'next/server'
import {
  authorizeKassaTerminalTenant,
  loadTenantTerminalSecrets,
} from '@/lib/kassa-payment-terminal-server'
import { readKlantschermMolliePaymentStatus } from '@/lib/klantscherm-mollie-qr-pay'

export const dynamic = 'force-dynamic'

type RouteContext = { params: { tenant: string } }

export async function GET(request: NextRequest, context: RouteContext) {
  const tenantSlug = context.params.tenant?.trim()
  const providerPaymentId = request.nextUrl.searchParams.get('provider_payment_id')?.trim() ?? ''

  if (!tenantSlug || !providerPaymentId) {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }

  const auth = await authorizeKassaTerminalTenant(request, tenantSlug)
  if (!auth.ok) return auth.response

  const secrets = await loadTenantTerminalSecrets(auth.supabase, auth.tenantSlug)
  const st = await readKlantschermMolliePaymentStatus(secrets, providerPaymentId)

  if (st === 'paid') {
    await auth.supabase
      .from('kassa_terminal_payments')
      .update({ status: 'succeeded', updated_at: new Date().toISOString() })
      .eq('tenant_slug', auth.tenantSlug)
      .eq('provider_payment_id', providerPaymentId)
  } else if (st === 'failed' || st === 'canceled') {
    await auth.supabase
      .from('kassa_terminal_payments')
      .update({
        status: st === 'canceled' ? 'canceled' : 'failed',
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_slug', auth.tenantSlug)
      .eq('provider_payment_id', providerPaymentId)
  }

  return NextResponse.json({ ok: true, status: st })
}
