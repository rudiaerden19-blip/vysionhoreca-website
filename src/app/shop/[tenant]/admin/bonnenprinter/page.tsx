'use client'

import { ThermalPrinterLanSetupCard } from '@/components/ThermalPrinterLanSetupCard'

const TESTFLIGHT_URL = 'https://testflight.apple.com/join/jtdBJyAk'

export default function BonnenprinterPage({ params }: { params: { tenant: string } }) {
  const tenant = params.tenant

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">🖨️ Bonnenprinter</h1>
        <p className="text-gray-600 mt-1">
          Stel thermisch printen in voor de <strong>kassa</strong> (aanbevolen: LAN tussen mini‑PC en Epson).
        </p>
      </div>

      <ThermalPrinterLanSetupCard tenantSlug={tenant} />

      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-700 text-white font-bold flex items-center justify-center flex-shrink-0">
            LAN
          </div>
          <h2 className="text-lg font-bold text-gray-900">Montage (standaard)</h2>
        </div>
        <ul className="list-disc list-inside space-y-2 text-sm text-gray-700 leading-snug">
          <li>
            Ethernet‑kabel tussen <strong>mini‑PC</strong> en <strong>Epson</strong> (RJ45), met{' '}
            <strong>vaste IP&apos;s</strong> op die link (bv. pc{' '}
            <span className="tabular-nums">192.168.50.1</span>, printer{' '}
            <span className="tabular-nums">192.168.50.10</span> — voorbeeld).
          </li>
          <li>
            Op de kassa‑PC draait de <strong>print‑service op poort 3001</strong>; die stuurt bonnen naar uw Epson
            via het netwerk (geen USB‑kabel nodig tussen pc en printer als uw Epson op LAN staat).
          </li>
          <li>
            In het veld hierboven: meestal <strong className="tabular-nums">127.0.0.1</strong> als browser en
            print‑service op <strong>dezelfde</strong> pc staan.
          </li>
          <li>
            Configureer de bridge zo dat deze uw printer op het <strong>LAN‑IP</strong> gebruikt (zie ook{' '}
            <span className="font-medium">Bonprinter Windows</span> voor download/config van de Windows‑bundle).
          </li>
        </ul>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4 opacity-95">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-400 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs">
            ?
          </div>
          <h2 className="text-lg font-bold text-gray-900">Optioneel — iPad / TestFlight</h2>
        </div>
        <p className="text-gray-600 text-sm">
          Alleen nodig als u een aparte print‑server op een iPad gebruikt. Voor de verkochte mini‑PC‑kassa met
          Epson‑LAN is dit meestal <strong>niet</strong> nodig.
        </p>
        <a
          href={TESTFLIGHT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-xl font-semibold transition-colors"
        >
          Download Print App (TestFlight)
        </a>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-between">
        <div>
          <p className="font-semibold text-sm text-gray-900">Hulp nodig bij het instellen?</p>
          <p className="text-xs text-gray-500">Neem contact op met Vysion support</p>
        </div>
        <a
          href="mailto:support@vysionhoreca.com"
          className="text-blue-600 text-sm font-semibold hover:underline"
        >
          Contact →
        </a>
      </div>
    </div>
  )
}
