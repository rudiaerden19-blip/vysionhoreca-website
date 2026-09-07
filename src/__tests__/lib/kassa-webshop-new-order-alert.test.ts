import {
  buildKassaNewOrderAlert,
  resolveKassaStartupOrderAlert,
} from '@/lib/kassa-webshop-new-order-alert'

describe('kassa-webshop-new-order-alert', () => {
  it('bouwt het oranje-scherm payload', () => {
    expect(
      buildKassaNewOrderAlert({ id: 'o1', order_number: 12, total: 24.5 }),
    ).toEqual({ id: 'o1', orderNumber: 12, total: 24.5 })
  })

  it('toont bij opstarten de nieuwste wachtende webshop-order', () => {
    expect(
      resolveKassaStartupOrderAlert([
        { id: 'nieuw', order_number: 9, total: 10 },
        { id: 'ouder', order_number: 8, total: 5 },
      ]),
    ).toEqual({ id: 'nieuw', orderNumber: 9, total: 10 })
  })

  it('geen oranje scherm als er geen wachtende webshop-new is', () => {
    expect(resolveKassaStartupOrderAlert([])).toBeNull()
  })
})
