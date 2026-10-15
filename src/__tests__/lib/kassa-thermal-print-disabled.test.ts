import { isKassaThermalPrintDisabled } from '@/lib/kassa-thermal-print-disabled'

describe('kassa-thermal-print-disabled', () => {
  it('is false when unset or false', () => {
    expect(isKassaThermalPrintDisabled(null)).toBe(false)
    expect(isKassaThermalPrintDisabled({})).toBe(false)
    expect(isKassaThermalPrintDisabled({ kassa_thermal_print_disabled: false })).toBe(false)
  })

  it('is true only when explicitly true', () => {
    expect(isKassaThermalPrintDisabled({ kassa_thermal_print_disabled: true })).toBe(true)
  })
})
