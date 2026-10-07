'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import PinGate from '@/components/PinGate'
import { useLanguage } from '@/i18n'
import { parseKlantschermSlideshowUploads } from '@/lib/klantscherm-slideshow-server'
import {
  getOrCreateKlantschermSessionToken,
  klantschermPublicUrl,
} from '@/lib/klantscherm-session-token'
import {
  buildCustomerDisplayPopupFeatures,
  heuristicSecondaryBoundsSync,
  readCachedSecondaryBounds,
} from '@/lib/kassa-customer-display-window'

type UploadRow = { url: string; sort: number }

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
      .select('klantscherm_enabled, klantscherm_slideshow_enabled, klantscherm_slideshow_uploads')
      .eq('tenant_slug', tenant)
      .maybeSingle()
    if (data) {
      setEnabled(data.klantscherm_enabled === true)
      setSlideshowEnabled(data.klantscherm_slideshow_enabled !== false)
      setUploads(parseKlantschermSlideshowUploads(data.klantscherm_slideshow_uploads))
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
    setUploadBusy(true)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${tenant}/klantscherm/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('media').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      })
      if (upErr) throw upErr
      const { data: pub } = supabase.storage.from('media').getPublicUrl(path)
      const url = pub.publicUrl
      setUploads((prev) => [...prev, { url, sort: prev.length }])
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
          <p className="mt-2 text-sm text-gray-600">
            <Link href={`/shop/${tenant}/admin/betaling`} className="text-[#3C4D6B] underline">
              {t('adminPages.klantscherm.mollieHint')}
            </Link>
          </p>
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
                accept="image/*"
                disabled={uploadBusy || !enabled}
                onChange={(e) => void onPickUpload(e.target.files?.[0] ?? null)}
              />
              <ul className="mt-4 space-y-2">
                {uploads.map((row, i) => (
                  <li key={row.url} className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={row.url} alt="" className="h-14 w-14 rounded object-cover" />
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
