import {
  orderItemLineTotalEur,
  orderItemStripeUnitAmountEur,
} from '@/lib/order-items-display'

describe('orderItemStripeUnitAmountEur', () => {
  it('webshop: maat/optie zit in Stripe-unit (pizza2018-achtig)', () => {
    const item = {
      name: 'BBQ Chicken',
      price: 7.95,
      quantity: 1,
      options: [{ name: 'Large', price: 3 }],
      total_price: 10.95,
    }
    expect(orderItemLineTotalEur(item)).toBe(10.95)
    expect(orderItemStripeUnitAmountEur(item)).toBe(10.95)
  })

  it('zonder opties: zelfde als basisprijs (geen regressie)', () => {
    const item = { name: 'Friet', price: 4.5, quantity: 2, total_price: 9 }
    expect(orderItemStripeUnitAmountEur(item)).toBe(4.5)
  })

  it('fallback: basisprijs + opties als total_price ontbreekt', () => {
    const item = {
      name: 'Pizza',
      price: 7.3,
      quantity: 1,
      options: [{ name: 'Large', price: 3.4 }],
    }
    expect(orderItemStripeUnitAmountEur(item)).toBeCloseTo(10.7, 2)
  })

  it('kassa-vorm met choices blijft werken', () => {
    const item = {
      quantity: 1,
      product: { name: 'Cola', price: 2.5 },
      choices: [{ choiceName: 'Groot', price: 0.5 }],
    }
    expect(orderItemStripeUnitAmountEur(item)).toBe(3)
  })
})
