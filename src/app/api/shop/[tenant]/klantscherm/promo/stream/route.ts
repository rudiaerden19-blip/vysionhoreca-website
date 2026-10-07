import { NextResponse } from 'next/server'
import { KLANTSCHERM_MEDIA_BUCKET_ID } from '@/lib/klantscherm-media-bucket-server'
import { KLANTSCHERM_PROMO_VIDEO_BUCKET_ID } from '@/lib/klantscherm-media-bucket-server'
import { klantschermPromoPathBelongsToTenant } from '@/lib/klantscherm-promo-storage-parse'
import { getServerSupabaseClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

type RouteContext = { params: { tenant: string } }

const ALLOWED_BUCKETS = new Set([KLANTSCHERM_PROMO_VIDEO_BUCKET_ID, KLANTSCHERM_MEDIA_BUCKET_ID])

const PASSTHROUGH_HEADERS = new Set([
  'content-type',
  'content-length',
  'content-range',
  'accept-ranges',
])

/** Video/foto stream voor klantscherm — Range-aware, leest via service role signed URL. */
export async function GET(request: Request, context: RouteContext) {
  const tenantSlug = context.params.tenant?.trim()
  if (!tenantSlug) {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }

  const url = new URL(request.url)
  const path = url.searchParams.get('path')?.trim() ?? ''
  const bucket = url.searchParams.get('bucket')?.trim() ?? KLANTSCHERM_PROMO_VIDEO_BUCKET_ID

  if (!path || !ALLOWED_BUCKETS.has(bucket) || !klantschermPromoPathBelongsToTenant(path, tenantSlug)) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 })
  }

  const supabase = getServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'server_config' }, { status: 503 })
  }

  const { data: signed, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600)
  if (error || !signed?.signedUrl) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
  }

  const range = request.headers.get('range')
  const upstream = await fetch(signed.signedUrl, {
    headers: range ? { Range: range } : {},
  })

  if (!upstream.ok && upstream.status !== 206) {
    return NextResponse.json({ ok: false, error: 'upstream_failed' }, { status: upstream.status })
  }

  const headers = new Headers()
  upstream.headers.forEach((value, key) => {
    if (PASSTHROUGH_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value)
    }
  })
  if (!headers.has('accept-ranges')) {
    headers.set('Accept-Ranges', 'bytes')
  }
  headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  })
}
