'use client'

import { useCallback, useEffect, useState } from 'react'
import PinGate from '@/components/PinGate'
import { getAuthHeaders } from '@/lib/auth-headers'
import { useLanguage } from '@/i18n'
import {
  KLANTSCHERM_CUSTOM_PROMO_MAX,
  type KlantschermCustomPromo,
  mergeKlantschermCustomPromosForSave,
} from '@/lib/klantscherm-custom-promos'
import {
  KLANTSCHERM_PROMO_FILE_ACCEPT,
  validateKlantschermPromoImageFile,
} from '@/lib/klantscherm-slideshow-media'
import { uploadKlantschermPromoImage } from '@/lib/klantscherm-promo-upload'
import { notifyKlantschermSlideshowRefresh } from '@/lib/klantscherm-slideshow-server'
import { KlantschermPromoSlideAdminPreview } from '@/components/klantscherm/KlantschermPromoSlideFrame'
import {
  getOrCreateKlantschermSessionToken,
  klantschermPublicUrl,
} from '@/lib/klantscherm-session-token'
import {
  buildCustomerDisplayPopupFeatures,
  heuristicSecondaryBoundsSync,
  readCachedSecondaryBounds,
} from '@/lib/kassa-customer-display-window'

const emptyPromo = (sort: number): KlantschermCustomPromo => ({
  url: '',
  sort,
  title: '',
  description: '',
  displayPrice: '',
  promoText: '',
})

