'use client'

import type { ReactNode } from 'react'
import ReportPinGate from '@/components/ReportPinGate'
import {
  isReportsAdminRestPath,
  lagoonStrictReportsPinEnabled,
} from '@/lib/lagoon-reports-pin-gate'

type Props = {
  tenant: string
  adminPath: string
  baseUrl: string
  children: ReactNode
}

/**
 * Rapport-PIN voor **alle** tenants (klassieke PinGate + session unlock).
 * Alleen The Lagoon: strikte PIN per rapportpagina.
 */
export function AdminReportPinShell({ tenant, adminPath, baseUrl, children }: Props) {
  const rest = adminPath.startsWith(baseUrl) ? adminPath.slice(baseUrl.length) : adminPath
  if (!isReportsAdminRestPath(rest)) {
    return <>{children}</>
  }
  const strict = lagoonStrictReportsPinEnabled(tenant)
  return (
    <ReportPinGate key={strict ? adminPath : tenant} tenant={tenant}>
      {children}
    </ReportPinGate>
  )
}
