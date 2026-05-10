'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import KassaReservationsView from '@/components/KassaReservationsView'
import { useTenantModuleFlags } from '@/lib/use-tenant-modules'
import { supabase } from '@/lib/supabase'
import type { KassaTable } from '@/components/kassa-reservations/kassa-reservations-model'
import { sanitizeFloorPlanTables, type FloorPlanTable } from '@/lib/kassa-floor-plan-tables'

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

    void supabase
      .from('floor_plan_tables')
      .select('data')
      .eq('tenant_slug', params.tenant)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) return
        if (data?.data != null && Array.isArray(data.data)) {
          const fixed = sanitizeFloorPlanTables(data.data as FloorPlanTable[])
          setKassaTables(fixed as KassaTable[])
          localStorage.setItem(`vysion_tables_${params.tenant}`, JSON.stringify(fixed))
        }
      })
  }, [params.tenant])

  if (modulesLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#3C4D6B] border-t-transparent" />
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
