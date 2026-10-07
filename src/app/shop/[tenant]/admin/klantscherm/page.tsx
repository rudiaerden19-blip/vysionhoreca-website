'use client'

import { useCallback, useEffect, useState } from 'react'
import PinGate from '@/components/PinGate'
import { getAuthHeaders } from '@/lib/auth-headers'
import { useLanguage } from '@/i18n'
import { parseKlantschermSlideshowUploads } from '@/lib/klantscherm-slideshow-server'
import {
  inferKlantschermMediaTypeFromUrl,
  KLANTSCHERM_PROMO_FILE_ACCEPT,
  normalizeKlantschermPromoUrl,
  validateKlantschermPromoFile,
  type KlantschermSlideshowMediaType,
} from '@/lib/klantscherm-slideshow-media'
import { uploadKlantschermPromoMedia } from '@/lib/klantscherm-promo-upload'
import { notifyKlantschermSlideshowRefresh } from '@/lib/klantscherm-slideshow-server'
import { klantschermSlideshowPlaybackUrl } from '@/lib/klantscherm-slideshow-playback-url'
import {
  getOrCreateKlantschermSessionToken,
  klantschermPublicUrl,
} from '@/lib/klantscherm-session-token'
import {
  buildCustomerDisplayPopupFeatures,
  heuristicSecondaryBoundsSync,
  readCachedSecondaryBounds,
} from '@/lib/kassa-customer-display-window'

type UploadRow = { url: string; sort: number; mediaType: KlantschermSlideshowMediaType }

