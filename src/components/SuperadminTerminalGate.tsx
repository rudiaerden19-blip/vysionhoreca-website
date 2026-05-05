'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { readTerminalLogout } from '@/lib/session-broadcast'

/**
 * Superadmin volledige uitlog: geen ander superadmin-dashboard tot opnieuw inloggen bij heropenen URL.
 */
export function SuperadminTerminalGate() {
  const pathname = usePathname()

  useEffect(() => {
    const stamp = readTerminalLogout()
    if (!stamp || stamp.kind !== 'superadmin') return
    const p = pathname || ''
    if (p.startsWith('/superadmin/login')) return
    window.location.replace(`${window.location.origin}/superadmin/login`)
  }, [pathname])

  return null
}
