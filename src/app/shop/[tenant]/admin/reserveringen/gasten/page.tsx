'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface GuestRecord {
  phone: string
  name: string
  email?: string
  totalReservations: number
  completedVisits: number
  noShows: number
  cancelledCount: number
  totalPersons: number
  firstVisit: string
  lastVisit: string
  notes?: string
}

export default function GastenCRMPage({ params }: { params: { tenant: string } }) {
  const [guests, setGuests] = useState<GuestRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'visits' | 'name' | 'noshow' | 'recent'>('recent')

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('reservations')
      .select('customer_name, customer_phone, customer_email, status, reservation_date, party_size')
      .eq('tenant_slug', params.tenant)
      .order('reservation_date', { ascending: false })

    if (!data) { setLoading(false); return }

    // Groepeer per telefoonnummer
    const guestMap: Record<string, GuestRecord> = {}

    for (const r of data) {
      const key = r.customer_phone
      if (!guestMap[key]) {
        guestMap[key] = {
          phone: r.customer_phone,
          name: r.customer_name,
          email: r.customer_email,
          totalReservations: 0,
          completedVisits: 0,
          noShows: 0,
          cancelledCount: 0,
          totalPersons: 0,
          firstVisit: r.reservation_date,
          lastVisit: r.reservation_date,
        }
      }

      const g = guestMap[key]
      g.totalReservations++
      g.totalPersons += r.party_size || 0
      if (r.status === 'completed') g.completedVisits++
      if (r.status === 'no_show') g.noShows++
      if (r.status === 'cancelled') g.cancelledCount++
      if (r.reservation_date < g.firstVisit) g.firstVisit = r.reservation_date
      if (r.reservation_date > g.lastVisit) {
        g.lastVisit = r.reservation_date
        g.name = r.customer_name
        g.email = r.customer_email
      }
    }

    setGuests(Object.values(guestMap))
    setLoading(false)
  }, [params.tenant])

  useEffect(() => { load() }, [load])

  const filtered = guests
    .filter(g =>
      search === '' ||
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.phone.includes(search) ||
      (g.email || '').toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'visits') return b.completedVisits - a.completedVisits
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'noshow') return b.noShows - a.noShows
      return b.lastVisit.localeCompare(a.lastVisit)
    })

  const totalGuests = guests.length
  const regularGuests = guests.filter(g => g.completedVisits >= 3).length
  const noShowGuests = guests.filter(g => g.noShows >= 2).length

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/shop/${params.tenant}/admin/reserveringen`} className="text-gray-400 hover:text-gray-600">
          ← Reserveringen
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">👤 Gasten CRM</h1>
          <p className="text-gray-500 text-sm">Overzicht van al je gasten en hun reservatiehistoriek</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm text-center">
          <p className="text-4xl font-black text-blue-600">{totalGuests}</p>
          <p className="text-sm text-gray-500 mt-1">Totaal gasten</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm text-center">
          <p className="text-4xl font-black text-green-500">{regularGuests}</p>
          <p className="text-sm text-gray-500 mt-1">Vaste gasten (3+)</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm text-center">
          <p className="text-4xl font-black text-purple-500">{noShowGuests}</p>
          <p className="text-sm text-gray-500 mt-1">Problematisch (2+ no-shows)</p>
        </div>
      </div>

      {/* Zoek + Sort */}
      <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="🔍 Zoek op naam, telefoon of e-mail..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500"
        />
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {([
            { key: 'recent', label: 'Recentst' },
            { key: 'visits', label: 'Meeste bezoeken' },
            { key: 'noshow', label: 'No-shows' },
            { key: 'name', label: 'Naam' },
          ] as const).map(s => (
            <button
              key={s.key}
              onClick={() => setSortBy(s.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${sortBy === s.key ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Gastenlijst */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
            <span className="text-5xl block mb-3">👤</span>
            <p className="text-gray-500">{search ? 'Geen gasten gevonden' : 'Nog geen gasten'}</p>
          </div>
        ) : (
          filtered.map(guest => {
            const hasNoShows = guest.noShows > 0
            const isBlocked = guest.noShows >= 3
            const isRegular = guest.completedVisits >= 3

            return (
              <div
                key={guest.phone}
                className={`bg-white rounded-2xl p-5 shadow-sm border-l-4 ${
                  isBlocked ? 'border-red-400' :
                  hasNoShows ? 'border-orange-400' :
                  isRegular ? 'border-green-400' :
                  'border-transparent'
                }`}
              >
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-gray-900">{guest.name}</h3>
                      {isRegular && !hasNoShows && (
                        <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">⭐ Vaste gast</span>
                      )}
                      {isBlocked && (
                        <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">🚫 Problematisch</span>
                      )}
                      {!isBlocked && hasNoShows && (
                        <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">⚠️ {guest.noShows}x no-show</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">📞 {guest.phone}</p>
                    {guest.email && <p className="text-sm text-gray-500">✉️ {guest.email}</p>}
                    <p className="text-xs text-gray-400 mt-1">
                      Eerste bezoek: {new Date(guest.firstVisit + 'T12:00').toLocaleDateString('nl-BE')} •
                      Laatste: {new Date(guest.lastVisit + 'T12:00').toLocaleDateString('nl-BE')}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="flex gap-4 text-center">
                    <div>
                      <p className="text-2xl font-black text-blue-600">{guest.totalReservations}</p>
                      <p className="text-xs text-gray-400">Reservaties</p>
                    </div>
                    <div>
                      <p className="text-2xl font-black text-green-500">{guest.completedVisits}</p>
                      <p className="text-xs text-gray-400">Bezoeken</p>
                    </div>
                    {guest.noShows > 0 && (
                      <div>
                        <p className="text-2xl font-black text-purple-500">{guest.noShows}</p>
                        <p className="text-xs text-gray-400">No-shows</p>
                      </div>
                    )}
                    <div>
                      <p className="text-2xl font-black text-gray-500">{guest.totalPersons}</p>
                      <p className="text-xs text-gray-400">Personen</p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {filtered.length > 0 && (
        <p className="text-center text-sm text-gray-400 pb-8">{filtered.length} gasten</p>
      )}
    </div>
  )
}
