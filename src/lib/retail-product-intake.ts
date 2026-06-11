/** Gedeelde barcode-normalisatie (retail product intake + admin producten). */
export function normalizeRetailProductBarcode(raw: string): string {
  return raw.replace(/\s/g, '').trim()
}

export function retailBarcodeMatchKey(raw: string): string {
  const trimmed = normalizeRetailProductBarcode(raw)
  const digits = trimmed.replace(/\D/g, '')
  return digits.length >= 8 ? digits : trimmed
}
