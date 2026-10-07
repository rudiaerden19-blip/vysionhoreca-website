import { klantschermPromoSlidesFromStorage } from '@/lib/klantscherm-slideshow-storage-fallback'

describe('klantscherm slideshow storage fallback', () => {
  it('returns empty without supabase list', async () => {
    const supabase = {
      storage: {
        from: () => ({
          list: async () => ({ data: null, error: { message: 'nope' } }),
          getPublicUrl: () => ({ data: { publicUrl: '' } }),
        }),
      },
    } as never
    await expect(klantschermPromoSlidesFromStorage(supabase, 'demo')).resolves.toEqual([])
  })

  it('maps image objects to slides', async () => {
    const supabase = {
      storage: {
        from: () => ({
          list: async () => ({
            data: [{ name: '1730000000.jpg' }, { name: 'skip.txt' }],
            error: null,
          }),
          getPublicUrl: (path: string) => ({
            data: { publicUrl: `https://cdn.example/${path}` },
          }),
        }),
      },
    } as never
    const slides = await klantschermPromoSlidesFromStorage(supabase, 'frituur-x')
    expect(slides).toHaveLength(1)
    expect(slides[0]?.url).toContain('frituur-x/klantscherm')
    expect(slides[0]?.type).toBe('image')
  })
})