export default function KlantschermAdminPage({ params }: { params: { tenant: string } }) {
  const { t } = useLanguage()
  const tenant = params.tenant
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [slideshowEnabled, setSlideshowEnabled] = useState(true)
  const [uploads, setUploads] = useState<UploadRow[]>([])
  const [uploadBusy, setUploadBusy] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [uploadStatusLabel, setUploadStatusLabel] = useState('')
  const [uploadElapsedSec, setUploadElapsedSec] = useState(0)
  const [displayUrl, setDisplayUrl] = useState('')
  const [displayUrlCopied, setDisplayUrlCopied] = useState(false)
  const [promoUrlDraft, setPromoUrlDraft] = useState('')
  const [promoUrlKind, setPromoUrlKind] = useState<KlantschermSlideshowMediaType | 'auto'>('auto')
  const [bankIban, setBankIban] = useState('')
  const [bankAccountName, setBankAccountName] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined' || !enabled) {
      setDisplayUrl('')
      return
    }
    const tok = getOrCreateKlantschermSessionToken(tenant)
    setDisplayUrl(klantschermPublicUrl(tenant, tok))
  }, [tenant, enabled])

  const openCustomerDisplay = () => {
    if (typeof window === 'undefined') return
    const tok = getOrCreateKlantschermSessionToken(tenant)
    const url = klantschermPublicUrl(tenant, tok)
    setDisplayUrl(url)
    const winName = `vysion_klantscherm_${tenant}`
    const cached = readCachedSecondaryBounds()
    const heuristic = heuristicSecondaryBoundsSync(window.screen)
    const syncBounds = cached ?? heuristic
    let features =
      'popup=yes,width=520,height=380,menubar=no,toolbar=no,location=no,status=no,scrollbars=yes,resizable=yes'
    if (syncBounds) {
      features = buildCustomerDisplayPopupFeatures(syncBounds)
    }
    const w = window.open(url, winName, features)
    if (!w) {
      alert(t('adminPages.klantscherm.openFailed'))
    }
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/shop/${encodeURIComponent(tenant)}/klantscherm/settings`, {
        credentials: 'same-origin',
        headers: getAuthHeaders(),
      })
      const json = (await r.json()) as {
        ok?: boolean
        settings?: {
          klantscherm_enabled?: boolean
          klantscherm_slideshow_enabled?: boolean
          klantscherm_bank_iban?: string | null
          klantscherm_bank_account_name?: string | null
        } | null
        uploads?: ReturnType<typeof parseKlantschermSlideshowUploads>
      }
      if (json.ok && json.settings) {
        const data = json.settings
        setEnabled(data.klantscherm_enabled === true)
        setSlideshowEnabled(data.klantscherm_slideshow_enabled !== false)
        setUploads(
          (json.uploads ?? []).map((row) => ({
            url: row.url,
            sort: row.sort,
            mediaType: row.mediaType ?? inferKlantschermMediaTypeFromUrl(row.url),
          })),
        )
        setBankIban(String(data.klantscherm_bank_iban ?? '').trim())
        setBankAccountName(String(data.klantscherm_bank_account_name ?? '').trim())
      }
    } catch {
      /* ignore */
    }
    setLoading(false)
  }, [tenant])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!uploadBusy) {
      setUploadElapsedSec(0)
      return
    }
    const started = Date.now()
    const id = window.setInterval(() => {
      setUploadElapsedSec(Math.floor((Date.now() - started) / 1000))
    }, 1000)
    return () => window.clearInterval(id)
  }, [uploadBusy])

  const persistSettings = async (
    uploadRows: UploadRow[],
    opts?: { slideshowEnabled?: boolean },
  ) => {
    const menuSlideshowOn = opts?.slideshowEnabled ?? slideshowEnabled
    const r = await fetch(`/api/shop/${encodeURIComponent(tenant)}/klantscherm/settings`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({
        klantscherm_enabled: enabled,
        klantscherm_slideshow_enabled: menuSlideshowOn,
        klantscherm_slideshow_uploads: uploadRows.map((row) => ({
          url: row.url,
          sort: row.sort,
          mediaType: row.mediaType,
        })),
        klantscherm_bank_iban: bankIban,
        klantscherm_bank_account_name: bankAccountName,
      }),
    })
    const json = (await r.json()) as { ok?: boolean; error?: string }
    if (!r.ok || !json.ok) return { ok: false as const, error: json.error }
    notifyKlantschermSlideshowRefresh(tenant)
    return { ok: true as const }
  }

  const saveSettings = async () => {
    setSaving(true)
    setSaved(false)
    const result = await persistSettings(uploads)
    setSaving(false)
    if (!result.ok) {
      alert(
        result.error
          ? `${t('adminPages.common.saveFailed')} (${result.error})`
          : t('adminPages.common.saveFailed'),
      )
      return
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const formatUploadSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${Math.max(1, Math.round(bytes / 1024))} KB`
  }

  const onPickUpload = async (file: File | null) => {
    if (!file) return
    const check = validateKlantschermPromoFile(file)
    if (!check.ok) {
      alert(
        check.reason === 'size'
          ? t('adminPages.klantscherm.uploadTooLarge')
          : t('adminPages.klantscherm.uploadInvalidType'),
      )
      return
    }
    setUploadBusy(true)
    setUploadProgress(0)
    setUploadStatusLabel(
      t('adminPages.klantscherm.uploadProgressStart')
        .replace('{name}', file.name)
        .replace('{size}', formatUploadSize(file.size)),
    )
    try {
      const result = await uploadKlantschermPromoMedia(tenant, file, check.mediaType, (p) => {
        setUploadProgress(p.percent)
        if (p.phase === 'preparing') {
          setUploadStatusLabel(
            t('adminPages.klantscherm.uploadPreparing').replace('{name}', file.name),
          )
          return
        }
        if (p.phase === 'finalizing') {
          setUploadStatusLabel(
            t('adminPages.klantscherm.uploadFinalizing').replace('{name}', file.name),
          )
          return
        }
        setUploadStatusLabel(
          t('adminPages.klantscherm.uploadProgress')
            .replace('{percent}', String(p.percent))
            .replace('{name}', file.name),
        )
      })
      if (!result.ok) {
        alert(
          t('adminPages.klantscherm.uploadFailedDetail').replace('{detail}', result.message),
        )
        return
      }
      const nextUploads: UploadRow[] = [
        ...uploads,
        { url: result.publicUrl, sort: uploads.length, mediaType: check.mediaType },
      ]
      setUploads(nextUploads)
      const saved = await persistSettings(nextUploads)
      setUploadStatusLabel(
        saved.ok
          ? t('adminPages.klantscherm.uploadSavedAuto')
          : t('adminPages.klantscherm.uploadAddedReminder'),
      )
      if (!saved.ok) {
        alert(t('adminPages.common.saveFailed'))
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err)
      alert(t('adminPages.klantscherm.uploadFailedDetail').replace('{detail}', detail))
    } finally {
      setUploadBusy(false)
      setUploadProgress(null)
      window.setTimeout(() => setUploadStatusLabel(''), 8000)
    }
  }

  const flashSaved = () => {
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2000)
  }

  const removeUpload = (index: number) => {
    const next = uploads.filter((_, i) => i !== index).map((row, sort) => ({ ...row, sort }))
    setUploads(next)
    void (async () => {
      const result = await persistSettings(next)
      if (!result.ok) {
        alert(t('adminPages.common.saveFailed'))
        void load()
        return
      }
      flashSaved()
    })()
  }

  const setUploadMediaType = (index: number, mediaType: KlantschermSlideshowMediaType) => {
    const next = uploads.map((row, i) => (i === index ? { ...row, mediaType } : row))
    setUploads(next)
    void (async () => {
      const result = await persistSettings(next)
      if (!result.ok) {
        alert(t('adminPages.common.saveFailed'))
        void load()
        return
      }
      flashSaved()
    })()
  }

  const addPromoUrl = () => {
    const url = normalizeKlantschermPromoUrl(promoUrlDraft)
    if (!url) {
      alert(t('adminPages.klantscherm.promoUrlInvalid'))
      return
    }
    if (uploads.some((row) => row.url === url)) {
      alert(t('adminPages.klantscherm.promoUrlDuplicate'))
      return
    }
    const mediaType =
      promoUrlKind === 'auto' ? inferKlantschermMediaTypeFromUrl(url) : promoUrlKind
    const next: UploadRow[] = [...uploads, { url, sort: uploads.length, mediaType }]
    setUploads(next)
    setPromoUrlDraft('')
    void (async () => {
      const result = await persistSettings(next)
      if (!result.ok) {
        alert(t('adminPages.common.saveFailed'))
        void load()
        return
      }
      flashSaved()
    })()
  }

  const copyDisplayUrl = async () => {
    if (!displayUrl || typeof navigator === 'undefined' || !navigator.clipboard) return
    try {
      await navigator.clipboard.writeText(displayUrl)
      setDisplayUrlCopied(true)
      window.setTimeout(() => setDisplayUrlCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  return (
    <PinGate tenant={tenant}>
      <div className="mx-auto max-w-3xl space-y-8 p-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('adminPages.klantscherm.title')}</h1>
          <p className="text-gray-500">{t('adminPages.klantscherm.subtitle')}</p>
          <p className="mt-2 text-sm text-gray-600">{t('adminPages.klantscherm.bankQrHint')}</p>
        </div>

        {loading ? (
          <p className="text-gray-500">{t('adminPages.common.loading')}</p>
        ) : (
          <>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="h-5 w-5"
              />
              <span>
                <span className="font-semibold text-gray-900">{t('adminPages.klantscherm.enabled')}</span>
                <span className="mt-1 block text-sm text-gray-500">{t('adminPages.klantscherm.enabledDesc')}</span>
              </span>
            </label>

            <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
              <div>
                <p className="font-semibold text-gray-900">{t('adminPages.klantscherm.bankQrTitle')}</p>
                <p className="mt-1 text-sm text-gray-500">{t('adminPages.klantscherm.bankQrDesc')}</p>
              </div>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">{t('adminPages.klantscherm.bankIban')}</span>
                <input
                  type="text"
                  value={bankIban}
                  disabled={!enabled}
                  onChange={(e) => setBankIban(e.target.value)}
                  placeholder="BE68 5390 0754 7034"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-40"
                  autoComplete="off"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  {t('adminPages.klantscherm.bankAccountName')}
                </span>
                <input
                  type="text"
                  value={bankAccountName}
                  disabled={!enabled}
                  onChange={(e) => setBankAccountName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-40"
                  autoComplete="organization"
                />
                <span className="mt-1 block text-xs text-gray-500">
                  {t('adminPages.klantscherm.bankAccountNameHint')}
                </span>
              </label>
            </div>

            <div className="rounded-xl border border-[#3C4D6B]/30 bg-[#3C4D6B]/5 p-4">
              <p className="font-semibold text-gray-900">{t('adminPages.klantscherm.openDisplay')}</p>
              <p className="mt-1 text-sm text-gray-600">{t('adminPages.klantscherm.openDisplayHint')}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={!enabled}
                  onClick={openCustomerDisplay}
                  className="rounded-xl bg-[#3C4D6B] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2D3A52] disabled:opacity-40"
                >
                  {t('adminPages.klantscherm.openDisplayButton')}
                </button>
              </div>
              {displayUrl ? (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-medium text-gray-600">
                    {t('adminPages.klantscherm.displayUrlLabel')}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={displayUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-xs text-[#3C4D6B] underline"
                    >
                      {displayUrl}
                    </a>
                    <button
                      type="button"
                      onClick={() => void copyDisplayUrl()}
                      className="shrink-0 rounded-lg border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      {displayUrlCopied
                        ? t('adminPages.klantscherm.displayUrlCopied')
                        : t('adminPages.klantscherm.displayUrlCopy')}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
              <input
                type="checkbox"
                checked={slideshowEnabled}
                disabled={!enabled}
                onChange={(e) => {
                  const next = e.target.checked
                  setSlideshowEnabled(next)
                  void (async () => {
                    const result = await persistSettings(uploads, { slideshowEnabled: next })
                    if (!result.ok) {
                      setSlideshowEnabled(!next)
                      alert(
                        result.error
                          ? `${t('adminPages.common.saveFailed')} (${result.error})`
                          : t('adminPages.common.saveFailed'),
                      )
                      return
                    }
                    setSaved(true)
                    setTimeout(() => setSaved(false), 2000)
                  })()
                }}
                className="h-5 w-5 disabled:opacity-40"
              />
              <span>
                <span className="font-semibold text-gray-900">{t('adminPages.klantscherm.slideshow')}</span>
                <span className="mt-1 block text-sm text-gray-500">{t('adminPages.klantscherm.slideshowDesc')}</span>
              </span>
            </label>

            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="font-semibold text-gray-900">{t('adminPages.klantscherm.uploadsTitle')}</p>
              <p className="mb-4 text-sm text-gray-500">{t('adminPages.klantscherm.uploadsDesc')}</p>
              <div className="mb-4 space-y-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3">
                <p className="text-sm font-medium text-gray-800">{t('adminPages.klantscherm.promoUrlTitle')}</p>
                <p className="text-xs text-gray-500">{t('adminPages.klantscherm.promoUrlDesc')}</p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <label className="min-w-0 flex-1">
                    <span className="sr-only">{t('adminPages.klantscherm.promoUrlTitle')}</span>
                    <input
                      type="url"
                      value={promoUrlDraft}
                      disabled={!enabled || uploadBusy}
                      onChange={(e) => setPromoUrlDraft(e.target.value)}
                      placeholder={t('adminPages.klantscherm.promoUrlPlaceholder')}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-40"
                    />
                  </label>
                  <label className="shrink-0">
                    <span className="mb-1 block text-xs font-medium text-gray-600">
                      {t('adminPages.klantscherm.uploadKindLabel')}
                    </span>
                    <select
                      value={promoUrlKind}
                      disabled={!enabled || uploadBusy}
                      onChange={(e) =>
                        setPromoUrlKind(e.target.value as KlantschermSlideshowMediaType | 'auto')
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-40 sm:w-auto"
                    >
                      <option value="auto">{t('adminPages.klantscherm.uploadKindAuto')}</option>
                      <option value="image">{t('adminPages.klantscherm.uploadKindPhoto')}</option>
                      <option value="video">{t('adminPages.klantscherm.uploadKindVideo')}</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    disabled={!enabled || uploadBusy || !promoUrlDraft.trim()}
                    onClick={addPromoUrl}
                    className="shrink-0 rounded-lg bg-[#3C4D6B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2D3A52] disabled:opacity-40"
                  >
                    {t('adminPages.klantscherm.promoUrlAdd')}
                  </button>
                </div>
              </div>
              <input
                type="file"
                accept={KLANTSCHERM_PROMO_FILE_ACCEPT}
                disabled={uploadBusy || !enabled}
                onChange={(e) => {
                  void onPickUpload(e.target.files?.[0] ?? null)
                  e.target.value = ''
                }}
              />
              {uploadBusy ? (
                <div className="mt-4 rounded-lg border border-[#3C4D6B]/30 bg-[#3C4D6B]/5 p-4">
                  <p className="text-sm font-medium text-gray-800">{uploadStatusLabel}</p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full bg-[#3C4D6B] transition-[width] duration-300"
                      style={{
                        width:
                          (uploadProgress ?? 0) > 0
                            ? `${uploadProgress}%`
                            : '12%',
                        opacity: (uploadProgress ?? 0) > 0 ? 1 : 0.55,
                      }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-600">
                    {t('adminPages.klantscherm.uploadWaitHint')}{' '}
                    {uploadElapsedSec > 0
                      ? t('adminPages.klantscherm.uploadElapsed').replace('{sec}', String(uploadElapsedSec))
                      : ''}
                  </p>
                </div>
              ) : uploadStatusLabel ? (
                <p className="mt-3 text-sm font-medium text-emerald-700">{uploadStatusLabel}</p>
              ) : null}
              <ul className="mt-4 space-y-2">
                {uploads.map((row, i) => {
                  const previewSrc = klantschermSlideshowPlaybackUrl(tenant, row.url)
                  return (
                  <li key={row.url} className="flex flex-wrap items-center gap-3 border-b border-gray-100 pb-2">
                    {row.mediaType === 'video' ? (
                      // eslint-disable-next-line jsx-a11y/media-has-caption
                      <video
                        src={previewSrc}
                        muted
                        playsInline
                        controls
                        preload="metadata"
                        className="h-14 w-24 rounded object-contain bg-black"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={previewSrc} alt="" className="h-14 w-14 rounded object-cover" />
                    )}
                    <label className="flex flex-col gap-0.5">
                      <span className="text-xs font-medium text-gray-600">
                        {t('adminPages.klantscherm.uploadKindLabel')}
                      </span>
                      <select
                        value={row.mediaType}
                        disabled={!enabled}
                        onChange={(e) =>
                          setUploadMediaType(i, e.target.value as KlantschermSlideshowMediaType)
                        }
                        className="rounded-lg border border-gray-300 px-2 py-1 text-sm disabled:opacity-40"
                      >
                        <option value="image">{t('adminPages.klantscherm.uploadKindPhoto')}</option>
                        <option value="video">{t('adminPages.klantscherm.uploadKindVideo')}</option>
                      </select>
                    </label>
                    <a
                      href={row.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 flex-1 truncate text-xs text-[#3C4D6B] underline"
                      title={row.url}
                    >
                      {row.url}
                    </a>
                    <button
                      type="button"
                      className="text-sm text-red-600 underline"
                      onClick={() => removeUpload(i)}
                    >
                      {t('adminPages.klantscherm.removeUpload')}
                    </button>
                  </li>
                  )
                })}
              </ul>
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={() => void saveSettings()}
              className="rounded-xl bg-[#3C4D6B] px-6 py-3 font-semibold text-white hover:bg-[#2D3A52] disabled:opacity-50"
            >
              {saving ? t('adminPages.common.saving') : saved ? t('adminPages.common.saved') : t('adminPages.common.save')}
            </button>
          </>
        )}
      </div>
    </PinGate>
  )
}
