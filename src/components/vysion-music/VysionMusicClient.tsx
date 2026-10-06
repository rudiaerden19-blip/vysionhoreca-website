'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { VysionMusicCatalogPanel } from './VysionMusicCatalogPanel'
import {
  mergePlaylistTrackDebugState,
  VysionMusicPlaylistDebugPanel,
  type PlaylistTrackDebugState,
} from './VysionMusicPlaylistDebugPanel'
import { VolumeSliderVertical } from './VolumeSliderVertical'
import { VolumeSpeakerArt } from './VolumeSpeakerArt'
import { VuMeterStereo } from './VuMeterStereo'
import styles from './vysion-music.module.css'

const VM_ICON_STROKE = 2.35

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

  const volumeSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const volumeSyncGeneration = useRef(0)
  const lastVolumeSentRef = useRef<number | null>(null)
  const volumeUiPendingRef = useRef<number | null>(null)
  const volumeDraggingRef = useRef(false)
  const nowLeftRef = useRef<HTMLDivElement>(null)
  const lastTrackKeyRef = useRef('')

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

  const loadSnapshot = useCallback(async () => {
    try {
      const res = await fetch(apiBase, { headers: getAuthHeaders(), cache: 'no-store' })
      const json = (await res.json()) as { snapshot?: Snapshot; error?: string }
      if (!res.ok) {
        setError(json.error || t('vysionMusic.errorLoad'))
        return
      }
      if (json.snapshot) {
        mergeSnapshot(json.snapshot)
        setError(null)
      }
    } catch {
      setError(t('vysionMusic.errorNetwork'))
    }
  }, [apiBase, mergeSnapshot, t])

  const [playlistDebug, setPlaylistDebug] = useState<PlaylistTrackDebugState | null>(null)
  const mergePlaylistDebugRef = useRef<(partial: Record<string, unknown>) => void>(() => {})
  mergePlaylistDebugRef.current = (partial) => {
    setPlaylistDebug((prev) => mergePlaylistTrackDebugState(prev, partial))
  }

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
        const json = (await res.json()) as {
          snapshot?: Snapshot
          error?: string
          ok?: boolean
          debug?: { playlistTrack?: Record<string, unknown> }
        }
        if (json.debug?.playlistTrack) {
          mergePlaylistDebugRef.current(json.debug.playlistTrack)
        }
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
    void loadSnapshot()
    const id = window.setInterval(() => void loadSnapshot(), 6000)
    return () => window.clearInterval(id)
  }, [loadSnapshot])

  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (snapshot?.playbackState !== 'playing') return
    const id = window.setInterval(() => setTick((n) => n + 1), 1000)
    return () => window.clearInterval(id)
  }, [snapshot?.playbackState, snapshot?.nowPlaying.startedAt])

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

  const nowTrack = snapshot?.nowPlaying.track
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

  const durationMs = nowTrack?.durationMs ?? 0
  let progressMs = snapshot?.nowPlaying.progressMs ?? 0
  if (snapshot?.playbackState === 'playing' && snapshot.nowPlaying.startedAt && durationMs) {
    progressMs = Math.min(
      durationMs,
      Math.max(0, Date.now() - new Date(snapshot.nowPlaying.startedAt).getTime()),
    )
  }
  void tick

  const progressPct = durationMs > 0 ? (progressMs / durationMs) * 100 : 0
  const isPlaying = snapshot?.playbackState === 'playing'
  const playPausePending: TransportPending = isPlaying ? 'pause' : 'play'
  const { date: clockDate, time: clockTime } = formatClock(clock, locale)

  useEffect(() => {
    setCoverBroken(false)
  }, [nowTrack?.imageUrl, nowTrack?.id])

  const coverSrc = useMemo(() => {
    const raw = nowTrack?.imageUrl?.trim()
    if (!raw || coverBroken) return null
    return `/api/soundtrack/cover?url=${encodeURIComponent(raw)}`
  }, [nowTrack?.imageUrl, coverBroken, nowTrack?.id])

  const playFromId = snapshot?.playFromPlaylistId?.trim() || null

  const catalogBusy = playlistSelecting || transportPending != null

  const refreshSnapshotAfterControl = useCallback(() => {
    void loadSnapshot()
    window.setTimeout(() => void loadSnapshot(), 1500)
  }, [loadSnapshot])

  const assignSourceAndPlay = useCallback(
    async (
      assignInput: Record<string, unknown>,
      opts?: { logPlaylistTrack?: boolean },
    ): Promise<boolean> => {
      const assignPayload = { immediate: true, ...assignInput }
      if (opts?.logPlaylistTrack) {
        console.info('[soundtrack-debug playlist-post]', {
          mutation: 'soundZoneAssignSource',
          input: assignPayload,
        })
      }
      const assigned = await postMutation('soundZoneAssignSource', assignPayload)
      if (!assigned) return false
      if (opts?.logPlaylistTrack) {
        console.info('[soundtrack-debug playlist-post]', { mutation: 'play', input: {} })
      }
      return postMutation(
        'play',
        opts?.logPlaylistTrack ? { debugPlaylistPlay: true } : {},
        { silent: !opts?.logPlaylistTrack },
      )
    },
    [postMutation],
  )

  const selectLibrarySource = useCallback(
    async (sourceId: string): Promise<boolean> => {
      setPlaylistSelecting(true)
      try {
        const ok = await assignSourceAndPlay({
          source: sourceId,
          sourceTrackIndex: 0,
        })
        if (ok) refreshSnapshotAfterControl()
        return ok
      } finally {
        setPlaylistSelecting(false)
      }
    },
    [assignSourceAndPlay, refreshSnapshotAfterControl],
  )

  const playPlaylistTrack = useCallback(
    async (
      sourceId: string,
      trackId: string,
      meta: {
        sourceTrackIndex: number
        trackTitle: string
        uiPosition: number
        sourceName: string
        sourceTypename?: string
      },
    ): Promise<boolean> => {
      setPlaylistSelecting(true)
      setPlaylistDebug({
        click: {
          sourceId,
          sourceTypename: meta.sourceTypename ?? null,
          sourceName: meta.sourceName,
          clickedTrackId: trackId,
          clickedTrackTitle: meta.trackTitle,
          uiPosition: meta.uiPosition,
          sourceTrackIndex: meta.sourceTrackIndex,
        },
        play: { executed: false },
      })
      try {
        const ok = await assignSourceAndPlay(
          {
            source: sourceId,
            track: trackId,
            sourceTrackIndex: meta.sourceTrackIndex,
            debugTrackId: trackId,
            debugTrackTitle: meta.trackTitle,
            debugUiPosition: meta.uiPosition,
            debugSourceName: meta.sourceName,
          },
          { logPlaylistTrack: true },
        )
        if (ok) refreshSnapshotAfterControl()
        return ok
      } finally {
        setPlaylistSelecting(false)
      }
    },
    [assignSourceAndPlay, refreshSnapshotAfterControl],
  )

  const playSearchTrack = useCallback(
    async (trackId: string) => {
      setPlaylistSelecting(true)
      try {
        await postMutation('soundZoneQueueTracks', {
          tracks: [trackId],
          immediate: true,
          clearQueuedTracks: true,
        })
      } finally {
        setPlaylistSelecting(false)
      }
    },
    [postMutation],
  )

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
        nowTrackId={nowTrack?.id ?? null}
        busy={catalogBusy}
        onSelectPlaylist={selectLibrarySource}
        onPlayPlaylistTrack={playPlaylistTrack}
        onPlaySearchTrack={playSearchTrack}
      />

      <VysionMusicPlaylistDebugPanel state={playlistDebug} />

      <div className={styles.statusBar}>{t('vysionMusic.statusFooter')}</div>
    </div>
  )
}
