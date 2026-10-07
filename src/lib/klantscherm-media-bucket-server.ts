import type { SupabaseClient } from '@supabase/supabase-js'

/** Promo + bestaande menu-foto’s in bucket `media`. */
export const KLANTSCHERM_MEDIA_BUCKET_ID = 'media'

export const KLANTSCHERM_MEDIA_BUCKET_FILE_SIZE_BYTES = 524_288_000

export const KLANTSCHERM_MEDIA_BUCKET_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-m4v',
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

/** Service role: zorg dat grote mp4-uploads niet door bucket-whitelist geblokkeerd worden. */
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
    sizeBytes != null && sizeBytes > 0 && sizeBytes < KLANTSCHERM_MEDIA_BUCKET_FILE_SIZE_BYTES

  if (!needsMime && !needsSize) {
    return { ok: true }
  }

  const nextAllowed = needsMime
    ? [...new Set([...(allowed ?? []), ...KLANTSCHERM_MEDIA_BUCKET_MIME_TYPES])]
    : allowed

  const { error: upErr } = await supabase.storage.updateBucket(KLANTSCHERM_MEDIA_BUCKET_ID, {
    public: bucket.public,
    allowedMimeTypes: nextAllowed ?? null,
    fileSizeLimit: KLANTSCHERM_MEDIA_BUCKET_FILE_SIZE_BYTES,
  })

  if (upErr) {
    return { ok: false, error: upErr.message }
  }

  return { ok: true }
}
