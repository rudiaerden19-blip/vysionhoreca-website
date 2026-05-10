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
    const applyPayload = (raw: unknown): KassaTable[] => {
      const parsed = parseFloorPlanTablesJson(raw)
      if (parsed === null) return []
      const fixed = sanitizeFloorPlanTables(parsed)
      return fixed as KassaTable[]
    }

    try {
      const rawInside = localStorage.getItem(`vysion_tables_${params.tenant}`)
      const rawTerrace = localStorage.getItem(`vysion_tables_terrace_${params.tenant}`)
      const mergedLs: KassaTable[] = []
      if (rawInside) {
        try {
          mergedLs.push(...(JSON.parse(rawInside) as KassaTable[]))
        } catch {
          /* empty */
        }
      }
      if (rawTerrace) {
        try {
          mergedLs.push(...(JSON.parse(rawTerrace) as KassaTable[]))
        } catch {
          /* empty */
        }
      }
      if (mergedLs.length) setKassaTables(mergedLs)
    } catch {
      /* empty */
    }

    void (async () => {
      const loadZone = async (plan_zone: 'inside' | 'terrace'): Promise<KassaTable[]> => {
        const adminRes = await adminDb.select<{ data?: unknown } | null>('floor_plan_tables', {
          tenantSlug: params.tenant,
          select: 'data',
          match: { plan_zone },
          single: 'maybe',
        })
        if (adminRes.ok) {
          const row = adminRes.data as { data?: unknown } | null | undefined
          if (row == null) return applyPayload([])
          return applyPayload(row.data)
        }
        const { data, error } = await supabase
          .from('floor_plan_tables')
          .select('data')
          .eq('tenant_slug', params.tenant)
          .eq('plan_zone', plan_zone)
          .maybeSingle()
        if (error) return []
        if (data == null) return applyPayload([])
        return applyPayload(data.data)
      }
      const [inside, terrace] = await Promise.all([loadZone('inside'), loadZone('terrace')])
      setKassaTables([...inside, ...terrace])
      try {
        localStorage.setItem(`vysion_tables_${params.tenant}`, JSON.stringify(inside))
        localStorage.setItem(`vysion_tables_terrace_${params.tenant}`, JSON.stringify(terrace))
      } catch {
        /* empty */
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
