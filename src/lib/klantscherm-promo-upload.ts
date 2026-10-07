'use client'

import { supabase } from '@/lib/supabase'
import type { KlantschermSlideshowMediaType } from '@/lib/klantscherm-slideshow-media'

export type KlantschermPromoUploadProgress = {
  loaded: number
  total: number
  percent: number
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
    path?: string
    token?: string
    publicUrl?: string
    error?: string
  }

  if (!signRes.ok || !signJson.ok || !signJson.path || !signJson.token || !signJson.publicUrl) {
    return {
      ok: false,
      message: signJson.error || `Signed URL mislukt (${signRes.status})`,
    }
  }

  onProgress?.({ loaded: 0, total: file.size, percent: 0 })

  const { error } = await supabase.storage.from('media').uploadToSignedUrl(signJson.path, signJson.token, file, {
    cacheControl: '3600',
    contentType,
    upsert: false,
  })

  if (error) {
    return { ok: false, message: error.message }
  }

  onProgress?.({ loaded: file.size, total: file.size, percent: 100 })
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

  onProgress?.({ loaded: 0, total: file.size, percent: 0 })
  const objectPath = `${tenantSlug}/klantscherm/${Date.now()}.${ext}`
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

  onProgress?.({ loaded: file.size, total: file.size, percent: 100 })
  const { data: pub } = supabase.storage.from('media').getPublicUrl(objectPath)
  return { ok: true, publicUrl: pub.publicUrl }
}
