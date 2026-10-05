/** Platform-brede help-onderwerpen voor kassa (video’s in Supabase Storage bucket `media`). */

export type KassaHelpVideoStep = {
  /** i18n key (dot path under messages) */
  hintKey: string
  /** Pad in bucket `media`, zonder leading slash */
  videoPath: string
}

export type KassaHelpVideoTopic = {
  id: string
  /** i18n key voor titel */
  titleKey: string
  steps: KassaHelpVideoStep[]
}

const FOLLOW_VIDEO_HINT = 'kassaApp.helpVideoHintFollowVideo'

function topicSteps(
  folder: string,
  count: number,
  hintKeys: string[],
): KassaHelpVideoStep[] {
  return Array.from({ length: count }, (_, i) => ({
    videoPath: `kassa-help/${folder}/${String(i + 1).padStart(2, '0')}.mp4`,
    hintKey: hintKeys[i] ?? FOLLOW_VIDEO_HINT,
  }))
}

export const KASSA_HELP_VIDEO_TOPICS: KassaHelpVideoTopic[] = [
  {
    id: 'add-category',
    titleKey: 'kassaApp.helpVideoTopicAddCategory',
    steps: topicSteps('add-category', 5, [
      'kassaApp.helpVideoHintAddCategory1',
      'kassaApp.helpVideoHintAddCategory2',
    ]),
  },
  {
    id: 'add-product',
    titleKey: 'kassaApp.helpVideoTopicAddProduct',
    steps: topicSteps('add-product', 5, [
      'kassaApp.helpVideoHintAddProduct1',
      'kassaApp.helpVideoHintAddProduct2',
    ]),
  },
  {
    id: 'options-extras',
    titleKey: 'kassaApp.helpVideoTopicOptionsExtras',
    steps: topicSteps('options-extras', 5, [
      'kassaApp.helpVideoHintOptionsExtras1',
      'kassaApp.helpVideoHintOptionsExtras2',
    ]),
  },
  {
    id: 'pincode',
    titleKey: 'kassaApp.helpVideoTopicPincode',
    steps: topicSteps('pincode', 1, ['kassaApp.helpVideoHintPincode1']),
  },
  {
    id: 'inventory',
    titleKey: 'kassaApp.helpVideoTopicInventory',
    steps: topicSteps('inventory', 2, [
      'kassaApp.helpVideoHintInventory1',
      'kassaApp.helpVideoHintInventory2',
    ]),
  },
  {
    id: 'online-toggle',
    titleKey: 'kassaApp.helpVideoTopicOnlineToggle',
    steps: topicSteps('online-toggle', 2, [
      'kassaApp.helpVideoHintOnlineToggle1',
      'kassaApp.helpVideoHintOnlineToggle2',
    ]),
  },
  {
    id: 'rewards',
    titleKey: 'kassaApp.helpVideoTopicRewards',
    steps: topicSteps('rewards', 1, ['kassaApp.helpVideoHintRewards1']),
  },
  {
    id: 'reports',
    titleKey: 'kassaApp.helpVideoTopicReports',
    steps: topicSteps('reports', 1, ['kassaApp.helpVideoHintReports1']),
  },
]

export function kassaHelpVideoPublicUrl(storagePath: string): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
  const path = storagePath.replace(/^\//, '')
  if (!base || !path) return null
  return `${base}/storage/v1/object/public/media/${path}`
}

export function findKassaHelpTopic(topicId: string): KassaHelpVideoTopic | undefined {
  return KASSA_HELP_VIDEO_TOPICS.find((t) => t.id === topicId)
}
