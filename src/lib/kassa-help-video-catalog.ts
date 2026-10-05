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

export const KASSA_HELP_VIDEO_TOPICS: KassaHelpVideoTopic[] = [
  {
    id: 'add-category',
    titleKey: 'kassaApp.helpVideoTopicAddCategory',
    // Volgorde: intro 1 .mp4 → 2.mp4 → 3 → 4 → 5 (Desktop …/categorieen/)
    steps: [
      {
        videoPath: 'kassa-help/add-category/01.mp4',
        hintKey: 'kassaApp.helpVideoHintAddCategory1',
      },
      {
        videoPath: 'kassa-help/add-category/02.mp4',
        hintKey: 'kassaApp.helpVideoHintAddCategory2',
      },
      { videoPath: 'kassa-help/add-category/03.mp4', hintKey: FOLLOW_VIDEO_HINT },
      { videoPath: 'kassa-help/add-category/04.mp4', hintKey: FOLLOW_VIDEO_HINT },
      { videoPath: 'kassa-help/add-category/05.mp4', hintKey: FOLLOW_VIDEO_HINT },
    ],
  },
  {
    id: 'add-product',
    titleKey: 'kassaApp.helpVideoTopicAddProduct',
    // Volgorde: 1.mp4 → 5.mp4 (Desktop …/product toevoegen /)
    steps: [
      {
        videoPath: 'kassa-help/add-product/01.mp4',
        hintKey: 'kassaApp.helpVideoHintAddProduct1',
      },
      {
        videoPath: 'kassa-help/add-product/02.mp4',
        hintKey: 'kassaApp.helpVideoHintAddProduct2',
      },
      { videoPath: 'kassa-help/add-product/03.mp4', hintKey: FOLLOW_VIDEO_HINT },
      { videoPath: 'kassa-help/add-product/04.mp4', hintKey: FOLLOW_VIDEO_HINT },
      { videoPath: 'kassa-help/add-product/05.mp4', hintKey: FOLLOW_VIDEO_HINT },
    ],
  },
  {
    id: 'options-extras',
    titleKey: 'kassaApp.helpVideoTopicOptionsExtras',
    // Volgorde: 1.mp4 → 5.mp4 (Desktop …/opties&extras/)
    steps: [
      {
        videoPath: 'kassa-help/options-extras/01.mp4',
        hintKey: 'kassaApp.helpVideoHintOptionsExtras1',
      },
      {
        videoPath: 'kassa-help/options-extras/02.mp4',
        hintKey: 'kassaApp.helpVideoHintOptionsExtras2',
      },
      { videoPath: 'kassa-help/options-extras/03.mp4', hintKey: FOLLOW_VIDEO_HINT },
      { videoPath: 'kassa-help/options-extras/04.mp4', hintKey: FOLLOW_VIDEO_HINT },
      { videoPath: 'kassa-help/options-extras/05.mp4', hintKey: FOLLOW_VIDEO_HINT },
    ],
  },
  {
    id: 'pincode',
    titleKey: 'kassaApp.helpVideoTopicPincode',
    steps: [
      {
        videoPath: 'kassa-help/pincode/01.mp4',
        hintKey: 'kassaApp.helpVideoHintPincode1',
      },
    ],
  },
  {
    id: 'inventory',
    titleKey: 'kassaApp.helpVideoTopicInventory',
    steps: [
      {
        videoPath: 'kassa-help/inventory/01.mp4',
        hintKey: 'kassaApp.helpVideoHintInventory1',
      },
      {
        videoPath: 'kassa-help/inventory/02.mp4',
        hintKey: 'kassaApp.helpVideoHintInventory2',
      },
    ],
  },
  {
    id: 'online-toggle',
    titleKey: 'kassaApp.helpVideoTopicOnlineToggle',
    // Volgorde: 1.mp4 → 2.mp4 (Desktop …/ONLINE AAN UIT ZETTEN/)
    steps: [
      {
        videoPath: 'kassa-help/online-toggle/01.mp4',
        hintKey: 'kassaApp.helpVideoHintOnlineToggle1',
      },
      {
        videoPath: 'kassa-help/online-toggle/02.mp4',
        hintKey: 'kassaApp.helpVideoHintOnlineToggle2',
      },
    ],
  },
  {
    id: 'rewards',
    titleKey: 'kassaApp.helpVideoTopicRewards',
    // Desktop …/BELONINGEN/1.mp4
    steps: [
      {
        videoPath: 'kassa-help/rewards/01.mp4',
        hintKey: 'kassaApp.helpVideoHintRewards1',
      },
    ],
  },
  {
    id: 'reports',
    titleKey: 'kassaApp.helpVideoTopicReports',
    // Desktop …/RAPPORTEN/raportages.mp4
    steps: [
      {
        videoPath: 'kassa-help/reports/01.mp4',
        hintKey: 'kassaApp.helpVideoHintReports1',
      },
    ],
  },
]

/** Public bucket voor help-mp4 (apart van `media` dat vaak geen video/mp4 toelaat). */
export const KASSA_HELP_VIDEO_STORAGE_BUCKET = 'kassa-help'

/** Verhoog na nieuwe upload (letterbox-crop) zodat browsers oude mp4 niet cachen. */
export const KASSA_HELP_VIDEO_ASSET_VERSION = 2

export function kassaHelpVideoPublicUrl(storagePath: string): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
  if (!base || !storagePath) return null
  const objectKey = storagePath.replace(/^\/?kassa-help\//, '')
  if (!objectKey) return null
  return `${base}/storage/v1/object/public/${KASSA_HELP_VIDEO_STORAGE_BUCKET}/${objectKey}?v=${KASSA_HELP_VIDEO_ASSET_VERSION}`
}

export function findKassaHelpTopic(topicId: string): KassaHelpVideoTopic | undefined {
  return KASSA_HELP_VIDEO_TOPICS.find((t) => t.id === topicId)
}
