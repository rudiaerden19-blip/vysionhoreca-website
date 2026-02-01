'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

// Types voor support acties
export interface SupportAction {
  type: 'click' | 'input' | 'scroll' | 'focus'
  selector: string
  value?: string // Voor input events
  scrollTop?: number // Voor scroll events
  timestamp: number
  supportName: string
}

interface SupportSession {
  id: string
  tenant_slug: string
  support_user_name: string
  status: 'active' | 'ended'
  started_at: string
}

interface SupportSessionContextType {
  // Session state
  activeSession: SupportSession | null
  isSupport: boolean // Ben ik de support persoon?
  isConnected: boolean
  
  // Actions
  startSession: (supportName: string) => Promise<void>
  endSession: () => Promise<void>
  broadcastAction: (action: Omit<SupportAction, 'timestamp' | 'supportName'>) => void
  
  // Voor receivers
  lastAction: SupportAction | null
}

const SupportSessionContext = createContext<SupportSessionContextType | null>(null)

export function useSupportSession() {
  const context = useContext(SupportSessionContext)
  if (!context) {
    throw new Error('useSupportSession must be used within SupportSessionProvider')
  }
  return context
}

// Hook die veilig null returned als er geen provider is
export function useSupportSessionSafe() {
  return useContext(SupportSessionContext)
}

interface Props {
  children: ReactNode
  tenantSlug: string
}

export function SupportSessionProvider({ children, tenantSlug }: Props) {
  const [activeSession, setActiveSession] = useState<SupportSession | null>(null)
  const [isSupport, setIsSupport] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [lastAction, setLastAction] = useState<SupportAction | null>(null)
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)

  // Check voor actieve sessie bij mount
  useEffect(() => {
    if (!supabase) return

    async function checkActiveSession() {
      const { data } = await supabase
        .from('support_sessions')
        .select('*')
        .eq('tenant_slug', tenantSlug)
        .eq('status', 'active')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (data) {
        setActiveSession(data)
      }
    }

    checkActiveSession()
  }, [tenantSlug])

  // Setup Realtime channel
  useEffect(() => {
    if (!supabase || !tenantSlug) return

    const channelName = `support:${tenantSlug}`
    const newChannel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false } // Don't receive own broadcasts
      }
    })

    newChannel
      .on('broadcast', { event: 'action' }, ({ payload }) => {
        // Ontvang actie van support
        setLastAction(payload as SupportAction)
      })
      .on('broadcast', { event: 'session_start' }, ({ payload }) => {
        setActiveSession(payload as SupportSession)
      })
      .on('broadcast', { event: 'session_end' }, () => {
        setActiveSession(null)
        setLastAction(null)
      })
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    setChannel(newChannel)

    return () => {
      newChannel.unsubscribe()
    }
  }, [tenantSlug])

  // Start een support sessie (alleen voor support)
  const startSession = useCallback(async (supportName: string) => {
    if (!supabase || !channel) return

    // Sluit eventuele bestaande sessies
    await supabase
      .from('support_sessions')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('tenant_slug', tenantSlug)
      .eq('status', 'active')

    // Maak nieuwe sessie
    const { data, error } = await supabase
      .from('support_sessions')
      .insert({
        tenant_slug: tenantSlug,
        support_user_name: supportName,
        status: 'active'
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to start support session:', error)
      return
    }

    setActiveSession(data)
    setIsSupport(true)

    // Broadcast naar tenant
    channel.send({
      type: 'broadcast',
      event: 'session_start',
      payload: data
    })
  }, [channel, tenantSlug])

  // Beëindig sessie
  const endSession = useCallback(async () => {
    if (!supabase || !channel || !activeSession) return

    await supabase
      .from('support_sessions')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', activeSession.id)

    // Broadcast naar tenant
    channel.send({
      type: 'broadcast',
      event: 'session_end',
      payload: {}
    })

    setActiveSession(null)
    setIsSupport(false)
  }, [channel, activeSession])

  // Broadcast een actie naar de tenant
  const broadcastAction = useCallback((action: Omit<SupportAction, 'timestamp' | 'supportName'>) => {
    if (!channel || !isSupport || !activeSession) return

    const fullAction: SupportAction = {
      ...action,
      timestamp: Date.now(),
      supportName: activeSession.support_user_name
    }

    channel.send({
      type: 'broadcast',
      event: 'action',
      payload: fullAction
    })
  }, [channel, isSupport, activeSession])

  return (
    <SupportSessionContext.Provider value={{
      activeSession,
      isSupport,
      isConnected,
      startSession,
      endSession,
      broadcastAction,
      lastAction
    }}>
      {children}
    </SupportSessionContext.Provider>
  )
}
