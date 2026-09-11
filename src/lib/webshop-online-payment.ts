/** Webshop-betaalmethodes die Stripe nodig hebben. */

export const WEBSHOP_ONLINE_PAYMENT_METHOD_IDS = [
  'bancontact',
  'visa',
  'mastercard',
  'paypal',
  'ideal',
] as const

export function isWebshopOnlinePaymentMethodId(method: string): boolean {
  return (WEBSHOP_ONLINE_PAYMENT_METHOD_IDS as readonly string[]).includes(method)
}

/** Zonder Stripe: geen Bancontact/iDEAL/kaart tonen. Altijd minstens cash. */
export function webshopPaymentMethodsOffered(
  configured: string[] | null | undefined,
  stripeOnlineReady: boolean,
): string[] {
  const list =
    Array.isArray(configured) && configured.length > 0 ? configured.filter((m) => typeof m === 'string') : ['cash']
  if (stripeOnlineReady) return list
  const cashOnly = list.filter((m) => m === 'cash')
  return cashOnly.length > 0 ? cashOnly : ['cash']
}

export function isStripeOnlineCheckoutSecretConfigured(secret: string | null | undefined): boolean {
  return typeof secret === 'string' && secret.trim().length > 10
}

export function stripeCheckoutSessionIsPaid(session: {
  payment_status?: string | null
  status?: string | null
}): boolean {
  const ps = String(session.payment_status || '').toLowerCase()
  return ps === 'paid' || ps === 'no_payment_required'
}

function looksLikeVysionBrand(value: string): boolean {
  return /^VYSION(\s|$)/.test(value.trim())
}

/** Tekst op het bankafschrift van de klant (niet Vysion). Stripe: 5–22 tekens. */
export function stripeStatementDescriptorFromShop(
  businessName: string | null | undefined,
  tenantSlug: string,
): string {
  const name = (businessName || '').trim().toUpperCase()
  const slug = (tenantSlug || '').trim().toUpperCase()
  const source = name && !looksLikeVysionBrand(name) ? name : slug || 'WEBSHOP'
  let cleaned = source.replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
  if (looksLikeVysionBrand(cleaned)) {
    cleaned = slug.replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim() || 'WEBSHOP'
  }
  if (cleaned.length < 5) {
    cleaned = `${cleaned} SHOP`.replace(/\s+/g, ' ').trim()
  }
  const clipped = cleaned.slice(0, 22).trim()
  return clipped.length >= 5 ? clipped : 'WEBSHOP'
}
