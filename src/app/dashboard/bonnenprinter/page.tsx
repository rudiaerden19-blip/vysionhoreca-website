'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ThermalPrinterLanSetupCard } from '@/components/ThermalPrinterLanSetupCard'

const TESTFLIGHT_URL = 'https://testflight.apple.com/join/jtdBJyAk'

export default function DashboardBonnenprinterPage() {
  const [tenantSlug, setTenantSlug] = useState<string | null>(null)
  const [resolved, setResolved] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('vysion_tenant')
      const slug = raw ? (JSON.parse(raw) as { tenant_slug?: string }).tenant_slug : undefined
      setTenantSlug(typeof slug === 'string' && slug.length > 0 ? slug : null)
    } catch {
      setTenantSlug(null)
    }
    setResolved(true)
  }, [])

  if (!resolved) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
      </div>
    )
  }

  if (!tenantSlug) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 rounded-2xl border border-red-500/30 bg-red-950/30 p-6 text-red-100">
        <p className="font-semibold">Geen zaak geladen</p>
        <p className="text-sm text-red-200/90">
          Log opnieuw in via het dashboard zodat uw tenant gekozen is. Daarna kunt u hier de bonprinter instellen.
        </p>
        <Link href="/login" className="inline-block text-sm font-semibold text-orange-400 hover:underline">
          Naar login →
        </Link>
      </div>
    )
  }

  const shopAdminPrinterHref = `/shop/${tenantSlug}/admin/bonnenprinter`

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">🖨️ Bonnenprinter</h1>
        <p className="text-gray-400 mt-1">
          Zelfde instelling als bij uw <strong className="text-gray-300">kassa</strong>: thermische print-service (poort{' '}
          3001). Aanbevolen: LAN tussen mini‑PC en Epson.
        </p>
        <p className="mt-2 text-xs text-gray-500">
          Diepgang en montage — ook op{' '}
          <Link href={shopAdminPrinterHref} prefetch={false} className="font-semibold text-orange-400 hover:underline">
            zaak-admin bonnenprinter
          </Link>
          .
        </p>
      </div>

      <ThermalPrinterLanSetupCard tenantSlug={tenantSlug} variant="dashboardDark" />

      <div className="rounded-2xl border border-gray-800 bg-[#1a1a1a] p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-600 text-sm font-bold text-white">
            LAN
          </div>
          <h2 className="text-lg font-bold text-white">Montage (standaard)</h2>
        </div>
        <ul className="list-disc list-inside space-y-2 text-sm text-gray-300 leading-snug">
          <li>
            Ethernet tussen <strong className="text-white">mini‑PC</strong> en <strong className="text-white">Epson</strong>{' '}
            (RJ45), met <strong className="text-white">vaste IP&apos;s</strong> op die verbinding.
          </li>
          <li>
            Print-service op de kassa‑PC (poort <span className="tabular-nums text-gray-200">3001</span>) stuurt naar uw
            printer via het netwerk.
          </li>
          <li>
            In het veld hierboven: meestal <strong className="tabular-nums text-white">127.0.0.1</strong> als browser en
            service op <strong className="text-white">dezelfde</strong> pc staan.
          </li>
        </ul>
      </div>

      <div className="rounded-2xl border border-gray-800 bg-[#1a1a1a] p-6 space-y-4 opacity-95">
        <h2 className="text-lg font-bold text-white">Optioneel — iPad / TestFlight</h2>
        <p className="text-gray-400 text-sm">
          Alleen als u een aparte print-server op een iPad gebruikt. Voor de verkochte mini‑PC‑kassa met Epson‑LAN is dit
          meestal niet nodig.
        </p>
        <a
          href={TESTFLIGHT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold transition-colors"
        >
          Download Print App (TestFlight)
        </a>
      </div>

      <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-sm text-white">Hulp nodig bij het instellen?</p>
          <p className="text-xs text-gray-400">Neem contact op met Vysion support</p>
        </div>
        <a href="mailto:support@vysionhoreca.com" className="text-blue-400 text-sm font-medium hover:underline shrink-0">
          Contact →
        </a>
      </div>
    </div>
  )
}
