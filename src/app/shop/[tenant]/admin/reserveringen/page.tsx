'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import KassaReservationsView from '@/components/KassaReservationsView'
import { useTenantModuleFlags } from '@/lib/use-tenant-modules'
import { supabase } from '@/lib/supabase'
import { adminDb } from '@/lib/admin-db-client'
import type { KassaTable } from '@/components/kassa-reservations/kassa-reservations-model'
import { parseFloorPlanTablesJson, sanitizeFloorPlanTables } from '@/lib/kassa-floor-plan-tables'

export default function ReserveringenPage({ params }: { params: { tenant: string } }) {
  const router = useRouter()
  const { moduleAccess, loading: modulesLoading } = useTenantModuleFlags(params.tenant)
  const [kassaTables, setKassaTables] = useState<KassaTable[]>([])

  useEffect(() => {
    const applyPayload = (raw: unknown) => {
      const parsed = parseFloorPlanTablesJson(raw)
      if (parsed === null) return false
      const fixed = sanitizeFloorPlanTables(parsed)
      setKassaTables(fixed as KassaTable[])
      localStorage.setItem(`vysion_tables_${params.tenant}`, JSON.stringify(fixed))
      return true
    }

    const raw = localStorage.getItem(`vysion_tables_${params.tenant}`)
    if (raw) {
      try {
        setKassaTables(JSON.parse(raw))
      } catch {
        /* leeg */
      }
    }

    void (async () => {
      const adminRes = await adminDb.select<{ data?: unknown } | null>('floor_plan_tables', {
        tenantSlug: params.tenant,
        select: 'data',
        single: 'maybe',
      })
      let merged = false
      if (adminRes.ok) {
        const row = adminRes.data as { data?: unknown } | null | undefined
        if (row == null) merged = applyPayload([])
        else merged = applyPayload(row.data)
      }
      if (!merged) {
        const { data, error } = await supabase
          .from('floor_plan_tables')
          .select('data')
          .eq('tenant_slug', params.tenant)
          .maybeSingle()
        if (!error) {
          if (data == null) applyPayload([])
          else applyPayload(data.data)
        }
      }
    })()
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
