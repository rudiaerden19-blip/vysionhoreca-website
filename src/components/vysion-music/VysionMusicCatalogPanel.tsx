'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLanguage } from '@/i18n'
import { getAuthHeaders } from '@/lib/auth-headers'
import { dedupeSearchTrackRows } from '@/lib/soundtrack/soundtrack-search-dedupe'
import type { SoundtrackLibrarySourceKind } from '@/lib/soundtrack/soundtrack-playlists'
import {
  getCachedPlaylistTracks,
  getCachedPlaylists,
  markTracksPrefetched,
  setCachedPlaylistTracks,
  setCachedPlaylists,
  type VysionMusicCatalogTrack,
  type VysionMusicLibraryItem,
} from './vysion-music-catalog-cache'
import { VysionMusicAddTrackToPlaylistModal } from './VysionMusicAddTrackToPlaylistModal'
import { perfLog, perfNow } from './vysion-music-perf'
import { TrackNowPlayingBars } from './TrackNowPlayingBars'
import {
  vysionMusicPlaylistRowIsActivePlayFrom,
  vysionMusicTrackRowIsNowPlaying,
  type VysionMusicNowPlayingMatch,
} from './vysion-music-track-match'
import { VysionMusicCreatePlaylistModal } from './VysionMusicCreatePlaylistModal'
import {
  vysionMusicLibraryCoverProxyUrl,
  vysionMusicLibraryFallbackCoverSrc,
  vysionMusicLibraryListArtUrl,
} from './vysion-music-library-thumb'
import { VysionMusicDeletePlaylistModal } from './VysionMusicDeletePlaylistModal'
import { VysionMusicRenamePlaylistModal } from './VysionMusicRenamePlaylistModal'
import { reloadSoundtrackPlayerWindow } from '@/lib/vysion-music/soundtrack-player-window'
import styles from './vysion-music.module.css'

function isManualLibraryPlaylist(kind: SoundtrackLibrarySourceKind): boolean {
  return kind === 'playlist' || kind === 'unknown'
}

type LibraryItem = VysionMusicLibraryItem
type TrackItem = VysionMusicCatalogTrack

type LibraryTab = 'lists' | 'schedules'

