'use client'

import { supabase } from '@/lib/supabase'
import {
  KLANTSCHERM_PROMO_VIDEO_BUCKET_ID,
  type KlantschermSlideshowMediaType,
} from '@/lib/klantscherm-slideshow-media'

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '')
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

export type KlantschermPromoUploadProgress = {
  loaded: number
  total: number
  percent: number
  phase?: 'preparing' | 'uploading' | 'finalizing'
}

function buildStorageObjectPostUrl(bucket: string, objectPath: string): string {
  const full = `${bucket}/${objectPath}`
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/')
  return `${SUPABASE_URL}/storage/v1/object/${full}`
}

function uploadFormDataViaXhr(
  method: 'POST' | 'PUT',
  url: string,
  file: File,
  cacheControl: string,
  onProgress?: (p: KlantschermPromoUploadProgress) => void,
  opts?: { signedTokenUpload?: boolean },
): Promise<{ ok: true } | { ok: false; message: string }> {
  return new Promise((resolve) => {
    if (!SUPABASE_URL || !SUPABASE_ANON) {
      resolve({ ok: false, message: 'Supabase niet geconfigureerd' })
      return
    }

    const form = new FormData()
    form.append('cacheControl', cacheControl)
    form.append('', file)

    const xhr = new XMLHttpRequest()
    xhr.open(method, url)
    if (!opts?.signedTokenUpload) {
      xhr.setRequestHeader('Authorization', `Bearer ${SUPABASE_ANON}`)
      xhr.setRequestHeader('apikey', SUPABASE_ANON)
    }
    xhr.setRequestHeader('x-upsert', 'false')
    xhr.timeout = 0

    xhr.upload.onprogress = (ev) => {
      const loaded = ev.loaded
      const pct = file.size > 0 ? Math.round((loaded / file.size) * 100) : 0
      const phase: KlantschermPromoUploadProgress['phase'] =
        loaded >= file.size * 0.995 ? 'finalizing' : 'uploading'
      onProgress?.({
        loaded,
        total: file.size,
        percent: Math.min(phase === 'finalizing' ? 99 : 100, Math.max(1, pct)),
        phase,
      })
    }

    xhr.onerror = () => resolve({ ok: false, message: 'Netwerkfout tijdens upload' })
    xhr.onabort = () => resolve({ ok: false, message: 'Upload geannuleerd' })
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.({ loaded: file.size, total: file.size, percent: 100, phase: 'uploading' })
        resolve({ ok: true })
        return
      }
      let message = `Upload geweigerd (HTTP ${xhr.status})`
      try {
        const body = JSON.parse(xhr.responseText) as { message?: string; error?: string }
        message = body.message || body.error || message
      } catch {
        if (xhr.responseText) message = xhr.responseText.slice(0, 240)
      }
      resolve({ ok: false, message })
    }

    onProgress?.({ loaded: 0, total: file.size, percent: 0, phase: 'uploading' })
    xhr.send(form)
  })
}

async function pollObjectExists(
  tenantSlug: string,
  storagePath: string,
  onProgress?: (p: KlantschermPromoUploadProgress) => void,
  fileSize = 0,
): Promise<boolean> {
  const started = Date.now()
  const maxMs = 12 * 60 * 1000
  while (Date.now() - started < maxMs) {
    onProgress?.({
      loaded: fileSize,
      total: fileSize,
      percent: 99,
      phase: 'finalizing',
    })
    try {
      const r = await fetch(
        `/api/shop/${encodeURIComponent(tenantSlug)}/klantscherm/promo/object-exists?path=${encodeURIComponent(storagePath)}`,
        { credentials: 'same-origin', cache: 'no-store' },
      )
      const json = (await r.json()) as { exists?: boolean }
      if (json.exists) return true
    } catch {
      /* retry */
    }
    await new Promise((res) => setTimeout(res, 3000))
  }
  return false
}

