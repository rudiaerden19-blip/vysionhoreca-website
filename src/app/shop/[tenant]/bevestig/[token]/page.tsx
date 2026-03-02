'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

interface Reservation {
  id: string
  customer_name: string
  party_size: number
  reservation_date: string
  time_from: string | null
  time_to: string | null
  reservation_time: string
  notes: string | null
  confirmed_by_customer: boolean
  status: string
}

export default function BevestigPage() {
  const params = useParams()
  const token = params.token as string
  const tenantSlug = params.tenant as string

  const [reservation, setReservation] = useState<Reservation | null>(null)
  const [businessName, setBusinessName] = useState('')
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [alreadyConfirmed, setAlreadyConfirmed] = useState(false)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    // Laad reservatiedetails via server-side API (omzeilt RLS)
    fetch(`/api/confirm-reservation?token=${token}&tenant=${tenantSlug}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setNotFound(true); return }
        setReservation(data.reservation)
        setBusinessName(data.businessName)
        if (data.reservation.confirmed_by_customer) setAlreadyConfirmed(true)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [token, tenantSlug])

  async function bevestig() {
    if (!reservation) return
    setConfirming(true)
    try {
      const res = await fetch('/api/confirm-reservation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (res.ok) setConfirmed(true)
    } catch (e) {
      console.error('Bevestiging mislukt:', e)
    }
    setConfirming(false)
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr + 'T12:00').toLocaleDateString('nl-BE', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center">
        <span className="text-6xl block mb-4">❓</span>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Niet gevonden</h1>
        <p className="text-gray-500">Deze reservatielink is ongeldig of vervallen.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full">

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <span className="text-3xl">🍽️</span>
          </div>
          <h2 className="text-lg font-bold text-gray-500">{businessName}</h2>
        </div>

        <div className="bg-gray-50 rounded-2xl p-5 mb-6">
          <h3 className="font-bold text-gray-900 text-lg mb-4">Uw reservatie</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-xl">👤</span>
              <div>
                <p className="text-xs text-gray-400">Naam</p>
                <p className="font-bold text-gray-900">{reservation!.customer_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xl">📅</span>
              <div>
                <p className="text-xs text-gray-400">Datum</p>
                <p className="font-bold text-gray-900">{formatDate(reservation!.reservation_date)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xl">🕐</span>
              <div>
                <p className="text-xs text-gray-400">Uur</p>
                <p className="font-bold text-gray-900">
                  {reservation!.time_from || reservation!.reservation_time}
                  {reservation!.time_to ? ` → ${reservation!.time_to}` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xl">👥</span>
              <div>
                <p className="text-xs text-gray-400">Personen</p>
                <p className="font-bold text-gray-900">
                  {reservation!.party_size} {reservation!.party_size === 1 ? 'persoon' : 'personen'}
                </p>
              </div>
            </div>
            {reservation!.notes && (
              <div className="flex items-start gap-3">
                <span className="text-xl">📝</span>
                <div>
                  <p className="text-xs text-gray-400">Notitie</p>
                  <p className="text-gray-700 text-sm">{reservation!.notes}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {confirmed || alreadyConfirmed ? (
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">✅</span>
            </div>
            <h2 className="text-2xl font-black text-green-700 mb-2">Bevestigd!</h2>
            <p className="text-gray-500 text-sm">
              {alreadyConfirmed && !confirmed
                ? 'U had deze reservatie al eerder bevestigd.'
                : 'Bedankt! Het restaurant heeft uw bevestiging ontvangen.'}
            </p>
          </div>
        ) : (
          <div>
            <button
              onClick={bevestig}
              disabled={confirming}
              className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-black text-lg rounded-2xl transition-colors shadow-lg disabled:opacity-60"
            >
              {confirming ? '⏳ Bezig...' : '✅ Ik bevestig mijn reservatie'}
            </button>
            <p className="text-center text-xs text-gray-400 mt-3">
              Kan u niet komen? Bel het restaurant dan zo snel mogelijk.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
