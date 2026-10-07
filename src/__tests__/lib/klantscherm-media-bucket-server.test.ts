import { KLANTSCHERM_MEDIA_BUCKET_MIME_TYPES } from '@/lib/klantscherm-media-bucket-server'
import { KLANTSCHERM_PROMO_VIDEO_BUCKET_ID } from '@/lib/klantscherm-slideshow-media'

describe('klantscherm media bucket', () => {
  it('includes video/mp4 in allowed mime list', () => {
    expect(KLANTSCHERM_MEDIA_BUCKET_MIME_TYPES).toContain('video/mp4')
  })

  it('uses dedicated promo video bucket id', () => {
    expect(KLANTSCHERM_PROMO_VIDEO_BUCKET_ID).toBe('klantscherm-promo')
  })
})