export default function KlantschermAdminPage({ params }: { params: { tenant: string } }) {
  const { t } = useLanguage()
  const tenant = params.tenant
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [promos, setPromos] = useState<KlantschermCustomPromo[]>([])
  const [uploadBusyIndex, setUploadBusyIndex] = useState<number | null>(null)
  const [displayUrl, setDisplayUrl] = useState('')
  const [displayUrlCopied, setDisplayUrlCopied] = useState(false)
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
          klantscherm_bank_iban?: string | null
          klantscherm_bank_account_name?: string | null
        } | null
        customPromos?: KlantschermCustomPromo[]
      }
      if (json.ok) {
        if (json.settings) {
          const data = json.settings
          setEnabled(data.klantscherm_enabled === true)
          setBankIban(String(data.klantscherm_bank_iban ?? '').trim())
          setBankAccountName(String(data.klantscherm_bank_account_name ?? '').trim())
        }
        setPromos(json.customPromos ?? [])
      }
    } catch {
      /* ignore */
    }
    setLoading(false)
  }, [tenant])

  useEffect(() => {
    void load()
  }, [load])

  const persistAll = async (nextPromos: KlantschermCustomPromo[]) => {
    const rows = mergeKlantschermCustomPromosForSave(nextPromos.filter((p) => p.url.trim()))
    const r = await fetch(`/api/shop/${encodeURIComponent(tenant)}/klantscherm/settings`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({
        klantscherm_enabled: enabled,
        klantscherm_slideshow_enabled: false,
        klantscherm_custom_promos: rows,
        klantscherm_bank_iban: bankIban,
        klantscherm_bank_account_name: bankAccountName,
      }),
    })
    const json = (await r.json()) as { ok?: boolean; error?: string }
    if (!r.ok || !json.ok) return { ok: false as const, error: json.error }
    notifyKlantschermSlideshowRefresh(tenant)
    return { ok: true as const, rows }
  }

  const saveSettings = async () => {
    setSaving(true)
    setSaved(false)
    const result = await persistAll(promos)
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
    await load()
  }

  const updatePromo = (index: number, patch: Partial<KlantschermCustomPromo>) => {
    setPromos((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  const removePromo = (index: number) => {
    setPromos((prev) =>
      prev.filter((_, i) => i !== index).map((row, sort) => ({ ...row, sort })),
    )
  }

  const addPromoSlot = () => {
    if (promos.length >= KLANTSCHERM_CUSTOM_PROMO_MAX) return
    setPromos((prev) => [...prev, emptyPromo(prev.length)])
  }

  const onPickImage = async (index: number, file: File | null) => {
    if (!file) return
    const check = validateKlantschermPromoImageFile(file)
    if (!check.ok) {
      alert(
        check.reason === 'size'
          ? t('adminPages.klantscherm.uploadTooLarge')
          : t('adminPages.klantscherm.uploadInvalidType'),
      )
      return
    }
    setUploadBusyIndex(index)
    try {
      const result = await uploadKlantschermPromoImage(tenant, file)
      if (!result.ok) {
        alert(t('adminPages.klantscherm.uploadFailedDetail').replace('{detail}', result.message))
        return
      }
      let next: KlantschermCustomPromo[] = []
      setPromos((prev) => {
        next = prev.map((row, i) =>
          i === index ? { ...row, url: result.publicUrl } : row,
        )
        return next
      })
      const saved = await persistAll(next)
      if (!saved.ok) {
        alert(
          saved.error
            ? `${t('adminPages.common.saveFailed')} (${saved.error})`
            : t('adminPages.common.saveFailed'),
        )
        return
      }
      if (saved.rows) setPromos(saved.rows)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setUploadBusyIndex(null)
    }
  }

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
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <a href={displayUrl} target="_blank" rel="noopener noreferrer" className="break-all text-xs text-[#3C4D6B] underline">
                    {displayUrl}
                  </a>
                  <button type="button" onClick={() => void copyDisplayUrl()} className="rounded-lg border border-gray-300 px-2 py-1 text-xs font-semibold">
                    {displayUrlCopied ? t('adminPages.klantscherm.displayUrlCopied') : t('adminPages.klantscherm.displayUrlCopy')}
                  </button>
                </div>
              ) : null}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="font-semibold text-gray-900">{t('adminPages.klantscherm.customPromosTitle')}</p>
              <p className="mb-4 text-sm text-gray-500">{t('adminPages.klantscherm.customPromosDesc')}</p>

              <div className="space-y-6">
                {promos.map((row, index) => (
                  <div key={`promo-${index}-${row.url}`} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                      {row.url ? (
                        <KlantschermPromoSlideAdminPreview
                          url={row.url}
                          copy={{
                            title: row.title,
                            description: row.description,
                            displayPrice: row.displayPrice,
                            promoText: row.promoText,
                          }}
                        />
                      ) : (
                        <div className="flex aspect-video w-full max-w-2xl items-center justify-center rounded-xl bg-gray-200 text-sm text-gray-500">
                          {t('adminPages.klantscherm.customPromoNoPhoto')}
                        </div>
                      )}
                      <div className="min-w-0 flex-1 space-y-3 lg:min-w-[16rem]">
                        <input
                          type="file"
                          accept={KLANTSCHERM_PROMO_FILE_ACCEPT}
                          disabled={!enabled || uploadBusyIndex === index}
                          onChange={(e) => {
                            void onPickImage(index, e.target.files?.[0] ?? null)
                            e.target.value = ''
                          }}
                          className="block w-full text-sm disabled:opacity-40"
                        />
                        <input
                          type="text"
                          value={row.title}
                          disabled={!enabled}
                          placeholder={t('adminPages.klantscherm.customPromoTitlePh')}
                          onChange={(e) => updatePromo(index, { title: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-40"
                        />
                        <textarea
                          value={row.description}
                          disabled={!enabled}
                          rows={2}
                          placeholder={t('adminPages.klantscherm.customPromoDescPh')}
                          onChange={(e) => updatePromo(index, { description: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-40"
                        />
                        <div className="flex flex-wrap gap-3">
                          <input
                            type="text"
                            value={row.displayPrice}
                            disabled={!enabled}
                            placeholder={t('adminPages.klantscherm.customPromoPricePh')}
                            onChange={(e) => updatePromo(index, { displayPrice: e.target.value })}
                            className="min-w-[8rem] flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-40"
                          />
                          <input
                            type="text"
                            value={row.promoText}
                            disabled={!enabled}
                            placeholder={t('adminPages.klantscherm.customPromoBadgePh')}
                            onChange={(e) => updatePromo(index, { promoText: e.target.value })}
                            className="min-w-[10rem] flex-[2] rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-40"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        className="text-sm text-red-600 underline"
                        onClick={() => removePromo(index)}
                      >
                        {t('adminPages.klantscherm.removeUpload')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {promos.length < KLANTSCHERM_CUSTOM_PROMO_MAX ? (
                <button
                  type="button"
                  disabled={!enabled}
                  onClick={addPromoSlot}
                  className="mt-4 rounded-lg border border-dashed border-[#3C4D6B] px-4 py-2 text-sm font-semibold text-[#3C4D6B] disabled:opacity-40"
                >
                  {t('adminPages.klantscherm.customPromoAdd')}
                </button>
              ) : null}
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
