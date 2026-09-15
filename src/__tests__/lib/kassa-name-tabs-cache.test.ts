import { adminDb } from '@/lib/admin-db-client'
import type { KassaNameTabRow } from '@/lib/kassa-name-account'
import {
  fetchKassaNameTabs,
  invalidateKassaNameTabsCache,
  setCachedKassaNameTabs,
} from '@/lib/kassa-name-tabs-cache'

jest.mock('@/lib/admin-db-client', () => ({
  adminDb: {
    select: jest.fn(),
  },
}))

const tenant = 'cafemarquise'

function tab(id: string, name: string): KassaNameTabRow {
  return {
    id,
    tenant_slug: tenant,
    customer_name: name,
    customer_key: name.toLowerCase(),
    items: [
      {
        cartKey: 'p',
        quantity: 1,
        product: { id: 'p', name: 'x', price: 10 } as KassaNameTabRow['items'][0]['product'],
        unpaidIncl: 10,
      },
    ],
    updated_at: new Date().toISOString(),
  }
}

describe('kassa-name-tabs-cache', () => {
  beforeEach(() => {
    invalidateKassaNameTabsCache(tenant)
    jest.clearAllMocks()
  })

  it('DB-fout zonder cache → lege lijst, ok false', async () => {
    ;(adminDb.select as jest.Mock).mockResolvedValue({ ok: false, error: 'boom' })
    const res = await fetchKassaNameTabs(tenant, { force: true })
    expect(res.ok).toBe(false)
    expect(res.tabs).toEqual([])
  })

  it('DB-fout met cache → lijst uit cache, ok true', async () => {
    setCachedKassaNameTabs(tenant, [tab('1', 'Rudi')])
    ;(adminDb.select as jest.Mock).mockResolvedValue({ ok: false, error: 'boom' })
    const res = await fetchKassaNameTabs(tenant, { force: true })
    expect(res.ok).toBe(true)
    expect(res.fromCache).toBe(true)
    expect(res.tabs).toHaveLength(1)
    expect(res.tabs[0].customer_name).toBe('Rudi')
  })

  it('parallelle requests delen inflight — fout gooit niet unhandled', async () => {
    ;(adminDb.select as jest.Mock).mockResolvedValue({ ok: false, error: 'column order_type does not exist' })
    const [a, b] = await Promise.all([
      fetchKassaNameTabs(tenant, { force: true }),
      fetchKassaNameTabs(tenant, { force: true }),
    ])
    expect(a.ok).toBe(false)
    expect(b.ok).toBe(false)
    expect(a.tabs).toEqual([])
    expect(b.tabs).toEqual([])
  })

  it('select zonder kolomlijst (geen select-optie)', async () => {
    ;(adminDb.select as jest.Mock).mockResolvedValue({ ok: true, data: [tab('2', 'Bart')] })
    await fetchKassaNameTabs(tenant, { force: true })
    expect(adminDb.select).toHaveBeenCalledWith(
      'kassa_name_tabs',
      expect.not.objectContaining({ select: expect.anything() }),
    )
  })
})
