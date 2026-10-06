'use client'

import { useEffect, useId, useState } from 'react'
import { useLanguage } from '@/i18n'
import { getAuthHeaders } from '@/lib/auth-headers'
import { refreshSoundtrackWebPlayer } from '@/lib/vysion-music/soundtrack-web-player-refresh'
import type {
  VysionMusicCatalogTrack,
  VysionMusicLibraryItem,
} from './vysion-music-catalog-cache'
import styles from './vysion-music.module.css'

export function VysionMusicAddTrackToPlaylistModal({
  tenant,
  open,
  trackId,
  playlists,
  onClose,
  onAdded,
}: {
  tenant: string
  open: boolean
  trackId: string
  playlists: VysionMusicLibraryItem[]
  onClose: () => void
  onAdded: (playlistId: string, tracks: VysionMusicCatalogTrack[]) => void | Promise<void>
}) {
  const { t } = useLanguage()
  const titleId = useId()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setSelectedId(null)
    setError(null)
    setSaving(false)
  }, [open, trackId])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, saving])

  if (!open) return null

  const canAdd = Boolean(selectedId?.trim()) && !saving

  const submit = async () => {
    const source = selectedId?.trim()
    if (!source || !canAdd) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/soundtrack/${encodeURIComponent(tenant)}/playlist-tracks`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ source, trackId: trackId.trim() }),
        },
      )
      const json = (await res.json()) as {
        error?: string
        ok?: boolean
        tracks?: VysionMusicCatalogTrack[]
        playerWebUrl?: string | null
      }
      if (!res.ok || json.ok === false) {
        setError(json.error || t('vysionMusic.addToPlaylistError'))
        return
      }
      refreshSoundtrackWebPlayer(json.playerWebUrl)
      await onAdded(source, json.tracks ?? [])
      onClose()
    } catch {
      setError(t('vysionMusic.errorNetwork'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className={styles.createPlaylistBackdrop}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose()
      }}
    >
      <div
        className={styles.addToPlaylistDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h2 id={titleId} className={styles.createPlaylistTitle}>
          {t('vysionMusic.addToPlaylistTitle')}
        </h2>
        <ul className={styles.addToPlaylistList}>
          {playlists.length === 0 ? (
            <li className={styles.libraryMuted}>{t('vysionMusic.addToPlaylistEmpty')}</li>
          ) : (
            playlists.map((pl) => {
              const checked = selectedId === pl.id
              return (
                <li key={pl.id}>
                  <button
                    type="button"
                    className={
                      checked ? styles.addToPlaylistRowActive : styles.addToPlaylistRow
                    }
                    disabled={saving}
                    onClick={() => setSelectedId(pl.id)}
                  >
                    {pl.name}
                  </button>
                </li>
              )
            })
          )}
        </ul>
        {error ? (
          <p className={styles.createPlaylistError} role="alert">
            {error}
          </p>
        ) : null}
        <div className={styles.createPlaylistActions}>
          <button
            type="button"
            className={styles.createPlaylistBtnSecondary}
            disabled={saving}
            onClick={onClose}
          >
            {t('vysionMusic.addToPlaylistCancel')}
          </button>
          <button
            type="button"
            className={styles.createPlaylistBtnPrimary}
            disabled={!canAdd}
            onClick={() => void submit()}
          >
            {saving ? t('vysionMusic.addToPlaylistAdding') : t('vysionMusic.addToPlaylistAdd')}
          </button>
        </div>
      </div>
    </div>
  )
}
