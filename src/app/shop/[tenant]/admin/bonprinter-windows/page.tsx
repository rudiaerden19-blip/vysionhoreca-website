'use client'

import { useState } from 'react'
import PinGate from '@/components/PinGate'
import { fetchThermalPrinterOnline } from '@/lib/printer-lan'

const EPSON_USB_PRINT_BRIDGE_TREE =
  'https://github.com/rudiaerden19-blip/epsonapp/tree/main/usb-print-bridge'

const EPSON_APP_REPO_ZIP =
  'https://github.com/rudiaerden19-blip/epsonapp/archive/refs/heads/main.zip'

const NODEJS_DOWNLOAD_HOME = 'https://nodejs.org/'

/** NL-only helperteksten (USB-bridge op Windows-kassa). */
const COPY = {
  title: 'Bonprinter Windows (USB-bridge)',
  lead:
    'Een website mag om veiligheidsredenen geen software automatisch op je pc installeren. Op deze Windows-kassa zet je de bridge zelf neer: eerst downloaden, dan Node.js als dat nog ontbreekt, daarna config en starten.',
  samePcTip:
    'Gebruik deze uitleg op dezelfde pc als de USB-printer — daar luistert de bridge op 127.0.0.1.',
  downloadZip: 'Stap 1: download als ZIP',
  downloadZipHint:
    'Pak het ZIP-bestand uit. De bridge zit in de map epsonapp-main/usb-print-bridge (die map verder gebruiken).',
  nodeJsButton: 'Node.js downloadpagina',
  nodeJsHint:
    'Stap 2: installeer Node.js LTS als je dat nog niet hebt; daarna in een terminal naar deze map.',
  liConfig:
    'Stel in usb-print-bridge/config.json in (COM-poort of Windows-printernaam; zie README in die map).',
  liRun:
    'Stap 3: in die map: npm install en daarna npm start — de bridge luistert op 127.0.0.1:3001.',
  liOrdervysion:
    'In Ordervysion: printer-IP 127.0.0.1 op kassa, ontvangsten- of keukenscherm — alleen op deze pc waar de bridge draait.',
  repoLink: 'usb-print-bridge op GitHub bekijken',
  check: 'Test of bridge draait',
  checking: 'Bezig met testen…',
  statusOnline: 'Bridge bereikbaar op deze pc',
  statusOffline: 'Geen bridge bereikbaar — map gestart? npm install gedaan?',
} as const

export default function BonprinterWindowsPage({ params }: { params: { tenant: string } }) {
  const [probe, setProbe] = useState<'idle' | 'checking' | 'online' | 'offline'>('idle')

  return (
    <PinGate tenant={params.tenant}>
      <div className="mx-auto max-w-2xl space-y-6 p-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🖨️ {COPY.title}</h1>
          <p className="mt-1 text-gray-600">{COPY.lead}</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950">
          {COPY.samePcTip}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <a
              href={EPSON_APP_REPO_ZIP}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-center text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-700"
            >
              {COPY.downloadZip}
            </a>
            <a
              href={NODEJS_DOWNLOAD_HOME}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl border-2 border-[#3C4D6B] bg-white px-4 py-3 text-center text-sm font-bold text-[#1e293b] transition-colors hover:bg-slate-50"
            >
              {COPY.nodeJsButton}
            </a>
          </div>
          <p className="text-xs text-gray-600">{COPY.downloadZipHint}</p>
          <p className="text-xs text-gray-600">{COPY.nodeJsHint}</p>
          <ul className="list-disc space-y-2 pl-5 text-sm text-gray-700">
            <li>{COPY.liConfig}</li>
            <li>{COPY.liRun}</li>
            <li>{COPY.liOrdervysion}</li>
          </ul>
          <a
            href={EPSON_USB_PRINT_BRIDGE_TREE}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex text-sm font-semibold text-blue-600 underline hover:text-blue-800"
          >
            {COPY.repoLink}
          </a>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button
              type="button"
              disabled={probe === 'checking'}
              onClick={async () => {
                setProbe('checking')
                const ok = await fetchThermalPrinterOnline('127.0.0.1')
                setProbe(ok ? 'online' : 'offline')
              }}
              className="rounded-xl bg-[#3C4D6B] px-4 py-2 text-sm font-bold text-white hover:bg-[#2D3A52] disabled:opacity-60"
            >
              {probe === 'checking' ? COPY.checking : COPY.check}
            </button>
            {probe === 'online' && (
              <span className="text-sm font-semibold text-green-700">{COPY.statusOnline}</span>
            )}
            {probe === 'offline' && (
              <span className="text-sm font-semibold text-red-700">{COPY.statusOffline}</span>
            )}
          </div>
        </div>
      </div>
    </PinGate>
  )
}
