/** EPC069-12 / SEPA QR — scan met bankapp (geen Mollie). */

export function normalizeIban(raw: string): string {
  return raw.replace(/\s/g, '').toUpperCase()
}

export function isPlausibleIban(iban: string): boolean {
  const n = normalizeIban(iban)
  return /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(n)
}

export function buildSepaEpcQrPayload(opts: {
  beneficiaryName: string
  iban: string
  amountEur: number
  remittanceInfo?: string
}): string {
  const iban = normalizeIban(opts.iban)
  const name = opts.beneficiaryName.trim().slice(0, 70)
  const amount = Math.max(0, opts.amountEur).toFixed(2)
  const info = (opts.remittanceInfo || 'Betaling').trim().slice(0, 140)
  return [
    'BCD',
    '002',
    '1',
    'SCT',
    '',
    name,
    iban,
    `EUR${amount}`,
    '',
    '',
    info,
  ].join('\n')
}
