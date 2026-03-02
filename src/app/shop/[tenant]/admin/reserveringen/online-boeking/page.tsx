'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const DAYS = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag']
const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

const DEFAULT_TIME_SLOTS = [
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00', '21:30'
]

interface BookingSettings {
  online_booking_enabled: boolean
  max_reservations_per_slot: number
  max_party_size: number
  min_advance_hours: number
  max_advance_days: number
  available_time_slots: string[]
  booking_days: string[]
  reservation_duration_minutes: number
  auto_confirm: boolean
  require_phone: boolean
  require_email: boolean
  booking_notes_placeholder: string
}

const DEFAULT_SETTINGS: BookingSettings = {
  online_booking_enabled: true,
  max_reservations_per_slot: 5,
  max_party_size: 10,
  min_advance_hours: 2,
  max_advance_days: 60,
  available_time_slots: DEFAULT_TIME_SLOTS,
  booking_days: DAY_KEYS,
  reservation_duration_minutes: 120,
  auto_confirm: true,
  require_phone: true,
  require_email: false,
  booking_notes_placeholder: 'Bijv. kinderstoel, allergie...',
}

export default function OnlineBoekingPage({ params }: { params: { tenant: string } }) {
  const [settings, setSettings] = useState<BookingSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [newSlot, setNewSlot] = useState('')

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('tenant_settings')
        .select('booking_settings')
        .eq('tenant_slug', params.tenant)
        .single()

      if (data?.booking_settings) {
        setSettings({ ...DEFAULT_SETTINGS, ...data.booking_settings })
      }
      setLoading(false)
    }
    load()
  }, [params.tenant])

  const save = async () => {
    setSaving(true)
    await supabase
      .from('tenant_settings')
      .upsert({ tenant_slug: params.tenant, booking_settings: settings }, { onConflict: 'tenant_slug' })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const toggleDay = (day: string) => {
    setSettings(prev => ({
      ...prev,
      booking_days: prev.booking_days.includes(day)
        ? prev.booking_days.filter(d => d !== day)
        : [...prev.booking_days, day]
    }))
  }

  const toggleSlot = (slot: string) => {
    setSettings(prev => ({
      ...prev,
      available_time_slots: prev.available_time_slots.includes(slot)
        ? prev.available_time_slots.filter(s => s !== slot)
        : [...prev.available_time_slots, slot].sort()
    }))
  }

  const addCustomSlot = () => {
    if (!newSlot || settings.available_time_slots.includes(newSlot)) return
    setSettings(prev => ({
      ...prev,
      available_time_slots: [...prev.available_time_slots, newSlot].sort()
    }))
    setNewSlot('')
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
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
          <h1 className="text-2xl font-bold text-gray-900">📱 Online Boeking</h1>
          <p className="text-gray-500 text-sm">Stel in hoe klanten online kunnen reserveren</p>
        </div>
      </div>

      {/* Hoofdschakelaar */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Online reservaties inschakelen</h2>
            <p className="text-gray-500 text-sm mt-1">
              {settings.online_booking_enabled
                ? 'Klanten kunnen nu online reserveren via jouw website'
                : 'Online reservaties zijn uitgeschakeld'}
            </p>
          </div>
          <button
            onClick={() => setSettings(p => ({ ...p, online_booking_enabled: !p.online_booking_enabled }))}
            className={`relative w-14 h-8 rounded-full transition-colors ${settings.online_booking_enabled ? 'bg-green-500' : 'bg-gray-300'}`}
          >
            <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${settings.online_booking_enabled ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      {settings.online_booking_enabled && (
        <>
          {/* Capaciteit */}
          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
            <h2 className="text-lg font-bold text-gray-900">🪑 Capaciteit & limieten</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Max. reservaties per tijdslot
                  <span className="ml-2 text-xs text-gray-400 font-normal">(hoe vol mag 1 tijdslot zijn)</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={settings.max_reservations_per_slot}
                  onChange={e => setSettings(p => ({ ...p, max_reservations_per_slot: Number(e.target.value) }))}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Max. personen per reservatie
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={settings.max_party_size}
                  onChange={e => setSettings(p => ({ ...p, max_party_size: Number(e.target.value) }))}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Min. uren op voorhand boeken
                </label>
                <input
                  type="number"
                  min={0}
                  max={72}
                  value={settings.min_advance_hours}
                  onChange={e => setSettings(p => ({ ...p, min_advance_hours: Number(e.target.value) }))}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Max. dagen op voorhand boeken
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={settings.max_advance_days}
                  onChange={e => setSettings(p => ({ ...p, max_advance_days: Number(e.target.value) }))}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Reservatieduur (minuten)
                </label>
                <select
                  value={settings.reservation_duration_minutes}
                  onChange={e => setSettings(p => ({ ...p, reservation_duration_minutes: Number(e.target.value) }))}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 font-bold focus:outline-none focus:border-blue-500"
                >
                  <option value={60}>1 uur</option>
                  <option value={90}>1,5 uur</option>
                  <option value={120}>2 uur</option>
                  <option value={150}>2,5 uur</option>
                  <option value={180}>3 uur</option>
                </select>
              </div>
            </div>
          </div>

          {/* Beschikbare dagen */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">📅 Beschikbare dagen</h2>
            <div className="grid grid-cols-4 gap-2">
              {DAYS.map((day, i) => {
                const key = DAY_KEYS[i]
                const active = settings.booking_days.includes(key)
                return (
                  <button
                    key={key}
                    onClick={() => toggleDay(key)}
                    className={`py-3 rounded-xl text-sm font-bold border-2 transition-colors ${
                      active ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {day.slice(0, 2)}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Tijdsloten */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-1">🕐 Beschikbare tijdsloten</h2>
            <p className="text-gray-500 text-sm mb-4">Klik om een tijdslot in/uit te schakelen</p>

            <div className="grid grid-cols-4 gap-2 mb-4">
              {DEFAULT_TIME_SLOTS.map(slot => {
                const active = settings.available_time_slots.includes(slot)
                return (
                  <button
                    key={slot}
                    onClick={() => toggleSlot(slot)}
                    className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-colors ${
                      active ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-200 text-gray-400 hover:border-gray-300'
                    }`}
                  >
                    {slot}
                  </button>
                )
              })}
            </div>

            {/* Eigen tijdslot toevoegen */}
            <div className="flex gap-2 mt-2">
              <input
                type="time"
                value={newSlot}
                onChange={e => setNewSlot(e.target.value)}
                className="border-2 border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={addCustomSlot}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium"
              >
                + Eigen tijdslot
              </button>
            </div>
          </div>

          {/* Automatisch bevestigen */}
          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-gray-900">⚙️ Opties</h2>

            {[
              { key: 'auto_confirm', label: 'Automatisch bevestigen', desc: 'Reservaties worden direct bevestigd zonder jouw goedkeuring' },
              { key: 'require_phone', label: 'Telefoonnummer verplicht', desc: 'Klant moet een telefoonnummer opgeven' },
              { key: 'require_email', label: 'E-mail verplicht', desc: 'Klant moet een e-mailadres opgeven' },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div>
                  <p className="font-medium text-gray-900">{label}</p>
                  <p className="text-sm text-gray-500">{desc}</p>
                </div>
                <button
                  onClick={() => setSettings(p => ({ ...p, [key]: !p[key as keyof BookingSettings] }))}
                  className={`relative w-12 h-7 rounded-full transition-colors ${settings[key as keyof BookingSettings] ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings[key as keyof BookingSettings] ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Opslaan */}
      <div className="flex justify-end pb-8">
        <button
          onClick={save}
          disabled={saving}
          className={`px-8 py-4 rounded-2xl font-bold text-white text-lg transition-colors ${
            saved ? 'bg-green-500' : 'bg-blue-500 hover:bg-blue-600'
          } disabled:opacity-50`}
        >
          {saving ? '⏳ Opslaan...' : saved ? '✅ Opgeslagen!' : '💾 Opslaan'}
        </button>
      </div>
    </div>
  )
}
