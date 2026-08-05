'use client'

/**
 * Online Booking Widget - Publieke reservatiepagina voor klanten
 * Geen login vereist - toegankelijk voor iedereen
 */

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  isPublicReservationSlotTooSoon,
  localCalendarDateString,
  maxReservationDateYmd,
  minReservationDateYmd,
} from '@/lib/reservation-datetime'
import { parseFloorPlanTablesJson, sanitizeFloorPlanTables } from '@/lib/kassa-floor-plan-tables'
import {
  findReservationBlockingTableSlot,
  getTableAvailabilityAtSlot,
  type ReservationTableBlocker,
} from '@/lib/reservation-table-availability'
import { CalendarDays, Clock, Users, Phone, Mail, MessageSquare, CheckCircle2, ChevronLeft, ChevronRight, MapPin } from 'lucide-react'

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
  bufferMinutes: number
  closedDays: number[]
  depositRequired: boolean
  depositAmount: number
  noShowProtection: boolean
  shifts: { id: string; name: string; startTime: string; endTime: string; isActive: boolean }[]
  autoConfirm: boolean
}

type PublicFloorTable = { number: string; seats: number }

const DEFAULT_SETTINGS: BookingSettings = {
  isEnabled: true,
  maxPartySize: 12,
  defaultDurationMinutes: 90,
  minAdvanceHours: 2,
  maxAdvanceDays: 60,
  slotDurationMinutes: 30,
  bufferMinutes: 15,
  closedDays: [],
  depositRequired: false,
  depositAmount: 0,
  noShowProtection: false,
  shifts: [],
  autoConfirm: false,
}

