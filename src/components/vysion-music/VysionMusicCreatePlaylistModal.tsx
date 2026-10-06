'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useLanguage } from '@/i18n'
import { getAuthHeaders } from '@/lib/auth-headers'
import styles from './vysion-music.module.css'

export function VysionMusicCreatePlaylistModal({
  tenant,
  open,
  onClose,
  onCreated,
}: {
  tenant: string
  open: boolean
  onClose: () => void
  onCreated: () => void | Promise<void>
}) {
  const { t } = useLanguage()
  const titleId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName('')
    setError(null)
    setSaving(false)
    const id = window.setTimeout(() => inputRef.current?.focus(), 0)
    return () => window.clearTimeout(id)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, saving])

  if (!open) return null

  const trimmed = name.trim()
  const canSave = trimmed.length > 0 && !saving

  const submit = async () => {
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/soundtrack/${encodeURIComponent(tenant)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          mutation: 'createManualPlaylist',
          input: { name: trimmed },
        }),
      })
      const json = (await res.json()) as {
        error?: string
        ok?: boolean
        mutation?: string
        playlist?: { id?: string; name?: string }
        playlists?: { id: string; name: string }[]
      }
      if (!res.ok || json.ok === false) {
        setError(json.error || t('vysionMusic.createPlaylistError'))
        return
      }
      const createdId = json.playlist?.id?.trim()
      if (!createdId) {
        setError(t('vysionMusic.createPlaylistError'))
        return
      }
      const inSoundtrackList = (json.playlists ?? []).some(
        (p) => p.id.trim() === createdId && p.name.trim() === trimmed,
      )
      if (!inSoundtrackList) {
        setError(t('vysionMusic.createPlaylistError'))
        return
      }
      await onCreated()
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
        className={styles.createPlaylistDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h2 id={titleId} className={styles.createPlaylistTitle}>
          {t('vysionMusic.createPlaylistTitle')}
        </h2>
        <label className={styles.createPlaylistLabel}>
          {t('vysionMusic.createPlaylistNameLabel')}
          <input
            ref={inputRef}
            className={styles.createPlaylistInput}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={saving}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canSave) void submit()
            }}
          />
        </label>
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
            {t('vysionMusic.createPlaylistCancel')}
          </button>
          <button
            type="button"
            className={styles.createPlaylistBtnPrimary}
            disabled={!canSave}
            onClick={() => void submit()}
          >
            {saving ? t('vysionMusic.createPlaylistSaving') : t('vysionMusic.createPlaylistSave')}
          </button>
        </div>
      </div>
    </div>
  )
}
