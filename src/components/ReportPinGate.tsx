'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import PinGate from '@/components/PinGate'
import { lagoonStrictReportsPinEnabled } from '@/lib/lagoon-reports-pin-gate'

type Props = {
  tenant: string
  children: ReactNode
  kassaNameAccountV2?: boolean
}

/** Rapporten / omzet — op Lagoon striktere eigenaar-PIN dan standaard PinGate. */
export default function ReportPinGate({ tenant, children, kassaNameAccountV2 = false }: Props) {
  const pathname = usePathname()
  const strictReportsPin = lagoonStrictReportsPinEnabled(tenant, { kassaNameAccountV2 })
  /** Lagoon: elke rapport-URL opnieuw PIN (ook na kassa → rapport). */
  const remountKey = strictReportsPin ? pathname : tenant
  return (
    <PinGate key={remountKey} tenant={tenant} strictReportsPin={strictReportsPin}>
      {children}
    </PinGate>
  )
}