async function uploadWithSignedUrl(
  tenantSlug: string,
  file: File,
  ext: string,
  contentType: string,
  onProgress?: (p: KlantschermPromoUploadProgress) => void,
): Promise<{ ok: true; publicUrl: string } | { ok: false; message: string }> {
  if (!supabase) {
    return { ok: false, message: 'Supabase niet geconfigureerd' }
  }

  onProgress?.({ loaded: 0, total: file.size, percent: 0, phase: 'preparing' })

  const signRes = await fetch(
    `/api/shop/${encodeURIComponent(tenantSlug)}/klantscherm/promo/signed-upload`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ ext, contentType }),
    },
  )
  const signJson = (await signRes.json()) as {
    ok?: boolean
    bucket?: string
    path?: string
    token?: string
    signedUrl?: string
    publicUrl?: string
    error?: string
  }

  if (!signRes.ok || !signJson.ok || !signJson.path || !signJson.token || !signJson.publicUrl) {
    return {
      ok: false,
      message: signJson.error || `Signed URL mislukt (${signRes.status})`,
    }
  }

  const storagePath = signJson.path
  const bucketId = signJson.bucket?.trim() || KLANTSCHERM_PROMO_VIDEO_BUCKET_ID
  let estimateTimer: ReturnType<typeof setInterval> | null = null
  const started = Date.now()
  estimateTimer = setInterval(() => {
    const elapsed = (Date.now() - started) / 1000
    const assumedRate = 2.5 * 1024 * 1024
    const loaded = Math.min(file.size, elapsed * assumedRate)
    const pct = file.size > 0 ? Math.round((loaded / file.size) * 100) : 0
    const phase: KlantschermPromoUploadProgress['phase'] =
      loaded >= file.size * 0.98 ? 'finalizing' : 'uploading'
    onProgress?.({
      loaded,
      total: file.size,
      percent: Math.min(phase === 'finalizing' ? 99 : 98, Math.max(1, pct)),
      phase,
    })
  }, 800)

  const uploadTask = supabase.storage
    .from(bucketId)
    .uploadToSignedUrl(storagePath, signJson.token, file, {
      cacheControl: '3600',
      contentType,
      upsert: false,
    })
    .then(({ error }) => {
      if (error) throw new Error(error.message)
    })

  const pollTask = (async () => {
    await new Promise((r) => setTimeout(r, 15_000))
    const ok = await pollObjectExists(tenantSlug, storagePath, onProgress, file.size)
    if (!ok) throw new Error('Upload time-out — bestand niet zichtbaar in Storage')
  })()

  try {
    await Promise.race([uploadTask, pollTask])
  } catch (e) {
    const polled = await pollObjectExists(tenantSlug, storagePath, onProgress, file.size)
    if (!polled) {
      const msg = e instanceof Error ? e.message : String(e)
      return { ok: false, message: msg }
    }
  } finally {
    if (estimateTimer) clearInterval(estimateTimer)
  }

  onProgress?.({ loaded: file.size, total: file.size, percent: 100, phase: 'uploading' })
  return { ok: true, publicUrl: signJson.publicUrl }
}

export async function uploadKlantschermPromoMedia(
  tenantSlug: string,
  file: File,
  mediaType: KlantschermSlideshowMediaType,
  onProgress?: (p: KlantschermPromoUploadProgress) => void,
): Promise<{ ok: true; publicUrl: string } | { ok: false; message: string }> {
  if (!supabase) {
    return { ok: false, message: 'Supabase niet geconfigureerd' }
  }

  const ext =
    file.name.split('.').pop()?.toLowerCase() ||
    (mediaType === 'video' ? 'mp4' : 'jpg')
  const contentType =
    file.type || (mediaType === 'video' ? 'video/mp4' : 'image/jpeg')

  if (mediaType === 'video' && file.size > 4 * 1024 * 1024) {
    return uploadWithSignedUrl(tenantSlug, file, ext, contentType, onProgress)
  }

  const objectPath = `${tenantSlug}/klantscherm/${Date.now()}.${ext}`
  const postUrl = buildStorageObjectPostUrl('media', objectPath)
  const xhrResult = await uploadFormDataViaXhr('POST', postUrl, file, '3600', onProgress)
  if (xhrResult.ok) {
    const { data: pub } = supabase.storage.from('media').getPublicUrl(objectPath)
    return { ok: true, publicUrl: pub.publicUrl }
  }

  const { error } = await supabase.storage.from('media').upload(objectPath, file, {
    cacheControl: '3600',
    upsert: false,
    contentType,
  })

  if (error) {
    if (mediaType === 'video') {
      const fallback = await uploadWithSignedUrl(tenantSlug, file, ext, contentType, onProgress)
      if (fallback.ok) return fallback
      return { ok: false, message: `${error.message} (${fallback.message})` }
    }
    return { ok: false, message: error.message }
  }

  onProgress?.({ loaded: file.size, total: file.size, percent: 100, phase: 'uploading' })
  const { data: pub } = supabase.storage.from('media').getPublicUrl(objectPath)
  return { ok: true, publicUrl: pub.publicUrl }
}
