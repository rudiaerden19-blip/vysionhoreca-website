/**
 * Controlled type="number" fields: showing 0 blocks typing "10" (becomes "010").
 * Use empty display for zero and parse raw string on change.
 */
export function numberFieldDisplayValue(
  value: number,
  options?: { emptyWhenZero?: boolean },
): string {
  const emptyWhenZero = options?.emptyWhenZero !== false
  if (emptyWhenZero && value === 0) return ''
  return String(value)
}

export function parseNumberFieldValue(
  raw: string,
  options?: { integer?: boolean },
): number {
  const trimmed = raw.trim()
  if (trimmed === '' || trimmed === '-' || trimmed === '.') return 0
  const n = options?.integer ? parseInt(trimmed, 10) : parseFloat(trimmed)
  return Number.isNaN(n) ? 0 : n
}

/** Like numberFieldDisplayValue but empty when value equals `emptyWhen`. */
export function numberFieldDisplayUnless(
  value: number,
  emptyWhen: number,
): string {
  if (value === emptyWhen) return ''
  return String(value)
}
