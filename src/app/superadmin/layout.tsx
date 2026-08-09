import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { SuperadminTerminalGate } from '@/components/SuperadminTerminalGate'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

/** Geen statische edge-cache voor superadmin — altijd nieuwste tenant-UI na deploy. */
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SuperadminTerminalGate />
      {children}
    </>
  )
}
