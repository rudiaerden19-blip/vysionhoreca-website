import {
  isStripeOnlineCheckoutSecretConfigured,
  webshopPaymentMethodsOffered,
} from '@/lib/webshop-online-payment'

describe('webshop-online-payment', () => {
  it('verbergt Bancontact zonder Stripe', () => {
    expect(webshopPaymentMethodsOffered(['cash', 'bancontact', 'ideal'], false)).toEqual(['cash'])
    expect(webshopPaymentMethodsOffered(['bancontact'], false)).toEqual(['cash'])
  })

  it('laat online methodes staan mét Stripe', () => {
    expect(webshopPaymentMethodsOffered(['cash', 'bancontact'], true)).toEqual(['cash', 'bancontact'])
  })

  it('herkent een echte secret, geen lege key', () => {
    expect(isStripeOnlineCheckoutSecretConfigured(null)).toBe(false)
    expect(isStripeOnlineCheckoutSecretConfigured('sk_live_abcdefghijk')).toBe(true)
    expect(isStripeOnlineCheckoutSecretConfigured('sk_')).toBe(false)
  })
})
