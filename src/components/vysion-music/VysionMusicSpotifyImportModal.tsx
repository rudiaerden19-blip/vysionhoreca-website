'use client'

import { useLanguage } from '@/i18n'
import styles from './vysion-music.module.css'

export function VysionMusicSpotifyImportModal({
  open,
  url,
  loading,
  onUrlChange,
  onClose,
  onImport,
  onApplyToList,
  summary,
}: {
  open: boolean
  url: string
  loading: boolean
  onUrlChange: (v: string) => void
  onClose: () => void
  onImport: () => void
  onApplyToList: () => void
  summary: {
    total: number
    matchedCount: number
    playlistName: string
  } | null
}) {
  const { t } = useLanguage()
  if (!open) return null

  return (
    <div className={styles.playlistModalBackdrop} role="presentation" onClick={onClose}>
      <div
        className={styles.spotifyImportModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="vm-spotify-import-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.playlistModalHeader}>
          <h2 id="vm-spotify-import-title" className={styles.playlistModalTitle}>
            {t('vysionMusic.spotifyModalTitle')}
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
        <p className={styles.spotifyImportHint}>{t('vysionMusic.spotifyModalHint')}</p>
        <div className={styles.spotifyImportField}>
          <input
            className={styles.spotifyImportInput}
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder={t('vysionMusic.spotifyUrlPlaceholder')}
            aria-label={t('vysionMusic.spotifyUrlPlaceholder')}
            disabled={loading}
          />
          <button
            type="button"
            className={styles.spotifyImportBtn}
            disabled={loading || !url.trim()}
            onClick={onImport}
          >
            {loading ? t('vysionMusic.spotifyImporting') : t('vysionMusic.spotifyImportRun')}
          </button>
        </div>
        {summary ? (
          <>
            <p className={styles.spotifyImportSummary}>
              {t('vysionMusic.spotifyImportSummary')
                .replace('{name}', summary.playlistName)
                .replace('{matched}', String(summary.matchedCount))
                .replace('{total}', String(summary.total))}
            </p>
            {summary.matchedCount > 0 ? (
              <button
                type="button"
                className={styles.spotifyApplyBtn}
                onClick={onApplyToList}
              >
                {t('vysionMusic.spotifyApplyToList')}
              </button>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  )
}
