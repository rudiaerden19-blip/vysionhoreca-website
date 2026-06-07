/** Belgisch rijksregisternummer / INSZ: 11 cijfers, weergave YY.MM.DD-XXX.CC */

export function inszDigitsOnly(raw: string | null | undefined): string {
  return (raw || '').replace(/\D/g, '').slice(0, 11)
}

export function formatBelgianInszDisplay(raw: string | null | undefined): string {
  const d = inszDigitsOnly(raw)
  if (d.length === 0) return ''
  let s = d.slice(0, 2)
  if (d.length > 2) s += `.${d.slice(2, 4)}`
  if (d.length > 4) s += `.${d.slice(4, 6)}`
  if (d.length > 6) s += `-${d.slice(6, 9)}`
  if (d.length > 9) s += `.${d.slice(9, 11)}`
  return s
}

export function isValidBelgianInszDigits(digits: string): boolean {
  return digits.length === 11
}
