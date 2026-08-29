import { NextRequest, NextResponse } from 'next/server'
import {
  authorizeKassaTerminalTenant,
  isMissingRelationError,
  loadTenantTerminalSecrets,
} from '@/lib/kassa-payment-terminal-server'
import { readTerminalCheckoutStatus } from '@/lib/kassa-payment-terminal-providers'
import { isKassaTerminalProvider } from '@/lib/kassa-payment-terminal'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const tenant_slug = request.nextUrl.searchParams.get('tenant_slug')?.trim() || ''
  const payment_id = request.nextUrl.searchParams.get('payment_id')?.trim() || ''
  const auth = await authorizeKassaTerminalTenant(request, tenant_slug)
  if (!auth.ok) return auth.response
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
  if (row.status === 'succeeded' || row.status === 'failed' || row.status === 'canceled') {
    return NextResponse.json({ ok: true, status: row.status })
  }

  const secrets = await loadTenantTerminalSecrets(auth.supabase, auth.tenantSlug)
  const live = await readTerminalCheckoutStatus({
    provider: row.provider,
    secrets,
    providerPaymentId: String(row.provider_payment_id),
    readerExternalId: row.provider_reader_id ? String(row.provider_reader_id) : null,
  })
  if (!live.ok) {
    return NextResponse.json({ ok: false, error: live.error }, { status: 400 })
  }

  if (live.status !== 'pending') {
    await auth.supabase
      .from('kassa_terminal_payments')
      .update({ status: live.status, updated_at: new Date().toISOString() })
      .eq('tenant_slug', auth.tenantSlug)
      .eq('id', row.id)
  }

  return NextResponse.json({ ok: true, status: live.status })
}
