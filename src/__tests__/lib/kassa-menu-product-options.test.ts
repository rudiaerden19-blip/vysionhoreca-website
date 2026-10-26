import {
  mergeProductIdsWithOptions,
  productIdsWithActiveOptionsFromMap,
  readCachedProductOptions,
  shouldFetchProductOptionsFallback,
} from '@/lib/kassa-menu-product-options'
import type { ProductOption } from '@/lib/admin-api'

describe('kassa-menu-product-options', () => {
  it('mergeProductIdsWithOptions unions link list and map ids', () => {
    expect(mergeProductIdsWithOptions(['a', 'b'], ['b', 'c'])).toEqual(['a', 'b', 'c'])
  })

  it('productIdsWithActiveOptionsFromMap ignores empty arrays', () => {
    const map: Record<string, ProductOption[]> = {
      p1: [{ tenant_slug: 't', name: 'Saus', type: 'single', required: false, sort_order: 0, is_active: true }],
      p2: [],
    }
    expect(productIdsWithActiveOptionsFromMap(map)).toEqual(['p1'])
  })

  it('readCachedProductOptions distinguishes missing vs empty', () => {
    expect(readCachedProductOptions('x', {})).toBeNull()
    expect(readCachedProductOptions('x', { x: [] })).toEqual([])
  })

  it('shouldFetchProductOptionsFallback uses network when cache miss or empty with known link', () => {
    const set = new Set(['p1'])
    expect(shouldFetchProductOptionsFallback(null, 'p1', set)).toBe(true)
    expect(shouldFetchProductOptionsFallback([], 'p1', set)).toBe(true)
    expect(shouldFetchProductOptionsFallback([], 'p2', set)).toBe(false)
    expect(shouldFetchProductOptionsFallback([{ tenant_slug: 't', name: 'A', type: 'single', required: false, sort_order: 0, is_active: true }], 'p1', set)).toBe(false)
  })
})
