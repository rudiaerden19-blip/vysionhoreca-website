'use client'

import { useEffect } from 'react'

/** Na Stripe-return: betaalstatus ophalen bij de Stripe van de zaak, niet bij Vysion. */
export function WebshopStripePaymentReturn({ tenant }: { tenant: string }) {
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    if (q.get('payment') !== 'success') return
    const order = q.get('order')
    const url = `/api/stripe/sync-order-payment?tenant=${encodeURIComponent(tenant)}${
      order ? `&orderNumber=${encodeURIComponent(order)}` : ''
    }`
    void fetch(url)
  }, [tenant])
  return null
}
