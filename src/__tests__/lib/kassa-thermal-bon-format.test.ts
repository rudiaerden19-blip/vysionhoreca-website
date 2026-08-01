import {
  KASSA_THERMAL_RECEIPT_W,
  kassaThermalItemLine,
  kassaThermalPadMoney,
  kassaThermalVatLine,
} from '@/lib/kassa-thermal-bon-format'

describe('kassaThermalBonFormat', () => {
  it('zet prijs rechts op vaste bonbreedte', () => {
    const line = kassaThermalItemLine(1, 'Glas rose wijn', 7)
    expect(line.length).toBeLessThanOrEqual(KASSA_THERMAL_RECEIPT_W)
    expect(line.endsWith('EUR 7.00')).toBe(true)
    expect(line.startsWith('1x ')).toBe(true)
  })

  it('BTW-regel zonder haakjes (Print Agent-safe)', () => {
    const line = kassaThermalVatLine(21, 3.55)
    expect(line.includes('Tarief 21%')).toBe(true)
    expect(line.includes('BTW (21%)')).toBe(false)
  })
})
