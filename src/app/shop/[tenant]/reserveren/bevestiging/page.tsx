'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CheckCircle2, CalendarDays } from 'lucide-react'

export default function ReservationBevestigingPage({ params }: { params: { tenant: string } }) {
  const searchParams = useSearchParams()
  const reservationId = searchParams.get('reservation_id')
  const sessionId = searchParams.get('session_id')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (reservationId && sessionId) {
      // Markeer reservatie als betaald
      supabase.from('reservations').update({
        payment_status: 'deposit_paid',
        stripe_session_id: sessionId,
        status: 'CONFIRMED',
      }).eq('id', reservationId).then(() => setDone(true))
    } else {
      setDone(true)
    }
  }, [reservationId, sessionId])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md bg-white rounded-2xl p-8 shadow-lg">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={40} className="text-green-500" />
        </div>
        <h2 className="text-2xl font-bold mb-3">Betaling Geslaagd!</h2>
        <p className="text-gray-500 mb-4">
          Uw borg is betaald en uw reservatie is bevestigd. Tot dan!
        </p>
        <a
          href={`/shop/${params.tenant}/reserveren`}
          className="inline-block px-6 py-3 rounded-xl bg-green-500 text-white font-medium hover:bg-green-600 transition-colors"
        >
          <CalendarDays size={16} className="inline mr-2" />
          Nieuwe reservatie
        </a>
      </div>
    </div>
  )
}
