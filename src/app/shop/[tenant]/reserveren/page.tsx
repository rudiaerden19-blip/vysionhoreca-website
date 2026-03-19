'use client'

/**
 * Online Booking Widget - Publieke reservatiepagina voor klanten
 * Geen login vereist - toegankelijk voor iedereen
 */

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { CalendarDays, Clock, Users, Phone, Mail, MessageSquare, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react'

interface TenantInfo {
  name: string
  phone?: string
  email?: string
  logo_url?: string
  primary_color?: string
}

interface BookingSettings {
  isEnabled: boolean
  maxPartySize: number
  defaultDurationMinutes: number
  minAdvanceHours: number
  maxAdvanceDays: number
  slotDurationMinutes: number
  closedDays: number[]
  depositRequired: boolean
  depositAmount: number
  noShowProtection: boolean
  shifts: { id: string; name: string; startTime: string; endTime: string; isActive: boolean }[]
}

const DEFAULT_SETTINGS: BookingSettings = {
  isEnabled: true,
  maxPartySize: 12,
  defaultDurationMinutes: 90,
  minAdvanceHours: 2,
  maxAdvanceDays: 60,
  slotDurationMinutes: 30,
  closedDays: [],
  depositRequired: false,
  depositAmount: 0,
  noShowProtection: false,
  shifts: [],
}

export default function ReserverenPage({ params }: { params: { tenant: string } }) {
  const { tenant } = params
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null)
  const [settings, setSettings] = useState<BookingSettings>(DEFAULT_SETTINGS)
  const [step, setStep] = useState<'form' | 'success'>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    guest_name: '',
    guest_phone: '',
    guest_email: '',
    party_size: 2,
    reservation_date: '',
    reservation_time: '19:00',
    notes: '',
    special_requests: '',
    occasion: '',
  })
  const [reservationId, setReservationId] = useState('')

  useEffect(() => {
    // Laad tenant info
    supabase.from('tenants').select('name,phone,email,logo_url,primary_color').eq('slug', tenant).single()
      .then(({ data }) => { if (data) setTenantInfo(data) })

    // Laad instellingen uit localStorage (via API zou beter zijn maar dit werkt voor nu)
    // Laad ook de reservatie settings als ze in Supabase staan
    supabase.from('reservation_settings').select('*').eq('tenant_slug', tenant).single()
      .then(({ data }) => {
        if (data) setSettings({ ...DEFAULT_SETTINGS, ...data })
      })
  }, [tenant])

  // Genereer tijdsloten
  const generateTimeSlots = () => {
    const slots: string[] = []
    const slotInterval = settings.slotDurationMinutes || 30
    const now = new Date()
    const selectedDate = formData.reservation_date

    for (let h = 11; h <= 22; h++) {
      for (let m = 0; m < 60; m += slotInterval) {
        const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
        // Check of tijd in de toekomst ligt als vandaag geselecteerd
        if (selectedDate === now.toISOString().split('T')[0]) {
          const slotTime = new Date()
          slotTime.setHours(h, m, 0)
          const minTime = new Date(now.getTime() + (settings.minAdvanceHours || 2) * 60 * 60 * 1000)
          if (slotTime < minTime) continue
        }
        slots.push(time)
      }
    }
    return slots
  }

  // Min datum (vandaag + minAdvanceHours)
  const getMinDate = () => {
    const d = new Date()
    if (settings.minAdvanceHours >= 24) d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  }

  // Max datum
  const getMaxDate = () => {
    const d = new Date()
    d.setDate(d.getDate() + (settings.maxAdvanceDays || 60))
    return d.toISOString().split('T')[0]
  }

  const handleSubmit = async () => {
    if (!formData.guest_name.trim()) { setError('Naam is verplicht'); return }
    if (!formData.reservation_date) { setError('Datum is verplicht'); return }
    if (!formData.reservation_time) { setError('Tijd is verplicht'); return }
    if (!formData.guest_phone && !formData.guest_email) {
      setError('Telefoon of email is verplicht'); return
    }
    setError('')
    setLoading(true)

    try {
      const { data, error: insertError } = await supabase.from('reservations').insert([{
        tenant_slug: tenant,
        guest_name: formData.guest_name,
        guest_phone: formData.guest_phone || null,
        guest_email: formData.guest_email || null,
        party_size: formData.party_size,
        reservation_date: formData.reservation_date,
        reservation_time: formData.reservation_time,
        duration_minutes: settings.defaultDurationMinutes,
        notes: formData.notes || null,
        special_requests: formData.special_requests || null,
        occasion: formData.occasion || null,
        status: 'PENDING',
        total_spent: 0,
        payment_status: 'unpaid',
      }]).select().single()

      if (insertError) throw insertError

      // Stuur bevestigingsmail
      if (formData.guest_email) {
        await fetch('/api/send-reservation-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerEmail: formData.guest_email,
            customerName: formData.guest_name,
            customerPhone: formData.guest_phone,
            reservationDate: formData.reservation_date,
            reservationTime: formData.reservation_time,
            partySize: formData.party_size,
            notes: formData.notes,
            specialRequests: formData.special_requests,
            occasion: formData.occasion,
            status: 'pending',
            businessName: tenantInfo?.name || tenant,
            businessPhone: tenantInfo?.phone,
            businessEmail: tenantInfo?.email,
          }),
        })
      }

      // Als borg vereist, redirect naar Stripe
      if (settings.depositRequired && settings.depositAmount > 0 && data) {
        const res = await fetch('/api/reservation-deposit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reservationId: data.id,
            tenantSlug: tenant,
            guestName: formData.guest_name,
            guestEmail: formData.guest_email,
            depositAmount: settings.depositAmount,
            reservationDate: formData.reservation_date,
            reservationTime: formData.reservation_time,
            businessName: tenantInfo?.name || tenant,
          }),
        })
        const { url } = await res.json()
        if (url) { window.location.href = url; return }
      }

      if (data) setReservationId(data.id)
      setStep('success')
    } catch (err) {
      console.error(err)
      setError('Er ging iets fout. Probeer opnieuw of bel ons.')
    } finally {
      setLoading(false)
    }
  }

  const primaryColor = tenantInfo?.primary_color || '#22c55e'
  const timeSlots = generateTimeSlots()

  if (!settings.isEnabled) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md bg-white rounded-2xl p-8 shadow-lg">
          <CalendarDays size={48} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-bold mb-2">Online reserveren niet beschikbaar</h2>
          <p className="text-gray-400">Neem telefonisch contact op om te reserveren.</p>
          {tenantInfo?.phone && (
            <a href={`tel:${tenantInfo.phone}`} className="mt-4 inline-block px-6 py-3 rounded-xl bg-green-500 text-white font-medium">
              📞 {tenantInfo.phone}
            </a>
          )}
        </div>
      </div>
    )
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md bg-white rounded-2xl p-8 shadow-lg">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} className="text-green-500" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Reservatie Ontvangen!</h2>
          <p className="text-gray-500 mb-4">
            Bedankt {formData.guest_name}! We hebben uw reservatie ontvangen voor <strong>{formData.reservation_date}</strong> om <strong>{formData.reservation_time}</strong>.
          </p>
          <p className="text-gray-400 text-sm mb-6">
            {formData.guest_email ? `U ontvangt een bevestiging op ${formData.guest_email}.` : 'We nemen zo snel mogelijk contact op.'}
          </p>
          <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2 mb-6">
            <div className="flex items-center gap-2 text-sm">
              <CalendarDays size={16} className="text-gray-400" />
              <span>{new Date(formData.reservation_date).toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock size={16} className="text-gray-400" />
              <span>{formData.reservation_time}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users size={16} className="text-gray-400" />
              <span>{formData.party_size} {formData.party_size === 1 ? 'persoon' : 'personen'}</span>
            </div>
          </div>
          {tenantInfo?.phone && (
            <p className="text-gray-400 text-sm">
              Vragen? Bel <a href={`tel:${tenantInfo.phone}`} className="text-green-500 font-medium">{tenantInfo.phone}</a>
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="text-white py-8 px-4 text-center" style={{ backgroundColor: primaryColor }}>
        <h1 className="text-2xl font-bold">{tenantInfo?.name || 'Reserveren'}</h1>
        <p className="opacity-90 mt-1">Online tafel reserveren</p>
      </div>

      {/* Form */}
      <div className="max-w-lg mx-auto p-4 -mt-4">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-6 space-y-5">
            {/* Naam */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Uw naam *</label>
              <input
                type="text"
                value={formData.guest_name}
                onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
                placeholder="Jan Janssen"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none bg-gray-50"
              />
            </div>

            {/* Telefoon & Email */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Phone size={14} className="inline mr-1" />Telefoon
                </label>
                <input
                  type="tel"
                  value={formData.guest_phone}
                  onChange={(e) => setFormData({ ...formData, guest_phone: e.target.value })}
                  placeholder="+32 ..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Mail size={14} className="inline mr-1" />Email
                </label>
                <input
                  type="email"
                  value={formData.guest_email}
                  onChange={(e) => setFormData({ ...formData, guest_email: e.target.value })}
                  placeholder="jan@email.be"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none bg-gray-50"
                />
              </div>
            </div>

            {/* Datum */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <CalendarDays size={14} className="inline mr-1" />Datum *
              </label>
              <input
                type="date"
                value={formData.reservation_date}
                onChange={(e) => setFormData({ ...formData, reservation_date: e.target.value })}
                min={getMinDate()}
                max={getMaxDate()}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none bg-gray-50"
              />
            </div>

            {/* Tijd */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock size={14} className="inline mr-1" />Tijdstip *
              </label>
              <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                {timeSlots.map((time) => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => setFormData({ ...formData, reservation_time: time })}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                      formData.reservation_time === time
                        ? 'text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    style={formData.reservation_time === time ? { backgroundColor: primaryColor } : {}}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>

            {/* Personen */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users size={14} className="inline mr-1" />Aantal personen
              </label>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, party_size: Math.max(1, formData.party_size - 1) })}
                  className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-xl font-bold hover:bg-gray-200"
                >-</button>
                <div className="flex-1 text-center">
                  <span className="text-3xl font-bold">{formData.party_size}</span>
                  <span className="text-gray-400 ml-2">personen</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, party_size: Math.min(settings.maxPartySize, formData.party_size + 1) })}
                  className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-xl font-bold hover:bg-gray-200"
                >+</button>
              </div>
            </div>

            {/* Gelegenheid */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Gelegenheid (optioneel)</label>
              <div className="flex flex-wrap gap-2">
                {['', 'Verjaardag', 'Jubileum', 'Zakelijk', 'Romantisch', 'Feest'].map((occ) => (
                  <button
                    key={occ}
                    type="button"
                    onClick={() => setFormData({ ...formData, occasion: occ })}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      formData.occasion === occ ? 'text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                    style={formData.occasion === occ ? { backgroundColor: primaryColor } : {}}
                  >
                    {occ || 'Geen'}
                  </button>
                ))}
              </div>
            </div>

            {/* Opmerkingen */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MessageSquare size={14} className="inline mr-1" />Opmerkingen / Speciale wensen
              </label>
              <textarea
                value={formData.special_requests}
                onChange={(e) => setFormData({ ...formData, special_requests: e.target.value })}
                placeholder="Allergieën, kinderstoel, rolstoel, speciale wensen..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none bg-gray-50 resize-none"
              />
            </div>

            {/* Borg melding */}
            {settings.depositRequired && settings.depositAmount > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-amber-700 text-sm font-medium">💳 Borg vereist: €{settings.depositAmount.toFixed(2)}</p>
                <p className="text-amber-600 text-xs mt-1">Na het invullen wordt u doorverwezen naar de betaalpagina.</p>
              </div>
            )}

            {/* No-show melding */}
            {settings.noShowProtection && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-blue-700 text-sm font-medium">🛡️ No-show bescherming actief</p>
                <p className="text-blue-600 text-xs mt-1">Bij niet verschijnen zonder annulering kan er een kost aangerekend worden.</p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-4 rounded-xl text-white font-bold text-lg transition-opacity disabled:opacity-50"
              style={{ backgroundColor: primaryColor }}
            >
              {loading ? 'Bezig...' : settings.depositRequired && settings.depositAmount > 0 ? `Reserveren & Betalen €${settings.depositAmount.toFixed(2)}` : 'Reservatie Aanvragen'}
            </button>

            <p className="text-center text-gray-400 text-xs">
              Door te reserveren gaat u akkoord met onze voorwaarden.
              {tenantInfo?.phone && ` Vragen? ${tenantInfo.phone}`}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
