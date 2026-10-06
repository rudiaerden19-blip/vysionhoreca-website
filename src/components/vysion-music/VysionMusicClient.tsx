'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLanguage } from '@/i18n'
import { getAuthHeaders } from '@/lib/auth-headers'
import { quantizeVolumeUiPercent } from '@/lib/soundtrack/soundtrack-server'
import {
  VYSION_MUSIC_TRACK_FADE_MS,
  trackIdentity,
} from '@/lib/vysion-music-track-fade'
import {
  VmPause,
  VmPlay,
  VmSkipBack,
  VmSkipForward,
  VmStop,
} from './VysionMusicIcons'
import type { VysionMusicCatalogTrack } from './vysion-music-catalog-cache'
import { VysionMusicCatalogPanel } from './VysionMusicCatalogPanel'
import { perfLog, perfNow } from './vysion-music-perf'
import { vysionMusicTrackRowIsNowPlaying } from './vysion-music-track-match'
import { VolumeSliderVertical } from './VolumeSliderVertical'
import { VolumeSpeakerArt } from './VolumeSpeakerArt'
import { VuMeterStereo } from './VuMeterStereo'
import styles from './vysion-music.module.css'

const VM_ICON_STROKE = 2.35

/** Snapshot polling — sneller tijdens play + burst vlak voor einde track (auto-volgende). */
const SNAPSHOT_POLL_IDLE_MS = 6000
const SNAPSHOT_POLL_PLAYING_MS = 1500
const SNAPSHOT_POLL_NEAR_END_MS = 500
const SNAPSHOT_NEAR_END_WINDOW_MS = 8000

/** Max tracks in één queue-mutatie (van geklikte song t/m einde playlist). */
const PLAYLIST_QUEUE_MAX_TRACKS = 80

type TrackRow = {
  id: string
  name: string
  artist: string
  durationMs: number
  imageUrl: string | null
}

type Snapshot = {
  zoneName: string
  online: boolean
  deviceName: string | null
  playbackState: string
  volume: number
  nowPlaying: {
    track: TrackRow | null
    startedAt: string | null
    progressMs: number
  }
  playFromPlaylistId?: string | null
}

type TransportPending = 'prev' | 'play' | 'pause' | 'stop' | 'skipNext'

function formatMs(ms: number): string {
  if (!ms || ms < 0) return '0:00'
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function proxiedCoverUrl(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim()
  if (!trimmed || !trimmed.startsWith('http')) return null
  return `/api/soundtrack/cover?url=${encodeURIComponent(trimmed)}`
}

function formatClock(now: Date, locale: string): { date: string; time: string } {
  const date = now.toLocaleDateString(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const time = now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false })
  return { date, time }
}

