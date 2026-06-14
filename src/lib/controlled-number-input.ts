/**
 * Controlled numeric fields: store number in state, keep partial input (12. / 3,5 / 1.234,) while typing.
 * BE/EU: thousand dots + decimal comma (1.234,56).
 */

/** Normalise partial or complete user input naar een enkel decimaalteken (punt). */
export function normalizeEuropeanNumberInput(raw: string): string {
  const t = raw.trim().replace(/\s/g, '')
  if (t === '' || t === '-') return t
  if (t === '.' || t === ',') return '.'

  const hasComma = t.includes(',')

  if (hasComma) {
    const lastComma = t.lastIndexOf(',')
    const intPart = t.slice(0, lastComma).replace(/\./g, '')
    const fracPart = t.slice(lastComma + 1)
    return `${intPart}.${fracPart}`
  }

  const dotCount = (t.match(/\./g) || []).length
  if (dotCount > 1) {
    return t.replace(/\./g, '')
  }

  return t
}

export function isPartialNumberInput(raw: string, options?: { integer?: boolean }): boolean {
  const t = raw.trim().replace(/\s/g, '')
  if (t === '') return true
  if (options?.integer) return /^\d*$/.test(t)
  if (t === '-' || t === '.' || t === ',') return true
  const normalized = normalizeEuropeanNumberInput(t)
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
  const trimmed = raw.trim().replace(/\s/g, '')
  if (trimmed === '' || trimmed === '-' || trimmed === '.' || trimmed === ',') return 0
  if (options?.integer) {
    const digits = trimmed.replace(/\./g, '').replace(/,/g, '')
    const n = parseInt(digits, 10)
    return Number.isNaN(n) ? 0 : n
  }
  const normalized = normalizeEuropeanNumberInput(trimmed)
  if (normalized === '' || normalized === '-' || normalized === '.') return 0
  const n = parseFloat(normalized)
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
