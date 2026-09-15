import {
  orderItemLineTotalEur,
  orderItemStripeUnitAmountEur,
} from '@/lib/order-items-display'

/** Zelfde cent-afronding als `create-checkout/route.ts`. */
function stripeUnitAmountCents(item: unknown): number {
  return Math.round(orderItemStripeUnitAmountEur(item) * 100)
}

function stripeLineTotalCents(item: { quantity?: number } & Record<string, unknown>): number {
  const q = item.quantity || 1
  return stripeUnitAmountCents(item) * q
}

/** Webshop checkout insert-vorm (`CheckoutPageClient`). */
function webshopOrderLine(input: {
  name: string
  price: number
  quantity: number
  unitTotal: number
  options?: { name: string; price: number }[]
  notes?: string
}) {
  return {
    product_id: 'pid',
    name: input.name,
    quantity: input.quantity,
    price: input.price,
    options: input.options,
    notes: input.notes,
    total_price: input.unitTotal * input.quantity,
  }
}

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
    expect(stripeUnitAmountCents(item)).toBe(1095)
  })

  it('zonder opties: zelfde als basisprijs (geen regressie)', () => {
    const item = { name: 'Friet', price: 4.5, quantity: 2, total_price: 9 }
    expect(orderItemStripeUnitAmountEur(item)).toBe(4.5)
    expect(stripeLineTotalCents(item)).toBe(900)
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

  it('meerdere opties op één product (maat + extra)', () => {
    const item = webshopOrderLine({
      name: 'Burger menu',
      price: 12,
      quantity: 1,
      unitTotal: 15.5,
      options: [
        { name: 'Large', price: 2 },
        { name: 'Extra kaas', price: 1.5 },
      ],
    })
    expect(orderItemLineTotalEur(item)).toBe(15.5)
    expect(orderItemStripeUnitAmountEur(item)).toBe(15.5)
    expect(stripeUnitAmountCents(item)).toBe(1550)
  })

  it('quantity > 1: Stripe unit = regeltotaal ÷ aantal', () => {
    const item = webshopOrderLine({
      name: 'Margherita',
      price: 8,
      quantity: 3,
      unitTotal: 11,
      options: [{ name: 'Medium', price: 3 }],
    })
    expect(orderItemLineTotalEur(item)).toBe(33)
    expect(orderItemStripeUnitAmountEur(item)).toBe(11)
    expect(stripeLineTotalCents(item)).toBe(3300)
  })

  it('gemengde mand: som Stripe-regels = subtotal (alle producttypes)', () => {
    const lines = [
      webshopOrderLine({ name: 'Cola', price: 2.5, quantity: 2, unitTotal: 2.5 }),
      webshopOrderLine({
        name: 'Pizza Quattro',
        price: 9.5,
        quantity: 1,
        unitTotal: 12.5,
        options: [{ name: 'Large', price: 3 }],
      }),
      webshopOrderLine({
        name: 'Salade',
        price: 6,
        quantity: 1,
        unitTotal: 7.25,
        options: [
          { name: 'Geitenkaas', price: 1.25 },
          { name: 'Geen ui', price: 0 },
        ],
      }),
    ]
    const subtotalEur = lines.reduce((s, l) => s + orderItemLineTotalEur(l), 0)
    const stripeCents = lines.reduce((s, l) => s + stripeLineTotalCents(l), 0)
    expect(subtotalEur).toBeCloseTo(24.75, 2)
    expect(stripeCents).toBe(2475)
  })

  it('promo-regel: total_price is leidend (niet basisprijs in price)', () => {
    const item = webshopOrderLine({
      name: 'Actie friet',
      price: 4.5,
      quantity: 2,
      unitTotal: 3.99,
    })
    expect(orderItemStripeUnitAmountEur(item)).toBe(3.99)
    expect(stripeLineTotalCents(item)).toBe(798)
  })

  it('kassa-vorm met choices blijft werken', () => {
    const item = {
      quantity: 2,
      product: { name: 'Cola', price: 2.5 },
      choices: [{ choiceName: 'Groot', price: 0.5 }],
    }
    expect(orderItemLineTotalEur(item)).toBe(6)
    expect(orderItemStripeUnitAmountEur(item)).toBe(3)
    expect(stripeLineTotalCents(item)).toBe(600)
  })

  it('cent-afronding per Stripe-regel (geen drift bij qty)', () => {
    const item = webshopOrderLine({
      name: 'Item',
      price: 1.99,
      quantity: 3,
      unitTotal: 1.99,
    })
    expect(stripeUnitAmountCents(item)).toBe(199)
    expect(stripeLineTotalCents(item)).toBe(597)
  })
})