function formatMs(ms: number): string {
  if (!ms || ms < 0) return '0:00'
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function VysionMusicCatalogPanel({
  tenant,
  activeSourceId: playFromSourceId,
  playingSourceId,
  nowPlayingTrack,
  nowPlaying,
  nowPlayingProgressMs,
  nowPlayingDurationMs,
  onPlayPlaylistTrack,
  onPlaySearchTrack,
  onPlaylistSelected,
  busy,
}: {
  tenant: string
  activeSourceId: string | null
  playingSourceId: string | null
  nowPlayingTrack: VysionMusicNowPlayingMatch | null
  nowPlaying: boolean
  nowPlayingProgressMs: number
  nowPlayingDurationMs: number
  onPlayPlaylistTrack: (
    sourceId: string,
    trackId: string,
    trackIndex: number,
    playlistTracks: TrackItem[],
  ) => void | Promise<void>
  onPlaySearchTrack: (trackId: string) => void | Promise<void>
  onPlaylistSelected: (sourceId: string) => void | Promise<void>
  busy: boolean
}) {
  void playingSourceId

  const { t } = useLanguage()

  const refreshSoundtrackPlayer = useCallback(async () => {
    setSoundtrackReloadBusy(true)
    setSoundtrackReloadError(null)
    try {
      const res = await fetch(
        `/api/soundtrack/${encodeURIComponent(tenant)}/player-display-url`,
        { headers: getAuthHeaders(), cache: 'no-store' },
      )
      const json = (await res.json()) as { playerWebUrl?: string | null; error?: string }
      if (!res.ok) {
        setSoundtrackReloadError(json.error || t('vysionMusic.libraryRefreshSoundtrackError'))
        return
      }
      if (!json.playerWebUrl?.trim()) {
        setSoundtrackReloadError(t('vysionMusic.libraryRefreshSoundtrackError'))
        return
      }
      const result = reloadSoundtrackPlayerWindow(json.playerWebUrl)
      if (result === 'failed') {
        setSoundtrackReloadError(t('vysionMusic.libraryRefreshSoundtrackError'))
      }
    } catch {
      setSoundtrackReloadError(t('vysionMusic.errorNetwork'))
    } finally {
      setSoundtrackReloadBusy(false)
    }
  }, [tenant, t])
  const [tab, setTab] = useState<LibraryTab>('lists')
  const [items, setItems] = useState<LibraryItem[]>(() => getCachedPlaylists(tenant) ?? [])
  const [listsLoading, setListsLoading] = useState(() => !getCachedPlaylists(tenant))
  const [listsError, setListsError] = useState<string | null>(null)
  const listsLoadedOnceRef = useRef(Boolean(getCachedPlaylists(tenant)))

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tracks, setTracks] = useState<TrackItem[]>([])
  const [tracksLoading, setTracksLoading] = useState(false)
  const [tracksError, setTracksError] = useState<string | null>(null)
  const tracksFetchGenRef = useRef(0)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<TrackItem[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [brokenThumbIds, setBrokenThumbIds] = useState<Set<string>>(() => new Set())
  const [createPlaylistOpen, setCreatePlaylistOpen] = useState(false)
  const [soundtrackReloadBusy, setSoundtrackReloadBusy] = useState(false)
  const [soundtrackReloadError, setSoundtrackReloadError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'F5') return
      e.preventDefault()
      if (soundtrackReloadBusy) return
      void refreshSoundtrackPlayer()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [refreshSoundtrackPlayer, soundtrackReloadBusy])
  const [searchMenuTrackId, setSearchMenuTrackId] = useState<string | null>(null)
  const [addToPlaylistTrackId, setAddToPlaylistTrackId] = useState<string | null>(null)
  const [libraryMenuPlaylistId, setLibraryMenuPlaylistId] = useState<string | null>(null)
  const [playlistTrackMenuIndex, setPlaylistTrackMenuIndex] = useState<number | null>(null)
  const [playlistTrackActionBusy, setPlaylistTrackActionBusy] = useState(false)
  const [renamePlaylist, setRenamePlaylist] = useState<{ id: string; name: string } | null>(null)
  const [deletePlaylist, setDeletePlaylist] = useState<{ id: string; name: string } | null>(null)

  const prefetchTracksForSource = useCallback(
    async (sourceId: string) => {
      if (!markTracksPrefetched(tenant, sourceId)) return
      if (getCachedPlaylistTracks(tenant, sourceId)) return
      try {
        const res = await fetch(
          `/api/soundtrack/${encodeURIComponent(tenant)}/playlist-tracks?source=${encodeURIComponent(sourceId)}`,
          { headers: getAuthHeaders(), cache: 'no-store' },
        )
        const json = (await res.json()) as { tracks?: TrackItem[] }
        if (res.ok && json.tracks) {
          setCachedPlaylistTracks(tenant, sourceId, json.tracks)
          const art = json.tracks.find((t) => t.imageUrl?.trim())?.imageUrl ?? null
          if (art) {
            setItems((prev) =>
              prev.map((pl) =>
                pl.id === sourceId && !pl.imageUrl?.trim() ? { ...pl, imageUrl: art } : pl,
              ),
            )
          }
        }
      } catch {
        /* prefetch best-effort */
      }
    },
    [tenant],
  )

  const loadLists = useCallback(
    async (opts?: { background?: boolean }) => {
      if (!opts?.background && !listsLoadedOnceRef.current) {
        setListsLoading(true)
      }
      setListsError(null)
      const t0 = perfNow()
      try {
        const res = await fetch(
          `/api/soundtrack/${encodeURIComponent(tenant)}/playlists`,
          { headers: getAuthHeaders(), cache: 'no-store' },
        )
        const json = (await res.json()) as { playlists?: LibraryItem[]; error?: string }
        if (!res.ok) {
          setListsError(json.error || t('vysionMusic.libraryLoadError'))
          if (!getCachedPlaylists(tenant)) setItems([])
          return
        }
        const next = json.playlists ?? []
        setItems(next)
        setCachedPlaylists(tenant, next)
        listsLoadedOnceRef.current = true
        perfLog('playlist-list-fetch', t0, { count: next.length, background: !!opts?.background })
      } catch {
        setListsError(t('vysionMusic.errorNetwork'))
        if (!getCachedPlaylists(tenant)) setItems([])
      } finally {
        setListsLoading(false)
      }
    },
    [tenant, t],
  )

  useEffect(() => {
    const cached = getCachedPlaylists(tenant)
    if (cached?.length) {
      setItems(cached)
      setListsLoading(false)
      void loadLists({ background: true })
    } else {
      void loadLists()
    }
  }, [loadLists, tenant])

  const loadTracks = useCallback(
    async (sourceId: string, opts?: { background?: boolean }) => {
      const gen = ++tracksFetchGenRef.current
      const cached = getCachedPlaylistTracks(tenant, sourceId)
      const clickT0 = perfNow()

      if (cached?.length) {
        setTracks(cached)
        setTracksLoading(false)
        setTracksError(null)
        perfLog('playlist-tracks-cached-show', clickT0, {
          sourceId,
          count: cached.length,
        })
      } else if (!opts?.background) {
        setTracksLoading(true)
        setTracksError(null)
      }

      try {
        const reqT0 = perfNow()
        const res = await fetch(
          `/api/soundtrack/${encodeURIComponent(tenant)}/playlist-tracks?source=${encodeURIComponent(sourceId)}`,
          { headers: getAuthHeaders(), cache: 'no-store' },
        )
        const json = (await res.json()) as { tracks?: TrackItem[]; error?: string }
        if (gen !== tracksFetchGenRef.current) return
        if (!res.ok) {
          if (!cached?.length) {
            setTracksError(json.error || t('vysionMusic.tracksLoadError'))
            setTracks([])
          }
          return
        }
        const next = json.tracks ?? []
        setCachedPlaylistTracks(tenant, sourceId, next)
        setTracks(next)
        setTracksError(null)
        perfLog(cached?.length ? 'playlist-tracks-background-refresh' : 'playlist-tracks-first-load', reqT0, {
          sourceId,
          count: next.length,
          playlistClickToRenderMs: cached?.length
            ? Math.round(perfNow() - clickT0)
            : undefined,
        })
      } catch {
        if (gen !== tracksFetchGenRef.current) return
        if (!cached?.length) {
          setTracksError(t('vysionMusic.errorNetwork'))
          setTracks([])
        }
      } finally {
        if (gen === tracksFetchGenRef.current) setTracksLoading(false)
      }
    },
    [tenant, t],
  )

  useEffect(() => {
    if (!selectedId) {
      setTracks([])
      return
    }
    void loadTracks(selectedId)
  }, [selectedId, loadTracks])

  useEffect(() => {
    const id = playFromSourceId?.trim()
    if (!id || !items.length) return
    if (!items.some((i) => i.id === id)) return
    setSelectedId((prev) => (prev === id ? prev : id))
  }, [playFromSourceId, items])

  const filteredLists = useMemo(() => {
    if (tab === 'schedules') return items.filter((i) => i.sourceKind === 'schedule')
    // Zelfde set als Soundtrack «Playlists & Stations»: manual + Soundtrack-curated (niet schedules).
    return items.filter((i) => i.sourceKind !== 'schedule')
  }, [items, tab])

  const addablePlaylists = useMemo(
    () => items.filter((i) => i.sourceKind === 'playlist' || i.sourceKind === 'unknown'),
    [items],
  )

  const selectedList = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId],
  )

  const showPlaylistTrackMenu =
    selectedList != null && isManualLibraryPlaylist(selectedList.sourceKind)

  const removePlaylistTrack = useCallback(
    async (trackIndex: number) => {
      if (!selectedId) return
      setPlaylistTrackMenuIndex(null)
      setPlaylistTrackActionBusy(true)
      try {
        const res = await fetch(
          `/api/soundtrack/${encodeURIComponent(tenant)}/playlist-tracks`,
          {
            method: 'DELETE',
            headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ source: selectedId, trackIndex }),
          },
        )
        const json = (await res.json()) as { tracks?: TrackItem[]; error?: string }
        if (!res.ok) {
          setTracksError(json.error || t('vysionMusic.playlistTrackRemoveError'))
          return
        }
        const next = json.tracks ?? []
        setTracks(next)
        setCachedPlaylistTracks(tenant, selectedId, next)
        setTracksError(null)
      } catch {
        setTracksError(t('vysionMusic.errorNetwork'))
      } finally {
        setPlaylistTrackActionBusy(false)
      }
    },
    [selectedId, tenant, t],
  )

  useEffect(() => {
    if (!searchMenuTrackId) return
    const close = () => setSearchMenuTrackId(null)
    const id = window.setTimeout(() => {
      document.addEventListener('click', close)
    }, 0)
    return () => {
      window.clearTimeout(id)
      document.removeEventListener('click', close)
    }
  }, [searchMenuTrackId])

  useEffect(() => {
    if (playlistTrackMenuIndex == null) return
    const close = () => setPlaylistTrackMenuIndex(null)
    const id = window.setTimeout(() => {
      document.addEventListener('click', close)
    }, 0)
    return () => {
      window.clearTimeout(id)
      document.removeEventListener('click', close)
    }
  }, [playlistTrackMenuIndex])

  useEffect(() => {
    if (!libraryMenuPlaylistId) return
    const close = () => setLibraryMenuPlaylistId(null)
    const id = window.setTimeout(() => {
      document.addEventListener('click', close)
    }, 0)
    return () => {
      window.clearTimeout(id)
      document.removeEventListener('click', close)
    }
  }, [libraryMenuPlaylistId])

  useEffect(() => {
    if (!items.length) return
    const toPrefetch = filteredLists.filter((pl) => !pl.imageUrl?.trim())
    const id = window.setTimeout(() => {
      for (const pl of toPrefetch) void prefetchTracksForSource(pl.id)
    }, 400)
    return () => window.clearTimeout(id)
  }, [items, filteredLists, prefetchTracksForSource])

  const runSearch = useCallback(async () => {
    const q = searchQuery.trim()
    if (!q) {
      setSearchResults([])
      return
    }
    setSearchLoading(true)
    try {
      const res = await fetch(
        `/api/soundtrack/${encodeURIComponent(tenant)}?q=${encodeURIComponent(q)}`,
        { headers: getAuthHeaders(), cache: 'no-store' },
      )
      const json = (await res.json()) as {
        search?: { tracks?: TrackItem[] }
        error?: string
      }
      if (!res.ok) {
        setSearchResults([])
        return
      }
      setSearchResults(dedupeSearchTrackRows(json.search?.tracks ?? []))
    } catch {
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }, [searchQuery, tenant])

  useEffect(() => {
    const q = searchQuery.trim()
    if (!q) {
      setSearchResults([])
      return
    }
    const id = window.setTimeout(() => void runSearch(), 400)
    return () => window.clearTimeout(id)
  }, [searchQuery, runSearch])

  const sourceLabel = useCallback(
    (kind: SoundtrackLibrarySourceKind) => {
      switch (kind) {
        case 'soundtrack':
          return t('vysionMusic.librarySourceSoundtrack')
        case 'schedule':
          return t('vysionMusic.librarySourceSchedule')
        default:
          return t('vysionMusic.librarySourcePlaylist')
      }
    },
    [t],
  )

  const selectedItem = items.find((i) => i.id === selectedId)
  const selectedName = selectedItem?.name ?? t('vysionMusic.tracksTitle')

  const pickPlaylist = (id: string) => {
    const t0 = perfNow()
    setSelectedId(id)
    const cached = getCachedPlaylistTracks(tenant, id)
    if (cached?.length) {
      setTracks(cached)
      setTracksLoading(false)
      perfLog('playlist-click-cached-tracks-visible', t0, { sourceId: id, count: cached.length })
    }
    void onPlaylistSelected(id)
  }

  return (
    <section className={styles.libraryPanel} aria-label={t('vysionMusic.libraryTitle')}>
      <div className={styles.catalogGrid}>
        <div className={styles.catalogCol}>
          <div className={styles.catalogColHead}>
            <div className={styles.libraryTabs}>
              <button
                type="button"
                className={tab === 'lists' ? styles.libraryTabActive : styles.libraryTab}
                onClick={() => setTab('lists')}
              >
                {t('vysionMusic.libraryTabLists')}
              </button>
              <button
                type="button"
                className={tab === 'schedules' ? styles.libraryTabActive : styles.libraryTab}
                onClick={() => setTab('schedules')}
              >
                {t('vysionMusic.libraryTabSchedules')}
              </button>
              <button
                type="button"
                className={styles.libraryTab}
                onClick={() => setCreatePlaylistOpen(true)}
              >
                {t('vysionMusic.libraryCreatePlaylist')}
              </button>
              <button
                type="button"
                className={styles.libraryTab}
                disabled={soundtrackReloadBusy}
                aria-label={t('vysionMusic.libraryRefreshSoundtrack')}
                onClick={() => void refreshSoundtrackPlayer()}
              >
                {t('vysionMusic.libraryRefreshSoundtrack')}
              </button>
            </div>
          </div>
          {soundtrackReloadError ? (
            <p className={styles.libraryError} role="alert">
              {soundtrackReloadError}
            </p>
          ) : null}
          {listsLoading ? (
            <p className={styles.libraryMuted}>{t('vysionMusic.libraryLoading')}</p>
          ) : null}
          {listsError ? (
            <p className={styles.libraryError} role="alert">
              {listsError}
            </p>
          ) : null}
          <ul className={styles.libraryList}>
            {!listsLoading && !listsError && filteredLists.length === 0 ? (
              <li className={styles.libraryMuted}>{t('vysionMusic.libraryEmpty')}</li>
            ) : null}
            {filteredLists.map((pl) => {
              const cachedPlaylistTracks = getCachedPlaylistTracks(tenant, pl.id)
              const playlistTrackIds = cachedPlaylistTracks?.map((t) => t.id) ?? null
              const isActivePlayFrom = vysionMusicPlaylistRowIsActivePlayFrom(
                pl.id,
                playFromSourceId,
                nowPlayingTrack,
                playlistTrackIds,
                cachedPlaylistTracks,
              )
              const isBrowsing = selectedId === pl.id && !isActivePlayFrom
              const rowClass = [
                styles.libraryRow,
                isActivePlayFrom
                  ? styles.libraryRowActive
                  : isBrowsing
                    ? styles.libraryRowSelected
                    : '',
              ]
                .filter(Boolean)
                .join(' ')
              const cachedTrackArt =
                getCachedPlaylistTracks(tenant, pl.id)?.find((t) => t.imageUrl?.trim())?.imageUrl ??
                null
              const listArtUrl = vysionMusicLibraryListArtUrl(
                pl.sourceKind,
                pl.imageUrl,
                cachedTrackArt,
              )
              const thumbSrc = vysionMusicLibraryCoverProxyUrl(listArtUrl)
              const fallbackCoverSrc = vysionMusicLibraryFallbackCoverSrc(pl.name)
              const libraryMenuOpen = libraryMenuPlaylistId === pl.id
              const showPlaylistMenu = isManualLibraryPlaylist(pl.sourceKind)
              return (
                <li key={pl.id}>
                  <div className={styles.libraryRowWrap}>
                    <button
                      type="button"
                      className={`${rowClass} ${styles.libraryRowMainBtn}`}
                      disabled={busy}
                      onClick={() => pickPlaylist(pl.id)}
                    >
                      <span className={styles.libraryThumb} aria-hidden>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={
                            thumbSrc && !brokenThumbIds.has(pl.id) ? thumbSrc : fallbackCoverSrc
                          }
                          alt=""
                          className={styles.libraryThumbImg}
                          referrerPolicy="no-referrer"
                          onError={() => {
                            if (thumbSrc && !brokenThumbIds.has(pl.id)) {
                              setBrokenThumbIds((prev) => new Set(prev).add(pl.id))
                            }
                          }}
                        />
                      </span>
                      <span className={styles.libraryRowText}>
                        <span className={styles.libraryRowName}>{pl.name}</span>
                        <span className={styles.libraryRowMeta}>{sourceLabel(pl.sourceKind)}</span>
                      </span>
                      {isActivePlayFrom && nowPlayingTrack != null ? (
                        <span className={styles.libraryRowEq}>
                          <TrackNowPlayingBars playing={nowPlaying} />
                        </span>
                      ) : null}
                    </button>
                    {showPlaylistMenu ? (
                      <div className={styles.searchTrackMenuWrap}>
                        <button
                          type="button"
                          className={styles.searchTrackMenuBtn}
                          disabled={busy}
                          aria-label={t('vysionMusic.playlistMenuAria')}
                          aria-expanded={libraryMenuOpen}
                          onClick={(e) => {
                            e.stopPropagation()
                            setLibraryMenuPlaylistId((prev) => (prev === pl.id ? null : pl.id))
                          }}
                        >
                          ⋮
                        </button>
                        {libraryMenuOpen ? (
                          <div
                            className={styles.searchTrackMenu}
                            role="menu"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              role="menuitem"
                              className={styles.searchTrackMenuItem}
                              disabled={busy}
                              onClick={() => {
                                setLibraryMenuPlaylistId(null)
                                setRenamePlaylist({ id: pl.id, name: pl.name })
                              }}
                            >
                              {t('vysionMusic.playlistRename')}
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              className={styles.searchTrackMenuItem}
                              disabled={busy}
                              onClick={() => {
                                setLibraryMenuPlaylistId(null)
                                setDeletePlaylist({ id: pl.id, name: pl.name })
                              }}
                            >
                              {t('vysionMusic.playlistDelete')}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>

        <div className={styles.catalogCol}>
          <div className={styles.catalogColHead}>
            <h2 className={styles.catalogColTitle}>{selectedName}</h2>
          </div>
          {tracksLoading && tracks.length === 0 ? (
            <p className={styles.libraryMuted}>{t('vysionMusic.tracksLoading')}</p>
          ) : null}
          {tracksError ? (
            <p className={styles.libraryError} role="alert">
              {tracksError}
            </p>
          ) : null}
          {!selectedId ? (
            <p className={styles.libraryMuted}>{t('vysionMusic.tracksPickList')}</p>
          ) : null}
          <ul className={styles.trackList}>
            {!tracksLoading && selectedId && tracks.length === 0 && !tracksError ? (
              <li className={styles.libraryMuted}>{t('vysionMusic.tracksEmpty')}</li>
            ) : null}
            {tracks.map((tr, idx) => {
              const active = vysionMusicTrackRowIsNowPlaying(tr, nowPlayingTrack, {
                allowTitleArtistFallback: true,
              })
              const rowProgressPct =
                active && nowPlayingDurationMs > 0
                  ? Math.min(100, (nowPlayingProgressMs / nowPlayingDurationMs) * 100)
                  : 0
              const trackMenuOpen = playlistTrackMenuIndex === idx
              const rowDisabled = busy || playlistTrackActionBusy || !selectedId
              const playBtn = (
                <button
                  type="button"
                  className={
                    active
                      ? `${styles.trackRowActive} ${styles.trackRowNowPlaying}${showPlaylistTrackMenu ? ` ${styles.searchTrackPlay}` : ''}`
                      : `${styles.trackRow}${showPlaylistTrackMenu ? ` ${styles.searchTrackPlay}` : ''}`
                  }
                  disabled={rowDisabled}
                  onClick={() => void onPlayPlaylistTrack(selectedId!, tr.id, idx, tracks)}
                >
                  <span className={styles.trackRowHeader}>
                    {active ? (
                      <TrackNowPlayingBars playing={nowPlaying} />
                    ) : (
                      <span className={styles.trackRowNum}>{idx + 1}</span>
                    )}
                    <span className={styles.trackRowMain}>
                      <span className={styles.trackRowTitle}>{tr.name}</span>
                      <span className={styles.trackRowArtist}>{tr.artist}</span>
                    </span>
                    {!showPlaylistTrackMenu ? (
                      <span className={styles.trackRowDur}>{formatMs(tr.durationMs)}</span>
                    ) : null}
                  </span>
                  {active ? (
                    <span className={styles.trackRowProgressTrack} aria-hidden>
                      <span
                        className={styles.trackRowProgressFill}
                        style={{ width: `${rowProgressPct}%` }}
                      />
                    </span>
                  ) : null}
                </button>
              )
              return (
                <li
                  key={`${tr.id}-${idx}`}
                  className={showPlaylistTrackMenu ? styles.searchTrackItem : undefined}
                >
                  {showPlaylistTrackMenu ? (
                    <div className={styles.searchTrackRow}>
                      {playBtn}
                      <span className={styles.searchTrackDur}>{formatMs(tr.durationMs)}</span>
                      <div className={styles.searchTrackMenuWrap}>
                        <button
                          type="button"
                          className={styles.searchTrackMenuBtn}
                          disabled={rowDisabled}
                          aria-label={t('vysionMusic.playlistTrackMenuAria')}
                          aria-expanded={trackMenuOpen}
                          onClick={(e) => {
                            e.stopPropagation()
                            setPlaylistTrackMenuIndex((prev) => (prev === idx ? null : idx))
                          }}
                        >
                          ⋮
                        </button>
                        {trackMenuOpen ? (
                          <div
                            className={styles.searchTrackMenu}
                            role="menu"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              role="menuitem"
                              className={styles.searchTrackMenuItem}
                              disabled={rowDisabled}
                              onClick={() => void removePlaylistTrack(idx)}
                            >
                              {t('vysionMusic.playlistDelete')}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    playBtn
                  )}
                </li>
              )
            })}
          </ul>
        </div>

        <div className={styles.catalogCol}>
          <div className={styles.catalogColHead}>
            <h2 className={styles.catalogColTitle}>{t('vysionMusic.searchTitle')}</h2>
            <div className={styles.searchBox}>
              <input
                className={styles.searchInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('vysionMusic.searchPlaceholder')}
                aria-label={t('vysionMusic.searchPlaceholder')}
              />
            </div>
          </div>
          {searchLoading ? (
            <p className={styles.libraryMuted}>{t('vysionMusic.searchLoading')}</p>
          ) : null}
          <ul className={styles.trackList}>
            {!searchLoading && searchQuery.trim() && searchResults.length === 0 ? (
              <li className={styles.libraryMuted}>{t('vysionMusic.searchEmpty')}</li>
            ) : null}
            {searchResults.map((tr, idx) => {
              const active = vysionMusicTrackRowIsNowPlaying(tr, nowPlayingTrack)
              const rowProgressPct =
                active && nowPlayingDurationMs > 0
                  ? Math.min(100, (nowPlayingProgressMs / nowPlayingDurationMs) * 100)
                  : 0
              const menuOpen = searchMenuTrackId === tr.id
              return (
                <li key={`${tr.id}-s-${idx}`} className={styles.searchTrackItem}>
                  <div className={styles.searchTrackRow}>
                    <button
                      type="button"
                      className={
                        active
                          ? `${styles.trackRowActive} ${styles.trackRowNowPlaying} ${styles.searchTrackPlay}`
                          : `${styles.trackRow} ${styles.searchTrackPlay}`
                      }
                      disabled={busy}
                      onClick={() => void onPlaySearchTrack(tr.id)}
                    >
                      <span className={styles.trackRowHeader}>
                        {active ? (
                          <TrackNowPlayingBars playing={nowPlaying} />
                        ) : (
                          <span className={styles.trackRowNum}>{idx + 1}</span>
                        )}
                        <span className={styles.trackRowMain}>
                          <span className={styles.trackRowTitle}>{tr.name}</span>
                          <span className={styles.trackRowArtist}>{tr.artist}</span>
                        </span>
                      </span>
                      {active ? (
                        <span className={styles.trackRowProgressTrack} aria-hidden>
                          <span
                            className={styles.trackRowProgressFill}
                            style={{ width: `${rowProgressPct}%` }}
                          />
                        </span>
                      ) : null}
                    </button>
                    <span className={styles.searchTrackDur}>{formatMs(tr.durationMs)}</span>
                    <div className={styles.searchTrackMenuWrap}>
                      <button
                        type="button"
                        className={styles.searchTrackMenuBtn}
                        disabled={busy}
                        aria-label={t('vysionMusic.searchTrackMenuAria')}
                        aria-expanded={menuOpen}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSearchMenuTrackId((prev) => (prev === tr.id ? null : tr.id))
                        }}
                      >
                        ⋮
                      </button>
                      {menuOpen ? (
                        <div
                          className={styles.searchTrackMenu}
                          role="menu"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            role="menuitem"
                            className={styles.searchTrackMenuItem}
                            disabled={busy}
                            onClick={() => {
                              setSearchMenuTrackId(null)
                              void onPlaySearchTrack(tr.id)
                            }}
                          >
                            {t('vysionMusic.searchPlayNow')}
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            className={styles.searchTrackMenuItem}
                            disabled={busy}
                            onClick={() => {
                              setSearchMenuTrackId(null)
                              void loadLists({ background: true })
                              setAddToPlaylistTrackId(tr.id)
                            }}
                          >
                            {t('vysionMusic.searchAddToPlaylist')}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
      <VysionMusicCreatePlaylistModal
        tenant={tenant}
        open={createPlaylistOpen}
        onClose={() => setCreatePlaylistOpen(false)}
        onCreated={() => {
          setTab('lists')
          return loadLists()
        }}
      />
      <VysionMusicRenamePlaylistModal
        tenant={tenant}
        open={renamePlaylist != null}
        playlistId={renamePlaylist?.id ?? ''}
        initialName={renamePlaylist?.name ?? ''}
        onClose={() => setRenamePlaylist(null)}
        onRenamed={() => loadLists({ background: true })}
      />
      <VysionMusicDeletePlaylistModal
        tenant={tenant}
        open={deletePlaylist != null}
        playlistId={deletePlaylist?.id ?? ''}
        playlistName={deletePlaylist?.name ?? ''}
        onClose={() => setDeletePlaylist(null)}
        onDeleted={async (removedId) => {
          if (selectedId === removedId) {
            setSelectedId(null)
            setTracks([])
          }
          await loadLists({ background: true })
        }}
      />
      <VysionMusicAddTrackToPlaylistModal
        tenant={tenant}
        open={addToPlaylistTrackId != null}
        trackId={addToPlaylistTrackId ?? ''}
        playlists={addablePlaylists}
        onClose={() => setAddToPlaylistTrackId(null)}
        onAdded={async (playlistId, refreshedTracks) => {
          setCachedPlaylistTracks(tenant, playlistId, refreshedTracks)
          if (selectedId === playlistId) {
            setTracks(refreshedTracks)
            setTracksError(null)
          }
          await loadLists({ background: true })
        }}
      />
    </section>
  )
}
