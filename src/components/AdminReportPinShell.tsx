'use client'

import type { ReactNode } from 'react'
import ReportPinGate from '@/components/ReportPinGate'
import {
  isLagoonStrictReportsAdminRestPath,
  lagoonStrictReportsPinEnabled,
} from '@/lib/lagoon-reports-pin-gate'

type Props = {
  tenant: string
  adminPath: string
  baseUrl: string
  kassaNameAccountV2?: boolean
  children: ReactNode
}

/** Eén PinGate-laag voor alle rapportroutes (Lagoon-pilot). */
export function AdminReportPinShell({
  tenant,
  adminPath,
  baseUrl,
  kassaNameAccountV2 = false,
  children,
}: Props) {
  const rest = adminPath.startsWith(baseUrl) ? adminPath.slice(baseUrl.length) : adminPath
  if (!isLagoonStrictReportsAdminRestPath(rest)) {
    return <>{children}</>
  }
  if (!lagoonStrictReportsPinEnabled(tenant, { kassaNameAccountV2 })) {
    return <>{children}</>
  }
  return (
    <ReportPinGate key={adminPath} tenant={tenant} kassaNameAccountV2={kassaNameAccountV2}>
      {children}
    </ReportPinGate>
  )
}
