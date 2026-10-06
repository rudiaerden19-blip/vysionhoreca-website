'use client'

import { useCallback, useEffect, useId, useState } from 'react'
import { useLanguage } from '@/i18n'
import { getAuthHeaders } from '@/lib/auth-headers'
import styles from './vysion-music.module.css'

export function VysionMusicPlayerLinkModal({
  tenant,
  open,
  onClose,
  onLinkedChange,
}: {
  tenant: string
  open: boolean
  onClose: () => void
  onLinkedChange?: (linked: boolean) => void
}) {
  const { t } = useLanguage()
  const titleId = useId()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordSet, setPasswordSet] = useState(false)
  const [linked, setLinked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/tenant/soundtrack-player?tenant=${encodeURIComponent(tenant)}`,
        { headers: getAuthHeaders(), cache: 'no-store' },
      )
      const json = (await res.json()) as {
        email?: string
        password_set?: boolean
        linked?: boolean
        error?: string
        platform_soundtrack_configured?: boolean
        platform_soundtrack_error?: string | null
      }
      if (!res.ok) {
        setError(json.error || t('vysionMusic.playerLinkLoadError'))
        return
      }
      if (json.platform_soundtrack_configured === false && json.platform_soundtrack_error) {
        setError(json.platform_soundtrack_error)
      }
      setEmail(json.email || '')
      setPasswordSet(!!json.password_set)
      const isLinked = !!json.linked
      setLinked(isLinked)
      onLinkedChange?.(isLinked)
    } catch {
      setError(t('vysionMusic.errorNetwork'))
    } finally {
      setLoading(false)
    }
  }, [tenant, t, onLinkedChange])

  useEffect(() => {
    if (open) {
      setPassword('')
      setSaved(false)
      void load()
    }
  }, [open, load])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch('/api/tenant/soundtrack-player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ tenantSlug: tenant, email, password }),
      })
      const json = (await res.json()) as { success?: boolean; error?: string }
      if (!res.ok || !json.success) {
        setError(json.error || t('vysionMusic.playerLinkSaveError'))
        return
      }
      setPassword('')
      setPasswordSet(true)
      setLinked(true)
      onLinkedChange?.(true)
      setSaved(true)
    } catch {
      setError(t('vysionMusic.errorNetwork'))
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className={styles.modalBackdrop} role="presentation" onClick={onClose}>
      <div
        className={styles.modalPanel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.modalHeader}>
          <h2 id={titleId} className={styles.modalTitle}>
            {t('vysionMusic.playerLinkTitle')}
          </h2>
          <button type="button" className={styles.modalClose} onClick={onClose} aria-label={t('vysionMusic.playerLinkClose')}>
            ×
          </button>
        </header>

        <p className={styles.modalHint}>{t('vysionMusic.playerLinkHint')}</p>

        {linked ? (
          <p className={styles.modalLinkedBadge}>{t('vysionMusic.playerLinkLinked')}</p>
        ) : null}

        {loading ? <p className={styles.modalMuted}>{t('adminPages.common.loading')}</p> : null}

        <label className={styles.modalField}>
          <span>{t('vysionMusic.playerLinkEmail')}</span>
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={saving}
          />
        </label>

        <label className={styles.modalField}>
          <span>{t('vysionMusic.playerLinkPassword')}</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={passwordSet ? t('vysionMusic.playerLinkPasswordKeep') : undefined}
            disabled={saving}
          />
        </label>

        {error ? <p className={styles.modalError}>{error}</p> : null}
        {saved ? <p className={styles.modalSuccess}>{t('vysionMusic.playerLinkSaved')}</p> : null}

        <div className={styles.modalActions}>
          <button type="button" className={styles.modalSecondary} onClick={onClose} disabled={saving}>
            {t('vysionMusic.playerLinkClose')}
          </button>
          <button type="button" className={styles.modalPrimary} onClick={() => void handleSave()} disabled={saving || loading}>
            {saving ? t('vysionMusic.playerLinkSaving') : t('vysionMusic.playerLinkConnect')}
          </button>
        </div>
      </div>
    </div>
  )
}
