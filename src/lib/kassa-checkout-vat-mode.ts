/** Per-tenant: BTW ter plaatse / meenemen / alcohol bij afrekenen. Standaard uit. */

import type { CategoryVatPercent } from '@/lib/order-vat'

export const KASSA_CHECKOUT_VAT_MODES = ['off', 'choose', 'dine_in', 'takeaway'] as const
export type KassaCheckoutVatMode = (typeof KASSA_CHECKOUT_VAT_MODES)[number]

export function normalizeKassaCheckoutVatMode(raw: unknown): KassaCheckoutVatMode {
  const v = String(raw ?? '')
    .trim()
    .toLowerCase()
  if (v === 'choose' || v === 'dine_in' || v === 'takeaway') return v
  return 'off'
}

/** Popup «Alcoholische dranken»: hele bon op dit tarief. */
export const KASSA_CHECKOUT_ALCOHOL_VAT_PCT = 21 as const satisfies CategoryVatPercent

export function applyKassaCheckoutVatForce(
  computed: CategoryVatPercent,
  forcePct: CategoryVatPercent | null | undefined,
): CategoryVatPercent {
  if (forcePct === 6 || forcePct === 9 || forcePct === 12 || forcePct === 21) return forcePct
  return computed
}
