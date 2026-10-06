'use client'

import Link from 'next/link'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from 'react'
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
import { quantizeVolumeUiPercent } from '@/lib/soundtrack/soundtrack-server'
import {
  VYSION_MUSIC_TRACK_FADE_MS,
  trackIdentity,
} from '@/lib/vysion-music-track-fade'
import { VolumeSliderVertical } from './VolumeSliderVertical'
import { VolumeSpeakerArt } from './VolumeSpeakerArt'
import { VuMeterStereo } from './VuMeterStereo'
import { VysionMusicPlaylistDraftList } from './VysionMusicPlaylistDraftList'
import { VysionMusicPlaylistsModal } from './VysionMusicPlaylistsModal'
import { VysionMusicSpotifyImportModal } from './VysionMusicSpotifyImportModal'
import type { VysionMusicPlaylistSummary } from '@/lib/vysion-music-playlists-server'
import { readDragTrack, writeDragTrack } from '@/lib/vysion-music-drag-track'
import styles from './vysion-music.module.css'

type LeftPanelMode = 'live' | 'edit' | 'saved'

const VM_ICON_STROKE = 2.35

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
  playFromPlaylistId?: string | null
  playFromTypename?: string | null
}

function formatMs(ms: number): string {
  if (!ms || ms < 0) return '0:00'
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function mapPlaylistApiError(
  json: { error?: string; code?: string },
  t: (key: string) => string,
  fallbackKey: string,
): string {
  if (json.code === 'playlist_tables_missing') {
    return t('vysionMusic.playlistTablesMissing')
  }
  if (json.code === 'soundtrack_sync_failed') {
    return t('vysionMusic.soundtrackSyncFailed')
  }
  return json.error || t(fallbackKey)
}

function mapSpotifyImportError(
  json: { error?: string; code?: string },
  t: (key: string) => string,
): string {
  if (json.code === 'spotify_not_configured') {
    return t('vysionMusic.spotifyNotConfigured')
  }
  if (json.code === 'invalid_spotify_url') {
    return t('vysionMusic.spotifyInvalidUrl')
  }
  if (json.code === 'empty_playlist') {
    return t('vysionMusic.spotifyEmptyPlaylist')
  }
  return json.error || t('vysionMusic.spotifyImportFailed')
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
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchLoadingMore, setSearchLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  type TransportPending = 'prev' | 'play' | 'pause' | 'stop' | 'skipNext'
  const [transportPending, setTransportPending] = useState<TransportPending | null>(null)
  const [switchingTrack, setSwitchingTrack] = useState(false)
  const [clock, setClock] = useState(() => new Date())
  const [tick, setTick] = useState(0)
  const [leftPanelMode, setLeftPanelMode] = useState<LeftPanelMode>('live')
  const [draftName, setDraftName] = useState('')
  const [draftTracks, setDraftTracks] = useState<TrackRow[]>([])
  const [draftPlaylistId, setDraftPlaylistId] = useState<string | null>(null)
  const [savedPlaylistName, setSavedPlaylistName] = useState('')
  const [savedPlaylistTracks, setSavedPlaylistTracks] = useState<TrackRow[]>([])
  const [savedPlaylistId, setSavedPlaylistId] = useState<string | null>(null)
  const [savedSoundtrackPlaylistId, setSavedSoundtrackPlaylistId] = useState<string | null>(
    null,
  )
  const [savedPlaylistLoading, setSavedPlaylistLoading] = useState(false)
  const [playlistsOpen, setPlaylistsOpen] = useState(false)
  const [playlistsLoading, setPlaylistsLoading] = useState(false)
  const [savedPlaylists, setSavedPlaylists] = useState<VysionMusicPlaylistSummary[]>([])
  const [leftDropActive, setLeftDropActive] = useState(false)
  const [savingPlaylist, setSavingPlaylist] = useState(false)
  const [spotifyOpen, setSpotifyOpen] = useState(false)
  const [spotifyUrl, setSpotifyUrl] = useState('')
  const [spotifyLoading, setSpotifyLoading] = useState(false)
  const [spotifySummary, setSpotifySummary] = useState<{
    total: number
    matchedCount: number
    playlistName: string
  } | null>(null)
  const [spotifyImportTracks, setSpotifyImportTracks] = useState<TrackRow[]>([])
  /** Slider/VU — niet laten overschrijven door trage Soundtrack-polls tijdens slepen. */
  const [volumeUi, setVolumeUi] = useState(0)

  const apiBase = `/api/soundtrack/${encodeURIComponent(tenant)}`
  const playlistsApiBase = `${apiBase}/playlists`

  const volumeSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const volumeSyncGeneration = useRef(0)
  const lastVolumeSentRef = useRef<number | null>(null)
  const volumeUiPendingRef = useRef<number | null>(null)
  const volumeDraggingRef = useRef(false)
  const playlistPanelRef = useRef<HTMLDivElement>(null)
  const nowLeftRef = useRef<HTMLDivElement>(null)
  const volumeUiRef = useRef(0)
  const lastTrackKeyRef = useRef('')
  const searchRequestId = useRef(0)
  const searchQueryRef = useRef(searchQuery)
  const searchAbortRef = useRef<AbortController | null>(null)
  const searchDebounceRef = useRef<number | null>(null)
  /** Blijft staan tijdens afspelen — voorkomt terugvallen naar live-geschiedenis in het paneel. */
  const savedPlaylistViewRef = useRef<{
    id: string
    name: string
    tracks: TrackRow[]
    soundtrackPlaylistId: string | null
  } | null>(null)
  searchQueryRef.current = searchQuery

  const pinSavedPlaylistView = useCallback(
    (
      id: string,
      name: string,
      tracks: TrackRow[],
      soundtrackPlaylistId: string | null = null,
    ) => {
      savedPlaylistViewRef.current = { id, name, tracks, soundtrackPlaylistId }
      setSavedPlaylistId(id)
      setSavedPlaylistName(name)
      setSavedPlaylistTracks(tracks)
      setSavedSoundtrackPlaylistId(soundtrackPlaylistId)
      setLeftPanelMode('saved')
    },
    [],
  )

  const restoreSavedPlaylistView = useCallback(() => {
    const pin = savedPlaylistViewRef.current
    if (!pin) return
    setLeftPanelMode('saved')
    setSavedPlaylistId(pin.id)
    setSavedPlaylistName(pin.name)
    setSavedPlaylistTracks(pin.tracks)
    setSavedSoundtrackPlaylistId(pin.soundtrackPlaylistId)
  }, [])

  const applyServerVolume = useCallback((serverVolume: number) => {
    if (volumeDraggingRef.current) return
    const qServer = quantizeVolumeUiPercent(serverVolume)
    setVolumeUi((ui) => {
      const pending = volumeUiPendingRef.current
      if (pending != null) {
        if (qServer === quantizeVolumeUiPercent(pending)) {
          volumeUiPendingRef.current = null
          return qServer
        }
        return ui
      }
      return qServer
    })
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
      const json = (await res.json()) as { ok?: boolean; snapshot?: Snapshot; error?: string }
      if (!res.ok) {
        setError(json.error || t('vysionMusic.errorLoad'))
        return
      }
      if (json.snapshot) mergeSnapshot(json.snapshot)
    } catch {
      setError(t('vysionMusic.errorNetwork'))
    }
  }, [apiBase, mergeSnapshot, t])

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
      setSearchLoadingMore(false)
      setSearchResults([])

      const stillCurrent = () =>
        reqId === searchRequestId.current && trimmed === searchQueryRef.current.trim()

      const fetchScope = async (scope: 'quick' | 'full') => {
        const res = await fetch(
          `${apiBase}?q=${encodeURIComponent(trimmed)}&scope=${scope}`,
          {
            headers: getAuthHeaders(),
            cache: 'no-store',
            signal: ac.signal,
          },
        )
        const json = (await res.json()) as {
          search?: { tracks: TrackRow[] }
          error?: string
        }
        if (!stillCurrent()) return null
        if (!res.ok) return []
        return json.search?.tracks ?? []
      }

      try {
        const quickTracks = await fetchScope('quick')
        if (quickTracks == null) return
        setSearchResults(quickTracks)
        setSearchLoading(false)

        const wantsArtistCatalog =
          prefersArtistOnlySearchResults(trimmed) &&
          filterTracksByArtistQuery(quickTracks, trimmed).length > 0
        if (wantsArtistCatalog) {
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
        searchDebounceRef.current = null
      }
      searchRequestId.current += 1
      searchAbortRef.current?.abort()
    }
  }, [searchQuery, runSearch])

  const finishUiFadeIn = useCallback(() => {
    const el = nowLeftRef.current
    if (!el) return
    void el.animate([{ opacity: 0.15 }, { opacity: 1 }], {
      duration: VYSION_MUSIC_TRACK_FADE_MS,
      easing: 'ease-in-out',
      fill: 'forwards',
    })
  }, [])

  const control = useCallback(
    async (
      op: string,
      extra?: { volume?: number; trackId?: string; trackIds?: string[] },
      opts?: {
        silent?: boolean
        volumeGeneration?: number
        transportPending?: TransportPending
      },
    ) => {
      const transportKey = opts?.transportPending
      if (!opts?.silent) {
        if (transportKey) setTransportPending(transportKey)
      }
      const volumeGeneration = opts?.volumeGeneration
      try {
        const res = await fetch(apiBase, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({
            op,
            trackId: extra?.trackId,
            trackIds: extra?.trackIds,
            volume: extra?.volume,
          }),
        })
        const json = (await res.json()) as { snapshot?: Snapshot; error?: string }
        if (!res.ok) {
          if (!(opts?.silent && op === 'setVolume')) {
            setError(json.error || t('vysionMusic.errorControl'))
          }
        } else {
          if (!(opts?.silent && op === 'setVolume')) setError(null)
          if (json.snapshot) {
            const ignoreVolume =
              op === 'setVolume' ||
              (volumeGeneration != null &&
                volumeGeneration !== volumeSyncGeneration.current)
            mergeSnapshot(json.snapshot, { ignoreVolume })
          }
        }
      } catch {
        if (!(opts?.silent && op === 'setVolume')) {
          setError(t('vysionMusic.errorNetwork'))
        }
      } finally {
        if (!opts?.silent && transportKey) {
          setTransportPending((p) => (p === transportKey ? null : p))
        }
      }
    },
    [apiBase, mergeSnapshot, t],
  )

  const syncVolume = useCallback(
    (v: number, immediate?: boolean) => {
      if (immediate && lastVolumeSentRef.current === v) return
      if (volumeSyncTimer.current) clearTimeout(volumeSyncTimer.current)
      const send = () => {
        lastVolumeSentRef.current = v
        const gen = ++volumeSyncGeneration.current
        void control('setVolume', { volume: v }, { silent: true, volumeGeneration: gen })
      }
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
          body: JSON.stringify({
            op: 'playTrack',
            trackId: row.id,
          }),
        })
        const json = (await res.json()) as { snapshot?: Snapshot; error?: string }
        if (!res.ok) {
          setError(json.error || t('vysionMusic.errorControl'))
        } else {
          setError(null)
          if (json.snapshot) mergeSnapshot(json.snapshot)
        }
      } catch {
        setError(t('vysionMusic.errorNetwork'))
      } finally {
        setSwitchingTrack(false)
        restoreSavedPlaylistView()
        window.setTimeout(() => void loadSnapshot(), 800)
        window.setTimeout(() => void loadSnapshot(), 3200)
        window.setTimeout(() => void loadSnapshot(), 6500)
      }
    },
    [apiBase, loadSnapshot, mergeSnapshot, restoreSavedPlaylistView, t],
  )

  const scrollToPlaylistPanel = useCallback(() => {
    playlistPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [])

  const addTrackToDraft = useCallback((row: TrackRow) => {
    if (!row.id || row.id.startsWith('placeholder')) return
    setDraftTracks((prev) => {
      if (prev.some((t) => t.id === row.id)) return prev
      return [...prev, row]
    })
  }, [])

  const startNewPlaylist = useCallback(() => {
    setLeftPanelMode('edit')
    setDraftPlaylistId(null)
    setDraftName('')
    setDraftTracks([])
    scrollToPlaylistPanel()
  }, [scrollToPlaylistPanel])

  const openSpotifyImport = useCallback(() => {
    setSpotifySummary(null)
    setSpotifyImportTracks([])
    setSpotifyOpen(true)
  }, [])

  const runSpotifyImport = useCallback(async () => {
    const url = spotifyUrl.trim()
    if (!url) return
    setSpotifyLoading(true)
    setSpotifySummary(null)
    setSpotifyImportTracks([])
    try {
      const res = await fetch(`${apiBase}/spotify-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ url }),
      })
      const json = (await res.json()) as {
        import?: {
          playlistName: string
          total: number
          matchedCount: number
          soundtrackTracks: TrackRow[]
        }
        error?: string
        code?: string
      }
      if (!res.ok || !json.import) {
        setError(mapSpotifyImportError(json, t))
        return
      }
      setError(null)
      setSpotifySummary({
        playlistName: json.import.playlistName,
        total: json.import.total,
        matchedCount: json.import.matchedCount,
      })
      setSpotifyImportTracks(json.import.soundtrackTracks)
    } catch {
      setError(t('vysionMusic.errorNetwork'))
    } finally {
      setSpotifyLoading(false)
    }
  }, [apiBase, spotifyUrl, t])

  const applySpotifyImportToList = useCallback(() => {
    if (spotifyImportTracks.length === 0) return
    setSpotifyOpen(false)
    setLeftPanelMode('edit')
    setDraftPlaylistId(null)
    setDraftName(spotifySummary?.playlistName?.trim() || '')
    setDraftTracks(spotifyImportTracks)
    scrollToPlaylistPanel()
  }, [scrollToPlaylistPanel, spotifyImportTracks, spotifySummary?.playlistName])

  const cancelPlaylistEdit = useCallback(() => {
    setDraftPlaylistId(null)
    setDraftName('')
    setDraftTracks([])
    restoreSavedPlaylistView()
    if (!savedPlaylistViewRef.current) setLeftPanelMode('live')
  }, [restoreSavedPlaylistView])

  const fetchSavedPlaylists = useCallback(async () => {
    setPlaylistsLoading(true)
    try {
      const res = await fetch(playlistsApiBase, {
        headers: getAuthHeaders(),
        cache: 'no-store',
      })
      const json = (await res.json()) as {
        playlists?: VysionMusicPlaylistSummary[]
        error?: string
        code?: string
      }
      if (!res.ok) {
        setError(mapPlaylistApiError(json, t, 'vysionMusic.playlistLoadFailed'))
        setSavedPlaylists([])
        return
      }
      setSavedPlaylists(json.playlists ?? [])
    } catch {
      setError(t('vysionMusic.errorNetwork'))
      setSavedPlaylists([])
    } finally {
      setPlaylistsLoading(false)
    }
  }, [playlistsApiBase, t])

  const openPlaylistsModal = useCallback(() => {
    setPlaylistsOpen(true)
    void fetchSavedPlaylists()
  }, [fetchSavedPlaylists])

  const loadSavedPlaylistIntoPanel = useCallback(
    async (playlistId: string, playlistNameHint?: string) => {
      setPlaylistsOpen(false)
      scrollToPlaylistPanel()
      setSavedPlaylistLoading(true)
      setLeftPanelMode('saved')
      setSavedPlaylistId(playlistId)
      setSavedPlaylistName(playlistNameHint?.trim() || '')
      setSavedPlaylistTracks([])
      try {
        const res = await fetch(`${playlistsApiBase}/${encodeURIComponent(playlistId)}`, {
          headers: getAuthHeaders(),
          cache: 'no-store',
        })
        const json = (await res.json()) as {
          playlist?: {
            id: string
            name: string
            soundtrackPlaylistId?: string | null
            tracks: TrackRow[]
          }
          error?: string
          code?: string
        }
        if (!res.ok || !json.playlist) {
          setError(mapPlaylistApiError(json, t, 'vysionMusic.playlistLoadFailed'))
          savedPlaylistViewRef.current = null
          setLeftPanelMode('live')
          setSavedPlaylistId(null)
          setSavedPlaylistName('')
          setPlaylistsOpen(true)
          return
        }
        setError(null)
        pinSavedPlaylistView(
          json.playlist.id,
          json.playlist.name,
          json.playlist.tracks,
          json.playlist.soundtrackPlaylistId ?? null,
        )
      } catch {
        setError(t('vysionMusic.errorNetwork'))
        savedPlaylistViewRef.current = null
        setLeftPanelMode('live')
        setSavedPlaylistId(null)
        setSavedPlaylistName('')
        setSavedSoundtrackPlaylistId(null)
        setPlaylistsOpen(true)
      } finally {
        setSavedPlaylistLoading(false)
      }
    },
    [pinSavedPlaylistView, playlistsApiBase, scrollToPlaylistPanel, t],
  )

  const editSavedPlaylist = useCallback(() => {
    if (!savedPlaylistId) return
    setLeftPanelMode('edit')
    setDraftPlaylistId(savedPlaylistId)
    setDraftName(savedPlaylistName)
    setDraftTracks(savedPlaylistTracks)
  }, [savedPlaylistId, savedPlaylistName, savedPlaylistTracks])

  const persistSavedPlaylistOrder = useCallback(
    async (tracks: TrackRow[]) => {
      const id = savedPlaylistId
      const name = savedPlaylistName.trim()
      if (!id || !name || tracks.length === 0) return
      setSavedPlaylistTracks(tracks)
      pinSavedPlaylistView(id, name, tracks, savedSoundtrackPlaylistId)
      try {
        const res = await fetch(playlistsApiBase, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({
            id,
            name,
            tracks: tracks.map((t) => ({
              id: t.id,
              name: t.name,
              artist: t.artist,
              durationMs: t.durationMs,
              imageUrl: t.imageUrl,
            })),
          }),
        })
        const json = (await res.json()) as {
          playlist?: {
            id: string
            name: string
            soundtrackPlaylistId?: string | null
            tracks: TrackRow[]
          }
          error?: string
          code?: string
        }
        if (!res.ok || !json.playlist) {
          setError(mapPlaylistApiError(json, t, 'vysionMusic.playlistSaveFailed'))
          return
        }
        setError(null)
        pinSavedPlaylistView(
          json.playlist.id,
          json.playlist.name,
          json.playlist.tracks,
          json.playlist.soundtrackPlaylistId ?? null,
        )
      } catch {
        setError(t('vysionMusic.errorNetwork'))
      }
    },
    [
      pinSavedPlaylistView,
      playlistsApiBase,
      savedPlaylistId,
      savedPlaylistName,
      savedSoundtrackPlaylistId,
      t,
    ],
  )

  const saveDraftPlaylist = useCallback(async () => {
    const name = draftName.trim()
    if (!name || draftTracks.length === 0) return
    setSavingPlaylist(true)
    try {
      const res = await fetch(playlistsApiBase, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          id: draftPlaylistId,
          name,
          tracks: draftTracks.map((t) => ({
            id: t.id,
            name: t.name,
            artist: t.artist,
            durationMs: t.durationMs,
            imageUrl: t.imageUrl,
          })),
        }),
      })
      const json = (await res.json()) as {
        playlist?: {
          id: string
          name: string
          soundtrackPlaylistId?: string | null
          tracks: TrackRow[]
        }
        error?: string
        code?: string
      }
      if (!res.ok || !json.playlist) {
        setError(mapPlaylistApiError(json, t, 'vysionMusic.playlistSaveFailed'))
        return
      }
      setError(null)
      pinSavedPlaylistView(
        json.playlist.id,
        json.playlist.name,
        json.playlist.tracks,
        json.playlist.soundtrackPlaylistId ?? null,
      )
      setDraftPlaylistId(null)
      setDraftName('')
      setDraftTracks([])
      void fetchSavedPlaylists()
    } catch {
      setError(t('vysionMusic.errorNetwork'))
    } finally {
      setSavingPlaylist(false)
    }
  }, [
    draftName,
    draftPlaylistId,
    draftTracks,
    fetchSavedPlaylists,
    pinSavedPlaylistView,
    playlistsApiBase,
    t,
  ])

  const deleteSavedPlaylist = useCallback(
    async (playlistId: string) => {
      try {
        const res = await fetch(`${playlistsApiBase}/${encodeURIComponent(playlistId)}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        })
        if (!res.ok) {
          const json = (await res.json()) as { error?: string }
          setError(json.error || t('vysionMusic.playlistDeleteFailed'))
          return
        }
        if (savedPlaylistId === playlistId) {
          savedPlaylistViewRef.current = null
          setLeftPanelMode('live')
          setSavedPlaylistId(null)
          setSavedPlaylistTracks([])
          setSavedPlaylistName('')
          setSavedSoundtrackPlaylistId(null)
        }
        void fetchSavedPlaylists()
      } catch {
        setError(t('vysionMusic.errorNetwork'))
      }
    },
    [fetchSavedPlaylists, playlistsApiBase, savedPlaylistId, t],
  )

  const playPlaylistTracks = useCallback(
    async (
      tracks: TrackRow[],
      opts?: { startTrackId?: string; syncToSoundtrack?: boolean },
    ) => {
      const ids = tracks.map((r) => r.id).filter((id) => id && !id.startsWith('placeholder'))
      if (ids.length === 0) return
      const playlistName =
        savedPlaylistName.trim() || draftName.trim() || t('vysionMusic.playlistTitle')
      const soundtrackPlaylistId =
        savedPlaylistId != null && savedPlaylistTracks.length > 0
          ? savedSoundtrackPlaylistId
          : snapshot?.playFromPlaylistId ?? savedSoundtrackPlaylistId
      setSwitchingTrack(true)
      setError(null)
      try {
        const res = await fetch(apiBase, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({
            op: 'playPlaylist',
            trackIds: ids,
            startTrackId: opts?.startTrackId?.trim() || undefined,
            syncToSoundtrack: opts?.syncToSoundtrack === true,
            playlistName,
            soundtrackPlaylistId,
            vysionPlaylistId: savedPlaylistId,
          }),
        })
        const json = (await res.json()) as {
          ok?: boolean
          snapshot?: Snapshot
          error?: string
          code?: string
          soundtrackPlaylistId?: string
        }
        if (!res.ok || json.ok === false) {
          setError(json.error || t('vysionMusic.errorControl'))
          return
        }
        if (json.snapshot) setSnapshot(json.snapshot)
        if (json.soundtrackPlaylistId && savedPlaylistId) {
          pinSavedPlaylistView(
            savedPlaylistId,
            savedPlaylistName,
            savedPlaylistTracks,
            json.soundtrackPlaylistId,
          )
        }
      } catch {
        setError(t('vysionMusic.errorNetwork'))
      } finally {
        setSwitchingTrack(false)
        window.setTimeout(() => void loadSnapshot(), 800)
      }
    },
    [
      apiBase,
      draftName,
      loadSnapshot,
      pinSavedPlaylistView,
      savedPlaylistId,
      savedPlaylistName,
      savedPlaylistTracks,
      savedSoundtrackPlaylistId,
      t,
    ],
  )

  const handleLeftPanelDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      setLeftDropActive(false)
      if (leftPanelMode !== 'edit') return
      const track = readDragTrack(e.dataTransfer)
      if (!track) return
      addTrackToDraft({
        id: track.id,
        name: track.name,
        artist: track.artist,
        durationMs: track.durationMs,
        imageUrl: track.imageUrl,
      })
    },
    [addTrackToDraft, leftPanelMode],
  )

  const nowTrack = snapshot?.nowPlaying.track
  volumeUiRef.current = volumeUi

  const nowTrackId = nowTrack?.id
  const nowTrackName = nowTrack?.name
  const nowTrackArtist = nowTrack?.artist

  useEffect(() => {
    const key = trackIdentity(nowTrack)
    if (!key) return
    if (lastTrackKeyRef.current && lastTrackKeyRef.current !== key) {
      finishUiFadeIn()
    }
    lastTrackKeyRef.current = key
  }, [nowTrackId, nowTrackName, nowTrackArtist, finishUiFadeIn, nowTrack])
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
  const [coverBroken, setCoverBroken] = useState(false)
  useEffect(() => {
    setCoverBroken(false)
  }, [nowTrack?.imageUrl, nowTrack?.id])

  const coverSrc = useMemo(() => {
    const raw = nowTrack?.imageUrl?.trim()
    if (!raw || coverBroken) return null
    return `/api/soundtrack/cover?url=${encodeURIComponent(raw)}`
  }, [nowTrack?.imageUrl, coverBroken, nowTrack?.id])

  const soundtrackQueueRows = useMemo(
    () => (snapshot?.playlist ?? []).filter((r) => r.name !== '—' && !r.id.startsWith('placeholder')),
    [snapshot?.playlist],
  )

  const showingSavedPlaylist =
    leftPanelMode !== 'edit' &&
    savedPlaylistId != null &&
    savedPlaylistTracks.length > 0

  const leftPanelTitle =
    leftPanelMode === 'edit'
      ? t('vysionMusic.playlistEditTitle')
      : showingSavedPlaylist
        ? savedPlaylistName || t('vysionMusic.playlistTitle')
        : t('vysionMusic.playlistTitle')

  const leftPanelRows =
    leftPanelMode === 'edit'
      ? draftTracks
      : showingSavedPlaylist
        ? savedPlaylistTracks
        : soundtrackQueueRows

  const transportPlaylistRows =
    soundtrackQueueRows.length > 0 ? soundtrackQueueRows : savedPlaylistTracks

  const playQueueRow = useCallback(
    (row: TrackRow) => {
      const list = showingSavedPlaylist ? savedPlaylistTracks : soundtrackQueueRows
      if (list.length > 0) {
        void playPlaylistTracks(list, { startTrackId: row.id })
        return
      }
      void playTrackRow(row)
    },
    [playPlaylistTracks, playTrackRow, savedPlaylistTracks, showingSavedPlaylist, soundtrackQueueRows],
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
                disabled={transportPending === 'prev'}
                aria-label={t('vysionMusic.prev')}
                onClick={() => {
                  const rows = transportPlaylistRows
                  if (!nowTrack || rows.length < 2) return
                  const idx = rows.findIndex((r) => r.id === nowTrack.id && r.name === nowTrack.name)
                  const prev = idx > 0 ? rows[idx - 1] : null
                  if (prev?.id && savedPlaylistId && savedPlaylistTracks.length > 0) {
                    void playPlaylistTracks(savedPlaylistTracks, { startTrackId: prev.id })
                  } else if (prev?.id) {
                    void control('playTrack', { trackId: prev.id }, { transportPending: 'prev' })
                  }
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
                  void control(isPlaying ? 'pause' : 'play', undefined, {
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
                onClick={() => void control('stop', undefined, { transportPending: 'stop' })}
              >
                <VmStop className={styles.transportIcon} strokeWidth={VM_ICON_STROKE} />
              </button>
              <button
                type="button"
                className={styles.transportBtn}
                disabled={transportPending === 'skipNext'}
                aria-label={t('vysionMusic.next')}
                onClick={() =>
                  void control('skipNext', undefined, { transportPending: 'skipNext' })
                }
              >
                <VmSkipForward className={styles.transportIcon} strokeWidth={VM_ICON_STROKE} />
              </button>
            </div>
            <div className={styles.transportActionsRow}>
              <button
                type="button"
                className={styles.glassActionBtn}
                onClick={() => openPlaylistsModal()}
              >
                <span>{t('vysionMusic.actionPlaylist')}</span>
              </button>
              <button
                type="button"
                className={styles.glassActionBtn}
                onClick={() => startNewPlaylist()}
              >
                <span>{t('vysionMusic.actionNewList')}</span>
              </button>
              <button
                type="button"
                className={styles.glassActionBtn}
                onClick={() => openSpotifyImport()}
              >
                <span>{t('vysionMusic.actionSpotifyImport')}</span>
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
        <div className={styles.panel} ref={playlistPanelRef}>
          <div className={styles.panelTitleRow}>
            <div className={styles.panelTitle}>{leftPanelTitle}</div>
            {showingSavedPlaylist ? (
              <div className={styles.panelTitleActions}>
                <button
                  type="button"
                  className={styles.panelMiniBtn}
                  disabled={switchingTrack}
                  onClick={() =>
                    void playPlaylistTracks(savedPlaylistTracks, { syncToSoundtrack: true })
                  }
                >
                  {t('vysionMusic.playlistPlay')}
                </button>
                <button
                  type="button"
                  className={styles.panelMiniBtn}
                  onClick={() => editSavedPlaylist()}
                >
                  {t('vysionMusic.playlistEdit')}
                </button>
              </div>
            ) : null}
          </div>
          {leftPanelMode === 'edit' ? (
            <div className={styles.playlistEditBar}>
              <input
                className={styles.playlistNameInput}
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder={t('vysionMusic.playlistNamePlaceholder')}
                aria-label={t('vysionMusic.playlistNamePlaceholder')}
              />
              <div className={styles.playlistEditActions}>
                <button
                  type="button"
                  className={styles.panelMiniBtnPrimary}
                  disabled={
                    savingPlaylist || !draftName.trim() || draftTracks.length === 0
                  }
                  onClick={() => void saveDraftPlaylist()}
                >
                  {savingPlaylist ? t('vysionMusic.loading') : t('vysionMusic.playlistSave')}
                </button>
                <button
                  type="button"
                  className={styles.panelMiniBtn}
                  disabled={savingPlaylist}
                  onClick={() => cancelPlaylistEdit()}
                >
                  {t('vysionMusic.playlistCancel')}
                </button>
              </div>
              <p className={styles.playlistDropHint}>{t('vysionMusic.playlistDropHint')}</p>
            </div>
          ) : null}
          <div
            className={`${styles.list} ${leftPanelMode === 'edit' ? styles.listDropTarget : ''} ${
              leftDropActive ? styles.listDropTargetActive : ''
            }`}
            onDragOver={(e) => {
              if (leftPanelMode !== 'edit') return
              e.preventDefault()
              e.dataTransfer.dropEffect = 'copy'
              setLeftDropActive(true)
            }}
            onDragLeave={() => setLeftDropActive(false)}
            onDrop={handleLeftPanelDrop}
          >
            {leftPanelMode === 'edit' && draftTracks.length === 0 ? (
              <p className={styles.playlistEmptyDrop}>{t('vysionMusic.playlistEmptyDrop')}</p>
            ) : null}
            {(leftPanelMode === 'saved' || savedPlaylistId) && savedPlaylistLoading ? (
              <p className={styles.playlistEmptyDrop}>{t('vysionMusic.loading')}</p>
            ) : null}
            {savedPlaylistId &&
            !savedPlaylistLoading &&
            savedPlaylistTracks.length === 0 ? (
              <p className={styles.playlistEmptyDrop}>{t('vysionMusic.playlistModalEmpty')}</p>
            ) : null}
            {!savedPlaylistLoading && leftPanelMode === 'edit' && draftTracks.length > 0 ? (
              <VysionMusicPlaylistDraftList
                mode="edit"
                tracks={draftTracks}
                onChange={setDraftTracks}
                dragLabel={t('vysionMusic.playlistDragReorder')}
                removeLabel={t('vysionMusic.playlistRemoveTrack')}
              />
            ) : null}
            {!savedPlaylistLoading && showingSavedPlaylist ? (
              <VysionMusicPlaylistDraftList
                mode="saved"
                tracks={savedPlaylistTracks}
                onChange={(next) => void persistSavedPlaylistOrder(next)}
                dragLabel={t('vysionMusic.playlistDragReorder')}
                switchingTrack={switchingTrack}
                nowTrackId={nowTrack?.id}
                nowTrackName={nowTrack?.name}
                onPlayRow={(row) => playQueueRow(row)}
              />
            ) : null}
            {!savedPlaylistLoading && leftPanelMode !== 'edit' && !showingSavedPlaylist
              ? soundtrackQueueRows.map((row, idx) => {
                  const active =
                    nowTrack && row.id === nowTrack.id && row.name === nowTrack.name
                  return (
                    <div key={`${row.id}-${idx}`} className={styles.listRowWrap}>
                      <button
                        type="button"
                        className={`${styles.listRow} ${active ? styles.listRowActive : ''}`}
                        disabled={
                          switchingTrack || !row.id || row.id.startsWith('placeholder')
                        }
                        onClick={() => void playQueueRow(row)}
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
              : null}
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
                draggable={leftPanelMode === 'edit' && !switchingTrack}
                className={`${styles.listRow} ${styles.listRowDraggable} ${
                  nowTrack && row.id === nowTrack.id && row.name === nowTrack.name
                    ? styles.listRowActive
                    : ''
                }`}
                disabled={switchingTrack}
                onDragStart={(e) => {
                  if (leftPanelMode !== 'edit') {
                    e.preventDefault()
                    return
                  }
                  writeDragTrack(e.dataTransfer, {
                    id: row.id,
                    name: row.name,
                    artist: row.artist,
                    durationMs: row.durationMs,
                    imageUrl: row.imageUrl ?? null,
                  })
                }}
                onClick={() => void playTrackRow(row)}
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

      <VysionMusicPlaylistsModal
        open={playlistsOpen}
        loading={playlistsLoading}
        playlists={savedPlaylists}
        onClose={() => setPlaylistsOpen(false)}
        onSelect={(id, name) => void loadSavedPlaylistIntoPanel(id, name)}
        onDelete={(id) => void deleteSavedPlaylist(id)}
      />

      <VysionMusicSpotifyImportModal
        open={spotifyOpen}
        url={spotifyUrl}
        loading={spotifyLoading}
        summary={spotifySummary}
        onUrlChange={setSpotifyUrl}
        onClose={() => setSpotifyOpen(false)}
        onImport={() => void runSpotifyImport()}
        onApplyToList={() => applySpotifyImportToList()}
      />

      <div className={styles.statusBar}>{t('vysionMusic.statusFooter')}</div>
    </div>
  )
}
