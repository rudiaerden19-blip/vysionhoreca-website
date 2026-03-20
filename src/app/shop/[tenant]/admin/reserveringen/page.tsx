'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import KassaReservationsView from '@/components/KassaReservationsView'

interface KassaTable {
  id: string
  number: string
  seats: number
  status: string
}

export default function ReserveringenPage({ params }: { params: { tenant: string } }) {
  const router = useRouter()
  const [kassaTables, setKassaTables] = useState<KassaTable[]>([])

  useEffect(() => {
    const raw = localStorage.getItem(`vysion_tables_${params.tenant}`)
    if (raw) {
      try { setKassaTables(JSON.parse(raw)) } catch { /* leeg */ }
    }
  }, [params.tenant])

  return (
    <KassaReservationsView
      tenant={params.tenant}
      kassaTables={kassaTables}
      onClose={() => router.push(`/shop/${params.tenant}/admin/kassa`)}
      onStartOrder={(tableNr) => {
        router.push(`/shop/${params.tenant}/admin/kassa?tafel=${tableNr}`)
      }}
    />
  )
}
