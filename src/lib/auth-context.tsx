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
    if (!supabase) {
      console.error('Supabase client not initialized')
      setLoading(false)
      return
    }

    let isMounted = true

    // Safety timeout - never load forever
    const timeout = setTimeout(() => {
      if (isMounted && loading) {
        console.log('Auth timeout - stopping loading')
        setLoading(false)
      }
    }, 5000)

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return
      console.log('Initial session:', session ? 'found' : 'none')
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchTenant(session.user.email)
      } else {
        setLoading(false)
      }
    }).catch(err => {
      if (!isMounted) return
      console.error('Error getting session:', err)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!isMounted) return
        console.log('Auth state changed:', _event)
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchTenant(session.user.email)
        } else {
          setTenant(null)
          setBusinessId(null)
          setLoading(false)
        }
      }
    )

    return () => {
      isMounted = false
      clearTimeout(timeout)
      subscription?.unsubscribe()
    }
  }, [])

  async function fetchTenant(email: string | undefined) {
    console.log('Fetching tenant for email:', email)
    
    if (!email || !supabase) {
      console.log('No email or supabase client')
      setLoading(false)
      return
    }

    try {
      // Try to find tenant by email
      const { data: tenantData, error } = await supabase
        .from('tenants')
        .select('id, business_id, name, slug, plan, logo_url')
        .eq('email', email)
        .maybeSingle()

      console.log('Tenant lookup result:', { tenantData, error })

      if (tenantData) {
        setTenant(tenantData)
        setBusinessId(tenantData.business_id)
        console.log('Tenant found, business_id:', tenantData.business_id)
      } else {
        console.log('No tenant found for this email')
        // Even if no tenant found, we still let them access the dashboard
        // They'll just see empty data
        setTenant(null)
        setBusinessId(null)
      }
    } catch (error) {
      console.error('Error fetching tenant:', error)
    } finally {
      setLoading(false)
    }
  }

  async function signIn(email: string, password: string) {
    if (!supabase) {
      return { error: new Error('Supabase not initialized') }
    }
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  async function signOut() {
    if (supabase) {
      await supabase.auth.signOut()
    }
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
