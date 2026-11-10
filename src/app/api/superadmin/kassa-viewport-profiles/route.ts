import { NextRequest, NextResponse } from 'next/server'
import { verifySuperAdminAccess } from '@/lib/verify-tenant-access'
import {
  deleteKassaViewportProfileSettingsOverride,
  loadKassaViewportProfileSettingsForStudio,
  upsertKassaViewportProfileSettings,
} from '@/lib/kassa-viewport-profile-settings-server'
import {
  isKassaViewportProfileId,
  type KassaViewportProfileId,
} from '@/lib/kassa-viewport-profile-id'
import { sanitizeKassaViewportProfileSettingsPatch } from '@/lib/kassa-viewport-profile-settings'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const access = await verifySuperAdminAccess(req)
  if (!access.authorized) {
    return NextResponse.json({ error: access.error || 'Geen toegang' }, { status: 403 })
  }
  const profiles = await loadKassaViewportProfileSettingsForStudio()
  return NextResponse.json({ profiles })
}

export async function PUT(req: NextRequest) {
  const access = await verifySuperAdminAccess(req)
  if (!access.authorized) {
    return NextResponse.json({ error: access.error || 'Geen toegang' }, { status: 403 })
  }
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Ongeldige JSON' }, { status: 400 })
  }
  const o = body as { profileId?: string; settings?: unknown; reset?: boolean }
  const profileId = o.profileId?.trim()
  if (!isKassaViewportProfileId(profileId)) {
    return NextResponse.json({ error: 'Ongeldig profileId' }, { status: 400 })
  }

  const email = req.headers.get('x-superadmin-email')

  if (o.reset === true) {
    const result = await deleteKassaViewportProfileSettingsOverride(profileId as KassaViewportProfileId)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })
    const profiles = await loadKassaViewportProfileSettingsForStudio()
    return NextResponse.json({ ok: true, profiles })
  }

  const patch = sanitizeKassaViewportProfileSettingsPatch(o.settings)
  const result = await upsertKassaViewportProfileSettings({
    profileId: profileId as KassaViewportProfileId,
    patch,
    updatedByEmail: email,
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })

  const profiles = await loadKassaViewportProfileSettingsForStudio()
  return NextResponse.json({ ok: true, profiles })
}
