import { normalizeKassaJetonDenominations } from '@/lib/kassa-jeton-math'
import {
  isJetonSaleItemName,
  jetonDaySaleTotalEuro,
  jetonKassaWaardeEuro,
  jetonSomBreakdown,
  jetonOverviewSubmenuVisible,
  parseJetonDayAmount,
  sumJetonDaySales,
  summarizeJetonOverview,
} from '@/lib/kassa-jeton-overview'
import { buildHamburgerModules } from '@/lib/admin-hamburger-modules'

const denoms = normalizeKassaJetonDenominations(300, 50)

describe('jeton overview', () => {
  it('herkent een jeton-artikel en niet munt thee', () => {
    expect(isJetonSaleItemName('Jeton')).toBe(true)
    expect(isJetonSaleItemName('5 jetons')).toBe(true)
    expect(isJetonSaleItemName('Munt thee')).toBe(false)
    expect(isJetonSaleItemName('Espresso')).toBe(false)
  })

  it('telt verkoop cash en pin, en jetons die binnenkomen', () => {
    const result = summarizeJetonOverview(
      [
        {
          status: 'confirmed',
          payment_status: 'paid',
          payment_method: 'CASH',
          order_type: 'DINE_IN',
          total: 12,
          created_at: '2026-10-29T18:00:00.000Z',
          items: [
            { name: 'Jeton', quantity: 4, price: 3 },
            { name: 'Munt thee', quantity: 1, price: 3.5 },
          ],
        },
        {
          status: 'confirmed',
          payment_status: 'paid',
          payment_method: 'CARD',
          order_type: 'DINE_IN',
          total: 6,
          created_at: '2026-10-29T19:00:00.000Z',
          items: [{ name: 'Jetons', quantity: 2, price: 3 }],
        },
        {
          status: 'confirmed',
          payment_status: 'paid',
          payment_method: 'JETON',
          order_type: 'DINE_IN',
          total: 4.5,
          created_at: '2026-10-29T20:00:00.000Z',
          items: [{ name: 'Espresso', quantity: 1, price: 3 }],
        },
        {
          status: 'cancelled',
          payment_status: 'paid',
          payment_method: 'CASH',
          order_type: 'DINE_IN',
          total: 3,
          created_at: '2026-10-29T21:00:00.000Z',
          items: [{ name: 'Jeton', quantity: 1, price: 3 }],
        },
      ],
      '2026-10-29',
      '2026-10-29',
      denoms,
    )
    expect(result.totals.soldPieces).toBe(6)
    expect(result.totals.soldCashPieces).toBe(4)
    expect(result.totals.soldCashEuro).toBe(12)
    expect(result.totals.soldPinPieces).toBe(2)
    expect(result.totals.soldPinEuro).toBe(6)
    expect(result.totals.receivedReceipts).toBe(1)
    expect(result.totals.receivedEuro).toBe(4.5)
    expect(result.totals.receivedBlack).toBe(1)
    expect(result.totals.receivedWhite).toBe(3)
    expect(result.totals.receivedPieces).toBe(4)
  })

  it('houdt een bon na middernacht op de open shift', () => {
    const result = summarizeJetonOverview(
      [
        {
          status: 'confirmed',
          payment_status: 'paid',
          payment_method: 'JETON',
          order_type: 'DINE_IN',
          total: 3,
          created_at: '2026-10-29T23:10:00.000Z',
          items: [],
        },
      ],
      '2026-10-29',
      '2026-10-29',
      denoms,
      [],
      [{ reportDate: '2026-10-29', closedAt: null }],
    )
    expect(result.totals.receivedReceipts).toBe(1)
    expect(result.totals.receivedBlack).toBe(1)
    const next = summarizeJetonOverview(
      [
        {
          status: 'confirmed',
          payment_status: 'paid',
          payment_method: 'JETON',
          order_type: 'DINE_IN',
          total: 3,
          created_at: '2026-10-29T23:10:00.000Z',
          items: [],
        },
      ],
      '2026-10-30',
      '2026-10-30',
      denoms,
      [],
      [{ reportDate: '2026-10-29', closedAt: null }],
    )
    expect(next.totals.receivedReceipts).toBe(0)
  })

  it('staat alleen in het rapportenmenu van The Lagoon', () => {
    expect(jetonOverviewSubmenuVisible('demo-frituur', { rapporten: true })).toBe(false)
    expect(jetonOverviewSubmenuVisible('thelagoon', { rapporten: true })).toBe(true)
    expect(jetonOverviewSubmenuVisible('the-lagoon', { sm_rpt_jetons: false, rapporten: true })).toBe(false)
    const lagoon = buildHamburgerModules('/shop/thelagoon/admin', 'thelagoon')
    const other = buildHamburgerModules('/shop/demo-frituur/admin', 'demo-frituur')
    const ids = (mods: ReturnType<typeof buildHamburgerModules>) =>
      mods.flatMap((m) => m.items.map((item) => item.id))
    expect(ids(lagoon)).toContain('sm_rpt_jetons')
    expect(ids(other)).not.toContain('sm_rpt_jetons')
    const href = lagoon.flatMap((m) => m.items).find((item) => item.id === 'sm_rpt_jetons')?.href
    expect(href).toBe('/shop/thelagoon/admin/rapporten/jetons')
  })

  it('telt handmatig ingevulde verkoop: cash plus pin', () => {
    expect(parseJetonDayAmount('100,5')).toBe(100.5)
    expect(jetonDaySaleTotalEuro({ cashEuro: 100, pinEuro: 200 })).toBe(300)
    expect(
      sumJetonDaySales([
        { jetonsSold: 100, cashEuro: 100, pinEuro: 200 },
        { jetonsSold: 10, cashEuro: 30, pinEuro: 0 },
      ]),
    ).toEqual({ jetonsSold: 110, cashEuro: 130, pinEuro: 200, totalEuro: 330 })
  })

  it('kassa waarde is cash plus pin min de jetons', () => {
    expect(jetonKassaWaardeEuro(100, 100, 12)).toBe(188)
    expect(jetonKassaWaardeEuro(100, 100, 0)).toBe(200)
  })

  it('som van alleen cash en pin wordt zwart en wit', () => {
    expect(jetonSomBreakdown(0, 100, 100, denoms)).toEqual({ euro: 200, black: 66, white: 4 })
  })

  it('som telt jetons cash en pin om naar zwart en wit', () => {
    expect(jetonSomBreakdown(21, 100, 100, denoms)).toEqual({ euro: 221, black: 73, white: 4 })
  })
})
