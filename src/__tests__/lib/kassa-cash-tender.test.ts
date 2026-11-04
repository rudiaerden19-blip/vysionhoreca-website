import {
  cashChangeDueEuro,
  isDonerKebabLaakdalCashTenderTenant,
  parseCashTenderInput,
} from '@/lib/kassa-cash-tender'

describe('kassa cash tender', () => {
  it('staat alleen aan voor donerkebablaakdal', () => {
    expect(isDonerKebabLaakdalCashTenderTenant('donerkebablaakdal')).toBe(true)
    expect(isDonerKebabLaakdalCashTenderTenant('DonerKebabLaakdal')).toBe(true)
    expect(isDonerKebabLaakdalCashTenderTenant('thelagoon')).toBe(false)
    expect(isDonerKebabLaakdalCashTenderTenant('drnerkebablaakdal')).toBe(false)
  })

  it('rekent wisselgeld uit het ontvangen cash', () => {
    expect(parseCashTenderInput('20,00')).toBe(20)
    expect(parseCashTenderInput('')).toBeNull()
    expect(cashChangeDueEuro(10.5, 20)).toBe(9.5)
    expect(cashChangeDueEuro(10.5, 10)).toBe(0)
    expect(cashChangeDueEuro(10.5, null)).toBe(0)
  })
})