'use client'

import React, { useState, useEffect, Component, ReactNode, ErrorInfo } from 'react'

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

// Error boundary om crashes te voorkomen
class SupportErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Support feature error (silently ignored):', error, errorInfo)
  }

  render() {
    // Bij error, render gewoon niks van de support features
    if (this.state.hasError) {
      return null
    }
    return this.props.children
  }
}

interface Props {
  children: React.ReactNode
  tenantSlug: string
  showControls?: boolean // Alleen tonen voor superadmin
}

/**
 * Wrapper component die alles combineert.
 * KRITIEK: Als er iets misgaat, renderen we gewoon alleen children.
 */
export function SupportSessionWrapper({ children, tenantSlug, showControls = false }: Props) {
  const [mounted, setMounted] = useState(false)

  // Alleen mounten op client-side om hydration errors te voorkomen
  useEffect(() => {
    setMounted(true)
  }, [])

  // Server-side of nog niet gemount: alleen children
  if (!mounted) {
    return <>{children}</>
  }

  return (
    <>
      {/* Children ALTIJD eerst - nooit blokkeren */}
      {children}
      
      {/* Support features in error boundary - als het crasht, werkt de app gewoon door */}
      <SupportErrorBoundary>
        <SupportSessionProvider tenantSlug={tenantSlug}>
          <SupportBanner />
          <ActionBroadcaster />
          <ActionReceiver />
          {showControls && <SupportControls />}
        </SupportSessionProvider>
      </SupportErrorBoundary>
    </>
  )
}
