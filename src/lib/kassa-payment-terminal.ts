import type { KassaPaymentMethod } from '@/lib/kassa-cart-types'

export const KASSA_TERMINAL_PROVIDERS = ['stripe', 'sumup', 'mollie'] as const
export type KassaTerminalProvider = (typeof KASSA_TERMINAL_PROVIDERS)[number]

export type KassaPaymentTerminalPublic = {
  id: string
  label: string
  provider: KassaTerminalProvider
  is_active: boolean
}

const CARD_PRESENT_METHODS = new Set<KassaPaymentMethod>(['CARD', 'BANCONTACT'])

/** Actieve lezers die een bedrag mogen ontvangen. */
export function activeKassaPaymentTerminals(
  terminals: readonly KassaPaymentTerminalPublic[] | null | undefined,
): KassaPaymentTerminalPublic[] {
  if (!terminals?.length) return []
  return terminals.filter((t) => t.is_active && t.id && t.provider)
}

/**
 * Alleen PIN/kaart of Bancontact gaan naar een cloud-lezer.
 * Geen lezers → false → bestaande kassa (direct betaald markeren).
 * Contant, iDEAL en gesplitst blijven altijd de oude flow.
 */
export function kassaCardPayGoesToCloudTerminal(
  method: KassaPaymentMethod,
  terminals: readonly KassaPaymentTerminalPublic[] | null | undefined,
): boolean {
  if (!CARD_PRESENT_METHODS.has(method)) return false
  return activeKassaPaymentTerminals(terminals).length > 0
}

export function eurosToCents(amount: number): number {
  if (!Number.isFinite(amount) || amount < 0) return 0
  return Math.round(amount * 100)
}

export function pickDefaultKassaTerminal(
  terminals: readonly KassaPaymentTerminalPublic[],
  preferredId?: string | null,
): KassaPaymentTerminalPublic | null {
  const active = activeKassaPaymentTerminals(terminals)
  if (active.length === 0) return null
  if (preferredId) {
    const found = active.find((t) => t.id === preferredId)
    if (found) return found
  }
  return active[0] ?? null
}

export function isKassaTerminalProvider(value: string): value is KassaTerminalProvider {
  return (KASSA_TERMINAL_PROVIDERS as readonly string[]).includes(value)
}
