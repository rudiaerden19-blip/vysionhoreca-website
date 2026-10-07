import {
  KLANTSCHERM_MEDIA_BUCKET_MIME_TYPES,
  KLANTSCHERM_PROMO_VIDEO_FILE_SIZE_BYTES,
  klantschermPromoStorageSizeHint,
  klantschermPromoVideoBucketReady,
} from '@/lib/klantscherm-media-bucket-server'
import { KLANTSCHERM_PROMO_VIDEO_BUCKET_ID } from '@/lib/klantscherm-media-bucket-server'

describe('klantscherm media bucket', () => {
  it('includes video/mp4 in allowed mime list', () => {
    expect(KLANTSCHERM_MEDIA_BUCKET_MIME_TYPES).toContain('video/mp4')
  })

  it('uses dedicated promo video bucket id', () => {
    expect(KLANTSCHERM_PROMO_VIDEO_BUCKET_ID).toBe('klantscherm-promo')
  })

  it('accepts promo bucket after SQL-sized limit', () => {
    expect(
      klantschermPromoVideoBucketReady(KLANTSCHERM_PROMO_VIDEO_FILE_SIZE_BYTES, ['video/mp4']),
    ).toBe(true)
  })

  it('explains global storage limit on size errors', () => {
    const hint = klantschermPromoStorageSizeHint('The object exceeded the maximum allowed size')
    expect(hint).toContain('Global file size limit')
  })
})
