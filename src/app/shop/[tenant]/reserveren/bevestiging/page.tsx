'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CalendarDays } from 'lucide-react'

export default function ReservationBevestigingPage({ params }: { params: { tenant: string } }) {
  const searchParams = useSearchParams()
  const reservationId = searchParams.get('reservation_id')
  const sessionId = searchParams.get('session_id')
  const [done, setDone] = useState(false)
  const [primaryColor, setPrimaryColor] = useState('#22c55e')
  const [businessName, setBusinessName] = useState('')

  useEffect(() => {
    // Laad tenant kleuren
    supabase.from('tenants').select('primary_color,name').eq('slug', params.tenant).single()
      .then(({ data }) => {
        if (data?.primary_color) setPrimaryColor(data.primary_color)
        if (data?.name) setBusinessName(data.name)
      })

    if (reservationId && sessionId) {
      supabase.from('reservations').update({
        payment_status: 'deposit_paid',
        stripe_session_id: sessionId,
        status: 'CONFIRMED',
      }).eq('id', reservationId).then(() => setDone(true))
    } else {
      setDone(true)
    }
  }, [reservationId, sessionId, params.tenant])

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: `${primaryColor}15` }}>
      <div className="text-center max-w-md w-full bg-white rounded-3xl p-8 shadow-xl">
        {/* Checkmark cirkel */}
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 text-white text-5xl shadow-lg"
          style={{ backgroundColor: primaryColor }}
        >
          ✓
        </div>

        <h2 className="text-2xl font-bold mb-2">Betaling Geslaagd!</h2>
        {businessName && (
          <p className="font-semibold mb-1" style={{ color: primaryColor }}>{businessName}</p>
        )}
        <p className="text-gray-500 mb-6">
          Uw borg is betaald en uw reservatie is <strong>bevestigd</strong>. We kijken ernaar uit!
        </p>

        {/* Bevestigingskaart */}
        <div className="rounded-2xl p-4 mb-6 text-sm text-left" style={{ backgroundColor: `${primaryColor}15` }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">✅</span>
            <span className="font-medium text-gray-700">Borg betaald</span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">📧</span>
            <span className="text-gray-600">Bevestiging verstuurd per email</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">📅</span>
            <span className="text-gray-600">Reservatie staat genoteerd</span>
          </div>
        </div>

        <div className="space-y-3">
          <a
            href={`/shop/${params.tenant}/reserveren`}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-white font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: primaryColor }}
          >
            <CalendarDays size={18} />
            Nieuwe reservatie
          </a>
          <a
            href={`/shop/${params.tenant}`}
            className="block w-full py-3 rounded-2xl bg-gray-100 text-gray-600 font-medium hover:bg-gray-200 transition-colors"
          >
            ← Terug naar {businessName || 'de zaak'}
          </a>
        </div>
      </div>
    </div>
  )
}
