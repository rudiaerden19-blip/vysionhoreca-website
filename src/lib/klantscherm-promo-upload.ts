'use client'

import { supabase } from '@/lib/supabase'

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '')
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

export type KlantschermPromoUploadProgress = {
  loaded: number
  total: number
  percent: number
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
  })
}

function uploadFormDataViaXhr(
  url: string,
  file: File,
  onProgress?: (p: KlantschermPromoUploadProgress) => void,
): Promise<{ ok: true } | { ok: false; message: string }> {
  return new Promise((resolve) => {
    if (!SUPABASE_URL || !SUPABASE_ANON) {
      resolve({ ok: false, message: 'Supabase niet geconfigureerd' })
      return
    }

    const form = new FormData()
    form.append('cacheControl', '3600')
    form.append('', file)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
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
      resolve({ ok: false, message })
    }

    reportUploadProgress(file, 0, onProgress)
    xhr.send(form)
  })
}

/** Promo-foto naar bucket `media` (alleen afbeeldingen). */
export async function uploadKlantschermPromoImage(
  tenantSlug: string,
  file: File,
  onProgress?: (p: KlantschermPromoUploadProgress) => void,
): Promise<{ ok: true; publicUrl: string } | { ok: false; message: string }> {
  if (!supabase) {
    return { ok: false, message: 'Supabase niet geconfigureerd' }
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const contentType = file.type || 'image/jpeg'
  const objectPath = `${tenantSlug}/klantscherm/${Date.now()}.${ext}`
  const postUrl = buildStorageObjectPostUrl('media', objectPath)
  const xhrResult = await uploadFormDataViaXhr(postUrl, file, onProgress)
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
    return { ok: false, message: error.message }
  }

  onProgress?.({ loaded: file.size, total: file.size, percent: 100 })
  const { data: pub } = supabase.storage.from('media').getPublicUrl(objectPath)
  return { ok: true, publicUrl: pub.publicUrl }
}
