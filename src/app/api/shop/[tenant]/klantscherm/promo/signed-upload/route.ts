import { NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

type RouteContext = { params: { tenant: string } }

/** Eenmalige signed URL voor grote promo-video (direct browser → Storage, geen Vercel body-limiet). */
export async function POST(request: Request, context: RouteContext) {
  const tenantSlug = context.params.tenant?.trim()
  if (!tenantSlug) {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }

  let ext = 'mp4'
  let contentType = 'video/mp4'
  try {
    const body = (await request.json()) as { ext?: string; contentType?: string }
    if (body.ext && /^[a-z0-9]{2,8}$/i.test(body.ext)) ext = body.ext.toLowerCase()
    if (body.contentType && body.contentType.length < 120) contentType = body.contentType
  } catch {
    /* defaults */
  }

  const supabase = getServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'server_config' }, { status: 503 })
  }

  const { data: settings } = await supabase
    .from('tenant_settings')
    .select('klantscherm_enabled')
    .eq('tenant_slug', tenantSlug)
    .maybeSingle()

  if (!settings) {
    return NextResponse.json({ ok: false, error: 'tenant_not_found' }, { status: 404 })
  }

  const objectPath = `${tenantSlug}/klantscherm/${Date.now()}.${ext}`
  const { data, error } = await supabase.storage.from('media').createSignedUploadUrl(objectPath)

  if (error || !data?.token || !data.path) {
    console.error('[klantscherm/promo/signed-upload]', error)
    return NextResponse.json(
      { ok: false, error: error?.message ?? 'signed_url_failed' },
      { status: 500 },
    )
  }

  const { data: pub } = supabase.storage.from('media').getPublicUrl(data.path)

  return NextResponse.json({
    ok: true,
    path: data.path,
    token: data.token,
    publicUrl: pub.publicUrl,
    contentType,
  })
}
