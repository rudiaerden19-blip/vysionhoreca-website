import type { SupabaseClient } from '@supabase/supabase-js'

/** Menu-foto’s blijven in `media`. */
export const KLANTSCHERM_MEDIA_BUCKET_ID = 'media'

import { KLANTSCHERM_PROMO_VIDEO_BUCKET_ID } from '@/lib/klantscherm-slideshow-media'

export { KLANTSCHERM_PROMO_VIDEO_BUCKET_ID }

export const KLANTSCHERM_PROMO_VIDEO_FILE_SIZE_BYTES = 524_288_000

export const KLANTSCHERM_PROMO_VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-m4v',
] as const

export const KLANTSCHERM_MEDIA_BUCKET_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  ...KLANTSCHERM_PROMO_VIDEO_MIME_TYPES,
] as const

function bucketFileSizeBytes(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  if (typeof raw === 'string' && /^\d+$/.test(raw.trim())) return parseInt(raw.trim(), 10)
  return null
}

function bucketNeedsVideoMime(allowed: string[] | null | undefined): boolean {
  if (allowed == null || allowed.length === 0) return false
  return !allowed.some((m) => m === 'video/mp4' || m.startsWith('video/'))
}

function readStorageBucketMeta(bucket: unknown): {
  sizeBytes: number | null
  allowed: string[] | null
} {
  const raw = bucket as {
    allowedMimeTypes?: string[] | null
    allowed_mime_types?: string[] | null
    fileSizeLimit?: unknown
    file_size_limit?: unknown
  }
  return {
    allowed: raw.allowedMimeTypes ?? raw.allowed_mime_types ?? null,
    sizeBytes: bucketFileSizeBytes(raw.fileSizeLimit ?? raw.file_size_limit),
  }
}

/** Bucket voldoet (bijv. na SQL); dan geen updateBucket — die faalt soms als globale limiet lager is. */
export function klantschermPromoVideoBucketReady(
  sizeBytes: number | null,
  allowed: string[] | null | undefined,
): boolean {
  const mimeOk =
    allowed == null ||
    allowed.length === 0 ||
    allowed.some((m) => m === 'video/mp4' || m.startsWith('video/'))
  const sizeOk =
    sizeBytes == null ||
    sizeBytes === 0 ||
    sizeBytes >= KLANTSCHERM_PROMO_VIDEO_FILE_SIZE_BYTES
  return mimeOk && sizeOk
}

/** SQL alleen volstaat niet: project-brede Storage-limiet moet ≥ 500 MB. */
export function klantschermPromoStorageSizeHint(baseMessage: string): string {
  if (!/maximum allowed size/i.test(baseMessage)) return baseMessage
  return `${baseMessage} De bucket-SQL is dan al goed — zet in Supabase Dashboard → Storage → Settings de «Global file size limit» (Maximum upload size) op minstens 500 MB, sla op, ververs admin en upload opnieuw.`
}

export function klantschermPromoBucketErrorForApi(error: string): string {
  if (/maximum allowed size/i.test(error)) {
    return `klantscherm-promo: ${klantschermPromoStorageSizeHint(error)}`
  }
  return `klantscherm-promo bucket: ${error}. Ontbreekt de bucket? Voer supabase/klantscherm_promo_video_bucket.sql uit.`
}

async function loadPromoVideoBucket(supabase: SupabaseClient) {
  const { data, error } = await supabase.storage.getBucket(KLANTSCHERM_PROMO_VIDEO_BUCKET_ID)
  if (error || !data) return { bucket: null as null, error: error?.message ?? 'bucket_missing' }
  return { bucket: data, error: null as null }
}

/** Promo-video bucket (multi-tenant paden `{tenant}/klantscherm/...`). */
export async function ensureKlantschermPromoVideoBucket(
  supabase: SupabaseClient,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const opts = {
    public: true,
    fileSizeLimit: KLANTSCHERM_PROMO_VIDEO_FILE_SIZE_BYTES,
    allowedMimeTypes: [...KLANTSCHERM_PROMO_VIDEO_MIME_TYPES],
  }

  let loaded = await loadPromoVideoBucket(supabase)
  if (!loaded.bucket) {
    const { error: createErr } = await supabase.storage.createBucket(
      KLANTSCHERM_PROMO_VIDEO_BUCKET_ID,
      opts,
    )
    if (createErr && !/already exists/i.test(createErr.message)) {
      return { ok: false, error: klantschermPromoStorageSizeHint(createErr.message) }
    }
    loaded = await loadPromoVideoBucket(supabase)
    if (!loaded.bucket) {
      return { ok: false, error: loaded.error ?? 'bucket_missing' }
    }
  }

  const firstMeta = readStorageBucketMeta(loaded.bucket)
  if (klantschermPromoVideoBucketReady(firstMeta.sizeBytes, firstMeta.allowed)) {
    return { ok: true }
  }

  const { error: upErr } = await supabase.storage.updateBucket(KLANTSCHERM_PROMO_VIDEO_BUCKET_ID, opts)
  if (!upErr) {
    return { ok: true }
  }

  const afterFail = await loadPromoVideoBucket(supabase)
  if (afterFail.bucket) {
    const meta = readStorageBucketMeta(afterFail.bucket)
    if (klantschermPromoVideoBucketReady(meta.sizeBytes, meta.allowed)) {
      return { ok: true }
    }
  }

  return { ok: false, error: klantschermPromoStorageSizeHint(upErr.message) }
}

/** Optioneel: foto’s in `media` mogen ook video (kleine tenants zonder promo-bucket-fallback). */
export async function ensureKlantschermMediaBucketAcceptsVideo(
  supabase: SupabaseClient,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: bucket, error: getErr } = await supabase.storage.getBucket(KLANTSCHERM_MEDIA_BUCKET_ID)
  if (getErr || !bucket) {
    return { ok: false, error: getErr?.message ?? 'media_bucket_missing' }
  }

  const rawBucket = bucket as {
    allowedMimeTypes?: string[] | null
    allowed_mime_types?: string[] | null
    fileSizeLimit?: unknown
    file_size_limit?: unknown
  }
  const allowed = rawBucket.allowedMimeTypes ?? rawBucket.allowed_mime_types ?? undefined
  const sizeBytes = bucketFileSizeBytes(rawBucket.fileSizeLimit ?? rawBucket.file_size_limit)

  const needsMime = bucketNeedsVideoMime(allowed ?? null)
  const needsSize =
    sizeBytes != null && sizeBytes > 0 && sizeBytes < KLANTSCHERM_PROMO_VIDEO_FILE_SIZE_BYTES

  if (!needsMime && !needsSize) {
    return { ok: true }
  }

  const nextAllowed = needsMime
    ? [...new Set([...(allowed ?? []), ...KLANTSCHERM_MEDIA_BUCKET_MIME_TYPES])]
    : allowed

  const { error: upErr } = await supabase.storage.updateBucket(KLANTSCHERM_MEDIA_BUCKET_ID, {
    public: bucket.public,
    allowedMimeTypes: nextAllowed ?? null,
    fileSizeLimit: KLANTSCHERM_PROMO_VIDEO_FILE_SIZE_BYTES,
  })

  if (upErr) {
    return { ok: false, error: upErr.message }
  }

  return { ok: true }
}
