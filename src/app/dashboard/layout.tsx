'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useLanguage } from '@/i18n'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

interface Tenant {
  id: string
  name: string
  email: string
  business_id: string
}

interface User {
  id: string
  email: string
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useLanguage()
  const menuTrans = (key: string) => t(`dashboard.menu.${key}`)
  const layoutTrans = (key: string) => t(`dashboardLayout.${key}`)

  const navigation = [
    { name: menuTrans('overview'), href: '/dashboard', icon: 'home' },
    { name: menuTrans('orders'), href: '/dashboard/bestellingen', icon: 'orders' },
    { name: menuTrans('customers'), href: '/dashboard/klanten', icon: 'customers' },
    { name: menuTrans('products'), href: '/dashboard/producten', icon: 'products' },
    { name: menuTrans('reports'), href: '/dashboard/rapporten', icon: 'reports' },
    { name: menuTrans('analytics'), href: '/dashboard/analyse', icon: 'analytics' },
    { name: menuTrans('settings'), href: '/dashboard/instellingen', icon: 'settings' },
  ]

  const icons: Record<string, JSX.Element> = {
    home: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
    orders: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>,
    customers: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
    products: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
    reports: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    analytics: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    settings: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  }

  const checkAuth = useCallback(async () => {
    // First check Supabase session
    if (supabase && isSupabaseConfigured()) {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
        })
        
        // Fetch tenant info
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('id, name, email, business_id')
          .eq('email', session.user.email)
          .maybeSingle()
        
        if (tenantData) {
          setTenant(tenantData)
          localStorage.setItem('vysion_tenant', JSON.stringify(tenantData))
        }
        
        setLoading(false)
        return
      }
    }
    
    // Fallback: Check localStorage for tenant (demo mode)
    const stored = localStorage.getItem('vysion_tenant')
    if (stored) {
      try {
        const parsedTenant = JSON.parse(stored)
        setTenant(parsedTenant)
        setUser({ id: parsedTenant.id, email: parsedTenant.email })
        setLoading(false)
        return
      } catch {
        // Invalid JSON, clear and redirect
        localStorage.removeItem('vysion_tenant')
      }
    }
    
    // No valid session, redirect to login
    router.push('/login')
  }, [router])

  useEffect(() => {
    checkAuth()
    
    // Listen for auth state changes
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
          localStorage.removeItem('vysion_tenant')
          localStorage.removeItem('vysion_session')
          router.push('/login')
        } else if (event === 'SIGNED_IN' && session) {
          checkAuth()
        }
      })
      
      return () => subscription?.unsubscribe()
    }
  }, [router, checkAuth])

  const handleSignOut = async () => {
    if (supabase) {
      await supabase.auth.signOut()
    }
    localStorage.removeItem('vysion_tenant')
    localStorage.removeItem('vysion_session')
    router.push('/login')
  }

  // Close sidebar when clicking outside on mobile
  const handleBackdropClick = () => {
    setSidebarOpen(false)
  }

  // Handle escape key to close sidebar
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSidebarOpen(false)
      }
    }
    
    if (sidebarOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [sidebarOpen])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center" role="status" aria-label={layoutTrans('loading')}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto" aria-hidden="true"></div>
          <p className="text-gray-500 mt-4">{layoutTrans('loading')}</p>
        </div>
      </div>
    )
  }

  if (!tenant && !user) {
    return null
  }

  const getInitials = () => {
    if (tenant?.name) {
      return tenant.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase()
    }
    return 'VH'
  }

  const displayName = tenant?.name || user?.email || 'Gebruiker'
  const displayEmail = tenant?.email || user?.email || ''

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={handleBackdropClick}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-dark transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        role="navigation"
        aria-label="Dashboard navigation"
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-700">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold">
                <span className="text-accent">Vysion</span>
                <span className="text-gray-400 font-normal ml-1">horeca</span>
              </span>
            </Link>
            <p className="text-gray-500 text-sm mt-1">Dashboard</p>
          </div>

          {/* Tenant info */}
          <div className="px-6 py-3 bg-accent/10 border-b border-gray-700">
            <p className="text-accent font-medium truncate">{displayName}</p>
            <p className="text-gray-500 text-xs truncate">{displayEmail}</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto" aria-label="Main navigation">
            {navigation.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-accent text-white' 
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {icons[item.icon]}
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-gray-700">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center" aria-hidden="true">
                <span className="text-accent font-semibold">{getInitials()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{displayName}</p>
                <p className="text-gray-500 text-sm truncate">{displayEmail}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white transition-colors mt-2 w-full"
              aria-label={layoutTrans('signOut')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {layoutTrans('signOut')}
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-4 lg:px-8">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-gray-600 hover:text-gray-900"
              aria-label="Open menu"
              aria-expanded={sidebarOpen}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="flex-1 lg:flex-none">
              <h1 className="text-xl font-semibold text-gray-900 lg:hidden">Dashboard</h1>
            </div>

            <div className="flex items-center gap-4">
              <button 
                onClick={() => window.location.reload()}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                aria-label={layoutTrans('refresh')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8" role="main">
          {children}
        </main>
      </div>
    </div>
  )
}
