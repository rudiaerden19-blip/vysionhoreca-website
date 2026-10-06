'use client'

import { useEffect, useId, useState } from 'react'
import { useLanguage } from '@/i18n'
import { getAuthHeaders } from '@/lib/auth-headers'
import styles from './vysion-music.module.css'

export function VysionMusicDeletePlaylistModal({
  tenant,
  open,
  playlistId,
  playlistName,
  onClose,
  onDeleted,
}: {
  tenant: string
  open: boolean
  playlistId: string
  playlistName: string
  onClose: () => void
  onDeleted: (playlistId: string) => void | Promise<void>
}) {
  const { t } = useLanguage()
  const titleId = useId()
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setDeleting(false)
  }, [open, playlistId])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !deleting) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, deleting])

  if (!open) return null

  const confirmDelete = async () => {
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/soundtrack/${encodeURIComponent(tenant)}/playlists`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ id: playlistId.trim() }),
        },
      )
      const json = (await res.json()) as { error?: string; ok?: boolean }
      if (!res.ok || json.ok === false) {
        setError(json.error || t('vysionMusic.deletePlaylistError'))
        return
      }
      await onDeleted(playlistId.trim())
      onClose()
    } catch {
      setError(t('vysionMusic.errorNetwork'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div
      className={styles.createPlaylistBackdrop}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !deleting) onClose()
      }}
    >
      <div
        className={styles.createPlaylistDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h2 id={titleId} className={styles.createPlaylistTitle}>
          {t('vysionMusic.deletePlaylistTitle')}
        </h2>
        <p className={styles.deletePlaylistMessage}>{t('vysionMusic.deletePlaylistConfirm')}</p>
        <p className={styles.deletePlaylistName}>{playlistName}</p>
        {error ? (
          <p className={styles.createPlaylistError} role="alert">
            {error}
          </p>
        ) : null}
        <div className={styles.createPlaylistActions}>
          <button
            type="button"
            className={styles.createPlaylistBtnSecondary}
            disabled={deleting}
            onClick={onClose}
          >
            {t('vysionMusic.deletePlaylistCancel')}
          </button>
          <button
            type="button"
            className={styles.createPlaylistBtnDanger}
            disabled={deleting}
            onClick={() => void confirmDelete()}
          >
            {deleting ? t('vysionMusic.deletePlaylistDeleting') : t('vysionMusic.deletePlaylistConfirmBtn')}
          </button>
        </div>
      </div>
    </div>
  )
}
