import {
  filterCartLinesForLagoonKitchen,
  filterLagoonKitchenQueueOrder,
  filterOrderItemsForLagoonKitchen,
  isLagoonKitchenMenuCategoryName,
  isLagoonKitchenScreenTenant,
} from '@/lib/lagoon-kitchen-screen'

describe('lagoon-kitchen-screen', () => {
  const ctx = {
    categoryNameById: new Map([
      ['c1', 'Cocktails'],
      ['c2', 'Mocktails'],
      ['c3', 'Snacks'],
      ['c4', 'Burgers'],
    ]),
    productCategoryByProductId: new Map([
      ['p-cock', 'c1'],
      ['p-mock', 'c2'],
      ['p-snack', 'c3'],
      ['p-burger', 'c4'],
    ]),
  }

  it('only thelagoon tenant uses lagoon kitchen filter', () => {
    expect(isLagoonKitchenScreenTenant('thelagoon')).toBe(true)
    expect(isLagoonKitchenScreenTenant('demo-frituur')).toBe(false)
  })

  it('matches cocktail and mocktail category names', () => {
    expect(isLagoonKitchenMenuCategoryName('Cocktails')).toBe(true)
    expect(isLagoonKitchenMenuCategoryName('Virgin Mocktails')).toBe(true)
    expect(isLagoonKitchenMenuCategoryName('Snacks')).toBe(false)
    expect(isLagoonKitchenMenuCategoryName('Burgers')).toBe(false)
  })

  it('filters order lines by category', () => {
    const items = [
      { quantity: 1, product: { category_id: 'c1', name: 'Mojito' } },
      { quantity: 2, product_id: 'p-snack', name: 'Friet' },
      { quantity: 1, product_id: 'p-mock', name: 'Nojito' },
    ]
    const out = filterOrderItemsForLagoonKitchen(items, ctx)
    expect(out).toHaveLength(2)
    expect(
      out.map((l) => {
        const row = l as { name?: string; product?: { name?: string } }
        return row.name ?? row.product?.name
      }),
    ).toEqual(['Mojito', 'Nojito'])
  })

  it('drops queue orders with only snacks for lagoon', () => {
    const order = {
      id: 'x',
      items: [{ quantity: 1, product_id: 'p-burger', name: 'Cheese' }],
    }
    expect(filterLagoonKitchenQueueOrder('thelagoon', order, ctx)).toBeNull()
    expect(filterLagoonKitchenQueueOrder('other-tenant', order, ctx)).toEqual(order)
  })

  it('filters kassa cart lines with category list', () => {
    const categories = [
      { id: 'c1', name: 'Cocktails' },
      { id: 'c3', name: 'Snacks' },
    ]
    const lines = [
      { quantity: 1, product: { category_id: 'c1', name: 'A', price: 10 } },
      { quantity: 1, product: { category_id: 'c3', name: 'B', price: 5 } },
    ]
    const out = filterCartLinesForLagoonKitchen(lines, categories)
    expect(out).toHaveLength(1)
    expect(out[0].product.name).toBe('A')
  })
})
