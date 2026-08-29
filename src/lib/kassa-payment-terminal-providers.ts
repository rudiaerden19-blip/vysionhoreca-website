import type { KassaTerminalProvider } from '@/lib/kassa-payment-terminal'

export type TerminalProviderResult =
  | { ok: true; id: string; raw?: unknown }
  | { ok: false; error: string; raw?: unknown }

export type TerminalPayStatus = 'pending' | 'succeeded' | 'failed' | 'canceled'

export type TenantTerminalSecrets = {
  stripe_secret_key: string | null
  stripe_terminal_access_token: string | null
  stripe_terminal_location_id: string | null
  sumup_api_key: string | null
  sumup_merchant_code: string | null
  mollie_api_key: string | null
  business_name: string | null
  address: string | null
  city: string | null
  postal_code: string | null
  country: string | null
}

export function stripeApiKey(secrets: TenantTerminalSecrets): string | null {
  return secrets.stripe_terminal_access_token?.trim() || secrets.stripe_secret_key?.trim() || null
}

function missing(name: string): TerminalProviderResult {
  return { ok: false, error: `${name}_not_configured` }
}

async function stripeRequest(
  secret: string,
  method: string,
  path: string,
  form?: Record<string, string>,
): Promise<{ status: number; json: Record<string, unknown> }> {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form ? new URLSearchParams(form) : undefined,
  })
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
  return { status: res.status, json }
}

