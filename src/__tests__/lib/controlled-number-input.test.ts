import {
  isPartialNumberInput,
  normalizeEuropeanNumberInput,
  parseNumberFieldValue,
} from '@/lib/controlled-number-input'

describe('normalizeEuropeanNumberInput', () => {
  it('accepts BE thousand dots + decimal comma', () => {
    expect(normalizeEuropeanNumberInput('1.234,56')).toBe('1234.56')
    expect(normalizeEuropeanNumberInput('1.234,')).toBe('1234.')
  })

  it('accepts comma-only decimals', () => {
    expect(normalizeEuropeanNumberInput('12,50')).toBe('12.50')
    expect(normalizeEuropeanNumberInput(',')).toBe('.')
  })

  it('accepts single dot decimals', () => {
    expect(normalizeEuropeanNumberInput('12.50')).toBe('12.50')
  })
})

describe('isPartialNumberInput', () => {
  it('allows partial EU amounts while typing', () => {
    expect(isPartialNumberInput('1.234,5')).toBe(true)
    expect(isPartialNumberInput('1.234,')).toBe(true)
    expect(isPartialNumberInput('12,')).toBe(true)
    expect(isPartialNumberInput('.')).toBe(true)
    expect(isPartialNumberInput(',')).toBe(true)
  })

  it('rejects garbage', () => {
    expect(isPartialNumberInput('12a')).toBe(false)
    expect(isPartialNumberInput('1,2,3')).toBe(false)
  })
})

describe('parseNumberFieldValue', () => {
  it('parses BE formatted amounts', () => {
    expect(parseNumberFieldValue('1.234,56')).toBe(1234.56)
    expect(parseNumberFieldValue('12,5')).toBe(12.5)
    expect(parseNumberFieldValue('12.5')).toBe(12.5)
  })
})
