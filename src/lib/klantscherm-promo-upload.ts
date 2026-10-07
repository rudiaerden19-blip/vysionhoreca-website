'use client'

import { supabase } from '@/lib/supabase'
import { klantschermPromoStorageSizeHint } from '@/lib/klantscherm-media-bucket-server'
import type { KlantschermSlideshowMediaType } from '@/lib/klantscherm-slideshow-media'

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

function reportUploadProgress(
  file: File,
  loaded: number,
  onProgress?: (p: KlantschermPromoUploadProgress) => void,
) {
  const total = file.size
  const pct = total > 0 ? Math.round((loaded / total) * 100) : 0
  onProgress?.({
    loaded,
    total,
    percent: Math.min(100, Math.max(0, pct)),
    phase: 'uploading',
  })
}

/**
 * Zelfde contract als @supabase/storage-js uploadToSignedUrl (FormData + PUT),
 * maar met xhr.upload.onprogress — geen dubbele pogingen die % terug naar 0 zetten.
 */
function uploadSignedUrlViaXhr(
  signedUrl: string,
  file: File,
  onProgress?: (p: KlantschermPromoUploadProgress) => void,
): Promise<{ ok: true } | { ok: false; message: string }> {
  return new Promise((resolve) => {
    if (!SUPABASE_ANON) {
      resolve({ ok: false, message: 'Supabase niet geconfigureerd' })
      return
    }

    const form = new FormData()
    form.append('cacheControl', '3600')
    form.append('', file)

    const xhr = new XMLHttpRequest()
    xhr.open('PUT', signedUrl)
    xhr.setRequestHeader('Authorization', `Bearer ${SUPABASE_ANON}`)
    xhr.setRequestHeader('apikey', SUPABASE_ANON)
    xhr.setRequestHeader('x-upsert', 'false')
    xhr.timeout = 0

    xhr.upload.onprogress = (ev) => {
      if (!ev.lengthComputable) return
      reportUploadProgress(file, ev.loaded, onProgress)
    }

    xhr.onerror = () => resolve({ ok: false, message: 'Netwerkfout tijdens upload' })
    xhr.onabort = () => resolve({ ok: false, message: 'Upload geannuleerd' })
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        reportUploadProgress(file, file.size, onProgress)
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
      resolve({ ok: false, message: klantschermPromoStorageSizeHint(message) })
    }

    reportUploadProgress(file, 0, onProgress)
    xhr.send(form)
  })
}

function uploadFormDataViaXhr(
  method: 'POST' | 'PUT',
  url: string,
  file: File,
  cacheControl: string,
  onProgress?: (p: KlantschermPromoUploadProgress) => void,
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
    xhr.setRequestHeader('Authorization', `Bearer ${SUPABASE_ANON}`)
    xhr.setRequestHeader('apikey', SUPABASE_ANON)
    xhr.setRequestHeader('x-upsert', 'false')
    xhr.timeout = 0

    xhr.upload.onprogress = (ev) => {
      if (!ev.lengthComputable) return
      reportUploadProgress(file, ev.loaded, onProgress)
    }

    xhr.onerror = () => resolve({ ok: false, message: 'Netwerkfout tijdens upload' })
    xhr.onabort = () => resolve({ ok: false, message: 'Upload geannuleerd' })
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        reportUploadProgress(file, file.size, onProgress)
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
      resolve({ ok: false, message: klantschermPromoStorageSizeHint(message) })
    }

    reportUploadProgress(file, 0, onProgress)
    xhr.send(form)
  })
}

async function uploadWithSignedUrl(
  tenantSlug: string,
  file: File,
  ext: string,
  contentType: string,
  onProgress?: (p: KlantschermPromoUploadProgress) => void,
): Promise<{ ok: true; publicUrl: string } | { ok: false; message: string }> {
  void contentType

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
    signedUrl?: string
    publicUrl?: string
    error?: string
  }

  if (!signRes.ok || !signJson.ok || !signJson.signedUrl || !signJson.publicUrl) {
    const raw = signJson.error || `Signed URL mislukt (${signRes.status})`
    return {
      ok: false,
      message: klantschermPromoStorageSizeHint(raw),
    }
  }

  const xhrResult = await uploadSignedUrlViaXhr(signJson.signedUrl, file, onProgress)
  if (!xhrResult.ok) {
    return xhrResult
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
