import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'
import type { TenantTerminalSecrets } from '@/lib/kassa-payment-terminal-providers'
import type { KassaPaymentTerminalPublic } from '@/lib/kassa-payment-terminal'
import { isKassaTerminalProvider } from '@/lib/kassa-payment-terminal'

export function isMissingRelationError(message: string | undefined): boolean {
  if (!message) return false
  return /does not exist|42P01|schema cache/i.test(message)
}

export async function authorizeKassaTerminalTenant(request: NextRequest, tenantSlug: string) {
  const slug = tenantSlug.trim()
  if (!slug) {
    return { ok: false as const, response: NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 }) }
  }
  const supabase = getServerSupabaseClient()
  if (!supabase) {
    return { ok: false as const, response: NextResponse.json({ ok: false, error: 'server_config' }, { status: 500 }) }
  }
  const access = await verifyTenantOrSuperAdmin(request, slug)
  if (!access.authorized) {
    return { ok: false as const, response: NextResponse.json({ ok: false, error: access.error || 'unauthorized' }, { status: 403 }) }
  }
  return { ok: true as const, supabase, tenantSlug: slug }
}

export async function loadTenantTerminalSecrets(
  supabase: NonNullable<ReturnType<typeof getServerSupabaseClient>>,
  tenantSlug: string,
): Promise<TenantTerminalSecrets> {
  const fullSelect =
    'stripe_secret_key, stripe_terminal_access_token, stripe_terminal_location_id, sumup_api_key, sumup_merchant_code, mollie_api_key, business_name, address, city, postal_code, country'
  const first = await supabase
    .from('tenant_settings')
    .select(fullSelect)
    .eq('tenant_slug', tenantSlug)
    .maybeSingle()
  let row = first.data as TenantTerminalSecrets | null
  if (first.error && /stripe_terminal_access_token|42703/i.test(first.error.message || '')) {
    const retry = await supabase
      .from('tenant_settings')
      .select(
        'stripe_secret_key, stripe_terminal_location_id, sumup_api_key, sumup_merchant_code, mollie_api_key, business_name, address, city, postal_code, country',
      )
      .eq('tenant_slug', tenantSlug)
      .maybeSingle()
    row = retry.data as TenantTerminalSecrets | null
  }
  return {
    stripe_secret_key: row?.stripe_secret_key ?? null,
    stripe_terminal_access_token: row?.stripe_terminal_access_token ?? null,
    stripe_terminal_location_id: row?.stripe_terminal_location_id ?? null,
    sumup_api_key: row?.sumup_api_key ?? null,
    sumup_merchant_code: row?.sumup_merchant_code ?? null,
    mollie_api_key: row?.mollie_api_key ?? null,
    business_name: row?.business_name ?? null,
    address: row?.address ?? null,
    city: row?.city ?? null,
    postal_code: row?.postal_code ?? null,
    country: row?.country ?? null,
  }
}

export function mapTerminalRow(row: {
  id: string
  label: string | null
  provider: string
  is_active: boolean | null
}): KassaPaymentTerminalPublic | null {
  if (!isKassaTerminalProvider(row.provider)) return null
  return {
    id: row.id,
    label: (row.label || row.provider).trim() || row.provider,
    provider: row.provider,
    is_active: row.is_active !== false,
  }
}
