'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import KassaReservationsView from '@/components/KassaReservationsView'
import { useTenantModuleFlags } from '@/lib/use-tenant-modules'

interface KassaTable {
  id: string
  number: string
  seats: number
  status: string
}

export default function ReserveringenPage({ params }: { params: { tenant: string } }) {
  const router = useRouter()
  const { moduleAccess, loading: modulesLoading } = useTenantModuleFlags(params.tenant)
  const [kassaTables, setKassaTables] = useState<KassaTable[]>([])

  useEffect(() => {
    const raw = localStorage.getItem(`vysion_tables_${params.tenant}`)
    if (raw) {
      try {
        setKassaTables(JSON.parse(raw))
      } catch {
        /* leeg */
      }
    }
  }, [params.tenant])

  if (modulesLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      </div>
    )
  }

  const kassaOn = !!moduleAccess['kassa']

  return (
    <KassaReservationsView
      tenant={params.tenant}
      kassaTables={kassaTables}
      presentation="adminPage"
      closeButtonLabel={kassaOn ? undefined : 'Overzicht'}
      allowKassaHandoff={kassaOn}
      onClose={() => {
        if (kassaOn) {
          router.push(`/shop/${params.tenant}/admin/kassa`)
        } else {
          router.push(`/shop/${params.tenant}/admin`)
        }
      }}
      onStartOrder={(tableNr) => {
        router.push(`/shop/${params.tenant}/admin/kassa?tafel=${encodeURIComponent(tableNr)}`)
      }}
    />
  )
}
