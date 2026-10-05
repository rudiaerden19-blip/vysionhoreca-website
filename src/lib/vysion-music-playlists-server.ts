import { syncManualPlaylistToSoundtrackLibrary } from '@/lib/soundtrack/soundtrack-manual-playlist-sync'
import { getServerSupabaseClient } from '@/lib/supabase-server'

export type VysionMusicPlaylistTrackPayload = {
  id: string
  name: string
  artist: string
  durationMs: number
  imageUrl: string | null
}

export type VysionMusicPlaylistSummary = {
  id: string
  name: string
  trackCount: number
  updatedAt: string
}

export type VysionMusicPlaylistDetail = {
  id: string
  name: string
  updatedAt: string
  soundtrackPlaylistId: string | null
  tracks: VysionMusicPlaylistTrackPayload[]
}

export const VYSION_MUSIC_PLAYLIST_SOUNDTRACK_SYNC_FAILED_CODE = 'soundtrack_sync_failed'

export class VysionMusicPlaylistError extends Error {
  status: number
  code?: string
  constructor(message: string, status = 400, code?: string) {
    super(message)
    this.name = 'VysionMusicPlaylistError'
    this.status = status
    this.code = code
  }
}

export const VYSION_MUSIC_PLAYLIST_TABLES_MISSING_CODE = 'playlist_tables_missing'

function requireDb() {
  const supabase = getServerSupabaseClient()
  if (!supabase) {
    throw new VysionMusicPlaylistError('Database not configured', 503)
  }
  return supabase
}

function isMissingTableError(message: string | undefined): boolean {
  if (!message) return false
  return (
    message.includes('vysion_music_playlists') &&
    (message.includes('does not exist') || message.includes('schema cache'))
  )
}

function isMissingSoundtrackPlaylistIdColumn(message: string | undefined): boolean {
  if (!message) return false
  return message.includes('soundtrack_playlist_id')
}

async function persistSoundtrackPlaylistId(
  tenantSlug: string,
  playlistId: string,
  soundtrackPlaylistId: string,
): Promise<void> {
  const supabase = requireDb()
  const { error } = await supabase
    .from('vysion_music_playlists')
    .update({ soundtrack_playlist_id: soundtrackPlaylistId })
    .eq('tenant_slug', tenantSlug)
    .eq('id', playlistId)
  if (error && !isMissingSoundtrackPlaylistIdColumn(error.message)) {
    throw new VysionMusicPlaylistError(error.message, 500)
  }
}

export async function syncVysionMusicPlaylistToSoundtrack(
  tenantSlug: string,
  playlistId: string,
): Promise<string> {
  const supabase = requireDb()
  const { data: row, error } = await supabase
    .from('vysion_music_playlists')
    .select('id, name, soundtrack_playlist_id')
    .eq('tenant_slug', tenantSlug)
    .eq('id', playlistId)
    .maybeSingle()

  if (error) {
    if (isMissingTableError(error.message)) {
      throw new VysionMusicPlaylistError(
        'Playlist tables not migrated',
        503,
        VYSION_MUSIC_PLAYLIST_TABLES_MISSING_CODE,
      )
    }
    if (isMissingSoundtrackPlaylistIdColumn(error.message)) {
      const { data: fallback, error: fbErr } = await supabase
        .from('vysion_music_playlists')
        .select('id, name')
        .eq('tenant_slug', tenantSlug)
        .eq('id', playlistId)
        .maybeSingle()
      if (fbErr || !fallback) throw new VysionMusicPlaylistError(fbErr?.message || 'Not found', 500)
      const detail = await getVysionMusicPlaylist(tenantSlug, playlistId)
      if (!detail) throw new VysionMusicPlaylistError('Playlist not found', 404)
      return syncManualPlaylistToSoundtrackLibrary({
        name: detail.name,
        trackIds: detail.tracks.map((t) => t.id),
        soundtrackPlaylistId: null,
      })
    }
    throw new VysionMusicPlaylistError(error.message, 500)
  }
  if (!row) throw new VysionMusicPlaylistError('Playlist not found', 404)

  const detail = await getVysionMusicPlaylist(tenantSlug, playlistId)
  if (!detail) throw new VysionMusicPlaylistError('Playlist not found', 404)

  try {
    const soundtrackId = await syncManualPlaylistToSoundtrackLibrary({
      name: detail.name,
      trackIds: detail.tracks.map((t) => t.id),
      soundtrackPlaylistId: (row.soundtrack_playlist_id as string | null) ?? null,
    })
    await persistSoundtrackPlaylistId(tenantSlug, playlistId, soundtrackId)
    return soundtrackId
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Soundtrack sync failed'
    throw new VysionMusicPlaylistError(msg, 502, VYSION_MUSIC_PLAYLIST_SOUNDTRACK_SYNC_FAILED_CODE)
  }
}

