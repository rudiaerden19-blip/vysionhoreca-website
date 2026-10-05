import {
  KASSA_HELP_VIDEO_TOPICS,
  findKassaHelpTopic,
  kassaHelpVideoPublicUrl,
} from '@/lib/kassa-help-video-catalog'

describe('kassa-help-video-catalog', () => {
  it('has eight help topics with at least one step each', () => {
    expect(KASSA_HELP_VIDEO_TOPICS).toHaveLength(8)
    for (const topic of KASSA_HELP_VIDEO_TOPICS) {
      expect(topic.id).toBeTruthy()
      expect(topic.titleKey.startsWith('kassaApp.helpVideoTopic')).toBe(true)
      expect(topic.steps.length).toBeGreaterThanOrEqual(1)
      for (const step of topic.steps) {
        expect(step.hintKey.startsWith('kassaApp.helpVideoHint')).toBe(true)
        expect(step.videoPath.startsWith('kassa-help/')).toBe(true)
      }
    }
  })

  it('findKassaHelpTopic resolves ids', () => {
    const first = KASSA_HELP_VIDEO_TOPICS[0]
    expect(findKassaHelpTopic(first.id)).toEqual(first)
    expect(findKassaHelpTopic('missing')).toBeUndefined()
  })

  it('kassaHelpVideoPublicUrl builds media URL', () => {
    const prev = process.env.NEXT_PUBLIC_SUPABASE_URL
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    expect(kassaHelpVideoPublicUrl('kassa-help/add-category/01.mp4')).toBe(
      'https://example.supabase.co/storage/v1/object/public/media/kassa-help/add-category/01.mp4',
    )
    process.env.NEXT_PUBLIC_SUPABASE_URL = prev
  })
})
