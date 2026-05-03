import { mergeOfflineOrderQueueRows } from '@/lib/kassa-offline-order-queue-merge'

describe('mergeOfflineOrderQueueRows', () => {
  it('returns empty for empty inputs', () => {
    expect(mergeOfflineOrderQueueRows([], [])).toEqual([])
  })

  it('dedupes by kassa_client_uuid; IDB pass wins after LS', () => {
    const ls = [{ kassa_client_uuid: 'a', total: 1 }]
    const idb = [{ kassa_client_uuid: 'a', total: 2 }]
    expect(mergeOfflineOrderQueueRows(ls as object[], idb as object[])).toEqual([
      { kassa_client_uuid: 'a', total: 2 },
    ])
  })

  it('uses LS-only uuid row when IDB has different uuid', () => {
    const ls = [{ kassa_client_uuid: 'x', n: 1 }]
    const idb = [{ kassa_client_uuid: 'y', n: 2 }]
    const merged = mergeOfflineOrderQueueRows(ls as object[], idb as object[])
    expect(merged).toHaveLength(2)
  })

  it('dedupes legacy numeric order_number', () => {
    const ls = [{ order_number: 5, x: 1 }]
    const idb = [{ order_number: 5, x: 2 }]
    expect(mergeOfflineOrderQueueRows(ls as object[], idb as object[])).toEqual([{ order_number: 5, x: 2 }])
  })

  it('uses fallback key for rows without uuid or numeric order_number', () => {
    const a = { created_at: '2026-01-01', total: 10 }
    const b = { created_at: '2026-01-02', total: 20 }
    expect(mergeOfflineOrderQueueRows([a], [b] as object[])).toHaveLength(2)
  })
})
