'use client'

import { useEffect, useState } from 'react'
import PinGate from '@/components/PinGate'
import { authFetch } from '@/lib/auth-headers'

const PACKAGES = [
  ['none', 'Geen'],
  ['scrada', 'Scrada'],
  ['exact', 'Exact Online'],
  ['octopus', 'Octopus'],
  ['winbooks', 'WinBooks'],
  ['yuki', 'Yuki'],
  ['billit', 'Billit'],
  ['other', 'Andere'],
] as const

export default function BoekhoudingPage({ params }: { params: { tenant: string } }) {
  const tenant = params.tenant
  const [ready, setReady] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [packageName, setPackageName] = useState('none')
  const [reference, setReference] = useState('')
  const [format, setFormat] = useState('csv')
  const [autoExport, setAutoExport] = useState(false)
  const [autoDay, setAutoDay] = useState(1)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    void authFetch(`/api/kasboek/settings?tenantSlug=${encodeURIComponent(tenant)}`)
      .then((res) => res.json())
      .then((json) => {
        setReady(json.storageReady !== false)
        setName(json.accountantName || '')
        setEmail(json.accountantEmail || '')
        setPackageName(json.packageName || 'none')
        setReference(json.clientReference || '')
        setFormat(json.exportFormat || 'csv')
        setAutoExport(json.autoExport === true)
        setAutoDay(Number(json.autoExportDay) || 1)
      })
      .catch(() => setError('Instellingen laden mislukt.'))
  }, [tenant])

  return (
    <PinGate tenant={tenant}>
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Boekhouding</h1>
        <p className="text-sm text-gray-500 mb-4">Gegevens voor de boekhouder. Er is nog geen koppeling met een extern pakket.</p>
        {!ready && (
          <p className="mb-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
            De tabel voor deze instellingen staat nog niet in de database.
          </p>
        )}
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        {saved && <p className="mb-4 text-sm text-gray-700">Opgeslagen.</p>}
        <form
          className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            setSaved(false)
            setError('')
            void authFetch('/api/kasboek/settings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                tenantSlug: tenant,
                accountantName: name,
                accountantEmail: email,
                packageName,
                clientReference: reference,
                exportFormat: format,
                autoExport,
                autoExportDay: autoDay,
              }),
            }).then(async (res) => {
              const json = await res.json().catch(() => ({}))
              if (!res.ok) {
                setError(json.error || 'Opslaan mislukt.')
                return
              }
              setSaved(true)
            })
          }}
        >
          <label className="block text-sm">Naam boekhouder
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full border rounded-xl px-3 py-2" />
          </label>
          <label className="block text-sm">E-mailadres boekhouder
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full border rounded-xl px-3 py-2" />
          </label>
          <label className="block text-sm">Boekhoudpakket
            <select value={packageName} onChange={(e) => setPackageName(e.target.value)} className="mt-1 w-full border rounded-xl px-3 py-2">
              {PACKAGES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </label>
          <label className="block text-sm">Klantnummer / referentie
            <input value={reference} onChange={(e) => setReference(e.target.value)} className="mt-1 w-full border rounded-xl px-3 py-2" />
          </label>
          <label className="block text-sm">Exportformaat
            <select value={format} onChange={(e) => setFormat(e.target.value)} className="mt-1 w-full border rounded-xl px-3 py-2">
              <option value="csv">CSV</option>
              <option value="pdf">PDF</option>
              <option value="xlsx">Excel</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={autoExport} onChange={(e) => setAutoExport(e.target.checked)} />
            Automatische maandexport
          </label>
          <label className="block text-sm">Dag van verzending
            <input type="number" min={1} max={28} value={autoDay} onChange={(e) => setAutoDay(Number(e.target.value) || 1)} className="mt-1 w-24 border rounded-xl px-3 py-2" />
          </label>
          <p className="text-xs text-gray-400">Standaard de eerste dag van de volgende maand. De mail gaat alleen weg als dit aan staat en het e-mailadres is ingevuld.</p>
          <button type="submit" className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm">Opslaan</button>
        </form>
      </div>
    </PinGate>
  )
}
