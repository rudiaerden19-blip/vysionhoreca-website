'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import PinGate from '@/components/PinGate'
import { useLanguage } from '@/i18n'
import { parseKlantschermSlideshowUploads } from '@/lib/klantscherm-slideshow-server'
import {
  inferKlantschermMediaTypeFromUrl,
  KLANTSCHERM_PROMO_FILE_ACCEPT,
  validateKlantschermPromoFile,
  type KlantschermSlideshowMediaType,
} from '@/lib/klantscherm-slideshow-media'
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
  const [displayUrl, setDisplayUrl] = useState('')
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
    const { data } = await supabase
      .from('tenant_settings')
      .select(
        'klantscherm_enabled, klantscherm_slideshow_enabled, klantscherm_slideshow_uploads, klantscherm_bank_iban, klantscherm_bank_account_name',
      )
      .eq('tenant_slug', tenant)
      .maybeSingle()
    if (data) {
      setEnabled(data.klantscherm_enabled === true)
      setSlideshowEnabled(data.klantscherm_slideshow_enabled !== false)
      setUploads(
        parseKlantschermSlideshowUploads(data.klantscherm_slideshow_uploads).map((row) => ({
          url: row.url,
          sort: row.sort,
          mediaType: row.mediaType ?? inferKlantschermMediaTypeFromUrl(row.url),
        })),
      )
      setBankIban(String(data.klantscherm_bank_iban ?? '').trim())
      setBankAccountName(String(data.klantscherm_bank_account_name ?? '').trim())
    }
    setLoading(false)
  }, [tenant])

  useEffect(() => {
    void load()
  }, [load])

  const saveSettings = async () => {
    setSaving(true)
    setSaved(false)
    const { error } = await supabase
      .from('tenant_settings')
      .update({
        klantscherm_enabled: enabled,
        klantscherm_slideshow_enabled: slideshowEnabled,
        klantscherm_slideshow_uploads: uploads,
        klantscherm_bank_iban: bankIban.replace(/\s/g, '').toUpperCase() || null,
        klantscherm_bank_account_name: bankAccountName.trim() || null,
      })
      .eq('tenant_slug', tenant)
    setSaving(false)
    if (error) {
      alert(t('adminPages.common.saveFailed'))
      return
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const onPickUpload = async (file: File | null) => {
    if (!file || !supabase) return
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
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || (check.mediaType === 'video' ? 'mp4' : 'jpg')
      const path = `${tenant}/klantscherm/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('media').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || undefined,
      })
      if (upErr) throw upErr
      const { data: pub } = supabase.storage.from('media').getPublicUrl(path)
      const url = pub.publicUrl
      setUploads((prev) => [...prev, { url, sort: prev.length, mediaType: check.mediaType }])
    } catch {
      alert(t('adminPages.klantscherm.uploadFailed'))
    } finally {
      setUploadBusy(false)
    }
  }

  const removeUpload = (index: number) => {
    setUploads((prev) => prev.filter((_, i) => i !== index))
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
                <p className="mt-3 break-all text-xs text-gray-500">
                  {t('adminPages.klantscherm.displayUrlLabel')}: {displayUrl}
                </p>
              ) : null}
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
              <input
                type="checkbox"
                checked={slideshowEnabled}
                disabled={!enabled}
                onChange={(e) => setSlideshowEnabled(e.target.checked)}
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
              <input
                type="file"
                accept={KLANTSCHERM_PROMO_FILE_ACCEPT}
                disabled={uploadBusy || !enabled}
                onChange={(e) => {
                  void onPickUpload(e.target.files?.[0] ?? null)
                  e.target.value = ''
                }}
              />
              <ul className="mt-4 space-y-2">
                {uploads.map((row, i) => (
                  <li key={row.url} className="flex items-center gap-3">
                    {row.mediaType === 'video' ? (
                      // eslint-disable-next-line jsx-a11y/media-has-caption
                      <video
                        src={row.url}
                        muted
                        playsInline
                        className="h-14 w-14 rounded object-cover bg-black"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={row.url} alt="" className="h-14 w-14 rounded object-cover" />
                    )}
                    <span className="text-xs text-gray-500">
                      {row.mediaType === 'video'
                        ? t('adminPages.klantscherm.uploadKindVideo')
                        : t('adminPages.klantscherm.uploadKindPhoto')}
                    </span>
                    <button
                      type="button"
                      className="text-sm text-red-600 underline"
                      onClick={() => removeUpload(i)}
                    >
                      {t('adminPages.klantscherm.removeUpload')}
                    </button>
                  </li>
                ))}
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
