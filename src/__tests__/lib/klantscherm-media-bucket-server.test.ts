import { KLANTSCHERM_MEDIA_BUCKET_MIME_TYPES } from '@/lib/klantscherm-media-bucket-server'

describe('klantscherm media bucket', () => {
  it('includes video/mp4 in allowed mime list', () => {
    expect(KLANTSCHERM_MEDIA_BUCKET_MIME_TYPES).toContain('video/mp4')
  })
})
