'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/i18n'
import PinGate from '@/components/PinGate'
import { getTenantSettings, saveTenantKassaFloorPlanEnabled } from '@/lib/admin-api'

export default function KassaTerminalSettingsPage({ params }: { params: { tenant: string } }) {
  const { t } = useLanguage()
  const tenant = params.tenant
  const [loading, setLoading] = useState(true)
  const [floorPlanOn, setFloorPlanOn] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getTenantSettings(tenant)
      .then((s) => {
        if (cancelled) return
        setFloorPlanOn(s?.kassa_floor_plan_enabled ?? true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [tenant])

  const persistLocalSettingsCache = (enabled: boolean) => {
    try {
      const key = `vysion_settings_${tenant}`
      const raw = localStorage.getItem(key)
      const prev = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
      localStorage.setItem(key, JSON.stringify({ ...prev, kassa_floor_plan_enabled: enabled }))
    } catch {
      /* ignore */
    }
  }

  const toggleFloorPlan = async (next: boolean) => {
    setSaving(true)
    setSaveError(null)
    const { ok, error } = await saveTenantKassaFloorPlanEnabled(tenant, next)
    setSaving(false)
    if (!ok) {
      setSaveError(error ?? t('adminPages.common.saveFailed'))
      return
    }
    setFloorPlanOn(next)
    persistLocalSettingsCache(next)
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 2000)
  }

  return (
    <PinGate tenant={tenant}>
      <div className="max-w-2xl mx-auto px-4 pb-10">
        <div className="mb-6">
          <Link
            href={`/shop/${tenant}/admin/kassa`}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1e293b] px-4 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-[#334155] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#58CCFF] focus-visible:ring-offset-2"
          >
            <span aria-hidden className="text-base leading-none">
              
            </span>
            {t('adminPages.kassaTerminal.backToPos')}
          </Link>
        </div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">{t('adminPages.kassaTerminal.title')}</h1>
          <p className="text-gray-500 mt-1">{t('adminPages.kassaTerminal.subtitle')}</p>
        </div>

        {(saveError || savedFlash) && (
          <div
            className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
              saveError
                ? 'border-red-200 bg-red-50 text-red-800'
                : 'border-green-200 bg-green-50 text-green-800'
            }`}
          >
            {saveError ||
              (savedFlash ? t('adminPages.kassaTerminal.savedFlash') : '')}
            {saveError &&
            /kassa_floor_plan_enabled|column.*does not exist|schema cache/i.test(saveError) ? (
              <span className="block mt-2 text-red-700">
                {t('adminPages.kassaTerminal.dbHint')}
              </span>
            ) : null}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <p className="font-semibold text-gray-900">{t('adminPages.kassaTerminal.floorPlanLabel')}</p>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                {t('adminPages.kassaTerminal.floorPlanHint')}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={floorPlanOn}
              disabled={loading || saving}
              onClick={() => void toggleFloorPlan(!floorPlanOn)}
              className={`relative shrink-0 inline-flex h-9 w-[52px] items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#3C4D6B] disabled:opacity-50 ${
                floorPlanOn ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-7 w-7 transform rounded-full bg-white shadow transition-transform ${
                  floorPlanOn ? 'translate-x-[22px]' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-6">
            {floorPlanOn ? t('adminPages.kassaTerminal.statusOn') : t('adminPages.kassaTerminal.statusOff')}
          </p>
        </div>
      </div>
    </PinGate>
  )
}
