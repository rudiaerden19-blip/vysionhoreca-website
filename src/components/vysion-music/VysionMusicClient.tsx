'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLanguage } from '@/i18n'
import { getAuthHeaders } from '@/lib/auth-headers'
import {
  VmEllipsisVertical,
  VmPause,
  VmPlay,
  VmSettings,
  VmSkipBack,
  VmSkipForward,
  VmStop,
} from './VysionMusicIcons'
import {
  filterTracksByArtistQuery,
  prefersArtistOnlySearchResults,
} from '@/lib/soundtrack/soundtrack-search-artist-filter'
import { playSoundtrackPlaylistRow } from '@/lib/soundtrack/soundtrack-playlist-row-play'
import { quantizeVolumeUiPercent } from '@/lib/soundtrack/soundtrack-server'
import {
  VYSION_MUSIC_TRACK_FADE_MS,
  trackIdentity,
} from '@/lib/vysion-music-track-fade'
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
  playlist: TrackRow[]
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
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<TrackRow[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchLoadingMore, setSearchLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [transportPending, setTransportPending] = useState<TransportPending | null>(null)
  const [switchingTrack, setSwitchingTrack] = useState(false)
  const [clock, setClock] = useState(() => new Date())
  const [tick, setTick] = useState(0)
  const [volumeUi, setVolumeUi] = useState(0)
  const [coverBroken, setCoverBroken] = useState(false)

  const volumeSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const volumeSyncGeneration = useRef(0)
  const lastVolumeSentRef = useRef<number | null>(null)
  const volumeUiPendingRef = useRef<number | null>(null)
  const volumeDraggingRef = useRef(false)
  const nowLeftRef = useRef<HTMLDivElement>(null)
  const lastTrackKeyRef = useRef('')
  const searchRequestId = useRef(0)
  const searchQueryRef = useRef(searchQuery)
  const searchAbortRef = useRef<AbortController | null>(null)
  const searchDebounceRef = useRef<number | null>(null)
  searchQueryRef.current = searchQuery

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
      if (json.snapshot) mergeSnapshot(json.snapshot)
    } catch {
      setError(t('vysionMusic.errorNetwork'))
    }
  }, [apiBase, mergeSnapshot, t])

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

  const runSearch = useCallback(
    async (trimmed: string) => {
      searchAbortRef.current?.abort()
      const ac = new AbortController()
      searchAbortRef.current = ac
      if (!trimmed) {
        setSearchResults([])
        setSearchLoading(false)
        setSearchLoadingMore(false)
        return
      }
      const reqId = ++searchRequestId.current
      setSearchLoading(true)
      setSearchResults([])
      const stillCurrent = () =>
        reqId === searchRequestId.current && trimmed === searchQueryRef.current.trim()

      const fetchScope = async (scope: 'quick' | 'full') => {
        const res = await fetch(`${apiBase}?q=${encodeURIComponent(trimmed)}&scope=${scope}`, {
          headers: getAuthHeaders(),
          cache: 'no-store',
          signal: ac.signal,
        })
        const json = (await res.json()) as { search?: { tracks: TrackRow[] } }
        if (!stillCurrent()) return null
        if (!res.ok) return []
        return json.search?.tracks ?? []
      }

      try {
        const quickTracks = await fetchScope('quick')
        if (quickTracks == null) return
        setSearchResults(quickTracks)
        setSearchLoading(false)
        if (
          prefersArtistOnlySearchResults(trimmed) &&
          filterTracksByArtistQuery(quickTracks, trimmed).length > 0
        ) {
          setSearchLoadingMore(true)
          const fullTracks = await fetchScope('full')
          if (fullTracks == null) return
          setSearchResults(fullTracks)
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return
        if (!stillCurrent()) return
        setSearchResults([])
      } finally {
        if (stillCurrent()) {
          setSearchLoading(false)
          setSearchLoadingMore(false)
        }
      }
    },
    [apiBase],
  )

  const submitSearchNow = useCallback(() => {
    const trimmed = searchQueryRef.current.trim()
    if (!trimmed) return
    if (searchDebounceRef.current != null) {
      window.clearTimeout(searchDebounceRef.current)
      searchDebounceRef.current = null
    }
    void runSearch(trimmed)
  }, [runSearch])

  useEffect(() => {
    void loadSnapshot()
    const ms = switchingTrack ? 2000 : 6000
    const id = window.setInterval(() => void loadSnapshot(), ms)
    return () => window.clearInterval(id)
  }, [loadSnapshot, switchingTrack])

  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (snapshot?.playbackState !== 'playing') return
    const id = window.setInterval(() => setTick((n) => n + 1), 1000)
    return () => window.clearInterval(id)
  }, [snapshot?.playbackState, snapshot?.nowPlaying.startedAt])

  useEffect(() => {
    const trimmed = searchQuery.trim()
    if (!trimmed) {
      searchRequestId.current += 1
      searchAbortRef.current?.abort()
      setSearchResults([])
      setSearchLoading(false)
      setSearchLoadingMore(false)
      return
    }
    searchDebounceRef.current = window.setTimeout(() => {
      searchDebounceRef.current = null
      void runSearch(trimmed)
    }, 280)
    return () => {
      if (searchDebounceRef.current != null) {
        window.clearTimeout(searchDebounceRef.current)
      }
      searchRequestId.current += 1
      searchAbortRef.current?.abort()
    }
  }, [searchQuery, runSearch])

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

  /** Afspeellijst (links): alleen Soundtrack setPlayFrom → play → skipTracks. */
  const playPlaylistRow = useCallback(
    async (trackIndex: number) => {
      const source = snapshot?.playFromPlaylistId?.trim()
      if (!source) {
        setError(t('vysionMusic.errorControl'))
        return
      }
      setSwitchingTrack(true)
      setError(null)
      const result = await playSoundtrackPlaylistRow(apiBase, source, trackIndex)
      if (!result.ok) {
        setError(result.error || t('vysionMusic.errorControl'))
      } else if (result.snapshot) {
        mergeSnapshot(result.snapshot as Snapshot)
      }
      setSwitchingTrack(false)
      void loadSnapshot()
    },
    [apiBase, loadSnapshot, mergeSnapshot, snapshot?.playFromPlaylistId, t],
  )

  const playTrack = useCallback(
    async (trackId: string) => {
      if (!trackId || trackId.startsWith('placeholder')) return
      setSwitchingTrack(true)
      await postMutation(
        'soundZoneQueueTracks',
        { tracks: [trackId], immediate: true, clearQueuedTracks: true },
        { silent: true },
      )
      await postMutation('play', {})
      setSwitchingTrack(false)
      void loadSnapshot()
    },
    [loadSnapshot, postMutation],
  )

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

  const queueRows = useMemo(
    () =>
      (snapshot?.playlist ?? []).filter((r) => r.name !== '—' && !r.id.startsWith('placeholder')),
    [snapshot?.playlist],
  )

  const playFromId = snapshot?.playFromPlaylistId?.trim() || ''

  const resultsTitle = searchQuery.trim()
    ? `${t('vysionMusic.resultsPrefix')} – ${searchQuery.trim().toUpperCase()}`
    : t('vysionMusic.resultsEmpty')

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
          <span className={styles.settingsBtn} aria-hidden>
            <VmSettings strokeWidth={VM_ICON_STROKE} />
          </span>
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
            <div className={styles.nowLabel}>
              {switchingTrack ? t('vysionMusic.switchingTrack') : t('vysionMusic.nowPlaying')}
            </div>
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
                disabled={transportPending === 'prev' || !playFromId}
                aria-label={t('vysionMusic.prev')}
                onClick={() => {
                  if (!nowTrack || queueRows.length < 2) return
                  const idx = queueRows.findIndex(
                    (r) => r.id === nowTrack.id && r.name === nowTrack.name,
                  )
                  if (idx > 0) void playPlaylistRow(idx - 1)
                }}
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

      <div className={styles.columns}>
        <div className={styles.panel}>
          <div className={styles.panelTitleRow}>
            <div className={styles.panelTitle}>{t('vysionMusic.playlistTitle')}</div>
          </div>
          <div className={styles.list}>
            {queueRows.length === 0 ? (
              <p className={styles.playlistEmptyDrop}>{t('vysionMusic.playlistModalEmpty')}</p>
            ) : (
              queueRows.map((row, idx) => {
                const active =
                  nowTrack && row.id === nowTrack.id && row.name === nowTrack.name
                return (
                  <div key={`${row.id}-${idx}`} className={styles.listRowWrap}>
                    <button
                      type="button"
                      className={`${styles.listRow} ${active ? styles.listRowActive : ''}`}
                      disabled={switchingTrack || !playFromId}
                      aria-label={`${row.name} – ${t('vysionMusic.play')}`}
                      onClick={() => void playPlaylistRow(idx)}
                    >
                      <span className={styles.rowNum}>{idx + 1}</span>
                      <span className={styles.rowPlay} aria-hidden>
                        <VmPlay className={styles.rowPlayIcon} filled strokeWidth={0} />
                      </span>
                      <span className={styles.rowTitle}>{row.name}</span>
                      <span className={styles.rowArtist}>{row.artist}</span>
                      <span className={styles.rowDur}>{formatMs(row.durationMs)}</span>
                      <span className={styles.rowMenu} aria-hidden>
                        <VmEllipsisVertical strokeWidth={VM_ICON_STROKE} />
                      </span>
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>
        <div className={styles.panel}>
          <div className={styles.searchWrap}>
            <div className={styles.searchBox}>
              <input
                className={styles.searchInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    submitSearchNow()
                  }
                }}
                placeholder={t('vysionMusic.searchPlaceholder')}
                aria-label={t('vysionMusic.searchPlaceholder')}
                enterKeyHint="search"
              />
              {searchQuery.trim() ? (
                <button
                  type="button"
                  className={styles.searchSubmit}
                  aria-label={t('vysionMusic.searchSubmit')}
                  onClick={() => submitSearchNow()}
                >
                  <span aria-hidden>›</span>
                </button>
              ) : null}
            </div>
          </div>
          <div className={styles.panelTitle}>{resultsTitle}</div>
          {searchLoading && searchQuery.trim() && searchResults.length === 0 ? (
            <p className={styles.searchLoading}>{t('vysionMusic.loading')}</p>
          ) : null}
          <div className={styles.list}>
            {searchResults.map((row, idx) => (
              <button
                key={`${row.id}-${idx}-${row.name}`}
                type="button"
                className={`${styles.listRow} ${
                  nowTrack && row.id === nowTrack.id && row.name === nowTrack.name
                    ? styles.listRowActive
                    : ''
                }`}
                disabled={switchingTrack}
                onClick={() => void playTrack(row.id)}
              >
                <span className={styles.rowNum}>{idx + 1}</span>
                <span className={styles.rowPlay} aria-hidden>
                  <VmPlay className={styles.rowPlayIcon} filled strokeWidth={0} />
                </span>
                <span className={styles.rowTitle}>{row.name}</span>
                <span className={styles.rowArtist}>{row.artist}</span>
                <span className={styles.rowDur}>{formatMs(row.durationMs)}</span>
                <span className={styles.rowMenu} aria-hidden>
                  <VmEllipsisVertical strokeWidth={VM_ICON_STROKE} />
                </span>
              </button>
            ))}
          </div>
          {searchLoadingMore && searchQuery.trim() ? (
            <p className={styles.searchLoadingMore}>{t('vysionMusic.loading')}</p>
          ) : null}
        </div>
      </div>

      <div className={styles.statusBar}>{t('vysionMusic.statusFooter')}</div>
    </div>
  )
}
