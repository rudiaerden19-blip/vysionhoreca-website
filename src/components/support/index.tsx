'use client'

/**
 * Support Session Components
 * 
 * Realtime co-browsing systeem voor support.
 * Support kan klikken/typen en de tenant ziet het live.
 */

export { SupportSessionProvider, useSupportSession, useSupportSessionSafe } from './SupportSessionProvider'
export { SupportBanner } from './SupportBanner'
export { SupportControls } from './SupportControls'
export { ActionBroadcaster } from './ActionBroadcaster'
export { ActionReceiver } from './ActionReceiver'

import { SupportSessionProvider } from './SupportSessionProvider'
import { SupportBanner } from './SupportBanner'
import { SupportControls } from './SupportControls'
import { ActionBroadcaster } from './ActionBroadcaster'
import { ActionReceiver } from './ActionReceiver'

interface Props {
  children: React.ReactNode
  tenantSlug: string
  showControls?: boolean // Alleen tonen voor superadmin
}

/**
 * Wrapper component die alles combineert.
 * Voeg dit toe rond de admin content.
 */
export function SupportSessionWrapper({ children, tenantSlug, showControls = false }: Props) {
  return (
    <SupportSessionProvider tenantSlug={tenantSlug}>
      {/* Banner voor tenant om te zien dat support meekijkt */}
      <SupportBanner />
      
      {/* Broadcast acties als ik support ben */}
      <ActionBroadcaster />
      
      {/* Ontvang en voer acties uit als ik tenant ben */}
      <ActionReceiver />
      
      {/* Controls om sessie te starten (alleen voor support/superadmin) */}
      {showControls && <SupportControls />}
      
      {children}
    </SupportSessionProvider>
  )
}
