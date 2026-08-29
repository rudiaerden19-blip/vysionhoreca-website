import { NextRequest, NextResponse } from 'next/server'
import {
  authorizeKassaTerminalTenant,
  isMissingRelationError,
  loadTenantTerminalSecrets,
} from '@/lib/kassa-payment-terminal-server'
import { cancelTerminalCheckout } from '@/lib/kassa-payment-terminal-providers'
import { isKassaTerminalProvider } from '@/lib/kassa-payment-terminal'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  let body: { tenant_slug?: string; payment_id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }

  const auth = await authorizeKassaTerminalTenant(request, body.tenant_slug || '')
  if (!auth.ok) return auth.response
  const payment_id = String(body.payment_id || '').trim()
  if (!payment_id) {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }

  const { data: row, error } = await auth.supabase
    .from('kassa_terminal_payments')
    .select('id, provider, provider_payment_id, provider_reader_id, status')
    .eq('tenant_slug', auth.tenantSlug)
    .eq('id', payment_id)
    .maybeSingle()

  if (error) {
    if (isMissingRelationError(error.message)) {
      return NextResponse.json({ ok: false, error: 'table_missing' }, { status: 503 })
    }
    return NextResponse.json({ ok: false, error: 'server' }, { status: 500 })
  }
  if (!row || !isKassaTerminalProvider(String(row.provider))) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
  }

  const secrets = await loadTenantTerminalSecrets(auth.supabase, auth.tenantSlug)
  await cancelTerminalCheckout({
    provider: row.provider,
    secrets,
    providerPaymentId: String(row.provider_payment_id),
    readerExternalId: String(row.provider_reader_id || ''),
  })

  await auth.supabase
    .from('kassa_terminal_payments')
    .update({ status: 'canceled', updated_at: new Date().toISOString() })
    .eq('tenant_slug', auth.tenantSlug)
    .eq('id', row.id)

  return NextResponse.json({ ok: true, status: 'canceled' })
}
