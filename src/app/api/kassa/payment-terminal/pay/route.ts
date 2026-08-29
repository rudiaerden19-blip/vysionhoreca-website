import { NextRequest, NextResponse } from 'next/server'
import {
  authorizeKassaTerminalTenant,
  isMissingRelationError,
  loadTenantTerminalSecrets,
} from '@/lib/kassa-payment-terminal-server'
import { startTerminalCheckout } from '@/lib/kassa-payment-terminal-providers'
import { eurosToCents, isKassaTerminalProvider } from '@/lib/kassa-payment-terminal'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  let body: {
    tenant_slug?: string
    terminal_id?: string
    amount?: number
    payment_method?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }

  const auth = await authorizeKassaTerminalTenant(request, body.tenant_slug || '')
  if (!auth.ok) return auth.response

  const amountCents = eurosToCents(Number(body.amount))
  if (amountCents < 1) {
    return NextResponse.json({ ok: false, error: 'invalid_amount' }, { status: 400 })
  }

  const { data: terminal, error: tErr } = await auth.supabase
    .from('kassa_payment_terminals')
    .select('id, provider, external_id, label, is_active')
    .eq('tenant_slug', auth.tenantSlug)
    .eq('id', String(body.terminal_id || '').trim())
    .maybeSingle()

  if (tErr) {
    if (isMissingRelationError(tErr.message)) {
      return NextResponse.json({ ok: false, error: 'table_missing' }, { status: 503 })
    }
    return NextResponse.json({ ok: false, error: 'server' }, { status: 500 })
  }
  if (!terminal || terminal.is_active === false || !isKassaTerminalProvider(String(terminal.provider))) {
    return NextResponse.json({ ok: false, error: 'terminal_not_found' }, { status: 404 })
  }

  const secrets = await loadTenantTerminalSecrets(auth.supabase, auth.tenantSlug)
  const started = await startTerminalCheckout({
    provider: terminal.provider,
    secrets,
    readerExternalId: String(terminal.external_id),
    amountCents,
    description: `${secrets.business_name || auth.tenantSlug} kassa`,
  })
  if (!started.ok) {
    return NextResponse.json({ ok: false, error: started.error }, { status: 400 })
  }

  const method = body.payment_method === 'BANCONTACT' ? 'BANCONTACT' : 'CARD'
  const { data: payment, error: pErr } = await auth.supabase
    .from('kassa_terminal_payments')
    .insert({
      tenant_slug: auth.tenantSlug,
      terminal_id: terminal.id,
      provider: terminal.provider,
      provider_payment_id: started.id,
      provider_reader_id: String(terminal.external_id),
      amount_cents: amountCents,
      currency: 'eur',
      status: 'pending',
      payment_method: method,
    })
    .select('id')
    .single()

  if (pErr) {
    if (isMissingRelationError(pErr.message)) {
      return NextResponse.json({
        ok: true,
        payment_id: started.id,
        provider_payment_id: started.id,
        ephemeral: true,
      })
    }
    console.error('[kassa/payment-terminal/pay]', pErr)
    return NextResponse.json({ ok: false, error: 'server' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    payment_id: payment.id,
    provider_payment_id: started.id,
  })
}