export async function listVysionMusicPlaylists(
  tenantSlug: string,
): Promise<VysionMusicPlaylistSummary[]> {
  const supabase = requireDb()
  const { data, error } = await supabase
    .from('vysion_music_playlists')
    .select('id, name, updated_at')
    .eq('tenant_slug', tenantSlug)
    .order('updated_at', { ascending: false })

  if (error) {
    if (isMissingTableError(error.message)) {
      throw new VysionMusicPlaylistError(
        'Playlist tables not migrated',
        503,
        VYSION_MUSIC_PLAYLIST_TABLES_MISSING_CODE,
      )
    }
    throw new VysionMusicPlaylistError(error.message, 500)
  }

  const rows = data ?? []
  if (rows.length === 0) return []

  const ids = rows.map((r) => r.id as string)
  const { data: trackRows, error: trackErr } = await supabase
    .from('vysion_music_playlist_tracks')
    .select('playlist_id')
    .eq('tenant_slug', tenantSlug)
    .in('playlist_id', ids)

  if (trackErr) {
    throw new VysionMusicPlaylistError(trackErr.message, 500)
  }

  const counts = new Map<string, number>()
  for (const tr of trackRows ?? []) {
    const pid = tr.playlist_id as string
    counts.set(pid, (counts.get(pid) ?? 0) + 1)
  }

  return rows.map((r) => ({
    id: r.id as string,
    name: (r.name as string) || '',
    trackCount: counts.get(r.id as string) ?? 0,
    updatedAt: (r.updated_at as string) || new Date().toISOString(),
  }))
}

export async function getVysionMusicPlaylist(
  tenantSlug: string,
  playlistId: string,
): Promise<VysionMusicPlaylistDetail | null> {
  const supabase = requireDb()
  let soundtrackPlaylistId: string | null = null
  type PlaylistRow = {
    id: string
    name: string
    updated_at: string
    soundtrack_playlist_id?: string | null
  }

  let playlist: PlaylistRow | null = null
  let error: { message: string } | null = null

  const primary = await supabase
    .from('vysion_music_playlists')
    .select('id, name, updated_at, soundtrack_playlist_id')
    .eq('tenant_slug', tenantSlug)
    .eq('id', playlistId)
    .maybeSingle()

  if (primary.error && isMissingSoundtrackPlaylistIdColumn(primary.error.message)) {
    const fallback = await supabase
      .from('vysion_music_playlists')
      .select('id, name, updated_at')
      .eq('tenant_slug', tenantSlug)
      .eq('id', playlistId)
      .maybeSingle()
    playlist = (fallback.data as PlaylistRow | null) ?? null
    error = fallback.error
  } else {
    playlist = (primary.data as PlaylistRow | null) ?? null
    error = primary.error
  }

  if (error) {
    if (isMissingTableError(error.message)) {
      throw new VysionMusicPlaylistError(
        'Playlist tables not migrated',
        503,
        VYSION_MUSIC_PLAYLIST_TABLES_MISSING_CODE,
      )
    }
    throw new VysionMusicPlaylistError(error.message, 500)
  }
  if (!playlist) return null

  soundtrackPlaylistId =
    typeof playlist.soundtrack_playlist_id === 'string'
      ? playlist.soundtrack_playlist_id.trim() || null
      : null

  const { data: tracks, error: trackErr } = await supabase
    .from('vysion_music_playlist_tracks')
    .select(
      'soundtrack_track_id, name, artist, duration_ms, image_url, sort_order',
    )
    .eq('tenant_slug', tenantSlug)
    .eq('playlist_id', playlistId)
    .order('sort_order', { ascending: true })

  if (trackErr) throw new VysionMusicPlaylistError(trackErr.message, 500)

  return {
    id: playlist.id as string,
    name: (playlist.name as string) || '',
    updatedAt: (playlist.updated_at as string) || new Date().toISOString(),
    soundtrackPlaylistId,
    tracks: (tracks ?? []).map((t) => ({
      id: t.soundtrack_track_id as string,
      name: (t.name as string) || '',
      artist: (t.artist as string) || '',
      durationMs: Number(t.duration_ms) || 0,
      imageUrl: (t.image_url as string | null) ?? null,
    })),
  }
}

