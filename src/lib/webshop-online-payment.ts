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
