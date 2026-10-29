'use client'

import type { ReactNode } from 'react'
import PinGate from '@/components/PinGate'
import { lagoonStrictReportsPinEnabled } from '@/lib/lagoon-reports-pin-gate'

type Props = {
  tenant: string
  children: ReactNode
}

/** Rapporten / omzet — op Lagoon striktere eigenaar-PIN dan standaard PinGate. */
export default function ReportPinGate({ tenant, children }: Props) {
  const strictReportsPin = lagoonStrictReportsPinEnabled(tenant)
  return (
    <PinGate tenant={tenant} strictReportsPin={strictReportsPin}>
      {children}
    </PinGate>
  )
}
