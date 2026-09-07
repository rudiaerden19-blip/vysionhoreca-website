/** Per-tenant: BTW ter plaatse / meenemen bij afrekenen. Standaard uit. */

export const KASSA_CHECKOUT_VAT_MODES = ['off', 'choose', 'dine_in', 'takeaway'] as const
export type KassaCheckoutVatMode = (typeof KASSA_CHECKOUT_VAT_MODES)[number]

export function normalizeKassaCheckoutVatMode(raw: unknown): KassaCheckoutVatMode {
  const v = String(raw ?? '')
    .trim()
    .toLowerCase()
  if (v === 'choose' || v === 'dine_in' || v === 'takeaway') return v
  return 'off'
}
