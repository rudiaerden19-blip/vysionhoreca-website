'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLanguage } from '@/i18n'
import { getAuthHeaders } from '@/lib/auth-headers'
import type { SoundtrackLibrarySourceKind } from '@/lib/soundtrack/soundtrack-playlists'
import styles from './vysion-music.module.css'

type LibraryItem = {
  id: string
  name: string
  sourceTypename: string
  snapshot: string | null
  sourceKind: SoundtrackLibrarySourceKind
  imageUrl: string | null
}

type TrackItem = {
  id: string
  name: string
  artist: string
  durationMs: number
  imageUrl: string | null
}

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
  activeSourceId,
  nowTrackId,
  onPlayPlaylistTrack,
  onPlaySearchTrack,
  busy,
}: {
  tenant: string
  activeSourceId: string | null
  nowTrackId: string | null
  onPlayPlaylistTrack: (sourceId: string, trackId: string) => void | Promise<void>
  onPlaySearchTrack: (trackId: string) => void | Promise<void>
  busy: boolean
}) {
  const { t } = useLanguage()
  const [tab, setTab] = useState<LibraryTab>('lists')
  const [items, setItems] = useState<LibraryItem[]>([])
  const [listsLoading, setListsLoading] = useState(true)
  const [listsError, setListsError] = useState<string | null>(null)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tracks, setTracks] = useState<TrackItem[]>([])
  const [tracksLoading, setTracksLoading] = useState(false)
  const [tracksError, setTracksError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<TrackItem[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [brokenThumbIds, setBrokenThumbIds] = useState<Set<string>>(() => new Set())

  const loadLists = useCallback(async () => {
    setListsLoading(true)
    setListsError(null)
    try {
      const res = await fetch(
        `/api/soundtrack/${encodeURIComponent(tenant)}/playlists`,
        { headers: getAuthHeaders(), cache: 'no-store' },
      )
      const json = (await res.json()) as { playlists?: LibraryItem[]; error?: string }
      if (!res.ok) {
        setListsError(json.error || t('vysionMusic.libraryLoadError'))
        setItems([])
        return
      }
      setItems(json.playlists ?? [])
    } catch {
      setListsError(t('vysionMusic.errorNetwork'))
      setItems([])
    } finally {
      setListsLoading(false)
    }
  }, [tenant, t])

  useEffect(() => {
    void loadLists()
  }, [loadLists])

  useEffect(() => {
    if (activeSourceId) setSelectedId(activeSourceId)
  }, [activeSourceId])

  const loadTracks = useCallback(
    async (sourceId: string) => {
      setTracksLoading(true)
      setTracksError(null)
      try {
        const res = await fetch(
          `/api/soundtrack/${encodeURIComponent(tenant)}/playlist-tracks?source=${encodeURIComponent(sourceId)}`,
          { headers: getAuthHeaders(), cache: 'no-store' },
        )
        const json = (await res.json()) as { tracks?: TrackItem[]; error?: string }
        if (!res.ok) {
          setTracksError(json.error || t('vysionMusic.tracksLoadError'))
          setTracks([])
          return
        }
        setTracks(json.tracks ?? [])
      } catch {
        setTracksError(t('vysionMusic.errorNetwork'))
        setTracks([])
      } finally {
        setTracksLoading(false)
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
      setSearchResults(json.search?.tracks ?? [])
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

  const filteredLists = useMemo(() => {
    if (tab === 'schedules') return items.filter((i) => i.sourceKind === 'schedule')
    return items.filter((i) => i.sourceKind !== 'schedule')
  }, [items, tab])

  const selectedItem = items.find((i) => i.id === selectedId)
  const selectedName = selectedItem?.name ?? t('vysionMusic.tracksTitle')

  const pickPlaylist = (id: string) => {
    setSelectedId(id)
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
            </div>
          </div>
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
              const active = activeSourceId === pl.id
              const thumbSrc =
                pl.imageUrl && pl.imageUrl.startsWith('http')
                  ? `/api/soundtrack/cover?url=${encodeURIComponent(pl.imageUrl)}`
                  : null
              return (
                <li key={pl.id}>
                  <button
                    type="button"
                    className={active ? styles.libraryRowActive : styles.libraryRow}
                    disabled={busy}
                    onClick={() => pickPlaylist(pl.id)}
                  >
                    <span className={styles.libraryThumb} aria-hidden>
                      {thumbSrc && !brokenThumbIds.has(pl.id) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumbSrc}
                          alt=""
                          className={styles.libraryThumbImg}
                          referrerPolicy="no-referrer"
                          onError={() =>
                            setBrokenThumbIds((prev) => new Set(prev).add(pl.id))
                          }
                        />
                      ) : (
                        <span className={styles.libraryThumbFallback}>{pl.name.charAt(0)}</span>
                      )}
                    </span>
                    <span className={styles.libraryRowText}>
                      <span className={styles.libraryRowName}>{pl.name}</span>
                      <span className={styles.libraryRowMeta}>{sourceLabel(pl.sourceKind)}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        <div className={styles.catalogCol}>
          <div className={styles.catalogColHead}>
            <h2 className={styles.catalogColTitle}>{selectedName}</h2>
          </div>
          {tracksLoading ? (
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
              const active = nowTrackId === tr.id && activeSourceId === selectedId
              return (
                <li key={`${tr.id}-${idx}`}>
                  <button
                    type="button"
                    className={active ? styles.trackRowActive : styles.trackRow}
                    disabled={busy || !selectedId}
                    onClick={() => void onPlayPlaylistTrack(selectedId!, tr.id)}
                  >
                    <span className={styles.trackRowNum}>{idx + 1}</span>
                    <span className={styles.trackRowMain}>
                      <span className={styles.trackRowTitle}>{tr.name}</span>
                      <span className={styles.trackRowArtist}>{tr.artist}</span>
                    </span>
                    <span className={styles.trackRowDur}>{formatMs(tr.durationMs)}</span>
                  </button>
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
              const active = nowTrackId === tr.id
              return (
                <li key={`${tr.id}-s-${idx}`}>
                  <button
                    type="button"
                    className={active ? styles.trackRowActive : styles.trackRow}
                    disabled={busy}
                    onClick={() => void onPlaySearchTrack(tr.id)}
                  >
                    <span className={styles.trackRowNum}>{idx + 1}</span>
                    <span className={styles.trackRowMain}>
                      <span className={styles.trackRowTitle}>{tr.name}</span>
                      <span className={styles.trackRowArtist}>{tr.artist}</span>
                    </span>
                    <span className={styles.trackRowDur}>{formatMs(tr.durationMs)}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </section>
  )
}
