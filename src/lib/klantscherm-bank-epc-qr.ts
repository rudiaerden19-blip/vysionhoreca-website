/** EPC069-12 / SEPA QR — scan met bankapp (geen Mollie). */

export function normalizeIban(raw: string): string {
  return raw.replace(/\s/g, '').toUpperCase()
}

export function isPlausibleIban(iban: string): boolean {
  const n = normalizeIban(iban)
  return /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(n)
}

/** Bankapps (BE) lezen EPC069-12 het best met ASCII-naam en vaste 12 regels. */
export function sanitizeEpcBeneficiaryName(name: string): string {
  const trimmed = name.trim().slice(0, 70)
  return trimmed
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .trim() || 'Betaling'
}

export function buildSepaEpcQrPayload(opts: {
  beneficiaryName: string
  iban: string
  amountEur: number
  remittanceInfo?: string
}): string {
  const iban = normalizeIban(opts.iban)
  const name = sanitizeEpcBeneficiaryName(opts.beneficiaryName)
  const amount = Math.max(0, opts.amountEur).toFixed(2)
  const info = (opts.remittanceInfo || 'Betaling')
    .trim()
    .slice(0, 140)
    .replace(/[\r\n]+/g, ' ')
  const lines = [
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
    '',
  ]
  return `${lines.join('\n')}\n`
}
