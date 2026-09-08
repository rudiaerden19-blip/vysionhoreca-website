/** Klant-BTW op de kassa BTW-bon. Landcode altijd hoofdletters; cijfers met punten. */

export type KassaCustomerVatCountry = 'BE' | 'NL'

/** BE: 10 cijfers. NL: 9 cijfers + B + 2 cijfers (11 cijfers, langer dan BE). */
export const KASSA_CUSTOMER_VAT_BE_DIGITS = 10
export const KASSA_CUSTOMER_VAT_NL_DIGITS = 11

export function kassaCustomerVatMaxDigits(country: KassaCustomerVatCountry): number {
  return country === 'BE' ? KASSA_CUSTOMER_VAT_BE_DIGITS : KASSA_CUSTOMER_VAT_NL_DIGITS
}

export function extractKassaCustomerVatDigits(raw: string): string {
  return String(raw ?? '').replace(/\D/g, '')
}

/** BE 0123.456.789 */
export function formatBeVatDigitGroups(digits: string): string {
  const d = extractKassaCustomerVatDigits(digits).slice(0, KASSA_CUSTOMER_VAT_BE_DIGITS)
  const parts = [d.slice(0, 4), d.slice(4, 7), d.slice(7, 10)].filter(Boolean)
  return parts.join('.')
}

/** NL 1234.56.789.B01 — meer posities dan BE (9+B+2). */
export function formatNlVatDigitGroups(digits: string): string {
  const d = extractKassaCustomerVatDigits(digits).slice(0, KASSA_CUSTOMER_VAT_NL_DIGITS)
  const rsin = d.slice(0, 9)
  const suffix = d.slice(9, 11)
  const parts = [rsin.slice(0, 4), rsin.slice(4, 6), rsin.slice(6, 9)].filter(Boolean)
  let body = parts.join('.')
  if (rsin.length >= 9) {
    body += '.B'
    if (suffix) body += suffix
  }
  return body
}

export function formatKassaCustomerVatDisplay(country: KassaCustomerVatCountry, raw: string): string {
  return country === 'BE' ? formatBeVatDigitGroups(raw) : formatNlVatDigitGroups(raw)
}

export function formatKassaCustomerVatReceipt(country: KassaCustomerVatCountry, raw: string): string {
  const inner = formatKassaCustomerVatDisplay(country, raw)
  if (!inner) return country
  return `${country} ${inner}`
}

export function isKassaCustomerVatComplete(country: KassaCustomerVatCountry, raw: string): boolean {
  return extractKassaCustomerVatDigits(raw).length === kassaCustomerVatMaxDigits(country)
}

export function parseKassaCustomerVatInput(
  country: KassaCustomerVatCountry,
  raw: string,
): { display: string; complete: boolean; receipt: string } {
  const display = formatKassaCustomerVatDisplay(country, raw)
  const complete = isKassaCustomerVatComplete(country, display)
  return {
    display,
    complete,
    receipt: complete ? formatKassaCustomerVatReceipt(country, display) : '',
  }
}