export async function saveVysionMusicPlaylist(
  tenantSlug: string,
  input: {
    id?: string | null
    name: string
    tracks: VysionMusicPlaylistTrackPayload[]
  },
): Promise<VysionMusicPlaylistDetail> {
  const name = input.name.trim()
  if (!name) throw new VysionMusicPlaylistError('Playlist name required')
  if (input.tracks.length === 0) {
    throw new VysionMusicPlaylistError('Add at least one track')
  }

  const supabase = requireDb()
  const now = new Date().toISOString()
  let playlistId = input.id?.trim() || ''

  let existingSoundtrackPlaylistId: string | null = null

  if (playlistId) {
    type ExistingRow = { id: string; soundtrack_playlist_id?: string | null }
    let existing: ExistingRow | null = null
    let exErr: { message: string } | null = null

    const primaryEx = await supabase
      .from('vysion_music_playlists')
      .select('id, soundtrack_playlist_id')
      .eq('tenant_slug', tenantSlug)
      .eq('id', playlistId)
      .maybeSingle()

    if (primaryEx.error && isMissingSoundtrackPlaylistIdColumn(primaryEx.error.message)) {
      const fb = await supabase
        .from('vysion_music_playlists')
        .select('id')
        .eq('tenant_slug', tenantSlug)
        .eq('id', playlistId)
        .maybeSingle()
      existing = (fb.data as ExistingRow | null) ?? null
      exErr = fb.error
    } else {
      existing = (primaryEx.data as ExistingRow | null) ?? null
      exErr = primaryEx.error
    }

    if (exErr) throw new VysionMusicPlaylistError(exErr.message, 500)
    if (!existing) throw new VysionMusicPlaylistError('Playlist not found', 404)
    existingSoundtrackPlaylistId =
      typeof existing.soundtrack_playlist_id === 'string'
        ? existing.soundtrack_playlist_id.trim() || null
        : null

    const { error: updErr } = await supabase
      .from('vysion_music_playlists')
      .update({ name, updated_at: now })
      .eq('tenant_slug', tenantSlug)
      .eq('id', playlistId)
    if (updErr) throw new VysionMusicPlaylistError(updErr.message, 500)
  } else {
    const { data: inserted, error: insErr } = await supabase
      .from('vysion_music_playlists')
      .insert({ tenant_slug: tenantSlug, name, updated_at: now })
      .select('id')
      .single()
    if (insErr) {
      if (isMissingTableError(insErr.message)) {
        throw new VysionMusicPlaylistError(
          'Playlist tables not migrated',
          503,
          VYSION_MUSIC_PLAYLIST_TABLES_MISSING_CODE,
        )
      }
      throw new VysionMusicPlaylistError(insErr.message, 500)
    }
    playlistId = inserted.id as string
  }

  const { error: delErr } = await supabase
    .from('vysion_music_playlist_tracks')
    .delete()
    .eq('tenant_slug', tenantSlug)
    .eq('playlist_id', playlistId)
  if (delErr) throw new VysionMusicPlaylistError(delErr.message, 500)

  const trackRows = input.tracks.map((t, idx) => ({
    tenant_slug: tenantSlug,
    playlist_id: playlistId,
    soundtrack_track_id: t.id,
    name: t.name,
    artist: t.artist,
    duration_ms: t.durationMs,
    image_url: t.imageUrl,
    sort_order: idx,
  }))

  const { error: tracksErr } = await supabase
    .from('vysion_music_playlist_tracks')
    .insert(trackRows)
  if (tracksErr) throw new VysionMusicPlaylistError(tracksErr.message, 500)

  try {
    const soundtrackId = await syncManualPlaylistToSoundtrackLibrary({
      name,
      trackIds: input.tracks.map((t) => t.id),
      soundtrackPlaylistId: existingSoundtrackPlaylistId,
    })
    await persistSoundtrackPlaylistId(tenantSlug, playlistId, soundtrackId)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Soundtrack sync failed'
    throw new VysionMusicPlaylistError(
      msg,
      502,
      VYSION_MUSIC_PLAYLIST_SOUNDTRACK_SYNC_FAILED_CODE,
    )
  }

  const detail = await getVysionMusicPlaylist(tenantSlug, playlistId)
  if (!detail) throw new VysionMusicPlaylistError('Save failed', 500)
  return detail
}

export async function deleteVysionMusicPlaylist(
  tenantSlug: string,
  playlistId: string,
): Promise<void> {
  const supabase = requireDb()
  const { error } = await supabase
    .from('vysion_music_playlists')
    .delete()
    .eq('tenant_slug', tenantSlug)
    .eq('id', playlistId)
  if (error) throw new VysionMusicPlaylistError(error.message, 500)
}
