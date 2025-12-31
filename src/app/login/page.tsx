'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/i18n'

interface Tenant {
  id: string
  name: string
  email: string
  business_id: string
}

export default function LoginPage() {
  const router = useRouter()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedTenant, setSelectedTenant] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [loadingTenants, setLoadingTenants] = useState(true)
  const { t } = useLanguage()

  useEffect(() => {
    fetchTenants()
  }, [])

  async function fetchTenants() {
    if (!supabase) return
    
    const { data } = await supabase
      .from('tenants')
      .select('id, name, email, business_id')
      .order('name')
    
    setTenants(data || [])
    setLoadingTenants(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTenant) return
    
    setIsLoading(true)
    
    // Store selected tenant in localStorage
    const tenant = tenants.find(t => t.id === selectedTenant)
    if (tenant) {
      localStorage.setItem('vysion_tenant', JSON.stringify(tenant))
      router.push('/dashboard')
    }
    
    setIsLoading(false)
  }

  return (
    <main className="min-h-screen bg-dark flex flex-col">
      {/* Header */}
      <header className="p-6">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t('login.backToHome')}
        </Link>
      </header>

      {/* Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-10">
            <Link href="/">
              <span className="text-3xl font-bold">
                <span className="text-accent">Vysion</span>
                <span className="text-gray-400 font-normal ml-1">horeca</span>
              </span>
            </Link>
            <p className="text-gray-400 mt-3">{t('login.selectBusiness')}</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="tenant" className="block text-sm font-medium text-gray-300 mb-2">
                {t('login.chooseBusiness')}
              </label>
              {loadingTenants ? (
                <div className="w-full px-4 py-3 bg-white/10 border border-gray-600 rounded-lg text-gray-400">
                  {t('login.loading')}
                </div>
              ) : (
                <select
                  id="tenant"
                  value={selectedTenant}
                  onChange={(e) => setSelectedTenant(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white/10 border border-gray-600 rounded-lg text-white focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                >
                  <option value="" className="bg-dark">{t('login.selectPlaceholder')}</option>
                  {tenants.map(tenant => (
                    <option key={tenant.id} value={tenant.id} className="bg-dark">
                      {tenant.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !selectedTenant}
              className="w-full bg-accent hover:bg-accent/90 disabled:bg-accent/50 text-white py-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('login.processing')}
                </>
              ) : (
                t('login.toDashboard')
              )}
            </button>
          </form>

          {/* Info */}
          <div className="mt-8 p-4 bg-accent/10 border border-accent/30 rounded-lg">
            <p className="text-accent text-sm">
              💡 <strong>{t('login.demoMode')}</strong> {t('login.demoInfo')}
            </p>
          </div>

          {/* Help Links */}
          <div className="space-y-4 mt-8">
            <Link
              href="/login/troubleshooting"
              className="flex items-center justify-between w-full px-4 py-3 bg-white/5 hover:bg-white/10 border border-gray-700 rounded-lg transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-medium">{t('login.troubleshooting.title')}</p>
                  <p className="text-sm text-gray-400">{t('login.troubleshooting.subtitle')}</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-gray-500 group-hover:text-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="p-6 text-center text-gray-500 text-sm">
        © {new Date().getFullYear()} Vysion Group. {t('login.copyright')}
      </footer>
    </main>
  )
}
