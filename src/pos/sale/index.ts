import type { PosCheckoutDraft } from '../types'

/**
 * Voorbereid checkout-resultaat voor persist (orders) + aanroep GKS.
 * Implementatie blijft in kassa/page tot migratie; dit type definieert het contract.
 */
export interface PosSalePrepared {
  draft: PosCheckoutDraft
  displayTotal: number
  createdAtIso: string
}

export type PreparePosSale = (draft: PosCheckoutDraft) => PosSalePrepared
