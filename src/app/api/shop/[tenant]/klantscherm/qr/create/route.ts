import { NextRequest, NextResponse } from 'next/server'
import { authorizeKassaTerminalTenant } from '@/lib/kassa-payment-terminal-server'
import { eurosToCents } from '@/lib/kassa-payment-terminal'
import {
  buildSepaEpcQrPayload,
  isPlausibleIban,
  normalizeIban,
} from '@/lib/klantscherm-bank-epc-qr'

export const dynamic = 'force-dynamic'

type RouteContext = { params: { tenant: string } }

export async function POST(request: NextRequest, context: RouteContext) {
  const tenantSlug = context.params.tenant?.trim()
  if (!tenantSlug) {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }

  let body: { amount?: number; reference?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }

  const auth = await authorizeKassaTerminalTenant(request, tenantSlug)
  if (!auth.ok) return auth.response

  const { data: settings } = await auth.supabase
    .from('tenant_settings')
    .select(
      'klantscherm_enabled, business_name, klantscherm_bank_iban, klantscherm_bank_account_name',
    )
    .eq('tenant_slug', auth.tenantSlug)
    .maybeSingle()

  if (settings?.klantscherm_enabled !== true) {
    return NextResponse.json({ ok: false, error: 'klantscherm_disabled' }, { status: 403 })
  }

  const amountCents = eurosToCents(Number(body.amount))
  if (amountCents < 1) {
    return NextResponse.json({ ok: false, error: 'invalid_amount' }, { status: 400 })
  }

  const ibanRaw = String(settings?.klantscherm_bank_iban ?? '').trim()
  if (!ibanRaw) {
    return NextResponse.json({ ok: false, error: 'iban_missing' }, { status: 400 })
  }
  if (!isPlausibleIban(ibanRaw)) {
    return NextResponse.json({ ok: false, error: 'invalid_iban' }, { status: 400 })
  }

  const beneficiary =
    String(settings?.klantscherm_bank_account_name ?? '').trim() ||
    String(settings?.business_name ?? auth.tenantSlug).trim()
  const amountEur = amountCents / 100
  const ref = typeof body.reference === 'string' ? body.reference.trim().slice(0, 140) : ''
  const qrPayload = buildSepaEpcQrPayload({
    beneficiaryName: beneficiary,
    iban: normalizeIban(ibanRaw),
    amountEur,
    remittanceInfo: ref || `Betaling ${beneficiary}`,
  })

  return NextResponse.json({
    ok: true,
    qr_payload: qrPayload,
    amount_cents: amountCents,
  })
}
