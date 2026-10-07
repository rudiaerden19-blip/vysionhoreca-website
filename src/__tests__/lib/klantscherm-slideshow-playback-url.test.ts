import { parseKlantschermPromoPublicStorageUrl } from '@/lib/klantscherm-promo-storage-parse'
import { klantschermSlideshowPlaybackUrl } from '@/lib/klantscherm-slideshow-playback-url'

describe('klantscherm slideshow playback url', () => {
  it('parses public storage klantscherm paths', () => {
    const ref = parseKlantschermPromoPublicStorageUrl(
      'https://abc.supabase.co/storage/v1/object/public/klantscherm-promo/demo/klantscherm/1.mp4',
    )
    expect(ref).toEqual({ bucket: 'klantscherm-promo', path: 'demo/klantscherm/1.mp4' })
  })

  it('rewrites tenant promo storage to stream api', () => {
    const out = klantschermSlideshowPlaybackUrl(
      'lomichillplay',
      'https://abc.supabase.co/storage/v1/object/public/klantscherm-promo/lomichillplay/klantscherm/9.mp4',
    )
    expect(out).toContain('/api/shop/lomichillplay/klantscherm/promo/stream')
    expect(out).toContain('path=lomichillplay%2Fklantscherm%2F9.mp4')
  })

  it('leaves external urls unchanged', () => {
    expect(klantschermSlideshowPlaybackUrl('demo', 'https://cdn.example.com/x.mp4')).toBe(
      'https://cdn.example.com/x.mp4',
    )
  })
})
