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

export const KASSA_HELP_VIDEO_TOPICS: KassaHelpVideoTopic[] = [
  {
    id: 'add-category',
    titleKey: 'kassaApp.helpVideoTopicAddCategory',
    steps: [
      {
        hintKey: 'kassaApp.helpVideoHintAddCategory1',
        videoPath: 'kassa-help/add-category/01.mp4',
      },
      {
        hintKey: 'kassaApp.helpVideoHintAddCategory2',
        videoPath: 'kassa-help/add-category/02.mp4',
      },
    ],
  },
  {
    id: 'add-product',
    titleKey: 'kassaApp.helpVideoTopicAddProduct',
    steps: [
      {
        hintKey: 'kassaApp.helpVideoHintAddProduct1',
        videoPath: 'kassa-help/add-product/01.mp4',
      },
      {
        hintKey: 'kassaApp.helpVideoHintAddProduct2',
        videoPath: 'kassa-help/add-product/02.mp4',
      },
    ],
  },
  {
    id: 'options-extras',
    titleKey: 'kassaApp.helpVideoTopicOptionsExtras',
    steps: [
      {
        hintKey: 'kassaApp.helpVideoHintOptionsExtras1',
        videoPath: 'kassa-help/options-extras/01.mp4',
      },
      {
        hintKey: 'kassaApp.helpVideoHintOptionsExtras2',
        videoPath: 'kassa-help/options-extras/02.mp4',
      },
    ],
  },
  {
    id: 'pincode',
    titleKey: 'kassaApp.helpVideoTopicPincode',
    steps: [
      {
        hintKey: 'kassaApp.helpVideoHintPincode1',
        videoPath: 'kassa-help/pincode/01.mp4',
      },
      {
        hintKey: 'kassaApp.helpVideoHintPincode2',
        videoPath: 'kassa-help/pincode/02.mp4',
      },
    ],
  },
  {
    id: 'inventory',
    titleKey: 'kassaApp.helpVideoTopicInventory',
    steps: [
      {
        hintKey: 'kassaApp.helpVideoHintInventory1',
        videoPath: 'kassa-help/inventory/01.mp4',
      },
      {
        hintKey: 'kassaApp.helpVideoHintInventory2',
        videoPath: 'kassa-help/inventory/02.mp4',
      },
    ],
  },
  {
    id: 'online-toggle',
    titleKey: 'kassaApp.helpVideoTopicOnlineToggle',
    steps: [
      {
        hintKey: 'kassaApp.helpVideoHintOnlineToggle1',
        videoPath: 'kassa-help/online-toggle/01.mp4',
      },
      {
        hintKey: 'kassaApp.helpVideoHintOnlineToggle2',
        videoPath: 'kassa-help/online-toggle/02.mp4',
      },
    ],
  },
  {
    id: 'rewards',
    titleKey: 'kassaApp.helpVideoTopicRewards',
    steps: [
      {
        hintKey: 'kassaApp.helpVideoHintRewards1',
        videoPath: 'kassa-help/rewards/01.mp4',
      },
      {
        hintKey: 'kassaApp.helpVideoHintRewards2',
        videoPath: 'kassa-help/rewards/02.mp4',
      },
    ],
  },
  {
    id: 'reports',
    titleKey: 'kassaApp.helpVideoTopicReports',
    steps: [
      {
        hintKey: 'kassaApp.helpVideoHintReports1',
        videoPath: 'kassa-help/reports/01.mp4',
      },
      {
        hintKey: 'kassaApp.helpVideoHintReports2',
        videoPath: 'kassa-help/reports/02.mp4',
      },
    ],
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
