import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { eurosToCents } from '@/lib/kassa-payment-terminal'
import {
  buildSepaEpcQrPayload,
  isPlausibleIban,
  normalizeIban,
} from '@/lib/klantscherm-bank-epc-qr'

export const dynamic = 'force-dynamic'

type RouteContext = { params: { tenant: string } }

function isMissingColumnError(message: string | undefined): boolean {
  return !!message && /42703|klantscherm_bank|column/.test(message)
}

/** Bank-QR voor klantscherm — geen kassa-login nodig (zelfde als slideshow). */
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

  const supabase = getServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'server_config' }, { status: 503 })
  }

  const full = await supabase
    .from('tenant_settings')
    .select(
      'klantscherm_enabled, business_name, klantscherm_bank_iban, klantscherm_bank_account_name',
    )
    .eq('tenant_slug', tenantSlug)
    .maybeSingle()

  let settings = full.data
  if (full.error && isMissingColumnError(full.error.message)) {
    const retry = await supabase
      .from('tenant_settings')
      .select('klantscherm_enabled, business_name')
      .eq('tenant_slug', tenantSlug)
      .maybeSingle()
    settings =
      retry.data != null
        ? {
            ...retry.data,
            klantscherm_bank_iban: null,
            klantscherm_bank_account_name: null,
          }
        : null
  } else if (full.error) {
    console.error('[klantscherm/qr/create] settings', full.error)
    return NextResponse.json({ ok: false, error: 'settings_load_failed' }, { status: 500 })
  }

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

  const iban = normalizeIban(ibanRaw)
  const beneficiary =
    String(settings?.klantscherm_bank_account_name ?? '').trim() ||
    String(settings?.business_name ?? tenantSlug).trim()
  const amountEur = amountCents / 100
  const ref = typeof body.reference === 'string' ? body.reference.trim().slice(0, 140) : ''
  const qrPayload = buildSepaEpcQrPayload({
    beneficiaryName: beneficiary,
    iban,
    amountEur,
    remittanceInfo: ref || `Betaling ${beneficiary}`,
  })

  return NextResponse.json({
    ok: true,
    qr_payload: qrPayload,
    amount_cents: amountCents,
    iban,
    beneficiary_name: beneficiary,
  })
}
