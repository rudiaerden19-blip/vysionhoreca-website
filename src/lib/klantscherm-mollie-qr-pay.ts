import type { TenantTerminalSecrets } from '@/lib/kassa-payment-terminal-providers'

type MollieJson = Record<string, unknown>

async function mollieRequest(
  apiKey: string,
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
): Promise<{ status: number; json: MollieJson }> {
  const res = await fetch(`https://api.mollie.com/v2${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body != null ? JSON.stringify(body) : undefined,
  })
  let json: MollieJson = {}
  try {
    json = (await res.json()) as MollieJson
  } catch {
    json = {}
  }
  return { status: res.status, json }
}

function checkoutHref(json: MollieJson): string | null {
  const links = json._links as { checkout?: { href?: string } } | undefined
  const href = links?.checkout?.href?.trim()
  return href || null
}

/** Bancontact via Mollie — QR = checkout-URL voor bank-app. */
export async function createKlantschermMollieQrPayment(opts: {
  secrets: TenantTerminalSecrets
  amountCents: number
  description: string
  redirectUrl: string
}): Promise<
  | { ok: true; providerPaymentId: string; qrCheckoutUrl: string }
  | { ok: false; error: string }
> {
  const key = opts.secrets.mollie_api_key?.trim()
  if (!key) return { ok: false, error: 'mollie_not_configured' }

  const value = (opts.amountCents / 100).toFixed(2)
  const { status, json } = await mollieRequest(key, 'POST', '/payments', {
    amount: { currency: 'EUR', value },
    description: opts.description.slice(0, 140),
    redirectUrl: opts.redirectUrl,
    method: 'bancontact',
  })

  const id = typeof json.id === 'string' ? json.id : ''
  const qrCheckoutUrl = checkoutHref(json)
  if (status >= 400 || !id || !qrCheckoutUrl) {
    const detail =
      typeof json.detail === 'string'
        ? json.detail
        : typeof json.title === 'string'
          ? json.title
          : 'mollie_create_failed'
    return { ok: false, error: detail }
  }

  return { ok: true, providerPaymentId: id, qrCheckoutUrl }
}

export async function readKlantschermMolliePaymentStatus(
  secrets: TenantTerminalSecrets,
  providerPaymentId: string,
): Promise<'pending' | 'paid' | 'failed' | 'canceled'> {
  const key = secrets.mollie_api_key?.trim()
  if (!key) return 'failed'
  const { status, json } = await mollieRequest(
    key,
    'GET',
    `/payments/${encodeURIComponent(providerPaymentId)}`,
  )
  if (status >= 400) return 'failed'
  const st = String(json.status || '')
  if (st === 'paid') return 'paid'
  if (st === 'canceled' || st === 'expired') return 'canceled'
  if (st === 'failed') return 'failed'
  return 'pending'
}
