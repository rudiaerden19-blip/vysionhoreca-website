'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

interface Tenant {
  id: string
  business_id: string
  name: string
  slug: string
  plan: string
  logo_url?: string
}

interface AuthContextType {
  user: User | null
  session: Session | null
  tenant: Tenant | null
  businessId: string | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase?.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchTenant(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase?.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchTenant(session.user.id)
        } else {
          setTenant(null)
          setBusinessId(null)
          setLoading(false)
        }
      }
    ) ?? { data: { subscription: null } }

    return () => subscription?.unsubscribe()
  }, [])

  async function fetchTenant(userId: string) {
    try {
      // First try to get tenant by user email
      const { data: userData } = await supabase?.auth.getUser() ?? { data: null }
      const email = userData?.user?.email

      if (email) {
        // Try to find tenant by email
        const { data: tenantData, error } = await supabase
          ?.from('tenants')
          .select('id, business_id, name, slug, plan, logo_url')
          .eq('email', email)
          .single() ?? { data: null, error: null }

        if (tenantData && !error) {
          setTenant(tenantData)
          setBusinessId(tenantData.business_id)
        }
      }
    } catch (error) {
      console.error('Error fetching tenant:', error)
    } finally {
      setLoading(false)
    }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase?.auth.signInWithPassword({
      email,
      password,
    }) ?? { error: new Error('Supabase not initialized') }
    return { error }
  }

  async function signOut() {
    await supabase?.auth.signOut()
    setUser(null)
    setSession(null)
    setTenant(null)
    setBusinessId(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      session,
      tenant,
      businessId,
      loading,
      signIn,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
