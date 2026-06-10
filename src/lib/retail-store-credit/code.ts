/** Interne EAN-13 range 897… = tegoedbon (niet product-EAN, niet winkelpas 899). */
export const RETAIL_STORE_CREDIT_PREFIX = '897'

export function normalizeRetailStoreCreditCode(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 13 && digits.startsWith(RETAIL_STORE_CREDIT_PREFIX)) {
    return digits
  }
  return null
}

export function isRetailStoreCreditScan(raw: string): boolean {
  return normalizeRetailStoreCreditCode(raw) !== null
}

function ean13CheckDigit(body12: string): string {
  let sum = 0
  for (let i = 0; i < 12; i++) {
    const n = Number(body12[i])
    sum += i % 2 === 0 ? n : n * 3
  }
  return String((10 - (sum % 10)) % 10)
}

export function generateRetailStoreCreditCode(): string {
  let body = RETAIL_STORE_CREDIT_PREFIX
  while (body.length < 12) {
    body += String(Math.floor(Math.random() * 10))
  }
  return body + ean13CheckDigit(body)
}
