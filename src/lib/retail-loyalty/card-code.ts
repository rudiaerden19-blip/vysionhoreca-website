/** Interne EAN-13 range 899… = winkelpas (niet product-EAN). */
export const RETAIL_LOYALTY_CARD_PREFIX = '899'

export function normalizeRetailLoyaltyCardCode(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 13 && digits.startsWith(RETAIL_LOYALTY_CARD_PREFIX)) {
    return digits
  }
  return null
}

export function isRetailLoyaltyCardScan(raw: string): boolean {
  return normalizeRetailLoyaltyCardCode(raw) !== null
}

export function generateRetailLoyaltyCardCode(): string {
  let suffix = ''
  for (let i = 0; i < 10; i++) {
    suffix += String(Math.floor(Math.random() * 10))
  }
  return `${RETAIL_LOYALTY_CARD_PREFIX}${suffix}`
}
