import {
  KASSA_THERMAL_LINE_WIDTH,
  formatKassaThermalPriceRow,
} from '@/lib/kassa-thermal-receipt-line'

describe('formatKassaThermalPriceRow', () => {
  it('houdt het product links en schuift EUR + prijs naar rechts', () => {
    const line = formatKassaThermalPriceRow('1x Chips', 2)
    expect(line.startsWith('1x Chips')).toBe(true)
    expect(line.endsWith('EUR 2.00')).toBe(true)
    expect(line).toHaveLength(KASSA_THERMAL_LINE_WIDTH)
    expect(line.indexOf('EUR 2.00')).toBe(KASSA_THERMAL_LINE_WIDTH - 'EUR 2.00'.length)
    expect(line).toContain('...')
  })

  it('houdt 2x Appeltaart en het bedrag op één regel van 42', () => {
    const line = formatKassaThermalPriceRow('2x Appeltaart', 7)
    expect(line).toHaveLength(42)
    expect(line.startsWith('2x Appeltaart')).toBe(true)
    expect(line.endsWith('EUR 7.00')).toBe(true)
    expect(line.includes('\n')).toBe(false)
  })

  it('kapt een te lange naam af zodat de prijs op de regel blijft', () => {
    const line = formatKassaThermalPriceRow('1x Superlange productnaam extra', 12.5)
    expect(line.endsWith('EUR 12.50')).toBe(true)
    expect(line).toHaveLength(KASSA_THERMAL_LINE_WIDTH)
    expect(line.startsWith('1x Superlange')).toBe(true)
  })
})
