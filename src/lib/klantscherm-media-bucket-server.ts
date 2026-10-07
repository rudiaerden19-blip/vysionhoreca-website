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

/** Promo-video bucket (multi-tenant paden `{tenant}/klantscherm/...`). */
export async function ensureKlantschermPromoVideoBucket(
  supabase: SupabaseClient,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const opts = {
    public: true,
    fileSizeLimit: KLANTSCHERM_PROMO_VIDEO_FILE_SIZE_BYTES,
    allowedMimeTypes: [...KLANTSCHERM_PROMO_VIDEO_MIME_TYPES],
  }

  const { data: buckets, error: listErr } = await supabase.storage.listBuckets()
  if (listErr) {
    return { ok: false, error: listErr.message }
  }

  const exists = buckets?.some((b) => b.name === KLANTSCHERM_PROMO_VIDEO_BUCKET_ID)
  if (!exists) {
    const { error } = await supabase.storage.createBucket(KLANTSCHERM_PROMO_VIDEO_BUCKET_ID, opts)
    if (error) {
      return { ok: false, error: error.message }
    }
  }

  const { error: upErr } = await supabase.storage.updateBucket(KLANTSCHERM_PROMO_VIDEO_BUCKET_ID, opts)
  if (upErr) {
    return { ok: false, error: upErr.message }
  }
  return { ok: true }
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
