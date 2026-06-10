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
  let body = RETAIL_LOYALTY_CARD_PREFIX
  while (body.length < 12) {
    body += String(Math.floor(Math.random() * 10))
  }
  let sum = 0
  for (let i = 0; i < 12; i++) {
    const n = Number(body[i])
    sum += i % 2 === 0 ? n : n * 3
  }
  const check = String((10 - (sum % 10)) % 10)
  return body + check
}
