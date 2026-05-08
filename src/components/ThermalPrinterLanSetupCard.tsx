'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLanguage } from '@/i18n'
import {
  fetchThermalPrinterOnline,
  normalizeLanPrinterIp,
  PRINTER_LAN_PRINT_SERVER_PORT,
  startPrinterLanHeartbeat,
} from '@/lib/printer-lan'
import {
  dispatchThermalPrinterIpSaved,
  thermalPrinterIpStorageKey,
  THERMAL_PRINTER_IP_SYNC_EVENT,
} from '@/lib/thermal-printer-sync'

type Props = { tenantSlug: string }

export function ThermalPrinterLanSetupCard({ tenantSlug }: Props) {
  const { t } = useLanguage()
  const txShop = (key: string) => t(`shopDisplay.${key}`)

  const [printerIP, setPrinterIP] = useState<string | null>(null)
  const [printerStatus, setPrinterStatus] = useState<'unknown' | 'online' | 'offline'>('unknown')
  const [draftIp, setDraftIp] = useState('')

  const reloadFromStorage = useCallback(() => {
    const raw = localStorage.getItem(thermalPrinterIpStorageKey(tenantSlug))
    const saved = raw ? normalizeLanPrinterIp(raw) : null
    if (saved) {
      if (raw && saved !== raw.trim()) {
        localStorage.setItem(thermalPrinterIpStorageKey(tenantSlug), saved)
      }
      setPrinterIP(saved)
      setDraftIp(saved)
    } else {
      if (raw) localStorage.removeItem(thermalPrinterIpStorageKey(tenantSlug))
      setPrinterIP(null)
      setDraftIp('')
    }
  }, [tenantSlug])

  useEffect(() => {
    reloadFromStorage()
  }, [reloadFromStorage])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === thermalPrinterIpStorageKey(tenantSlug)) reloadFromStorage()
    }
    const onSameTab = (e: Event) => {
      const d = (e as CustomEvent<{ tenantSlug?: string }>).detail
      if (d?.tenantSlug === tenantSlug) reloadFromStorage()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener(THERMAL_PRINTER_IP_SYNC_EVENT, onSameTab as EventListener)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(THERMAL_PRINTER_IP_SYNC_EVENT, onSameTab as EventListener)
    }
  }, [tenantSlug, reloadFromStorage])

  useEffect(() => {
    if (!printerIP) {
      setPrinterStatus('unknown')
      return
    }
    void fetchThermalPrinterOnline(printerIP).then((ok) => setPrinterStatus(ok ? 'online' : 'offline'))
    return startPrinterLanHeartbeat({
      printerIP,
      onResult: (online) => setPrinterStatus(online ? 'online' : 'offline'),
    })
  }, [printerIP])

  function saveIp() {
    const n = normalizeLanPrinterIp(draftIp.trim())
    if (!n) {
      alert(txShop('printerInvalidIp'))
      return
    }
    localStorage.setItem(thermalPrinterIpStorageKey(tenantSlug), n)
    setPrinterIP(n)
    setDraftIp(n)
    dispatchThermalPrinterIpSaved(tenantSlug)
    void fetchThermalPrinterOnline(n).then((ok) => setPrinterStatus(ok ? 'online' : 'offline'))
  }

  function clearIp() {
    localStorage.removeItem(thermalPrinterIpStorageKey(tenantSlug))
    setPrinterIP(null)
    setDraftIp('')
    setPrinterStatus('unknown')
    dispatchThermalPrinterIpSaved(tenantSlug)
  }

  return (
    <div className="rounded-2xl border border-orange-200 bg-orange-50/80 p-6 shadow-sm space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500 text-lg font-bold text-white">
          1
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-gray-900">Kassa + LAN-printer</h2>
          <p className="mt-1 text-sm text-gray-700 leading-snug">
            Mini‑PC met ethernet naar uw Epson (RJ45). Op deze pc draait de print-service op poort{' '}
            {PRINTER_LAN_PRINT_SERVER_PORT}. Vul hieronder het adres waar de{' '}
            <strong>browser</strong> die service vindt — op <strong>dezelfde kassa-pc</strong> is dat{' '}
            meestal <strong className="tabular-nums">127.0.0.1</strong>.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
        <label className="block text-sm font-medium text-gray-800">
          Print-service adres (IPv4)
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            value={draftIp}
            onChange={(e) => setDraftIp(e.target.value)}
            placeholder={txShop('printerIpPlaceholder')}
            className="mt-1.5 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder:text-gray-400 tabular-nums"
            aria-describedby="thermal-setup-hint"
          />
        </label>
        <p id="thermal-setup-hint" className="text-xs text-gray-600 leading-snug">
          Privé IPv4 zoals <span className="tabular-nums">127.0.0.1</span>,{' '}
          <span className="tabular-nums">192.168.x.x</span>. Geen hostnaam. De service luistert op poort{' '}
          <span className="tabular-nums">{PRINTER_LAN_PRINT_SERVER_PORT}</span> — niet invullen in dit veld.
        </p>

        <div
          className={`rounded-xl px-4 py-3 text-sm font-medium ${
            printerStatus === 'online'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : printerStatus === 'offline'
                ? 'bg-red-50 text-red-900 border border-red-200'
                : 'bg-gray-50 text-gray-700 border border-gray-200'
          }`}
        >
          {printerStatus === 'online' && printerIP && (
            <span>Verbonden met print-service op {printerIP}:{PRINTER_LAN_PRINT_SERVER_PORT}</span>
          )}
          {printerStatus === 'offline' && printerIP && (
            <span>
              Print-service niet bereikbaar op {printerIP}:{PRINTER_LAN_PRINT_SERVER_PORT} — start de print-service
              op deze pc en controleer firewall.
            </span>
          )}
          {(printerStatus === 'unknown' || !printerIP) && (
            <span>Nog geen geldig adres opgeslagen of nog niet gecontroleerd.</span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={saveIp}
            className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
          >
            Opslaan
          </button>
          {printerIP && (
            <>
              <button
                type="button"
                onClick={() => void fetchThermalPrinterOnline(printerIP).then((ok) => setPrinterStatus(ok ? 'online' : 'offline'))}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
              >
                Test verbinding
              </button>
              <button
                type="button"
                onClick={clearIp}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Wissen
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
