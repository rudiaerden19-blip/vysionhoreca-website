'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLanguage } from '@/i18n'
import { getAuthHeaders } from '@/lib/auth-headers'
import type { SoundtrackLibrarySourceKind } from '@/lib/soundtrack/soundtrack-playlists'
import styles from './vysion-music.module.css'

type LibraryItem = {
  id: string
  name: string
  sourceKind: SoundtrackLibrarySourceKind
  imageUrl: string | null
}

type LibraryTab = 'lists' | 'schedules'

export function VysionMusicLibrarySidebar({
  tenant,
  activeSourceId,
  onSelect,
  selecting,
}: {
  tenant: string
  activeSourceId: string | null
  onSelect: (sourceId: string) => void
  selecting: boolean
}) {
  const { t } = useLanguage()
  const [tab, setTab] = useState<LibraryTab>('lists')
  const [items, setItems] = useState<LibraryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/soundtrack/${encodeURIComponent(tenant)}/playlists`,
        { headers: getAuthHeaders(), cache: 'no-store' },
      )
      const json = (await res.json()) as { playlists?: LibraryItem[]; error?: string }
      if (!res.ok) {
        setError(json.error || t('vysionMusic.libraryLoadError'))
        setItems([])
        return
      }
      setItems(json.playlists ?? [])
    } catch {
      setError(t('vysionMusic.errorNetwork'))
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [tenant, t])

  useEffect(() => {
    void load()
  }, [load])

  const sourceLabel = useCallback(
    (kind: SoundtrackLibrarySourceKind) => {
      switch (kind) {
        case 'soundtrack':
          return t('vysionMusic.librarySourceSoundtrack')
        case 'schedule':
          return t('vysionMusic.librarySourceSchedule')
        case 'playlist':
        default:
          return t('vysionMusic.librarySourcePlaylist')
      }
    },
    [t],
  )

  const filtered = useMemo(() => {
    if (tab === 'schedules') {
      return items.filter((i) => i.sourceKind === 'schedule')
    }
    return items.filter((i) => i.sourceKind !== 'schedule')
  }, [items, tab])

  return (
    <aside className={styles.librarySidebar} aria-label={t('vysionMusic.libraryTitle')}>
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

      {loading ? (
        <p className={styles.libraryMuted}>{t('vysionMusic.libraryLoading')}</p>
      ) : null}
      {error ? (
        <p className={styles.libraryError} role="alert">
          {error}
        </p>
      ) : null}

      <ul className={styles.libraryList}>
        {!loading && !error && filtered.length === 0 ? (
          <li className={styles.libraryMuted}>{t('vysionMusic.libraryEmpty')}</li>
        ) : null}
        {filtered.map((pl) => {
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
                disabled={selecting}
                onClick={() => onSelect(pl.id)}
              >
                <span className={styles.libraryThumb} aria-hidden>
                  {thumbSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumbSrc} alt="" className={styles.libraryThumbImg} />
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
    </aside>
  )
}
