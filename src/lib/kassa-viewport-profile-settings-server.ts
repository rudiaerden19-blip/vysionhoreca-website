import { getServerSupabaseClient } from '@/lib/supabase-server'
import type { KassaViewportProfileId } from '@/lib/kassa-viewport-profile-id'
import { KASSA_PLATFORM_TENANT_SLUG, KASSA_VIEWPORT_PROFILE_IDS } from '@/lib/kassa-viewport-profile-id'
import {
  sanitizeKassaViewportProfileSettingsPatch,
  type KassaViewportProfileSettingsMap,
  type KassaViewportProfileSettingsRow,
  kassaDefaultProfileSettingsFromTokens,
  mergeKassaViewportProfileSettings,
} from '@/lib/kassa-viewport-profile-settings'

type DbRow = {
  profile_id: string
  tenant_slug: string
  settings: unknown
  updated_at: string
  updated_by_email: string | null
}

export async function loadKassaViewportProfileSettingsMap(): Promise<{
  map: KassaViewportProfileSettingsMap
  version: string
}> {
  const supabase = getServerSupabaseClient()
  if (!supabase) return { map: {}, version: '0' }

  const { data, error } = await supabase
    .from('kassa_viewport_profile_settings')
    .select('profile_id, settings, updated_at')
    .eq('tenant_slug', KASSA_PLATFORM_TENANT_SLUG)

  if (error || !data) return { map: {}, version: '0' }

  const map: KassaViewportProfileSettingsMap = {}
  let maxUpdated = ''
  for (const row of data as DbRow[]) {
    const pid = row.profile_id as KassaViewportProfileId
    if (!(KASSA_VIEWPORT_PROFILE_IDS as readonly string[]).includes(pid)) continue
    map[pid] = sanitizeKassaViewportProfileSettingsPatch(row.settings)
    if (row.updated_at && row.updated_at > maxUpdated) maxUpdated = row.updated_at
  }
  return { map, version: maxUpdated || '0' }
}

export async function loadKassaViewportProfileSettingsForStudio(): Promise<
  KassaViewportProfileSettingsRow[]
> {
  const supabase = getServerSupabaseClient()
  const rows: KassaViewportProfileSettingsRow[] = []

  for (const profileId of KASSA_VIEWPORT_PROFILE_IDS) {
    const defaults = kassaDefaultProfileSettingsFromTokens(profileId)
    let patch = {}
    let updatedAt: string | null = null
    let updatedByEmail: string | null = null

    if (supabase) {
      const { data } = await supabase
        .from('kassa_viewport_profile_settings')
        .select('settings, updated_at, updated_by_email')
        .eq('tenant_slug', KASSA_PLATFORM_TENANT_SLUG)
        .eq('profile_id', profileId)
        .maybeSingle()
      if (data) {
        patch = sanitizeKassaViewportProfileSettingsPatch(data.settings)
        updatedAt = data.updated_at ?? null
        updatedByEmail = data.updated_by_email ?? null
      }
    }

    const effective = mergeKassaViewportProfileSettings(profileId, patch)
    rows.push({
      profileId,
      settings: effective,
      updatedAt,
      updatedByEmail,
    })
  }

  return rows
}

export async function upsertKassaViewportProfileSettings(input: {
  profileId: KassaViewportProfileId
  patch: Record<string, unknown>
  updatedByEmail: string | null
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = getServerSupabaseClient()
  if (!supabase) return { ok: false, error: 'Database niet beschikbaar' }

  const settings = sanitizeKassaViewportProfileSettingsPatch(input.patch)
  const { error } = await supabase.from('kassa_viewport_profile_settings').upsert(
    {
      profile_id: input.profileId,
      tenant_slug: KASSA_PLATFORM_TENANT_SLUG,
      settings,
      updated_at: new Date().toISOString(),
      updated_by_email: input.updatedByEmail,
    },
    { onConflict: 'profile_id,tenant_slug' },
  )

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function deleteKassaViewportProfileSettingsOverride(
  profileId: KassaViewportProfileId,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getServerSupabaseClient()
  if (!supabase) return { ok: false, error: 'Database niet beschikbaar' }

  const { error } = await supabase
    .from('kassa_viewport_profile_settings')
    .delete()
    .eq('tenant_slug', KASSA_PLATFORM_TENANT_SLUG)
    .eq('profile_id', profileId)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
