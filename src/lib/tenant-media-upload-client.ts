'use client'

import { supabase } from '@/lib/supabase'

export async function compressImageFile(
  file: File,
  maxWidth = 1200,
  quality = 0.8,
): Promise<File> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(file)
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = document.createElement('img')
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d')?.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(
                new File([blob], file.name || 'photo.jpg', {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                }),
              )
            } else {
              resolve(file)
            }
          },
          'image/jpeg',
          quality,
        )
      }
      img.onerror = () => resolve(file)
      img.src = e.target?.result as string
    }
    reader.onerror = () => resolve(file)
    reader.readAsDataURL(file)
  })
}

export async function uploadTenantMediaImage(
  tenantSlug: string,
  file: File,
  displayNameFallback: string,
): Promise<{ ok: true; publicUrl: string } | { ok: false; error: string }> {
  if (!supabase) {
    return { ok: false, error: 'db_not_connected' }
  }

  const compressedFile = await compressImageFile(file, 1200, 0.8)
  const fileName = `${tenantSlug}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`

  const { error: uploadError } = await supabase.storage.from('media').upload(fileName, compressedFile, {
    cacheControl: '31536000',
    upsert: false,
    contentType: 'image/jpeg',
  })

  if (uploadError) {
    return { ok: false, error: uploadError.message }
  }

  const { data: urlData } = supabase.storage.from('media').getPublicUrl(fileName)
  const publicUrl = urlData.publicUrl
  const displayName = file.name?.trim() || displayNameFallback

  await supabase.from('tenant_media').insert({
    tenant_slug: tenantSlug,
    url: publicUrl,
    file_url: publicUrl,
    name: displayName,
    file_name: displayName,
    category: 'Uploads',
    file_size: compressedFile.size || 0,
    file_type: 'image/jpeg',
  })

  return { ok: true, publicUrl }
}
