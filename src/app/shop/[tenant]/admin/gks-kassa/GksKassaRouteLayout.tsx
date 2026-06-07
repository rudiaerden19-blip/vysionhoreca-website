'use client'

import type { ReactNode } from 'react'
import { GksPilotLayoutGate } from '@/lib/gks-kassa/gks-pilot-layout-gate'

export function GksKassaRouteLayout({
  tenant,
  children,
}: {
  tenant: string
  children: ReactNode
}) {
  return <GksPilotLayoutGate tenantSlug={tenant}>{children}</GksPilotLayoutGate>
}