export function VysionMusicClient({
  tenant,
  businessName,
  kassaHref,
}: {
  tenant: string
  businessName: string
  kassaHref: string
}) {
  const { t, locale } = useLanguage()
  const apiBase = `/api/soundtrack/${encodeURIComponent(tenant)}`

  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [transportPending, setTransportPending] = useState<TransportPending | null>(null)
  const [clock, setClock] = useState(() => new Date())
  const [tick, setTick] = useState(0)
  const [volumeUi, setVolumeUi] = useState(0)
  const [coverBroken, setCoverBroken] = useState(false)
  const [playlistSelecting, setPlaylistSelecting] = useState(false)
  const [optimisticTrack, setOptimisticTrack] = useState<TrackRow | null>(null)
  const [playbackSourceId, setPlaybackSourceId] = useState<string | null>(null)

  const volumeSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const volumeSyncGeneration = useRef(0)
  const lastVolumeSentRef = useRef<number | null>(null)
  const volumeUiPendingRef = useRef<number | null>(null)
  const volumeDraggingRef = useRef(false)
  const nowLeftRef = useRef<HTMLDivElement>(null)
  const lastTrackKeyRef = useRef('')
  const optimisticStartedAtRef = useRef<string | null>(null)
  const confirmSessionRef = useRef(0)
  const snapshotRef = useRef<Snapshot | null>(null)
  const optimisticTrackRef = useRef<TrackRow | null>(null)

  const applyServerVolume = useCallback((v: number) => {
    const q = quantizeVolumeUiPercent(v)
    if (volumeDraggingRef.current || volumeUiPendingRef.current != null) return
    setVolumeUi(q)
  }, [])

  const mergeSnapshot = useCallback(
    (snap: Snapshot, opts?: { ignoreVolume?: boolean }) => {
      setSnapshot((prev) => {
        let volume = snap.volume
        const pending = volumeUiPendingRef.current
        if (pending != null) volume = pending
        else if (opts?.ignoreVolume && prev) volume = prev.volume
        else if (volumeDraggingRef.current && prev) volume = prev.volume
        return volume === snap.volume ? snap : { ...snap, volume }
      })
      applyServerVolume(snap.volume)
    },
    [applyServerVolume],
  )

  const fetchSnapshot = useCallback(async (): Promise<Snapshot | null> => {
    const res = await fetch(apiBase, { headers: getAuthHeaders(), cache: 'no-store' })
    const json = (await res.json()) as { snapshot?: Snapshot; error?: string }
    if (!res.ok) {
      setError(json.error || t('vysionMusic.errorLoad'))
      return null
    }
    return json.snapshot ?? null
  }, [apiBase, t])

  const loadSnapshot = useCallback(async () => {
    try {
      const snap = await fetchSnapshot()
      if (snap) {
        mergeSnapshot(snap)
        setError(null)
      }
    } catch {
      setError(t('vysionMusic.errorNetwork'))
    }
  }, [fetchSnapshot, mergeSnapshot, t])

  const postMutation = useCallback(
    async (
      mutation: string,
      input: Record<string, unknown> = {},
      opts?: { silent?: boolean; transportPending?: TransportPending; volumeGeneration?: number },
    ) => {
      const transportKey = opts?.transportPending
      if (!opts?.silent && transportKey) setTransportPending(transportKey)
      try {
        const res = await fetch(apiBase, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ mutation, input }),
        })
        const json = (await res.json()) as { snapshot?: Snapshot; error?: string; ok?: boolean }
        if (!res.ok || json.ok === false) {
          if (!opts?.silent) setError(json.error || t('vysionMusic.errorControl'))
          return false
        }
        if (!opts?.silent) setError(null)
        if (json.snapshot) {
          const ignoreVolume =
            mutation === 'setVolume' ||
            (opts?.volumeGeneration != null &&
              opts.volumeGeneration !== volumeSyncGeneration.current)
          mergeSnapshot(json.snapshot, { ignoreVolume: !!ignoreVolume })
        }
        return true
      } catch {
        if (!opts?.silent) setError(t('vysionMusic.errorNetwork'))
        return false
      } finally {
        if (!opts?.silent && transportKey) {
          setTransportPending((p) => (p === transportKey ? null : p))
        }
      }
    },
    [apiBase, mergeSnapshot, t],
  )

  useEffect(() => {
    snapshotRef.current = snapshot
  }, [snapshot])

  useEffect(() => {
    optimisticTrackRef.current = optimisticTrack
  }, [optimisticTrack])

  useEffect(() => {
    let cancelled = false
    let timer: number | undefined

    const pollDelayMs = (): number => {
      const snap = snapshotRef.current
      const optimistic = optimisticTrackRef.current
      const playing = optimistic != null || snap?.playbackState === 'playing'
      if (!playing) return SNAPSHOT_POLL_IDLE_MS

      const track = optimistic ?? snap?.nowPlaying.track ?? null
      const durationMs = track?.durationMs ?? 0
      if (!durationMs) return SNAPSHOT_POLL_PLAYING_MS

      const startedAt =
        optimistic != null
          ? optimisticStartedAtRef.current ?? snap?.nowPlaying.startedAt
          : snap?.nowPlaying.startedAt

      let progressMs = snap?.nowPlaying.progressMs ?? 0
      if (startedAt) {
        progressMs = Math.min(
          durationMs,
          Math.max(0, Date.now() - new Date(startedAt).getTime()),
        )
      }

      const remaining = durationMs - progressMs
      if (remaining <= SNAPSHOT_NEAR_END_WINDOW_MS) return SNAPSHOT_POLL_NEAR_END_MS
      return SNAPSHOT_POLL_PLAYING_MS
    }

    const run = async () => {
      if (cancelled) return
      await loadSnapshot()
      if (cancelled) return
      timer = window.setTimeout(() => void run(), pollDelayMs())
    }

    void run()
    return () => {
      cancelled = true
      if (timer != null) window.clearTimeout(timer)
    }
  }, [loadSnapshot])

  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  const syncVolume = useCallback(
    (v: number, immediate?: boolean) => {
      if (immediate && lastVolumeSentRef.current === v) return
      if (volumeSyncTimer.current) clearTimeout(volumeSyncTimer.current)
      const send = () => {
        lastVolumeSentRef.current = v
        const gen = ++volumeSyncGeneration.current
        void postMutation('setVolume', { volume: v }, { silent: true, volumeGeneration: gen })
      }
      if (immediate) send()
      else volumeSyncTimer.current = setTimeout(send, 320)
    },
    [postMutation],
  )

  useEffect(() => {
    return () => {
      if (volumeSyncTimer.current) clearTimeout(volumeSyncTimer.current)
    }
  }, [])

  useEffect(() => {
    const server = snapshot?.nowPlaying.track
    if (!optimisticTrack || !server?.id) return
    const sameId = server.id === optimisticTrack.id
    const sameMeta =
      server.name.trim().toLowerCase() === optimisticTrack.name.trim().toLowerCase() &&
      server.artist.trim().toLowerCase() === optimisticTrack.artist.trim().toLowerCase()
    if (sameId || sameMeta) {
      setOptimisticTrack(null)
      optimisticStartedAtRef.current = null
    }
  }, [snapshot?.nowPlaying.track, optimisticTrack])

  useEffect(() => {
    const playing =
      optimisticTrack != null || snapshot?.playbackState === 'playing'
    if (!playing) return
    const id = window.setInterval(() => {
      setTick((n) => n + 1)
      const snap = snapshotRef.current
      const optimistic = optimisticTrackRef.current
      const track = optimistic ?? snap?.nowPlaying.track ?? null
      const durationMs = track?.durationMs ?? 0
      if (!durationMs || !snap) return
      const startedAt =
        optimistic != null
          ? optimisticStartedAtRef.current ?? snap.nowPlaying.startedAt
          : snap.nowPlaying.startedAt
      if (!startedAt) return
      const progressMs = Math.min(
        durationMs,
        Math.max(0, Date.now() - new Date(startedAt).getTime()),
      )
      if (durationMs - progressMs <= 1500) void loadSnapshot()
    }, 1000)
    return () => window.clearInterval(id)
  }, [optimisticTrack, loadSnapshot, snapshot?.playbackState, snapshot?.nowPlaying.startedAt])

  const nowTrack = optimisticTrack ?? snapshot?.nowPlaying.track ?? null
  const playbackState =
    optimisticTrack != null ? 'playing' : (snapshot?.playbackState ?? 'paused')
  const nowTrackId = nowTrack?.id ?? null
  const nowTrackImageUrl = nowTrack?.imageUrl ?? null

  useEffect(() => {
    const key = trackIdentity(nowTrack)
    if (!key) return
    if (lastTrackKeyRef.current && lastTrackKeyRef.current !== key) {
      const el = nowLeftRef.current
      if (el) {
        void el.animate([{ opacity: 0.15 }, { opacity: 1 }], {
          duration: VYSION_MUSIC_TRACK_FADE_MS,
          easing: 'ease-in-out',
          fill: 'forwards',
        })
      }
    }
    lastTrackKeyRef.current = key
  }, [nowTrack?.id, nowTrack?.name, nowTrack?.artist, nowTrack])

  useEffect(() => {
    setCoverBroken(false)
  }, [nowTrackId, nowTrackImageUrl])

  const pollUntilNowPlayingMatches = useCallback(
    async (expected: VysionMusicCatalogTrack, mutationStartedAt: number) => {
      const session = ++confirmSessionRef.current
      const waits = [0, 500, 1000, 2000]
      let prev = 0
      for (const target of waits) {
        if (session !== confirmSessionRef.current) return
        const delay = target - prev
        prev = target
        if (delay > 0) {
          await new Promise<void>((resolve) => window.setTimeout(resolve, delay))
        }
        if (session !== confirmSessionRef.current) return
        const snapT0 = perfNow()
        try {
          const snap = await fetchSnapshot()
          if (session !== confirmSessionRef.current) return
          if (snap) mergeSnapshot(snap)
          const nowRow = snap?.nowPlaying.track ?? null
          const match = vysionMusicTrackRowIsNowPlaying(
            expected,
            nowRow
              ? { id: nowRow.id, name: nowRow.name, artist: nowRow.artist }
              : null,
          )
          perfLog(`track-confirm-snapshot-${target}ms`, snapT0, {
            expectedTrackId: expected.id,
            nowId: nowRow?.id ?? null,
            match,
          })
          if (match) {
            perfLog('track-soundtrack-confirmation-total', mutationStartedAt, {
              expectedTrackId: expected.id,
              matchedAfterMs: target,
            })
            setOptimisticTrack(null)
            optimisticStartedAtRef.current = null
            return
          }
        } catch {
          /* volgende poging */
        }
      }
    },
    [fetchSnapshot, mergeSnapshot],
  )

  const applyOptimisticNowPlaying = useCallback((track: VysionMusicCatalogTrack) => {
    const clickT0 = perfNow()
    const row: TrackRow = {
      id: track.id,
      name: track.name,
      artist: track.artist,
      durationMs: track.durationMs,
      imageUrl: track.imageUrl,
    }
    optimisticStartedAtRef.current = new Date().toISOString()
    setOptimisticTrack(row)
    perfLog('track-ui-update', clickT0, { trackId: track.id })
    const coverUrl = proxiedCoverUrl(track.imageUrl)
    if (coverUrl) {
      const img = new Image()
      img.referrerPolicy = 'no-referrer'
      img.src = coverUrl
    }
    return clickT0
  }, [])

  const queueTrackNow = useCallback(
    async (track: VysionMusicCatalogTrack) => {
      applyOptimisticNowPlaying(track)
      setPlaylistSelecting(true)
      const mutationT0 = perfNow()
      try {
        const ok = await postMutation('soundZoneQueueTracks', {
          tracks: [track.id],
          immediate: true,
          clearQueuedTracks: true,
        })
        perfLog('track-mutation-response', mutationT0, { ok, trackId: track.id })
        if (ok) void pollUntilNowPlayingMatches(track, mutationT0)
      } finally {
        setPlaylistSelecting(false)
      }
    },
    [applyOptimisticNowPlaying, pollUntilNowPlayingMatches, postMutation],
  )

  /**
   * Playlist: queueTracks (wisselt meteen van song) + rest van lijst in queue voor auto-volgende.
   * assignSource alleen wisselde vaak niet van audio — queue wel.
   */
  const playPlaylistTrack = useCallback(
    async (
      sourceId: string,
      track: VysionMusicCatalogTrack,
      trackIndex: number,
      playlistTracks: VysionMusicCatalogTrack[],
    ) => {
      setPlaybackSourceId(sourceId)
      applyOptimisticNowPlaying(track)
      setPlaylistSelecting(true)
      const mutationT0 = perfNow()
      const fromHere = playlistTracks.slice(Math.max(0, trackIndex)).map((t) => t.id)
      const tracksToQueue =
        fromHere.length > 0 ? fromHere.slice(0, PLAYLIST_QUEUE_MAX_TRACKS) : [track.id]
      try {
        const ok = await postMutation('soundZoneQueueTracks', {
          tracks: tracksToQueue,
          immediate: true,
          clearQueuedTracks: true,
        })
        perfLog('playlist-track-queue-response', mutationT0, {
          ok,
          trackId: track.id,
          trackIndex,
          queuedCount: tracksToQueue.length,
        })
        if (ok) void pollUntilNowPlayingMatches(track, mutationT0)
      } finally {
        setPlaylistSelecting(false)
      }
    },
    [applyOptimisticNowPlaying, pollUntilNowPlayingMatches, postMutation],
  )

  const playSearchTrack = useCallback(
    async (track: VysionMusicCatalogTrack) => {
      setPlaybackSourceId(null)
      await queueTrackNow(track)
    },
    [queueTrackNow],
  )

  const durationMs = nowTrack?.durationMs ?? 0
  const startedAt =
    optimisticTrack != null
      ? optimisticStartedAtRef.current ?? snapshot?.nowPlaying.startedAt
      : snapshot?.nowPlaying.startedAt

  let progressMs = snapshot?.nowPlaying.progressMs ?? 0
  if (optimisticTrack && optimisticStartedAtRef.current && durationMs) {
    progressMs = Math.min(
      durationMs,
      Math.max(0, Date.now() - new Date(optimisticStartedAtRef.current).getTime()),
    )
  } else if (optimisticTrack) progressMs = 0
  else if (playbackState === 'playing' && startedAt && durationMs) {
    progressMs = Math.min(
      durationMs,
      Math.max(0, Date.now() - new Date(startedAt).getTime()),
    )
  }
  void tick

  const progressPct = durationMs > 0 ? (progressMs / durationMs) * 100 : 0
  const isPlaying = playbackState === 'playing'
  const playPausePending: TransportPending = isPlaying ? 'pause' : 'play'
  const { date: clockDate, time: clockTime } = formatClock(clock, locale)

  const coverSrc = coverBroken ? null : proxiedCoverUrl(nowTrackImageUrl)

  const playFromId = snapshot?.playFromPlaylistId?.trim() || null

  const catalogBusy = playlistSelecting || transportPending != null

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href={kassaHref} className={styles.menuBtn} prefetch={false}>
            <span className={styles.menuIcon} aria-hidden>
              <span />
              <span />
              <span />
            </span>
            <span className={styles.menuBtnLabel}>{t('vysionMusic.backToKassa')}</span>
          </Link>
        </div>
        <div className={styles.brand}>
          <span className={styles.brandVysion}>
            VYSI<span className={styles.brandO} aria-hidden />N
          </span>
          <span className={styles.brandDivider} aria-hidden />
          <span className={styles.brandMusic}>MUSIC</span>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.venueName}>{businessName}</span>
          <div className={styles.clockBlock}>
            <div className={styles.clockDate}>{clockDate}</div>
            <div className={styles.clockTime}>{clockTime}</div>
          </div>
        </div>
      </header>

      {error ? (
        <div className={styles.errorBanner} role="alert">
          <span className={styles.errorBannerText}>{error}</span>
          <button
            type="button"
            className={styles.errorDismiss}
            aria-label={t('vysionMusic.errorDismiss')}
            onClick={() => setError(null)}
          >
            ×
          </button>
        </div>
      ) : null}

      <section className={styles.nowPlaying}>
        <div className={styles.nowLeft} ref={nowLeftRef}>
          <div className={styles.coverFrame}>
            {coverSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={nowTrackId ?? 'cover'}
                src={coverSrc}
                alt=""
                className={styles.cover}
                referrerPolicy="no-referrer"
                onError={() => setCoverBroken(true)}
              />
            ) : (
              <div className={styles.coverPlaceholder} aria-hidden />
            )}
          </div>
          <div className={styles.trackMain}>
            <div className={styles.nowLabel}>{t('vysionMusic.nowPlaying')}</div>
            <h1 className={styles.trackTitle}>{nowTrack?.name ?? '—'}</h1>
            <p className={styles.trackArtist}>{nowTrack?.artist ?? '—'}</p>
            <div className={styles.progressRow}>
              <span className={styles.timeLabel}>{formatMs(progressMs)}</span>
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
              </div>
              <span className={styles.timeLabel}>{formatMs(durationMs)}</span>
            </div>
          </div>
        </div>
        <div className={styles.nowRight}>
          <div className={styles.controlsBlock}>
            <div className={styles.transport}>
              <button
                type="button"
                className={styles.transportBtn}
                disabled
                aria-label={t('vysionMusic.prev')}
                title={t('vysionMusic.prevUnavailable')}
              >
                <VmSkipBack className={styles.transportIcon} strokeWidth={VM_ICON_STROKE} />
              </button>
              <button
                type="button"
                className={styles.transportPrimary}
                disabled={transportPending === playPausePending}
                aria-label={isPlaying ? t('vysionMusic.pause') : t('vysionMusic.play')}
                onClick={() =>
                  void postMutation(isPlaying ? 'pause' : 'play', {}, {
                    transportPending: playPausePending,
                  })
                }
              >
                {isPlaying ? (
                  <VmPause className={styles.transportIconPrimary} strokeWidth={VM_ICON_STROKE} />
                ) : (
                  <VmPlay className={styles.transportIconPrimary} filled strokeWidth={VM_ICON_STROKE} />
                )}
              </button>
              <button
                type="button"
                className={styles.transportBtn}
                disabled={transportPending === 'stop'}
                aria-label={t('vysionMusic.stop')}
                onClick={() => void postMutation('pause', {}, { transportPending: 'stop' })}
              >
                <VmStop className={styles.transportIcon} strokeWidth={VM_ICON_STROKE} />
              </button>
              <button
                type="button"
                className={styles.transportBtn}
                disabled={transportPending === 'skipNext'}
                aria-label={t('vysionMusic.next')}
                onClick={() =>
                  void postMutation('skipTrack', {}, { transportPending: 'skipNext' })
                }
              >
                <VmSkipForward className={styles.transportIcon} strokeWidth={VM_ICON_STROKE} />
              </button>
            </div>
          </div>
          <div className={styles.volumeColumn}>
            <div className={styles.volumeControlsRow}>
              <VuMeterStereo
                playing={isPlaying}
                volumePercent={volumeUi}
                trackKey={trackIdentity(nowTrack)}
              />
              <div className={styles.volumeSliderStack}>
                <span className={styles.volumeIconLarge} aria-hidden>
                  <VolumeSpeakerArt large />
                </span>
                <div className={styles.volumeSliderWrap}>
                  <VolumeSliderVertical
                    value={volumeUi}
                    ariaLabel={t('vysionMusic.volume')}
                    onDragChange={(dragging) => {
                      volumeDraggingRef.current = dragging
                    }}
                    onChange={(v) => {
                      volumeUiPendingRef.current = v
                      setVolumeUi(v)
                      setSnapshot((s) => (s ? { ...s, volume: v } : s))
                    }}
                    onCommit={(v) => syncVolume(v, true)}
                  />
                </div>
                <span className={styles.volumeIcon} aria-hidden>
                  <VolumeSpeakerArt />
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <VysionMusicCatalogPanel
        tenant={tenant}
        activeSourceId={playFromId}
        playingSourceId={playbackSourceId}
        nowPlayingTrack={
          nowTrack
            ? { id: nowTrack.id, name: nowTrack.name, artist: nowTrack.artist }
            : null
        }
        nowPlaying={isPlaying}
        busy={catalogBusy}
        onPlayPlaylistTrack={playPlaylistTrack}
        onPlaySearchTrack={playSearchTrack}
      />

      <div className={styles.statusBar}>{t('vysionMusic.statusFooter')}</div>
    </div>
  )
}
