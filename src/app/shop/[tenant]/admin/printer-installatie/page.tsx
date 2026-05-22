'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useLanguage } from '@/i18n'
import PinGate from '@/components/PinGate'
import {
  fetchVysionPrintAgentConfigSnapshot,
  fetchVysionPrintAgentPrinterList,
  saveVysionPrintAgentConfigPatch,
} from '@/lib/vysion-print-agent-client'

function isValidKassaUrl(raw: string): boolean {
  const s = raw.trim()
  if (!/^https?:\/\//i.test(s)) return false
  try {
    const u = new URL(s)
    const path = u.pathname.replace(/\/$/, '') || '/'
    return /\/admin\/kassa$/i.test(path)
  } catch {
    return false
  }
}

function normalizeKassaUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, '')
}

export default function PrinterInstallatiePage({ params }: { params: { tenant: string } }) {
  const { t } = useLanguage()
  const tenant = params.tenant

  const defaultKassaPath = `/shop/${tenant}/admin/kassa`

  const [loading, setLoading] = useState(true)
  const [printerRows, setPrinterRows] = useState<string[]>([])
  const [printerName, setPrinterName] = useState('')
  const [kassaUrl, setKassaUrl] = useState('')
  const [banner, setBanner] = useState<'none' | 'offline' | 'old' | 'saved' | 'error'>('none')
  const [bannerDetail, setBannerDetail] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [agentUnreachable, setAgentUnreachable] = useState(false)
  const [agentTooOld, setAgentTooOld] = useState(false)

  const loadAll = useCallback(async () => {
    setLoading(true)
    setBanner('none')
    setBannerDetail(null)

    let suggestedUrl = ''
    if (typeof window !== 'undefined') {
      suggestedUrl = `${window.location.origin}${defaultKassaPath}`
    }

    const [plist, cfg] = await Promise.all([
      fetchVysionPrintAgentPrinterList(),
      fetchVysionPrintAgentConfigSnapshot(),
    ])

    const printers = plist.ok ? plist.printers : []
    /** Als /printers faalt → geen betrouwbare agent op deze pc (offline, firewall of geen Print Agent). */
    const unreachable = !plist.ok
    const tooOld = !cfg.ok && cfg.status === 503 && plist.ok

    setAgentUnreachable(unreachable)
    setAgentTooOld(tooOld)

    if (unreachable) setBanner('offline')
    else if (tooOld) setBanner('old')

    const seen = new Set<string>()
    const ordered: string[] = []
    if (cfg.ok && cfg.printerName && printers.indexOf(cfg.printerName) < 0) {
      ordered.push(cfg.printerName)
      seen.add(cfg.printerName)
    }
    for (const p of printers) {
      if (!seen.has(p)) {
        ordered.push(p)
        seen.add(p)
      }
    }
    setPrinterRows(ordered)

    if (cfg.ok) {
      setPrinterName(cfg.printerName || '')
      const u = cfg.kassaUrl?.trim()
      setKassaUrl(u ? normalizeKassaUrl(u) : suggestedUrl)
    } else {
      setPrinterName('')
      setKassaUrl(suggestedUrl)
    }

    setLoading(false)
  }, [defaultKassaPath])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const saveDisabled =
    loading || saving || agentUnreachable || agentTooOld || printerRows.length === 0 || !printerName

  const onSave = async () => {
    setBanner('none')
    setBannerDetail(null)

    const p = printerName.trim()
    if (!p || printerRows.length === 0) {
      setBanner('error')
      setBannerDetail(t('adminPages.printerInstall.validationPrinter'))
      return
    }
    if (!printerRows.includes(p)) {
      setBanner('error')
      setBannerDetail(t('adminPages.printerInstall.validationPrinter'))
      return
    }

    const urlNorm = normalizeKassaUrl(kassaUrl)
    if (!isValidKassaUrl(urlNorm)) {
      setBanner('error')
      setBannerDetail(t('adminPages.printerInstall.validationUrl'))
      return
    }

    setSaving(true)
    const res = await saveVysionPrintAgentConfigPatch({
      printerName: p,
      kassaUrl: urlNorm,
    })
    setSaving(false)

    if (res.ok) {
      setBanner('saved')
      window.setTimeout(() => setBanner('none'), 2400)
      return
    }

    const old =
      res.status === 503 || res.error === 'config-endpoint-not-available'
    if (old) {
      setAgentTooOld(true)
      setBanner('old')
      return
    }

    setBanner('error')
    setBannerDetail(res.error || '')
  }

  const showForm = !agentUnreachable

  return (
    <PinGate tenant={tenant}>
      <div className="mx-auto max-w-2xl px-4 pb-10">
        <div className="mb-6">
          <Link
            href={`/shop/${tenant}/admin`}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1e293b] px-4 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-[#334155] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#58CCFF] focus-visible:ring-offset-2"
          >
            <span aria-hidden className="text-base leading-none">
              ←
            </span>
            {t('adminPages.printerInstall.backToOverview')}
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">{t('adminPages.printerInstall.title')}</h1>
          <p className="mt-1 text-gray-500">{t('adminPages.printerInstall.subtitle')}</p>
        </div>

        <p className="mb-6 text-sm leading-relaxed text-gray-600">{t('adminPages.printerInstall.intro')}</p>

        {banner !== 'none' && (
          <div
            role="status"
            className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
              banner === 'error'
                ? 'border-red-200 bg-red-50 text-red-800'
                : banner === 'saved'
                  ? 'border-green-200 bg-green-50 text-green-800'
                  : banner === 'offline'
                    ? 'border-amber-200 bg-amber-50 text-amber-900'
                    : 'border-sky-200 bg-sky-50 text-sky-900'
            }`}
          >
            {banner === 'offline' && t('adminPages.printerInstall.agentOffline')}
            {banner === 'old' && t('adminPages.printerInstall.agentOld')}
            {banner === 'saved' && t('adminPages.printerInstall.saved')}
            {banner === 'error' &&
              (bannerDetail || t('adminPages.printerInstall.validationPrinter'))}
          </div>
        )}

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          {!showForm ? null : (
            <>
              <label className="block">
                <span className="font-semibold text-gray-900">
                  {t('adminPages.printerInstall.printerLabel')}
                </span>
                <select
                  className="mt-2 block w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-[#58CCFF] focus:outline-none focus:ring-1 focus:ring-[#58CCFF] disabled:bg-gray-50 disabled:text-gray-500"
                  disabled={loading || agentUnreachable || printerRows.length === 0}
                  value={printerRows.includes(printerName) ? printerName : ''}
                  onChange={(e) => setPrinterName(e.target.value)}
                >
                  <option value="">{t('adminPages.printerInstall.printerPlaceholder')}</option>
                  {printerRows.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="mt-6 block">
                <span className="font-semibold text-gray-900">{t('adminPages.printerInstall.kassaUrlLabel')}</span>
                <p className="mt-1 text-sm text-gray-500">{t('adminPages.printerInstall.kassaUrlHint')}</p>
                <input
                  type="url"
                  className="mt-2 block w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-[#58CCFF] focus:outline-none focus:ring-1 focus:ring-[#58CCFF] disabled:bg-gray-50 disabled:text-gray-500"
                  disabled={loading || agentUnreachable}
                  value={kassaUrl}
                  onChange={(e) => setKassaUrl(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
                  disabled={loading}
                  onClick={() => void loadAll()}
                >
                  {t('adminPages.printerInstall.refresh')}
                </button>
                <button
                  type="button"
                  className="rounded-xl bg-[#1e293b] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[#334155] disabled:opacity-50"
                  disabled={saveDisabled}
                  onClick={() => void onSave()}
                >
                  {saving ? t('adminPages.printerInstall.saving') : t('adminPages.printerInstall.save')}
                </button>
              </div>

              <p className="mt-6 border-t border-gray-100 pt-4 text-xs text-gray-500">
                {t('adminPages.printerInstall.systrayTip')}
              </p>
            </>
          )}
        </div>

        <div className="mt-8 rounded-xl border border-dashed border-gray-300 bg-gray-50/80 p-4 text-sm">
          <p className="text-gray-700">{t('adminPages.printerInstall.downloadIntro')}</p>
          <Link
            href="/download/print-agent-windows"
            className="mt-3 inline-flex font-semibold text-[#0d6588] underline decoration-[#58CCFF]/60 underline-offset-2 hover:text-[#064b66]"
          >
            {t('adminPages.printerInstall.downloadCta')}
          </Link>
        </div>
      </div>
    </PinGate>
  )
}
