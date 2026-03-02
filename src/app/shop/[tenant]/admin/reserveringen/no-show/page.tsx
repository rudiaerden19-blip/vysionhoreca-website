'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface NoShowReservation {
  id: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  reservation_date: string
  reservation_time: string
  party_size: number
  created_at: string
}

interface NoShowSettings {
  warning_threshold: number   // Toon waarschuwing na X no-shows
  block_threshold: number     // Blokkeer na X no-shows
  block_enabled: boolean      // Blokkering actief
}

const DEFAULT_SETTINGS: NoShowSettings = {
  warning_threshold: 2,
  block_threshold: 3,
  block_enabled: false,
}

export default function NoShowPage({ params }: { params: { tenant: string } }) {
  const [noShows, setNoShows] = useState<NoShowReservation[]>([])
  const [settings, setSettings] = useState<NoShowSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    const [{ data: reservations }, { data: tenantSettings }] = await Promise.all([
      supabase
        .from('reservations')
        .select('id, customer_name, customer_phone, customer_email, reservation_date, reservation_time, party_size, created_at')
        .eq('tenant_slug', params.tenant)
        .eq('status', 'no_show')
        .order('reservation_date', { ascending: false }),
      supabase
        .from('tenant_settings')
        .select('no_show_settings')
        .eq('tenant_slug', params.tenant)
        .single()
    ])

    setNoShows(reservations || [])
    if (tenantSettings?.no_show_settings) {
      setSettings({ ...DEFAULT_SETTINGS, ...tenantSettings.no_show_settings })
    }
    setLoading(false)
  }, [params.tenant])

  useEffect(() => { load() }, [load])

  const save = async () => {
    setSaving(true)
    await supabase
      .from('tenant_settings')
      .upsert({ tenant_slug: params.tenant, no_show_settings: settings }, { onConflict: 'tenant_slug' })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  // No-show teller per klant (op basis van telefoonnummer)
  const noShowsPerCustomer = noShows.reduce<Record<string, { name: string; phone: string; email?: string; count: number; lastDate: string }>>((acc, r) => {
    const key = r.customer_phone
    if (!acc[key]) {
      acc[key] = { name: r.customer_name, phone: r.customer_phone, email: r.customer_email, count: 0, lastDate: r.reservation_date }
    }
    acc[key].count++
    if (r.reservation_date > acc[key].lastDate) acc[key].lastDate = r.reservation_date
    return acc
  }, {})

  const sortedCustomers = Object.values(noShowsPerCustomer).sort((a, b) => b.count - a.count)

  const totalNoShows = noShows.length
  const uniqueOffenders = sortedCustomers.length
  const repeatedOffenders = sortedCustomers.filter(c => c.count >= settings.warning_threshold).length

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/shop/${params.tenant}/admin/reserveringen`} className="text-gray-400 hover:text-gray-600">
          ← Reserveringen
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🛡️ No-show Bescherming</h1>
          <p className="text-gray-500 text-sm">Beheer gasten die niet opdagen</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm text-center">
          <p className="text-4xl font-black text-purple-600">{totalNoShows}</p>
          <p className="text-sm text-gray-500 mt-1">Totaal no-shows</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm text-center">
          <p className="text-4xl font-black text-orange-500">{uniqueOffenders}</p>
          <p className="text-sm text-gray-500 mt-1">Unieke gasten</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm text-center">
          <p className="text-4xl font-black text-red-500">{repeatedOffenders}</p>
          <p className="text-sm text-gray-500 mt-1">Herhaalde no-shows</p>
        </div>
      </div>

      {/* Instellingen */}
      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
        <h2 className="text-lg font-bold text-gray-900">⚙️ Instellingen</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Waarschuwing na X no-shows
              <span className="ml-2 text-xs text-gray-400 font-normal">(rode badge bij naam)</span>
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={settings.warning_threshold}
              onChange={e => setSettings(p => ({ ...p, warning_threshold: Number(e.target.value) }))}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg font-bold focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Blokkeer na X no-shows
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={settings.block_threshold}
              onChange={e => setSettings(p => ({ ...p, block_threshold: Number(e.target.value) }))}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg font-bold focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-between py-3 border-t border-gray-100">
          <div>
            <p className="font-medium text-gray-900">Blokkering inschakelen</p>
            <p className="text-sm text-gray-500">Gasten met te veel no-shows kunnen niet meer online reserveren</p>
          </div>
          <button
            onClick={() => setSettings(p => ({ ...p, block_enabled: !p.block_enabled }))}
            className={`relative w-12 h-7 rounded-full transition-colors ${settings.block_enabled ? 'bg-red-500' : 'bg-gray-300'}`}
          >
            <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.block_enabled ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className={`w-full py-3 rounded-xl font-bold text-white transition-colors ${saved ? 'bg-green-500' : 'bg-purple-500 hover:bg-purple-600'} disabled:opacity-50`}
        >
          {saving ? '⏳ Opslaan...' : saved ? '✅ Opgeslagen!' : '💾 Instellingen opslaan'}
        </button>
      </div>

      {/* Gasten met no-shows */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-4">👻 Gasten met no-shows</h2>

        {sortedCustomers.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-5xl block mb-3">🎉</span>
            <p className="text-gray-500">Geen no-shows geregistreerd</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedCustomers.map(customer => {
              const isBlocked = settings.block_enabled && customer.count >= settings.block_threshold
              const isWarning = customer.count >= settings.warning_threshold

              return (
                <div
                  key={customer.phone}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 ${
                    isBlocked ? 'border-red-200 bg-red-50' :
                    isWarning ? 'border-orange-200 bg-orange-50' :
                    'border-gray-100 bg-gray-50'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-900">{customer.name}</p>
                      {isBlocked && (
                        <span className="text-xs font-bold bg-red-500 text-white px-2 py-0.5 rounded-full">GEBLOKKEERD</span>
                      )}
                      {!isBlocked && isWarning && (
                        <span className="text-xs font-bold bg-orange-500 text-white px-2 py-0.5 rounded-full">WAARSCHUWING</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">📞 {customer.phone}</p>
                    {customer.email && <p className="text-sm text-gray-400">✉️ {customer.email}</p>}
                    <p className="text-xs text-gray-400 mt-1">Laatste: {new Date(customer.lastDate + 'T12:00').toLocaleDateString('nl-BE')}</p>
                  </div>

                  <div className="text-center">
                    <p className={`text-3xl font-black ${isBlocked ? 'text-red-500' : isWarning ? 'text-orange-500' : 'text-gray-600'}`}>
                      {customer.count}x
                    </p>
                    <p className="text-xs text-gray-400">no-show</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Volledige no-show geschiedenis */}
      {noShows.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">📋 Volledige geschiedenis</h2>
          <div className="space-y-2">
            {noShows.map(r => (
              <div key={r.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div>
                  <p className="font-medium text-gray-900">{r.customer_name}</p>
                  <p className="text-sm text-gray-500">📞 {r.customer_phone}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-700">
                    {new Date(r.reservation_date + 'T12:00').toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })}
                  </p>
                  <p className="text-xs text-gray-400">{r.reservation_time.slice(0, 5)} • {r.party_size} pers.</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
