/**
 * Controlled numeric fields: store number in state, keep partial input (12. / 3,5) while typing.
 */
export function isPartialNumberInput(raw: string, options?: { integer?: boolean }): boolean {
  const t = raw.trim().replace(/\s/g, '')
  if (t === '') return true
  if (options?.integer) return /^\d*$/.test(t)
  if (t === '-' || t === '.' || t === ',') return true
  if (t.includes(',') && t.includes('.')) return false
  const normalized = t.replace(',', '.')
  return /^-?\d*\.?\d*$/.test(normalized)
}

export function numberFieldDisplayValue(
  value: number,
  options?: { emptyWhenZero?: boolean },
): string {
  const emptyWhenZero = options?.emptyWhenZero !== false
  if (emptyWhenZero && value === 0) return ''
  return String(value)
}

export function parseNumberFieldValue(raw: string, options?: { integer?: boolean }): number {
  const trimmed = raw.trim().replace(/\s/g, '').replace(',', '.')
  if (trimmed === '' || trimmed === '-' || trimmed === '.') return 0
  const n = options?.integer ? parseInt(trimmed, 10) : parseFloat(trimmed)
  return Number.isNaN(n) ? 0 : n
}

/** Like numberFieldDisplayValue but empty when value equals `emptyWhen`. */
export function numberFieldDisplayUnless(value: number, emptyWhen: number): string {
  if (value === emptyWhen) return ''
  return String(value)
}

export function optionalNumberFieldDisplay(value: number | undefined | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return ''
  return String(value)
}

export function parseOptionalNumberFieldValue(raw: string, options?: { integer?: boolean }): number | undefined {
  const trimmed = raw.trim()
  if (trimmed === '') return undefined
  if (!isPartialNumberInput(trimmed, options)) return undefined
  const n = parseNumberFieldValue(trimmed, options)
  return Number.isNaN(n) ? undefined : n
}
