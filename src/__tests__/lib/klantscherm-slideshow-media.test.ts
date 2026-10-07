import {
  detectKlantschermUploadMediaType,
  inferKlantschermMediaTypeFromUrl,
  validateKlantschermPromoFile,
} from '@/lib/klantscherm-slideshow-media'
import { parseKlantschermSlideshowUploads } from '@/lib/klantscherm-slideshow-server'

describe('klantscherm slideshow media', () => {
  it('infers video from mp4 url', () => {
    expect(inferKlantschermMediaTypeFromUrl('https://x.com/a/promo.mp4')).toBe('video')
    expect(inferKlantschermMediaTypeFromUrl('https://x.com/a/promo.jpg')).toBe('image')
  })

  it('detects mp4 file type', () => {
    const f = new File(['x'], 'clip.mp4', { type: 'video/mp4' })
    expect(detectKlantschermUploadMediaType(f)).toBe('video')
    expect(validateKlantschermPromoFile(f)).toEqual({ ok: true, mediaType: 'video' })
  })

  it('parses uploads with mediaType', () => {
    const rows = parseKlantschermSlideshowUploads([
      { url: 'https://cdn/a.mp4', sort: 0 },
      { url: 'https://cdn/b.png', sort: 1, mediaType: 'image' },
    ])
    expect(rows[0]?.mediaType).toBe('video')
    expect(rows[1]?.mediaType).toBe('image')
  })
})
