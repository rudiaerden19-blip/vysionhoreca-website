'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import KassaReservationsView from '@/components/KassaReservationsView'
import { useLanguage } from '@/i18n'
import { useTenantModuleFlags } from '@/lib/use-tenant-modules'
import { supabase } from '@/lib/supabase'
import { adminDb } from '@/lib/admin-db-client'
import type { KassaTable } from '@/components/kassa-reservations/kassa-reservations-model'
import { parseFloorPlanTablesJson, sanitizeFloorPlanTables } from '@/lib/kassa-floor-plan-tables'
import { purgeLegacyKassaLocalStorage } from '@/lib/kassa-pos-state-client'

function ReserveringenPageInner({ tenant }: { tenant: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useLanguage()
  const { moduleAccess, loading: modulesLoading } = useTenantModuleFlags(tenant)
  const [kassaTables, setKassaTables] = useState<KassaTable[]>([])
  const openOnline = searchParams.get('online') === '1'

  useEffect(() => {
    purgeLegacyKassaLocalStorage(tenant)
    const applyPayload = (raw: unknown): KassaTable[] => {
      const parsed = parseFloorPlanTablesJson(raw)
      if (parsed === null) return []
      const fixed = sanitizeFloorPlanTables(parsed)
      return fixed as KassaTable[]
    }

    void (async () => {
      const loadZone = async (plan_zone: 'inside' | 'terrace'): Promise<KassaTable[]> => {
        const adminRes = await adminDb.select<{ data?: unknown } | null>('floor_plan_tables', {
          tenantSlug: tenant,
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
          .eq('tenant_slug', tenant)
          .eq('plan_zone', plan_zone)
          .maybeSingle()
        if (error) return []
        if (data == null) return applyPayload([])
        return applyPayload(data.data)
      }
      const [inside, terrace] = await Promise.all([loadZone('inside'), loadZone('terrace')])
      setKassaTables([...inside, ...terrace])
    })()
  }, [tenant])

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
      tenant={tenant}
      kassaTables={kassaTables}
      presentation="adminPage"
      openOnlineReservationsOnMount={openOnline}
      closeButtonLabel={kassaOn ? undefined : t('reservationKassa.pageTitle')}
      allowKassaHandoff={kassaOn}
      onClose={() => {
        if (kassaOn) {
          router.push(`/shop/${tenant}/admin/kassa`)
        } else {
          router.push(`/shop/${tenant}/admin`)
        }
      }}
      onStartOrder={(tableNr) => {
        router.push(`/shop/${tenant}/admin/kassa?tafel=${encodeURIComponent(tableNr)}`)
      }}
    />
  )
}

export default function ReserveringenPage({ params }: { params: { tenant: string } }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#3C4D6B] border-t-transparent" />
        </div>
      }
    >
      <ReserveringenPageInner tenant={params.tenant} />
    </Suspense>
  )
}
