'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useLanguage } from '@/i18n'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const { t } = useLanguage()

  // Check if already logged in
  useEffect(() => {
    if (!supabase) return
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push('/dashboard')
      }
    })
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!email || !password) {
      setError(t('login.errors.fillAllFields'))
      return
    }

    if (!supabase) {
      setError(t('login.errors.serviceUnavailable'))
      return
    }
    
    setIsLoading(true)
    
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          setError(t('login.errors.invalidCredentials'))
        } else if (authError.message.includes('Email not confirmed')) {
          setError(t('login.errors.emailNotConfirmed'))
        } else {
          setError(authError.message)
        }
        return
      }
      
      if (data.session) {
        // Store session info
        localStorage.setItem('vysion_session', JSON.stringify({
          user: data.user,
          accessToken: data.session.access_token,
        }))
        
        // Fetch tenant info
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('id, name, email, business_id')
          .eq('email', email)
          .maybeSingle()
        
        if (tenantData) {
          localStorage.setItem('vysion_tenant', JSON.stringify(tenantData))
        }
        
        router.push('/dashboard')
      }
    } catch (err) {
      setError(t('login.errors.unexpected'))
      console.error('Login error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!email) {
      setError(t('login.errors.enterEmailFirst'))
      return
    }
    
    if (!supabase) {
      setError(t('login.errors.serviceUnavailable'))
      return
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login/reset-password`,
      })
      
      if (resetError) {
        setError(resetError.message)
      } else {
        setError(null)
        alert(t('login.passwordResetSent'))
      }
    } catch (err) {
      setError(t('login.errors.unexpected'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-dark flex flex-col">
      {/* Header */}
      <header className="p-6">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          aria-label={t('login.backToHome')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
            <Link href="/" aria-label="Vysion Horeca Home">
              <span className="text-3xl font-bold">
                <span className="text-accent">Vysion</span>
                <span className="text-gray-400 font-normal ml-1">horeca</span>
              </span>
            </Link>
            <p className="text-gray-400 mt-3">{t('login.title')}</p>
          </div>

          {/* Error Message */}
          {error && (
            <div 
              className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm"
              role="alert"
              aria-live="polite"
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            </div>
          )}

          {/* Supabase not configured warning */}
          {!isSupabaseConfigured() && (
            <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {t('login.errors.configurationMissing')}
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                {t('login.email')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                aria-describedby={error ? "error-message" : undefined}
                className="w-full px-4 py-3 bg-white/10 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                placeholder={t('login.emailPlaceholder')}
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                {t('login.password')}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-3 pr-12 bg-white/10 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                  placeholder={t('login.passwordPlaceholder')}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-gray-600 bg-white/10 text-accent focus:ring-accent/20"
                />
                <span className="text-sm text-gray-400">{t('login.rememberMe')}</span>
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm text-accent hover:text-accent/80 transition-colors"
                disabled={isLoading}
              >
                {t('login.forgotPassword')}
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading || !isSupabaseConfigured()}
              className="w-full bg-accent hover:bg-accent/90 disabled:bg-accent/50 disabled:cursor-not-allowed text-white py-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('login.processing')}
                </>
              ) : (
                t('login.submit')
              )}
            </button>
          </form>

          {/* Help Links */}
          <div className="space-y-4 mt-8">
            <Link
              href="/login/troubleshooting"
              className="flex items-center justify-between w-full px-4 py-3 bg-white/5 hover:bg-white/10 border border-gray-700 rounded-lg transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-medium">{t('login.troubleshooting.title')}</p>
                  <p className="text-sm text-gray-400">{t('login.troubleshooting.subtitle')}</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-gray-500 group-hover:text-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* Register Link */}
          <p className="text-center text-gray-400 mt-8">
            {t('login.noAccount')}{' '}
            <a href="/#contact" className="text-accent hover:text-accent/80 transition-colors">
              {t('login.contactUs')}
            </a>
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="p-6 text-center text-gray-500 text-sm">
        © {new Date().getFullYear()} Vysion Group. {t('login.copyright')}
      </footer>
    </main>
  )
}
