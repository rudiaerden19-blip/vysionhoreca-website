import { readKlantschermPromoSettingsRow as fetchKlantschermPromoSettingsRow } from '@/lib/klantscherm-promo-settings-server'

describe('fetchKlantschermPromoSettingsRow', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('haalt promo-json op via PostgREST', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          klantscherm_enabled: true,
          klantscherm_custom_promos: [{ url: 'https://cdn/a.jpg', sort: 0, title: 'A' }],
          klantscherm_slideshow_uploads: [{ url: 'https://cdn/a.jpg', sort: 0, mediaType: 'image' }],
        },
      ],
    }) as typeof fetch

    const row = await fetchKlantschermPromoSettingsRow('demo-zaak')
    expect(row?.klantscherm_enabled).toBe(true)
    expect(Array.isArray(row?.klantscherm_custom_promos)).toBe(true)
    expect((row?.klantscherm_custom_promos as unknown[]).length).toBe(1)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/rest/v1/tenant_settings?tenant_slug=eq.demo-zaak'),
      expect.objectContaining({ cache: 'no-store' }),
    )
  })

  it('lege slug → geen fetch', async () => {
    global.fetch = jest.fn() as typeof fetch
    await expect(fetchKlantschermPromoSettingsRow('  ')).resolves.toBeNull()
    expect(global.fetch).not.toHaveBeenCalled()
  })
})
