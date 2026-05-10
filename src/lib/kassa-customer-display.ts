/**
 * Tweede scherm (klant): lokaal BroadcastChannel — geen server, geen impact op
 * kassa als klantscherm niet geopend is.
 */

export const KASSA_CUSTOMER_DISPLAY_CHANNEL_PREFIX = 'vysion-klantscherm'

export function kassaCustomerDisplayChannelName(tenantSlug: string, sessionToken: string): string {
  return `${KASSA_CUSTOMER_DISPLAY_CHANNEL_PREFIX}-${tenantSlug}-${sessionToken}`
}

/** Duur bedankmelding op klantscherm na betaling (daarna weer datum/klok). */
export const KASSA_CUSTOMER_DISPLAY_THANK_YOU_MS = 10_000

export type KassaCustomerDisplayLine = {
  label: string
  qty: number
  lineTotal: number
}

export type KassaCustomerDisplayMessage =
  | {
      v: 1
      phase: 'idle'
      tenantSlug: string
      businessName: string
    }
  | {
      v: 1
      phase: 'cart'
      tenantSlug: string
      businessName: string
      lines: KassaCustomerDisplayLine[]
      totalInclVat: number
    }
  | {
      v: 1
      phase: 'checkout'
      tenantSlug: string
      businessName: string
      lines: KassaCustomerDisplayLine[]
      subtotalExVat: number
      vatRate: number
      vatAmount: number
      totalInclVat: number
    }
  | {
      v: 1
      phase: 'thankYou'
      tenantSlug: string
      businessName: string
      totalInclVat: number
    }

export function isKassaCustomerDisplayMessage(x: unknown): x is KassaCustomerDisplayMessage {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return o.v === 1 && typeof o.phase === 'string' && typeof o.tenantSlug === 'string'
}
