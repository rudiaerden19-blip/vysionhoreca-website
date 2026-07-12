import type { KassaCartItem } from '@/lib/kassa-cart-types'
import {
  computeBarBonDelta,
  hydrateBarBonWatermarksFromStore,
  loadBarBonWatermarks,
  seedBarBonWatermarkFromTableLines,
} from '@/lib/kassa-bar-bon-watermark'

const TENANT = 'test-tenant'

function line(productId: string, name: string, qty: number): KassaCartItem {
  return {
    cartKey: productId,
    quantity: qty,
    choices: [],
    product: {
      id: productId,
      name,
      price: 4,
    } as KassaCartItem['product'],
  }
}

describe('computeBarBonDelta (volledige tafelmand)', () => {
  it('tweede ronde print alleen nieuwe regels', () => {
    const smos = line('p1', 'Smos kaas', 1)
    const sprite = line('p2', 'Sprite', 1)

    const round1 = computeBarBonDelta([smos], {})
    expect(round1.deltaLines).toHaveLength(1)
    expect(round1.deltaLines[0].product.id).toBe('p1')
    expect(round1.deltaLines[0].quantity).toBe(1)
    expect(round1.nextWatermark).toEqual({ p1: 1 })

    const fullTable = [smos, sprite]
    const round2 = computeBarBonDelta(fullTable, round1.nextWatermark)
    expect(round2.deltaLines).toHaveLength(1)
    expect(round2.deltaLines[0].product.id).toBe('p2')
    expect(round2.deltaLines[0].quantity).toBe(1)
    expect(round2.nextWatermark).toEqual({ p1: 1, p2: 1 })
  })

  it('geen delta als tafel ongewijzigd t.o.v. watermerk', () => {
    const smos = line('p1', 'Smos kaas', 1)
    const wm = { p1: 1 }
    const result = computeBarBonDelta([smos], wm)
    expect(result.deltaLines).toHaveLength(0)
    expect(result.nextWatermark).toEqual({ p1: 1 })
  })
})

describe('seedBarBonWatermarkFromTableLines', () => {
  beforeEach(() => {
    hydrateBarBonWatermarksFromStore(TENANT, {})
  })

  it('vult watermerk voor bestaande tafelregels', () => {
    const smos = line('p1', 'Smos kaas', 1)
    seedBarBonWatermarkFromTableLines(TENANT, 'inside|1', [smos])

    const store = loadBarBonWatermarks(TENANT)
    expect(store['inside|1']).toEqual({ p1: 1 })
  })

  it('na seed print tweede ronde alleen nieuwe regel', () => {
    const smos = line('p1', 'Smos kaas', 1)
    const sprite = line('p2', 'Sprite', 1)
    seedBarBonWatermarkFromTableLines(TENANT, 'terrace|3', [smos])

    const prev = loadBarBonWatermarks(TENANT)['terrace|3'] ?? {}
    const { deltaLines } = computeBarBonDelta([smos, sprite], prev)
    expect(deltaLines).toHaveLength(1)
    expect(deltaLines[0].product.id).toBe('p2')
  })
})
