'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const getSupabase = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface TenantInfo {
  name: string
  address?: string
  city?: string
  phone?: string
  primary_color?: string
}

const TIME_SLOTS = [
  '11:00','11:30','12:00','12:30','13:00','13:30',
  '14:00','14:30','18:00','18:30','19:00','19:30',
  '20:00','20:30','21:00','21:30'
]

type Step = 'datetime' | 'info' | 'confirm' | 'done'

export default function ReserverenPage() {
  const params = useParams()
  const tenantSlug = params.tenant as string

  const [tenant, setTenant] = useState<TenantInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<Step>('datetime')
  const [submitting, setSubmitting] = useState(false)

  // Stap 1: datum & tijd
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [duration, setDuration] = useState('2') // uur
  const [partySize, setPartySize] = useState(2)

  // Stap 2: klantgegevens
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, boolean>>({})

  // Resultaat
  const [reservationId, setReservationId] = useState('')

  const todayStr = new Date().toISOString().split('T')[0]

  useEffect(() => {
    async function load() {
      const sb = getSupabase()
      const { data: t } = await sb
        .from('tenant_settings')
        .select('business_name, address, city, phone, primary_color')
        .eq('tenant_slug', tenantSlug)
        .single()

      if (t) {
        setTenant({
          name: t.business_name || tenantSlug,
          address: t.address,
          city: t.city,
          phone: t.phone,
          primary_color: t.primary_color || '#16a34a',
        })
      } else {
        // Fallback naar tenants tabel
        const { data: tn } = await sb.from('tenants').select('name').eq('slug', tenantSlug).single()
        setTenant({ name: tn?.name || tenantSlug })
      }
      setLoading(false)
    }
    load()
  }, [tenantSlug])

  function calcTimeTo(from: string, hours: string): string {
    if (!from) return ''
    const [h, m] = from.split(':').map(Number)
    const total = h * 60 + m + Number(hours) * 60
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
  }

  function validateStep1() {
    return date && time && partySize >= 1
  }

  function validateStep2() {
    const e: Record<string, boolean> = {}
    if (!firstName.trim()) e.firstName = true
    if (!lastName.trim()) e.lastName = true
    if (!phone.trim()) e.phone = true
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function submit() {
    if (!validateStep2()) return
    setSubmitting(true)

    try {
      const timeTo = calcTimeTo(time, duration)
      const fullName = `${firstName.trim()} ${lastName.trim()}`

      // Sla reservatie op via server-side API
      const res = await fetch('/api/online-reservatie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantSlug,
          customer_name: fullName,
          customer_phone: phone.trim(),
          customer_email: email.trim(),
          party_size: partySize,
          reservation_date: date,
          reservation_time: time,
          time_from: time,
          time_to: timeTo,
          notes: notes.trim() || null,
          status: 'confirmed',
        }),
      })

      const data = await res.json()
      if (data.id) {
        setReservationId(data.id)
        setStep('done')
      }
    } catch (e) {
      console.error(e)
    }
    setSubmitting(false)
  }

  const color = tenant?.primary_color || '#16a34a'
  const formatDate = (d: string) => d ? new Date(d + 'T12:00').toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: color, borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div style={{ backgroundColor: color }} className="text-white py-8 px-4 text-center">
        <h1 className="text-3xl font-black mb-1">{tenant?.name}</h1>
        <p className="text-white/80 text-lg">Tafel reserveren</p>
        {tenant?.address && <p className="text-white/60 text-sm mt-1">{tenant.address}{tenant.city ? `, ${tenant.city}` : ''}</p>}
      </div>

      {/* Stappen indicator */}
      <div className="flex items-center justify-center gap-2 py-4 px-4">
        {['datetime', 'info', 'confirm'].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
              step === s ? 'text-white' : (step === 'done' || ['datetime','info','confirm'].indexOf(step) > i) ? 'text-white opacity-70' : 'bg-gray-200 text-gray-500'
            }`} style={{ backgroundColor: step === s || step === 'done' || ['datetime','info','confirm'].indexOf(step) > i ? color : undefined }}>
              {i + 1}
            </div>
            {i < 2 && <div className="w-8 h-0.5 bg-gray-200" />}
          </div>
        ))}
      </div>

      <div className="max-w-lg mx-auto px-4 pb-12">

        {/* STAP 1: Datum & Tijd */}
        {step === 'datetime' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Wanneer wilt u reserveren?</h2>

            {/* Datum */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Datum <span className="text-red-500">*</span></label>
              <input
                type="date"
                min={todayStr}
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-green-500"
              />
            </div>

            {/* Tijdstip */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Tijdstip <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-4 gap-2">
                {TIME_SLOTS.map(t => (
                  <button
                    key={t}
                    onClick={() => setTime(t)}
                    className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${
                      time === t ? 'text-white border-transparent' : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                    style={{ backgroundColor: time === t ? color : undefined }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Duur */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Duur verblijf</label>
              <div className="flex gap-2">
                {['1', '1.5', '2', '2.5', '3'].map(d => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${
                      duration === d ? 'text-white border-transparent' : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                    style={{ backgroundColor: duration === d ? color : undefined }}
                  >
                    {d}u
                  </button>
                ))}
              </div>
            </div>

            {/* Aantal personen */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Aantal personen <span className="text-red-500">*</span></label>
              <div className="flex items-center gap-4">
                <button onClick={() => setPartySize(p => Math.max(1, p - 1))} className="w-12 h-12 rounded-xl border-2 border-gray-200 text-xl font-bold text-gray-700 hover:bg-gray-50">−</button>
                <span className="text-3xl font-black text-gray-900 w-12 text-center">{partySize}</span>
                <button onClick={() => setPartySize(p => Math.min(20, p + 1))} className="w-12 h-12 rounded-xl border-2 border-gray-200 text-xl font-bold text-gray-700 hover:bg-gray-50">+</button>
                <span className="text-sm text-gray-400">personen</span>
              </div>
            </div>

            <button
              onClick={() => validateStep1() && setStep('info')}
              disabled={!validateStep1()}
              className="w-full py-4 rounded-2xl font-black text-white text-lg transition-opacity disabled:opacity-40"
              style={{ backgroundColor: color }}
            >
              Volgende →
            </button>
          </div>
        )}

        {/* STAP 2: Klantgegevens */}
        {step === 'info' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Uw gegevens</h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Voornaam <span className="text-red-500">*</span></label>
                <input value={firstName} onChange={e => { setFirstName(e.target.value); setErrors(p => ({ ...p, firstName: false })) }}
                  placeholder="Voornaam"
                  className={`w-full border-2 rounded-xl px-3 py-2.5 focus:outline-none ${errors.firstName ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-green-500'}`} />
                {errors.firstName && <p className="text-red-500 text-xs mt-1">Verplicht</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Achternaam <span className="text-red-500">*</span></label>
                <input value={lastName} onChange={e => { setLastName(e.target.value); setErrors(p => ({ ...p, lastName: false })) }}
                  placeholder="Achternaam"
                  className={`w-full border-2 rounded-xl px-3 py-2.5 focus:outline-none ${errors.lastName ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-green-500'}`} />
                {errors.lastName && <p className="text-red-500 text-xs mt-1">Verplicht</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Telefoon <span className="text-red-500">*</span></label>
              <input value={phone} onChange={e => { setPhone(e.target.value); setErrors(p => ({ ...p, phone: false })) }}
                placeholder="+32 4xx xx xx xx" type="tel"
                className={`w-full border-2 rounded-xl px-3 py-2.5 focus:outline-none ${errors.phone ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-green-500'}`} />
              {errors.phone && <p className="text-red-500 text-xs mt-1">Verplicht</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Email <span className="text-gray-400 font-normal">(voor bevestiging)</span></label>
              <input value={email} onChange={e => setEmail(e.target.value)}
                placeholder="naam@email.com" type="email"
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-green-500" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Notities <span className="text-gray-400 font-normal">(allergieën, speciale wensen...)</span></label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                rows={2} className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-green-500 resize-none" />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep('datetime')} className="flex-1 py-3 border-2 border-gray-200 rounded-2xl font-bold text-gray-700 hover:bg-gray-50">← Terug</button>
              <button onClick={() => validateStep2() && setStep('confirm')} className="flex-1 py-3 rounded-2xl font-bold text-white" style={{ backgroundColor: color }}>Controleren →</button>
            </div>
          </div>
        )}

        {/* STAP 3: Bevestigen */}
        {step === 'confirm' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Controleer uw reservatie</h2>

            <div className="bg-gray-50 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xl">📅</span>
                <div>
                  <p className="text-xs text-gray-400">Datum</p>
                  <p className="font-bold text-gray-900">{formatDate(date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xl">🕐</span>
                <div>
                  <p className="text-xs text-gray-400">Uur</p>
                  <p className="font-bold text-gray-900">{time} → {calcTimeTo(time, duration)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xl">👥</span>
                <div>
                  <p className="text-xs text-gray-400">Personen</p>
                  <p className="font-bold text-gray-900">{partySize} {partySize === 1 ? 'persoon' : 'personen'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xl">👤</span>
                <div>
                  <p className="text-xs text-gray-400">Naam</p>
                  <p className="font-bold text-gray-900">{firstName} {lastName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xl">📱</span>
                <div>
                  <p className="text-xs text-gray-400">Telefoon</p>
                  <p className="font-bold text-gray-900">{phone}</p>
                </div>
              </div>
              {email && <div className="flex items-center gap-3">
                <span className="text-xl">📧</span>
                <div>
                  <p className="text-xs text-gray-400">Email</p>
                  <p className="font-bold text-gray-900">{email}</p>
                </div>
              </div>}
              {notes && <div className="flex items-center gap-3">
                <span className="text-xl">📝</span>
                <div>
                  <p className="text-xs text-gray-400">Notitie</p>
                  <p className="text-gray-700 text-sm">{notes}</p>
                </div>
              </div>}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep('info')} className="flex-1 py-3 border-2 border-gray-200 rounded-2xl font-bold text-gray-700 hover:bg-gray-50">← Terug</button>
              <button onClick={submit} disabled={submitting} className="flex-1 py-3 rounded-2xl font-black text-white text-base disabled:opacity-60" style={{ backgroundColor: color }}>
                {submitting ? '⏳ Bezig...' : '✅ Bevestig reservatie'}
              </button>
            </div>
          </div>
        )}

        {/* DONE */}
        {step === 'done' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-5" style={{ backgroundColor: `${color}20` }}>
              <span className="text-5xl">🎉</span>
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Reservatie bevestigd!</h2>
            <p className="text-gray-500 mb-6">
              Bedankt {firstName}! Uw tafel bij <strong>{tenant?.name}</strong> is gereserveerd voor <strong>{formatDate(date)}</strong> om <strong>{time}</strong>.
            </p>
            {email && (
              <div className="bg-blue-50 rounded-xl p-4 mb-6">
                <p className="text-blue-700 text-sm font-medium">📧 Een bevestigingsmail werd verstuurd naar <strong>{email}</strong></p>
              </div>
            )}
            {tenant?.phone && (
              <p className="text-gray-400 text-sm">Annuleren? Bel <a href={`tel:${tenant.phone}`} className="font-bold text-gray-700">{tenant.phone}</a></p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
