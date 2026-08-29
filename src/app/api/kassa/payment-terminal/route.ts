import { NextRequest, NextResponse } from 'next/server'
import {
  authorizeKassaTerminalTenant,
  isMissingRelationError,
  loadTenantTerminalSecrets,
  mapTerminalRow,
} from '@/lib/kassa-payment-terminal-server'
import {
  ensureStripeTerminalLocation,
  listRemoteReaders,
  pairStripeReader,
  providerHasKeys,
} from '@/lib/kassa-payment-terminal-providers'
import { isKassaTerminalProvider } from '@/lib/kassa-payment-terminal'
import { terminalOauthAppsReady } from '@/lib/kassa-payment-terminal-oauth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const tenant_slug = request.nextUrl.searchParams.get('tenant_slug')?.trim() || ''
  const auth = await authorizeKassaTerminalTenant(request, tenant_slug)
  if (!auth.ok) return auth.response

  const secrets = await loadTenantTerminalSecrets(auth.supabase, auth.tenantSlug)
  const { data, error } = await auth.supabase
    .from('kassa_payment_terminals')
    .select('id, label, provider, is_active')
    .eq('tenant_slug', auth.tenantSlug)
    .order('label', { ascending: true })

  if (error) {
    if (isMissingRelationError(error.message)) {
      return NextResponse.json({
        ok: true,
        terminals: [],
        providers: { stripe: !!secrets.stripe_secret_key, sumup: false, mollie: false },
        connect: terminalOauthAppsReady(),
        table_ready: false,
      })
    }
    console.error('[kassa/payment-terminal] GET', error)
    return NextResponse.json({ ok: false, error: 'server' }, { status: 500 })
  }

  const terminals = (data ?? [])
    .map((row) => mapTerminalRow(row as { id: string; label: string | null; provider: string; is_active: boolean | null }))
    .filter((t): t is NonNullable<typeof t> => t != null)

  return NextResponse.json({
    ok: true,
    terminals,
    providers: {
      stripe: providerHasKeys('stripe', secrets),
      sumup: providerHasKeys('sumup', secrets),
      mollie: providerHasKeys('mollie', secrets),
    },
    connect: terminalOauthAppsReady(),
    table_ready: true,
  })
}

export async function POST(request: NextRequest) {
  let body: {
    tenant_slug?: string
    action?: string
    provider?: string
    label?: string
    registration_code?: string
    external_id?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }

  const auth = await authorizeKassaTerminalTenant(request, body.tenant_slug || '')
  if (!auth.ok) return auth.response
  if (!isKassaTerminalProvider(body.provider || '')) {
    return NextResponse.json({ ok: false, error: 'bad_provider' }, { status: 400 })
  }
  const provider = body.provider as 'stripe' | 'sumup' | 'mollie'
  const label = (body.label || '').trim() || provider
  const secrets = await loadTenantTerminalSecrets(auth.supabase, auth.tenantSlug)

  if (body.action === 'disconnect') {
    const patch: Record<string, null> =
      provider === 'stripe'
        ? { stripe_terminal_access_token: null }
        : provider === 'sumup'
          ? { sumup_api_key: null, sumup_merchant_code: null }
          : { mollie_api_key: null }
    const { error } = await auth.supabase
      .from('tenant_settings')
      .update(patch)
      .eq('tenant_slug', auth.tenantSlug)
    if (error) return NextResponse.json({ ok: false, error: 'server' }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'list_remote') {
    const listed = await listRemoteReaders(provider, secrets)
    if (!listed.ok) return NextResponse.json({ ok: false, error: listed.error }, { status: 400 })
    return NextResponse.json({ ok: true, readers: listed.readers })
  }

  let externalId = (body.external_id || '').trim()
  if (provider === 'stripe' && body.action !== 'attach' && (body.registration_code || '').trim()) {
    const paired = await pairStripeReader(secrets, body.registration_code!.trim(), label)
    if (!paired.ok) return NextResponse.json({ ok: false, error: paired.error }, { status: 400 })
    externalId = paired.id
    const locId =
      paired.raw && typeof paired.raw === 'object' && 'locationId' in paired.raw
        ? String((paired.raw as { locationId?: string }).locationId || '')
        : ''
    if (locId && !secrets.stripe_terminal_location_id) {
      await auth.supabase
        .from('tenant_settings')
        .update({ stripe_terminal_location_id: locId })
        .eq('tenant_slug', auth.tenantSlug)
    }
  } else if (provider === 'stripe' && !externalId) {
    const loc = await ensureStripeTerminalLocation(secrets)
    if (loc.ok && loc.id && !secrets.stripe_terminal_location_id) {
      await auth.supabase
        .from('tenant_settings')
        .update({ stripe_terminal_location_id: loc.id })
        .eq('tenant_slug', auth.tenantSlug)
    }
    return NextResponse.json({ ok: false, error: 'need_code_or_id' }, { status: 400 })
  }

  if (!externalId) {
    return NextResponse.json({ ok: false, error: 'need_external_id' }, { status: 400 })
  }

  const { data, error } = await auth.supabase
    .from('kassa_payment_terminals')
    .upsert(
      {
        tenant_slug: auth.tenantSlug,
        provider,
        external_id: externalId,
        label,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_slug,provider,external_id' },
    )
    .select('id, label, provider, is_active')
    .single()

  if (error) {
    if (isMissingRelationError(error.message)) {
      return NextResponse.json({ ok: false, error: 'table_missing' }, { status: 503 })
    }
    console.error('[kassa/payment-terminal] POST', error)
    return NextResponse.json({ ok: false, error: 'server' }, { status: 500 })
  }

  const mapped = mapTerminalRow(data as { id: string; label: string | null; provider: string; is_active: boolean | null })
  return NextResponse.json({ ok: true, terminal: mapped })
}

export async function PATCH(request: NextRequest) {
  let body: { tenant_slug?: string; id?: string; is_active?: boolean; label?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }
  const auth = await authorizeKassaTerminalTenant(request, body.tenant_slug || '')
  if (!auth.ok) return auth.response
  const id = (body.id || '').trim()
  if (!id) return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof body.is_active === 'boolean') patch.is_active = body.is_active
  if (typeof body.label === 'string' && body.label.trim()) patch.label = body.label.trim()

  const { error } = await auth.supabase
    .from('kassa_payment_terminals')
    .update(patch)
    .eq('tenant_slug', auth.tenantSlug)
    .eq('id', id)

  if (error) {
    if (isMissingRelationError(error.message)) {
      return NextResponse.json({ ok: false, error: 'table_missing' }, { status: 503 })
    }
    return NextResponse.json({ ok: false, error: 'server' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const tenant_slug = request.nextUrl.searchParams.get('tenant_slug')?.trim() || ''
  const id = request.nextUrl.searchParams.get('id')?.trim() || ''
  const auth = await authorizeKassaTerminalTenant(request, tenant_slug)
  if (!auth.ok) return auth.response
  if (!id) return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })

  const { error } = await auth.supabase
    .from('kassa_payment_terminals')
    .delete()
    .eq('tenant_slug', auth.tenantSlug)
    .eq('id', id)

  if (error) {
    if (isMissingRelationError(error.message)) {
      return NextResponse.json({ ok: false, error: 'table_missing' }, { status: 503 })
    }
    return NextResponse.json({ ok: false, error: 'server' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
