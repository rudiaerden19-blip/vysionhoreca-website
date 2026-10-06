'use client'

import { useLanguage } from '@/i18n'
import styles from './vysion-music.module.css'

export type SoundtrackLibraryPlaylistRow = {
  id: string
  name: string
}

export function VysionMusicPlaylistsModal({
  open,
  loading,
  playlists,
  onClose,
  onSelect,
  onEdit,
}: {
  open: boolean
  loading: boolean
  playlists: SoundtrackLibraryPlaylistRow[]
  onClose: () => void
  onSelect: (playlistId: string, playlistName: string) => void
  onEdit: (playlistId: string) => void
}) {
  const { t } = useLanguage()
  if (!open) return null

  return (
    <div
      className={styles.playlistModalBackdrop}
      role="presentation"
      onClick={onClose}
    >
      <div
        className={styles.playlistModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="vm-playlists-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.playlistModalHeader}>
          <h2 id="vm-playlists-title" className={styles.playlistModalTitle}>
            {t('vysionMusic.playlistModalTitle')}
          </h2>
          <button
            type="button"
            className={styles.playlistModalClose}
            aria-label={t('vysionMusic.playlistModalClose')}
            onClick={onClose}
          >
            ×
          </button>
        </div>
        {loading ? (
          <p className={styles.playlistModalHint}>{t('vysionMusic.loading')}</p>
        ) : playlists.length === 0 ? (
          <p className={styles.playlistModalHint}>{t('vysionMusic.playlistModalEmpty')}</p>
        ) : (
          <ul className={styles.playlistModalList}>
            {playlists.map((p) => (
              <li key={p.id} className={styles.playlistModalItem}>
                <button
                  type="button"
                  className={styles.playlistModalSelect}
                  onClick={() => onSelect(p.id, p.name)}
                >
                  <span className={styles.playlistModalName}>{p.name}</span>
                </button>
                <button
                  type="button"
                  className={styles.playlistModalDelete}
                  aria-label={t('vysionMusic.playlistEdit')}
                  onClick={() => onEdit(p.id)}
                >
                  ✎
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