async function mollieRequest(
  key: string,
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<{ status: number; json: Record<string, unknown> }> {
  const res = await fetch(`https://api.mollie.com/v2${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
  return { status: res.status, json }
}

async function sumupRequest(
  key: string,
  method: string,
  url: string,
  body?: Record<string, unknown>,
): Promise<{ status: number; json: Record<string, unknown> }> {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
  return { status: res.status, json }
}

export function providerHasKeys(
  provider: KassaTerminalProvider,
  secrets: TenantTerminalSecrets,
): boolean {
  if (provider === 'stripe') return !!stripeApiKey(secrets)
  if (provider === 'sumup') {
    return !!secrets.sumup_api_key?.trim() && !!secrets.sumup_merchant_code?.trim()
  }
  return !!secrets.mollie_api_key?.trim()
}

export async function ensureStripeTerminalLocation(
  secrets: TenantTerminalSecrets,
): Promise<TerminalProviderResult & { locationId?: string }> {
  const secret = stripeApiKey(secrets)
  if (!secret) return missing('stripe')
  if (secrets.stripe_terminal_location_id?.trim()) {
    return { ok: true, id: secrets.stripe_terminal_location_id.trim() }
  }
  const displayName = (secrets.business_name || 'Kassa').slice(0, 80)
  const country = (secrets.country || 'BE').toUpperCase().slice(0, 2)
  const { status, json } = await stripeRequest(secret, 'POST', '/terminal/locations', {
    display_name: displayName,
    'address[line1]': (secrets.address || 'Onbekend').slice(0, 120),
    'address[city]': (secrets.city || 'Onbekend').slice(0, 80),
    'address[postal_code]': (secrets.postal_code || '0000').slice(0, 20),
    'address[country]': country === 'NL' || country === 'BE' ? country : 'BE',
  })
  const id = typeof json.id === 'string' ? json.id : ''
  if (status >= 400 || !id) {
    return { ok: false, error: String(json.message || json.error || 'stripe_location_failed') }
  }
  return { ok: true, id }
}

export async function pairStripeReader(
  secrets: TenantTerminalSecrets,
  registrationCode: string,
  label: string,
): Promise<TerminalProviderResult> {
  const secret = stripeApiKey(secrets)
  if (!secret) return missing('stripe')
  const loc = await ensureStripeTerminalLocation(secrets)
  if (!loc.ok) return loc
  const { status, json } = await stripeRequest(secret, 'POST', '/terminal/readers', {
    registration_code: registrationCode.trim(),
    label: label.trim() || 'Kassa',
    location: loc.id,
  })
  const id = typeof json.id === 'string' ? json.id : ''
  if (status >= 400 || !id) {
    return { ok: false, error: String(json.message || 'stripe_pair_failed') }
  }
  return { ok: true, id, raw: { locationId: loc.id } }
}

export async function listRemoteReaders(
  provider: KassaTerminalProvider,
  secrets: TenantTerminalSecrets,
): Promise<{ ok: true; readers: { id: string; label: string }[] } | { ok: false; error: string }> {
  if (provider === 'stripe') {
    const secret = stripeApiKey(secrets)
    if (!secret) return { ok: false, error: 'stripe_not_configured' }
    const { status, json } = await stripeRequest(secret, 'GET', '/terminal/readers?limit=30')
    if (status >= 400) return { ok: false, error: 'stripe_list_failed' }
    const data = Array.isArray(json.data) ? json.data : []
    return {
      ok: true,
      readers: data
        .map((row) => {
          const r = row as { id?: string; label?: string; device_type?: string }
          return {
            id: String(r.id || ''),
            label: String(r.label || r.device_type || r.id || ''),
          }
        })
        .filter((r) => r.id),
    }
  }
  if (provider === 'mollie') {
    const key = secrets.mollie_api_key?.trim()
    if (!key) return { ok: false, error: 'mollie_not_configured' }
    const { status, json } = await mollieRequest(key, 'GET', '/terminals')
    if (status >= 400) return { ok: false, error: 'mollie_list_failed' }
    const embedded = json._embedded as { terminals?: Array<{ id?: string; description?: string; brand?: string }> } | undefined
    const data = embedded?.terminals ?? []
    return {
      ok: true,
      readers: data
        .map((r) => ({
          id: String(r.id || ''),
          label: String(r.description || r.brand || r.id || ''),
        }))
        .filter((r) => r.id),
    }
  }
  const key = secrets.sumup_api_key?.trim()
  const merchant = secrets.sumup_merchant_code?.trim()
  if (!key || !merchant) return { ok: false, error: 'sumup_not_configured' }
  const { status, json } = await sumupRequest(
    key,
    'GET',
    `https://api.sumup.com/v0.1/merchants/${encodeURIComponent(merchant)}/readers`,
  )
  if (status >= 400) return { ok: false, error: 'sumup_list_failed' }
  const items = Array.isArray(json.items)
    ? json.items
    : Array.isArray(json.readers)
      ? json.readers
      : Array.isArray(json)
        ? json
        : []
  return {
    ok: true,
    readers: (items as Array<{ id?: string; name?: string; serial_number?: string }>)
      .map((r) => ({
        id: String(r.id || ''),
        label: String(r.name || r.serial_number || r.id || ''),
      }))
      .filter((r) => r.id),
  }
}

export async function startTerminalCheckout(opts: {
  provider: KassaTerminalProvider
  secrets: TenantTerminalSecrets
  readerExternalId: string
  amountCents: number
  description: string
}): Promise<TerminalProviderResult> {
  const { provider, secrets, readerExternalId, amountCents, description } = opts
  if (amountCents < 1) return { ok: false, error: 'invalid_amount' }

  if (provider === 'stripe') {
    const secret = stripeApiKey(secrets)
    if (!secret) return missing('stripe')
    const pi = await stripeRequest(secret, 'POST', '/payment_intents', {
      amount: String(amountCents),
      currency: 'eur',
      'payment_method_types[0]': 'card_present',
      capture_method: 'automatic',
      description: description.slice(0, 120),
    })
    const piId = typeof pi.json.id === 'string' ? pi.json.id : ''
    if (pi.status >= 400 || !piId) {
      return { ok: false, error: String(pi.json.message || 'stripe_intent_failed') }
    }
    const proc = await stripeRequest(
      secret,
      'POST',
      `/terminal/readers/${encodeURIComponent(readerExternalId)}/process_payment_intent`,
      { payment_intent: piId },
    )
    if (proc.status >= 400) {
      return { ok: false, error: String(proc.json.message || 'stripe_reader_busy') }
    }
    return { ok: true, id: piId }
  }

  if (provider === 'mollie') {
    const key = secrets.mollie_api_key?.trim()
    if (!key) return missing('mollie')
    const value = (amountCents / 100).toFixed(2)
    const { status, json } = await mollieRequest(key, 'POST', '/payments', {
      amount: { currency: 'EUR', value },
      description: description.slice(0, 140),
      method: 'pointofsale',
      terminalId: readerExternalId,
    })
    const id = typeof json.id === 'string' ? json.id : ''
    if (status >= 400 || !id) {
      return { ok: false, error: String((json.detail as string) || 'mollie_pay_failed') }
    }
    return { ok: true, id }
  }

  const key = secrets.sumup_api_key?.trim()
  const merchant = secrets.sumup_merchant_code?.trim()
  if (!key || !merchant) return missing('sumup')
  const { status, json } = await sumupRequest(
    key,
    'POST',
    `https://api.sumup.com/v0.1/merchants/${encodeURIComponent(merchant)}/readers/${encodeURIComponent(readerExternalId)}/checkout`,
    {
      description: description.slice(0, 120),
      total_amount: { value: amountCents, currency: 'EUR', minor_unit: 2 },
    },
  )
  const id =
    typeof json.id === 'string'
      ? json.id
      : typeof json.client_transaction_id === 'string'
        ? json.client_transaction_id
        : ''
  if (status >= 400 || !id) {
    return { ok: false, error: String((json.message as string) || 'sumup_pay_failed') }
  }
  return { ok: true, id }
}

export async function readTerminalCheckoutStatus(opts: {
  provider: KassaTerminalProvider
  secrets: TenantTerminalSecrets
  providerPaymentId: string
  readerExternalId?: string | null
}): Promise<{ ok: true; status: TerminalPayStatus } | { ok: false; error: string }> {
  const { provider, secrets, providerPaymentId } = opts
  if (provider === 'stripe') {
    const secret = stripeApiKey(secrets)
    if (!secret) return { ok: false, error: 'stripe_not_configured' }
    const { status, json } = await stripeRequest(
      secret,
      'GET',
      `/payment_intents/${encodeURIComponent(providerPaymentId)}`,
    )
    if (status >= 400) return { ok: false, error: 'stripe_status_failed' }
    const st = String(json.status || '')
    if (st === 'succeeded') return { ok: true, status: 'succeeded' }
    if (st === 'canceled') return { ok: true, status: 'canceled' }
    if (st === 'requires_payment_method' || st === 'requires_source') {
      return { ok: true, status: 'failed' }
    }
    return { ok: true, status: 'pending' }
  }
  if (provider === 'mollie') {
    const key = secrets.mollie_api_key?.trim()
    if (!key) return { ok: false, error: 'mollie_not_configured' }
    const { status, json } = await mollieRequest(
      key,
      'GET',
      `/payments/${encodeURIComponent(providerPaymentId)}`,
    )
    if (status >= 400) return { ok: false, error: 'mollie_status_failed' }
    const st = String(json.status || '')
    if (st === 'paid') return { ok: true, status: 'succeeded' }
    if (st === 'canceled' || st === 'expired') return { ok: true, status: 'canceled' }
    if (st === 'failed') return { ok: true, status: 'failed' }
    return { ok: true, status: 'pending' }
  }
  const key = secrets.sumup_api_key?.trim()
  if (!key) return { ok: false, error: 'sumup_not_configured' }
  const { status, json } = await sumupRequest(
    key,
    'GET',
    `https://api.sumup.com/v0.1/checkouts/${encodeURIComponent(providerPaymentId)}`,
  )
  if (status >= 400) {
    const alt = await sumupRequest(
      key,
      'GET',
      `https://api.sumup.com/v2.1/merchants/transactions/${encodeURIComponent(providerPaymentId)}`,
    )
    if (alt.status >= 400) return { ok: false, error: 'sumup_status_failed' }
    return mapSumupStatus(alt.json)
  }
  return mapSumupStatus(json)
}

function mapSumupStatus(json: Record<string, unknown>): {
  ok: true
  status: TerminalPayStatus
} {
  const st = String(json.status || json.transaction_status || '').toUpperCase()
  if (st === 'PAID' || st === 'SUCCESSFUL' || st === 'SUCCESS') {
    return { ok: true, status: 'succeeded' }
  }
  if (st === 'FAILED' || st === 'ERROR') return { ok: true, status: 'failed' }
  if (st === 'CANCELLED' || st === 'CANCELED') return { ok: true, status: 'canceled' }
  return { ok: true, status: 'pending' }
}

export async function cancelTerminalCheckout(opts: {
  provider: KassaTerminalProvider
  secrets: TenantTerminalSecrets
  providerPaymentId: string
  readerExternalId: string
}): Promise<TerminalProviderResult> {
  const { provider, secrets, providerPaymentId, readerExternalId } = opts
  if (provider === 'stripe') {
    const secret = stripeApiKey(secrets)
    if (!secret) return missing('stripe')
    await stripeRequest(
      secret,
      'POST',
      `/terminal/readers/${encodeURIComponent(readerExternalId)}/cancel_action`,
    )
    await stripeRequest(secret, 'POST', `/payment_intents/${encodeURIComponent(providerPaymentId)}/cancel`)
    return { ok: true, id: providerPaymentId }
  }
  if (provider === 'mollie') {
    const key = secrets.mollie_api_key?.trim()
    if (!key) return missing('mollie')
    const { status, json } = await mollieRequest(
      key,
      'DELETE',
      `/payments/${encodeURIComponent(providerPaymentId)}`,
    )
    if (status >= 400 && status !== 405) {
      return { ok: false, error: String((json.detail as string) || 'mollie_cancel_failed') }
    }
    return { ok: true, id: providerPaymentId }
  }
  const key = secrets.sumup_api_key?.trim()
  const merchant = secrets.sumup_merchant_code?.trim()
  if (!key || !merchant) return missing('sumup')
  await sumupRequest(
    key,
    'POST',
    `https://api.sumup.com/v0.1/merchants/${encodeURIComponent(merchant)}/readers/${encodeURIComponent(readerExternalId)}/terminate`,
  )
  return { ok: true, id: providerPaymentId }
}
