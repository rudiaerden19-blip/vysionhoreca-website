'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLanguage } from '@/i18n'
import { getAuthHeaders } from '@/lib/auth-headers'
import styles from './vysion-music.module.css'

type TrackRow = {
  id: string
  name: string
  artist: string
  durationMs: number
  imageUrl: string | null
  imageWidth?: number | null
  imageHeight?: number | null
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
}

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
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<TrackRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [switchingTrack, setSwitchingTrack] = useState(false)
  const [clock, setClock] = useState(() => new Date())
  const [tick, setTick] = useState(0)

  const apiBase = `/api/soundtrack/${encodeURIComponent(tenant)}`

  const loadSnapshot = useCallback(async () => {
    try {
      const res = await fetch(apiBase, { headers: getAuthHeaders(), cache: 'no-store' })
      const json = (await res.json()) as { ok?: boolean; snapshot?: Snapshot; error?: string }
      if (!res.ok) {
        setError(json.error || t('vysionMusic.errorLoad'))
        return
      }
      if (json.snapshot) setSnapshot(json.snapshot)
    } catch {
      setError(t('vysionMusic.errorNetwork'))
    }
  }, [apiBase, t])

  const runSearch = useCallback(
    async (q: string) => {
      const trimmed = q.trim()
      if (!trimmed) {
        setSearchResults([])
        return
      }
      try {
        const res = await fetch(`${apiBase}?q=${encodeURIComponent(trimmed)}`, {
          headers: getAuthHeaders(),
          cache: 'no-store',
        })
        const json = (await res.json()) as {
          search?: { tracks: TrackRow[] }
          error?: string
        }
        if (!res.ok) {
          setSearchResults([])
          return
        }
        setSearchResults(json.search?.tracks ?? [])
      } catch {
        setSearchResults([])
      }
    },
    [apiBase],
  )

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
    const id = window.setTimeout(() => void runSearch(searchQuery), 350)
    return () => window.clearTimeout(id)
  }, [searchQuery, runSearch])

  const control = useCallback(
    async (
      op: string,
      extra?: { volume?: number; trackId?: string },
      opts?: { silent?: boolean },
    ) => {
      if (!opts?.silent) setBusy(true)
      try {
        const res = await fetch(apiBase, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ op, ...extra }),
        })
        const json = (await res.json()) as { snapshot?: Snapshot; error?: string }
        if (!res.ok) {
          setError(json.error || t('vysionMusic.errorControl'))
        } else {
          setError(null)
          if (json.snapshot) setSnapshot(json.snapshot)
        }
      } catch {
        setError(t('vysionMusic.errorNetwork'))
      } finally {
        if (!opts?.silent) setBusy(false)
      }
    },
    [apiBase, t],
  )

  const volumeSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const syncVolume = useCallback(
    (v: number, immediate?: boolean) => {
      if (volumeSyncTimer.current) clearTimeout(volumeSyncTimer.current)
      const send = () => void control('setVolume', { volume: v }, { silent: true })
      if (immediate) send()
      else volumeSyncTimer.current = setTimeout(send, 320)
    },
    [control],
  )

  useEffect(() => {
    return () => {
      if (volumeSyncTimer.current) clearTimeout(volumeSyncTimer.current)
    }
  }, [])

  const playTrackRow = useCallback(
    async (row: TrackRow) => {
      if (!row.id || row.id.startsWith('placeholder')) return
      setError(null)
      setSwitchingTrack(true)
      try {
        const res = await fetch(apiBase, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ op: 'playTrack', trackId: row.id }),
        })
        const json = (await res.json()) as { snapshot?: Snapshot; error?: string }
        if (!res.ok) {
          setError(json.error || t('vysionMusic.errorControl'))
        } else {
          setError(null)
          if (json.snapshot) setSnapshot(json.snapshot)
        }
      } catch {
        setError(t('vysionMusic.errorNetwork'))
      } finally {
        setSwitchingTrack(false)
        window.setTimeout(() => void loadSnapshot(), 700)
        window.setTimeout(() => void loadSnapshot(), 2200)
      }
    },
    [apiBase, loadSnapshot, t],
  )

  const nowTrack = snapshot?.nowPlaying.track
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
  const { date: clockDate, time: clockTime } = formatClock(clock, locale)
  const [coverBroken, setCoverBroken] = useState(false)
  useEffect(() => {
    setCoverBroken(false)
  }, [nowTrack?.imageUrl, nowTrack?.id])

  const coverSrc = useMemo(() => {
    const raw = nowTrack?.imageUrl?.trim()
    if (!raw || coverBroken) return null
    return `/api/soundtrack/cover?url=${encodeURIComponent(raw)}`
  }, [nowTrack?.imageUrl, coverBroken, nowTrack?.id])

  const playlistRows = useMemo(
    () => (snapshot?.playlist ?? []).filter((r) => r.name !== '—'),
    [snapshot?.playlist],
  )

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
            {t('vysionMusic.backToKassa')}
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
            ⚙
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
        <div className={styles.nowLeft}>
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
                disabled={busy}
                aria-label={t('vysionMusic.prev')}
                onClick={() => {
                  const rows = playlistRows
                  if (!nowTrack || rows.length < 2) return
                  const idx = rows.findIndex((r) => r.id === nowTrack.id && r.name === nowTrack.name)
                  const prev = idx > 0 ? rows[idx - 1] : rows[0]
                  if (prev?.id) void control('playTrack', { trackId: prev.id })
                }}
              >
                ⏮
              </button>
              <button
                type="button"
                className={styles.transportPrimary}
                disabled={busy}
                aria-label={isPlaying ? t('vysionMusic.pause') : t('vysionMusic.play')}
                onClick={() => void control(isPlaying ? 'pause' : 'play')}
              >
                {isPlaying ? '⏸' : '▶'}
              </button>
              <button
                type="button"
                className={styles.transportBtn}
                disabled={busy}
                aria-label={t('vysionMusic.stop')}
                onClick={() => void control('stop')}
              >
                ⏹
              </button>
              <button
                type="button"
                className={styles.transportBtn}
                disabled={busy}
                aria-label={t('vysionMusic.next')}
                onClick={() => void control('skipNext')}
              >
                ⏭
              </button>
            </div>
          </div>
          <div className={styles.volumeColumn}>
            <span className={styles.volumeIconLarge} aria-hidden>
              🔊
            </span>
            <div className={styles.volumeSliderWrap}>
              <input
                type="range"
                min={0}
                max={100}
                value={snapshot?.volume ?? 0}
                className={`${styles.volumeSlider} ${styles.volumeSliderVertical}`}
                style={{ ['--vm-vol-pct' as string]: `${snapshot?.volume ?? 0}%` }}
                aria-label={t('vysionMusic.volume')}
                aria-valuetext={`${snapshot?.volume ?? 0}%`}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  setSnapshot((s) => (s ? { ...s, volume: v } : s))
                  syncVolume(v)
                }}
                onPointerUp={(e) => syncVolume(Number(e.currentTarget.value), true)}
              />
            </div>
            <span className={styles.volumeIcon} aria-hidden>
              🔊
            </span>
          </div>
        </div>
      </section>

      <div className={styles.columns}>
        <div className={styles.panel}>
          <div className={styles.panelTitle}>{t('vysionMusic.playlistTitle')}</div>
          <div className={styles.list}>
            {playlistRows.map((row, idx) => {
              const active = nowTrack && row.id === nowTrack.id && row.name === nowTrack.name
              return (
                <button
                  key={`${row.id}-${idx}`}
                  type="button"
                  className={`${styles.listRow} ${active ? styles.listRowActive : ''}`}
                  disabled={switchingTrack || !row.id || row.id.startsWith('placeholder')}
                  onClick={() => void playTrackRow(row)}
                >
                  <span className={styles.rowNum}>{idx + 1}</span>
                  <span className={styles.rowPlay} aria-hidden>
                    ▶
                  </span>
                  <span className={styles.rowTitle}>{row.name}</span>
                  <span className={styles.rowArtist}>{row.artist}</span>
                  <span className={styles.rowDur}>{formatMs(row.durationMs)}</span>
                  <span className={styles.rowMenu} aria-hidden>
                    ⋮
                  </span>
                </button>
              )
            })}
          </div>
        </div>
        <div className={styles.panel}>
          <div className={styles.searchWrap}>
            <div className={styles.searchBox}>
              <input
                className={styles.searchInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('vysionMusic.searchPlaceholder')}
                aria-label={t('vysionMusic.searchPlaceholder')}
              />
              {searchQuery ? (
                <button
                  type="button"
                  className={styles.searchClear}
                  aria-label={t('vysionMusic.searchClear')}
                  onClick={() => setSearchQuery('')}
                >
                  ×
                </button>
              ) : null}
            </div>
          </div>
          <div className={styles.panelTitle}>{resultsTitle}</div>
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
                onClick={() => void playTrackRow(row)}
              >
                <span className={styles.rowNum}>{idx + 1}</span>
                <span className={styles.rowPlay} aria-hidden>
                  ▶
                </span>
                <span className={styles.rowTitle}>{row.name}</span>
                <span className={styles.rowArtist}>{row.artist}</span>
                <span className={styles.rowDur}>{formatMs(row.durationMs)}</span>
                <span className={styles.rowMenu} aria-hidden>
                  ⋮
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.statusBar}>
        {snapshot?.zoneName ? (
          <>
            {snapshot.zoneName}
            {snapshot.deviceName ? ` · ${snapshot.deviceName}` : ''}
            {snapshot.online ? ` · ${t('vysionMusic.online')}` : ` · ${t('vysionMusic.offline')}`}
          </>
        ) : (
          t('vysionMusic.loading')
        )}
      </div>
    </div>
  )
}