export default function ReserverenPage({ params }: { params: { tenant: string } }) {
  const { tenant } = params
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null)
  const [settings, setSettings] = useState<BookingSettings>(DEFAULT_SETTINGS)
  const [step, setStep] = useState<'form' |  'success'>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailWarning, setEmailWarning] = useState('')

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
    table_number: '',
  })
  const [reservationId, setReservationId] = useState('')
  const [floorTables, setFloorTables] = useState<PublicFloorTable[]>([])
  const [dayReservations, setDayReservations] = useState<ReservationTableBlocker[]>([])
  const [loadingDayReservations, setLoadingDayReservations] = useState(false)

  useEffect(() => {
    // Laad tenant info (basis: naam, telefoon, logo)
    supabase.from('tenants').select('name,phone,email,logo_url').eq('slug', tenant).single()
      .then(({ data }) => { if (data) setTenantInfo(prev => ({ ...prev, ...data })) })

    // Laad primaryColor uit tenant_settings (correcte bron)
    supabase.from('tenant_settings').select('primary_color,business_name,logo_url').eq('tenant_slug', tenant).single()
      .then(({ data }) => {
        if (data) {
          setTenantInfo(prev => ({
            ...prev,
            primary_color: data.primary_color || prev?.primary_color,
            name: data.business_name || prev?.name || '',
            logo_url: data.logo_url || prev?.logo_url,
          }))
        }
      })

    // Laad reservatie instellingen uit Supabase (geen harde fout bij ontbrekende rij)
    supabase.from('reservation_settings').select('*').eq('tenant_slug', tenant).maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error('[reserveren] reservation_settings:', error.message)
          return
        }
        if (!data) return
        setSettings({
          ...DEFAULT_SETTINGS,
          isEnabled: data.is_enabled ?? DEFAULT_SETTINGS.isEnabled,
          maxPartySize: data.max_party_size ?? DEFAULT_SETTINGS.maxPartySize,
          defaultDurationMinutes: data.default_duration_minutes ?? DEFAULT_SETTINGS.defaultDurationMinutes,
          minAdvanceHours: data.min_advance_hours ?? DEFAULT_SETTINGS.minAdvanceHours,
          maxAdvanceDays: data.max_advance_days ?? DEFAULT_SETTINGS.maxAdvanceDays,
          slotDurationMinutes: data.slot_duration_minutes ?? DEFAULT_SETTINGS.slotDurationMinutes,
          bufferMinutes: data.buffer_minutes ?? DEFAULT_SETTINGS.bufferMinutes,
          closedDays: Array.isArray(data.closed_days) ? data.closed_days : (typeof data.closed_days === 'string'? (() => { try { return JSON.parse(data.closed_days) } catch { return [] } })() : []),
          depositRequired: data.deposit_required ?? DEFAULT_SETTINGS.depositRequired,
          depositAmount: Number(data.deposit_amount) || DEFAULT_SETTINGS.depositAmount,
          noShowProtection: data.no_show_protection ?? DEFAULT_SETTINGS.noShowProtection,
          shifts: Array.isArray(data.shifts) ? data.shifts : (typeof data.shifts === 'string'? (() => { try { return JSON.parse(data.shifts) } catch { return [] } })() : []),
          autoConfirm: data.auto_confirm ?? false,
        })
      })

    Promise.all([
      supabase.from('floor_plan_tables').select('data').eq('tenant_slug', tenant).eq('plan_zone', 'inside').maybeSingle(),
      supabase.from('floor_plan_tables').select('data').eq('tenant_slug', tenant).eq('plan_zone', 'terrace').maybeSingle(),
    ]).then(([insideRes, terraceRes]) => {
      const merged = [
        ...(parseFloorPlanTablesJson(insideRes.data?.data) || []),
        ...(parseFloorPlanTablesJson(terraceRes.data?.data) || []),
      ]
      const sanitized = sanitizeFloorPlanTables(merged)
      setFloorTables(
        sanitized.map(t => ({ number: String(t.number), seats: t.seats || 2 })).sort((a, b) => {
          const na = parseInt(a.number, 10)
          const nb = parseInt(b.number, 10)
          if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb
          return a.number.localeCompare(b.number)
        }),
      )
    })
  }, [tenant])

  useEffect(() => {
    if (!formData.reservation_date) {
      setDayReservations([])
      return
    }
    let cancelled = false
    setLoadingDayReservations(true)
    void supabase
      .from('reservations')
      .select('id, reservation_date, reservation_time, duration_minutes, table_number, status, guest_name')
      .eq('tenant_slug', tenant)
      .eq('reservation_date', formData.reservation_date)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error('[reserveren] reservations load:', error.message)
          setDayReservations([])
          return
        }
        setDayReservations(
          (data || []).map(row => ({
            id: row.id as string,
            reservation_date: row.reservation_date as string,
            reservation_time: (row.reservation_time as string) || '19:00',
            duration_minutes: Number(row.duration_minutes) || settings.defaultDurationMinutes,
            table_number: row.table_number as string | number | null | undefined,
            status: ((row.status as string) || '').toUpperCase(),
            guest_name: row.guest_name as string | undefined,
          })),
        )
      })
      .then(() => {
        if (!cancelled) setLoadingDayReservations(false)
      })
    return () => {
      cancelled = true
    }
  }, [tenant, formData.reservation_date, settings.defaultDurationMinutes])

  const tablePickerTables = floorTables.filter(t => t.seats >= formData.party_size)

  const slotAvailabilityParams = (tableNum: string | number) => ({
    tableNumber: tableNum,
    date: formData.reservation_date,
    slotStartHm: formData.reservation_time,
    slotDurationMinutes: settings.defaultDurationMinutes,
    bufferMinutes: settings.bufferMinutes,
    defaultDurationMinutes: settings.defaultDurationMinutes,
  })

  useEffect(() => {
    if (!formData.table_number) return
    const status = getTableAvailabilityAtSlot(dayReservations, slotAvailabilityParams(formData.table_number))
    if (status.bezet) {
      setFormData(f => ({ ...f, table_number: '' }))
    }
  }, [
    formData.reservation_date,
    formData.reservation_time,
    formData.party_size,
    dayReservations,
    settings.defaultDurationMinutes,
    settings.bufferMinutes,
  ])

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
        if (selectedDate === localCalendarDateString(now)) {
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

  /** Eerste kalenderdag waarop (nu + minAdvanceHours) nog binnen opening valt — lokaal, geen UTC-shift. */
  const getMinDate = () => minReservationDateYmd(settings.minAdvanceHours)

  const getMaxDate = () => maxReservationDateYmd(settings.maxAdvanceDays || 60)

  const handleSubmit = async () => {
    if (!formData.guest_name.trim()) { setError('Naam is verplicht'); return }
    if (!formData.reservation_date) { setError('Datum is verplicht'); return }
    if (!formData.reservation_time) { setError('Tijd is verplicht'); return }
    if (!formData.guest_phone && !formData.guest_email) {
      setError('Telefoon of email is verplicht'); return
    }
    if (
      isPublicReservationSlotTooSoon(
        formData.reservation_date,
        formData.reservation_time,
        settings.minAdvanceHours
      )
    ) {
      setError(
        'Deze datum en tijd liggen in het verleden of binnen de minimale vooruit. Kies een later tijdstip.'
      )
      return
    }
    if (floorTables.length > 0) {
      if (!formData.table_number) {
        setError('Kies een vrije tafel voor uw tijdstip.')
        return
      }
      if (
        findReservationBlockingTableSlot(dayReservations, {
          ...slotAvailabilityParams(formData.table_number),
        })
      ) {
        setError('Deze tafel is bezet op het gekozen uur. Kies een andere tafel of een later tijdstip.')
        return
      }
    }
    setError('')
    setLoading(true)

    try {
      const reservationStatus = settings.autoConfirm ? 'CONFIRMED': 'PENDING'
      const { data, error: insertError } = await supabase.from('reservations').insert([{
        tenant_slug: tenant,
        guest_name: formData.guest_name,
        guest_phone: formData.guest_phone || null,
        guest_email: formData.guest_email || null,
        customer_name: formData.guest_name,
        customer_phone: formData.guest_phone || null,
        customer_email: formData.guest_email || null,
        party_size: formData.party_size,
        reservation_date: formData.reservation_date,
        reservation_time: formData.reservation_time,
        duration_minutes: settings.defaultDurationMinutes,
        table_number: formData.table_number || null,
        notes: formData.notes || null,
        special_requests: formData.special_requests || null,
        status: reservationStatus,
        total_spent: 0,
      }]).select().single()

      if (insertError) throw insertError

      // Gastprofiel aanmaken of updaten — via server-endpoint omdat anon
      // sinds Phase 1 RLS-lockdown niet meer rechtstreeks naar guest_profiles
      // mag schrijven (klantnaam + telefoon zijn persoonsgegevens).
      if (formData.guest_phone || formData.guest_email) {
        try {
          await fetch('/api/public/guest-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json'},
            body: JSON.stringify({
              tenantSlug: tenant,
              name: formData.guest_name,
              phone: formData.guest_phone || null,
              email: formData.guest_email || null,
              lastVisit: formData.reservation_date,
            }),
          })
        } catch (profileErr) {
          console.warn('[reserveren] guest_profile endpoint mislukt:', profileErr)
        }
      }

      // Stuur mail: bij autoConfirm → "bevestigd", anders → "in afwachting"
      if (formData.guest_email) {
        try {
          // Haal tenant info opnieuw op als nog niet geladen
          let bName = tenantInfo?.name || ''
          let bPhone = tenantInfo?.phone || ''
          let bEmail = tenantInfo?.email || ''
          if (!bName) {
            const { data: td } = await supabase.from('tenants').select('name,phone,email').eq('slug', tenant).single()
            if (td) { bName = td.name || tenant; bPhone = td.phone || ''; bEmail = td.email || ''}
          }
          const mailRes = await fetch('/api/send-reservation-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json'},
            body: JSON.stringify({
              tenantSlug: tenant,
              customerEmail: formData.guest_email,
              customerName: formData.guest_name,
              customerPhone: formData.guest_phone,
              reservationDate: formData.reservation_date,
              reservationTime: formData.reservation_time,
              partySize: formData.party_size,
              notes: formData.notes,
              specialRequests: formData.special_requests,
              status: settings.autoConfirm ? 'confirmed': 'pending',
              businessName: bName || tenant,
              businessPhone: bPhone,
              businessEmail: bEmail,
            }),
          })
          if (!mailRes.ok) {
            const err = await mailRes.json().catch(() => ({}))
            console.error('[reserveren] Email fout:', err)
            setEmailWarning('Uw reservatie is aangemaakt, maar de bevestigingsmail kon niet worden verstuurd. Neem contact op met de zaak als u geen mail ontvangt.')
          }
        } catch (mailErr) {
          console.error('[reserveren] Email netwerk fout:', mailErr)
          setEmailWarning('Uw reservatie is aangemaakt, maar de bevestigingsmail kon niet worden verstuurd. Neem contact op met de zaak als u geen mail ontvangt.')
        }
      }

      // Als borg vereist, redirect naar Stripe
      if (settings.depositRequired && settings.depositAmount > 0 && data) {
        const res = await fetch('/api/reservation-deposit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json'},
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
               {tenantInfo.phone}
            </a>
          )}
        </div>
      </div>
    )
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: `${primaryColor}10`}}>
        <div className="text-center max-w-md w-full bg-white rounded-3xl p-8 shadow-xl">
          {/* Animated checkmark */}
          <div className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center text-5xl shadow-lg"
            style={{ backgroundColor: primaryColor }}>
            
          </div>
          <h2 className="text-2xl font-bold mb-2">
            {settings.autoConfirm ? 'Reservatie Bevestigd! ': 'Reservatie Ontvangen!'}
          </h2>
          <p className="text-gray-500 mb-6">
            {settings.autoConfirm
              ? <>Bedankt <strong>{formData.guest_name}</strong>! Uw tafel is gereserveerd. Tot ziens!</>
              : <>Bedankt <strong>{formData.guest_name}</strong>! Uw reservatie is aangevraagd. U ontvangt een bevestiging zodra wij uw reservatie goedkeuren.</>
            }
          </p>

          {/* Overzicht kaart */}
          <div className="rounded-2xl p-5 text-left space-y-3 mb-6" style={{ backgroundColor: `${primaryColor}15`}}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm" style={{ backgroundColor: primaryColor }}>
                <CalendarDays size={16} />
              </div>
              <div>
                <p className="text-xs text-gray-500">Datum</p>
                <p className="font-semibold text-gray-800">{new Date(formData.reservation_date).toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long'})}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm" style={{ backgroundColor: primaryColor }}>
                <Clock size={16} />
              </div>
              <div>
                <p className="text-xs text-gray-500">Tijdstip</p>
                <p className="font-semibold text-gray-800">{formData.reservation_time}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm" style={{ backgroundColor: primaryColor }}>
                <Users size={16} />
              </div>
              <div>
                <p className="text-xs text-gray-500">Personen</p>
                <p className="font-semibold text-gray-800">{formData.party_size} {formData.party_size === 1 ? 'persoon': 'personen'}</p>
              </div>
            </div>
          </div>

          {formData.guest_email && !emailWarning && (
            <p className="text-gray-400 text-sm mb-6">
               {settings.autoConfirm
                ? <>Een bevestiging is verstuurd naar <strong>{formData.guest_email}</strong></>
                : <>U ontvangt een bevestigingsmail op <strong>{formData.guest_email}</strong> zodra uw reservatie goedgekeurd is.</>
              }
            </p>
          )}

          {emailWarning && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
              <p className="text-amber-700 text-sm">{emailWarning}</p>
            </div>
          )}

          {tenantInfo?.phone && (
            <a href={`tel:${tenantInfo.phone}`}
              className="block w-full py-3 rounded-2xl font-semibold text-white mb-3 transition-opacity hover:opacity-90"
              style={{ backgroundColor: primaryColor }}>
               {tenantInfo.phone}
            </a>
          )}
          <a href={`/shop/${tenant}`}
            className="block w-full py-3 rounded-2xl font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
            ← Terug naar {tenantInfo?.name || 'de zaak'}
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="text-white px-4 pt-5 pb-10 relative" style={{ backgroundColor: primaryColor }}>
        <a href={`/shop/${tenant}`} className="absolute top-4 left-4 flex items-center gap-1 text-white/80 hover:text-white text-sm font-medium transition-colors">
          <ChevronLeft size={18} /> Terug
        </a>
        <div className="text-center">
          {tenantInfo?.logo_url ? (
            <img src={tenantInfo.logo_url} alt={tenantInfo.name} className="w-16 h-16 rounded-2xl object-cover mx-auto mb-3 shadow-lg border-2 border-white/30" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-white/20 mx-auto mb-3 flex items-center justify-center text-3xl"></div>
          )}
          <h1 className="text-2xl font-bold">{tenantInfo?.name || 'Reserveren'}</h1>
          <p className="opacity-80 mt-1 text-sm">Online tafel reserveren</p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-lg mx-auto p-4 -mt-6">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6 space-y-5">
            {/* Naam */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Uw naam *</label>
              <input
                type="text"
                value={formData.guest_name}
                onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
                placeholder="Jan Janssen"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none bg-gray-50 focus:border-2"
                onFocus={e => e.target.style.borderColor = primaryColor}
                onBlur={e => e.target.style.borderColor = ''}
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
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none bg-gray-50"
                  onFocus={e => e.target.style.borderColor = primaryColor}
                  onBlur={e => e.target.style.borderColor = ''}
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
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none bg-gray-50"
                  onFocus={e => e.target.style.borderColor = primaryColor}
                  onBlur={e => e.target.style.borderColor = ''}
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
                onChange={(e) => setFormData({ ...formData, reservation_date: e.target.value, table_number: '' })}
                min={getMinDate()}
                max={getMaxDate()}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none bg-gray-50"
                onFocus={e => e.target.style.borderColor = primaryColor}
                onBlur={e => e.target.style.borderColor = ''}
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
                    onClick={() => setFormData({ ...formData, reservation_time: time, table_number: '' })}
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

            {/* Tafel — alleen vrije tafels op gekozen datum/tijd */}
            {floorTables.length > 0 && formData.reservation_date && formData.reservation_time && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin size={14} className="inline mr-1" />
                  Tafel * <span className="font-normal text-gray-400">(vrij op {formData.reservation_time})</span>
                </label>
                {loadingDayReservations ? (
                  <p className="text-sm text-gray-400">Beschikbaarheid laden…</p>
                ) : tablePickerTables.length === 0 ? (
                  <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    Geen tafel groot genoeg voor {formData.party_size} personen. Pas het aantal personen aan.
                  </p>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                    {tablePickerTables.map(table => {
                      const status = getTableAvailabilityAtSlot(dayReservations, slotAvailabilityParams(table.number))
                      const selected = formData.table_number === table.number
                      return (
                        <button
                          key={table.number}
                          type="button"
                          disabled={status.bezet}
                          title={
                            status.bezet
                              ? `Bezet${status.tot ? ` tot ${status.tot}` : ''}`
                              : `${table.seats} plaatsen`
                          }
                          onClick={() => {
                            if (!status.bezet) {
                              setFormData(f => ({ ...f, table_number: table.number }))
                            }
                          }}
                          className={`py-2.5 px-2 rounded-xl border-2 text-sm font-bold transition-colors ${
                            status.bezet
                              ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed line-through'
                              : selected
                                ? 'border-transparent text-white'
                                : 'border-gray-200 bg-white text-gray-800 hover:border-gray-400'
                          }`}
                          style={!status.bezet && selected ? { backgroundColor: primaryColor, borderColor: primaryColor } : undefined}
                        >
                          {table.number}
                          <span className="block text-[10px] font-normal opacity-80">{table.seats}p</span>
                        </button>
                      )
                    })}
                  </div>
                )}
                {!loadingDayReservations &&
                  tablePickerTables.length > 0 &&
                  tablePickerTables.every(t => getTableAvailabilityAtSlot(dayReservations, slotAvailabilityParams(t.number)).bezet) && (
                    <p className="text-sm text-red-600 mt-2">
                      Alle geschikte tafels zijn bezet rond dit uur. Kies een ander tijdstip.
                    </p>
                  )}
              </div>
            )}

            {/* Personen */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users size={14} className="inline mr-1" />Aantal personen
              </label>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, party_size: Math.max(1, formData.party_size - 1), table_number: '' })}
                  className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-xl font-bold hover:bg-gray-200"
                >-</button>
                <div className="flex-1 text-center">
                  <span className="text-3xl font-bold">{formData.party_size}</span>
                  <span className="text-gray-400 ml-2">personen</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, party_size: Math.min(settings.maxPartySize, formData.party_size + 1), table_number: '' })}
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
                      formData.occasion === occ ? 'text-white': 'bg-gray-100 text-gray-500 hover:bg-gray-200'
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
                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none bg-gray-50 resize-none"
                onFocus={e => e.target.style.borderColor = primaryColor}
                onBlur={e => e.target.style.borderColor = ''}
              />
            </div>

            {/* Borg melding */}
            {settings.depositRequired && settings.depositAmount > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-amber-700 text-sm font-medium"> Borg vereist: €{settings.depositAmount.toFixed(2)}</p>
                <p className="text-amber-600 text-xs mt-1">Na het invullen wordt u doorverwezen naar de betaalpagina.</p>
              </div>
            )}

            {/* No-show melding */}
            {settings.noShowProtection && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-blue-700 text-sm font-medium"> No-show bescherming actief</p>
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
              {loading ? 'Bezig...': settings.depositRequired && settings.depositAmount > 0 ? `Reserveren & Betalen €${settings.depositAmount.toFixed(2)}`: 'Reservatie Aanvragen'}
            </button>

            <p className="text-center text-gray-400 text-xs">
              Door te reserveren gaat u akkoord met onze voorwaarden.
              {tenantInfo?.phone && `Vragen? ${tenantInfo.phone}`}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
