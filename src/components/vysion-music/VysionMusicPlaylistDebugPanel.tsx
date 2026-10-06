'use client'

import styles from './vysion-music.module.css'

export type PlaylistTrackDebugState = {
  click?: Record<string, unknown>
  sourceResolution?: Record<string, unknown>
  assign?: {
    request?: Record<string, unknown>
    response?: Record<string, unknown>
    ok?: boolean
    errorMessage?: string | null
  }
  play?: {
    executed?: boolean
    request?: Record<string, unknown>
    response?: Record<string, unknown>
    ok?: boolean
    errorMessage?: string | null
  }
  snapshotAfter?: Record<string, unknown>
}

function section(
  prev: Record<string, unknown> | undefined,
  partial: unknown,
): Record<string, unknown> | undefined {
  if (!partial || typeof partial !== 'object') return prev
  return { ...(prev ?? {}), ...(partial as Record<string, unknown>) }
}

export function mergePlaylistTrackDebugState(
  prev: PlaylistTrackDebugState | null,
  partial: Record<string, unknown>,
): PlaylistTrackDebugState {
  const base = prev ?? {}
  return {
    click: section(base.click, partial.click) ?? base.click,
    sourceResolution:
      (partial.sourceResolution as Record<string, unknown> | undefined) ?? base.sourceResolution,
    assign: section(base.assign, partial.assign) as PlaylistTrackDebugState['assign'],
    play: section(base.play, partial.play) as PlaylistTrackDebugState['play'],
    snapshotAfter:
      (partial.snapshotAfter as Record<string, unknown> | undefined) ?? base.snapshotAfter,
  }
}

function responseFailed(block?: {
  ok?: boolean
  response?: Record<string, unknown>
  errorMessage?: string | null
}): boolean {
  if (!block) return false
  if (block.ok === false) return true
  if (block.errorMessage) return true
  const res = block.response
  if (!res) return false
  const http = res.httpStatus
  if (typeof http === 'number' && (http < 200 || http >= 300)) return true
  const errs = res.errors
  return Array.isArray(errs) && errs.length > 0
}

export function playlistTrackDebugStatus(state: PlaylistTrackDebugState | null): string {
  if (!state?.click) return '—'
  if (responseFailed(state.assign)) return 'ASSIGN ERROR'
  if (state.play?.executed && responseFailed(state.play)) return 'PLAY ERROR'
  const clicked = String(state.click.clickedTrackId ?? '').trim()
  const snap = state.snapshotAfter
  if (snap && clicked) {
    const nowId = String(snap.nowPlayingTrackId ?? '').trim()
    if (nowId && nowId === clicked) return 'TRACK GEWIJZIGD'
    if (state.play?.executed) return 'TRACK NIET GEWIJZIGD'
  }
  if (state.play?.executed && state.play.ok !== false) return 'PLAY VERSTUURD'
  if (state.assign && state.assign.ok !== false && !responseFailed(state.assign)) {
    return 'ASSIGN VERSTUURD'
  }
  return 'CLICK ONTVANGEN'
}

function DebugBlock({ title, data }: { title: string; data: unknown }) {
  if (data == null) return null
  return (
    <div className={styles.playlistDebugSection}>
      <div className={styles.playlistDebugSectionTitle}>{title}</div>
      <pre className={styles.playlistDebugPre}>{JSON.stringify(data, null, 2)}</pre>
    </div>
  )
}

export function VysionMusicPlaylistDebugPanel({ state }: { state: PlaylistTrackDebugState | null }) {
  if (!state?.click) return null

  const playRequest = {
    uitgevoerd: state.play?.executed ? 'JA' : 'NEE',
    ...(state.play?.request ? { request: state.play.request } : {}),
  }

  return (
    <aside className={styles.playlistDebugPanel} aria-live="polite" data-testid="playlist-debug-panel">
      <div className={styles.playlistDebugHeader}>Playlist debug (tijdelijk)</div>
      <div className={styles.playlistDebugStatus}>{playlistTrackDebugStatus(state)}</div>
      <DebugBlock title="1. CLICK" data={state.click} />
      <DebugBlock title="1b. SOURCE RESOLUTION" data={state.sourceResolution} />
      <DebugBlock title="2. ASSIGN REQUEST" data={state.assign?.request} />
      <DebugBlock title="3. ASSIGN RESPONSE" data={state.assign?.response} />
      <DebugBlock title="4. PLAY REQUEST" data={playRequest} />
      <DebugBlock title="5. PLAY RESPONSE" data={state.play?.response} />
      <DebugBlock title="6. SNAPSHOT AFTER" data={state.snapshotAfter} />
    </aside>
  )
}
