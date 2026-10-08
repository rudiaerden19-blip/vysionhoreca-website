import {
  KASSA_HELP_VIDEO_TOPICS,
  KASSA_HELP_VIDEO_ASSET_VERSION,
  KASSA_HELP_VIDEO_STORAGE_BUCKET,
  findKassaHelpTopic,
  kassaHelpVideoPublicUrl,
} from '@/lib/kassa-help-video-catalog'

describe('kassa-help-video-catalog', () => {
  it('has sixteen help topics with at least one step each', () => {
    expect(KASSA_HELP_VIDEO_TOPICS).toHaveLength(16)
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

  it('pincode and inventory match Desktop file order', () => {
    expect(findKassaHelpTopic('pincode')?.steps.map((s) => s.videoPath)).toEqual([
      'kassa-help/pincode/01.mp4',
    ])
    expect(findKassaHelpTopic('inventory')?.steps.map((s) => s.videoPath)).toEqual([
      'kassa-help/inventory/01.mp4',
      'kassa-help/inventory/02.mp4',
    ])
  })

  it('reports uses Desktop raportages.mp4 as 01.mp4', () => {
    const topic = findKassaHelpTopic('reports')
    expect(topic?.steps.map((s) => s.videoPath)).toEqual(['kassa-help/reports/01.mp4'])
  })

  it('rewards uses single Desktop video 1.mp4 as 01.mp4', () => {
    const topic = findKassaHelpTopic('rewards')
    expect(topic?.steps.map((s) => s.videoPath)).toEqual(['kassa-help/rewards/01.mp4'])
  })

  it('online-toggle videos stay in Desktop order (1.mp4 then 2.mp4)', () => {
    const topic = findKassaHelpTopic('online-toggle')
    expect(topic?.steps.map((s) => s.videoPath)).toEqual([
      'kassa-help/online-toggle/01.mp4',
      'kassa-help/online-toggle/02.mp4',
    ])
  })

  it('options-extras videos stay in Desktop order (1.mp4 through 5.mp4)', () => {
    const topic = findKassaHelpTopic('options-extras')
    expect(topic?.steps.map((s) => s.videoPath)).toEqual([
      'kassa-help/options-extras/01.mp4',
      'kassa-help/options-extras/02.mp4',
      'kassa-help/options-extras/03.mp4',
      'kassa-help/options-extras/04.mp4',
      'kassa-help/options-extras/05.mp4',
    ])
  })

  it('add-product videos stay in Desktop order (1.mp4 through 5.mp4)', () => {
    const topic = findKassaHelpTopic('add-product')
    expect(topic?.steps.map((s) => s.videoPath)).toEqual([
      'kassa-help/add-product/01.mp4',
      'kassa-help/add-product/02.mp4',
      'kassa-help/add-product/03.mp4',
      'kassa-help/add-product/04.mp4',
      'kassa-help/add-product/05.mp4',
    ])
  })

  it('add-category videos stay in Desktop source order (intro then 2–5)', () => {
    const topic = findKassaHelpTopic('add-category')
    expect(topic?.steps.map((s) => s.videoPath)).toEqual([
      'kassa-help/add-category/01.mp4',
      'kassa-help/add-category/02.mp4',
      'kassa-help/add-category/03.mp4',
      'kassa-help/add-category/04.mp4',
      'kassa-help/add-category/05.mp4',
    ])
  })

  it('admin setup topics each use one Desktop clip as 01.mp4', () => {
    for (const id of [
      'business-profile',
      'opening-hours',
      'delivery-pickup',
      'colors-design',
      'reviews-approve',
      'qr-codes',
      'cashbook',
      'z-reports',
    ]) {
      expect(findKassaHelpTopic(id)?.steps.map((s) => s.videoPath)).toEqual([
        `kassa-help/${id}/01.mp4`,
      ])
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
      `https://example.supabase.co/storage/v1/object/public/${KASSA_HELP_VIDEO_STORAGE_BUCKET}/add-category/01.mp4?v=${KASSA_HELP_VIDEO_ASSET_VERSION}`,
    )
    process.env.NEXT_PUBLIC_SUPABASE_URL = prev
  })
})
