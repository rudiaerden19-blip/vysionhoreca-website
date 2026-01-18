'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useLanguage, Locale } from '@/i18n'

export default function LoginPage() {
  const router = useRouter()
  const { t, locale, setLocale, locales, localeNames, localeFlags } = useLanguage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmailSent, setResetEmailSent] = useState(false)
  const [isLangOpen, setIsLangOpen] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)

  // Read language from URL parameter on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const langParam = params.get('lang') as Locale | null
    if (langParam && locales.includes(langParam)) {
      setLocale(langParam)
    }
  }, [setLocale, locales])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setIsLangOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLanguageSelect = (langCode: Locale) => {
    setLocale(langCode)
    setIsLangOpen(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    
    setIsLoading(true)
    setError('')
    
    try {
      // Server-side API call voor robuuste login
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || t('login.loginFailed'))
        setIsLoading(false)
        return
      }

      const tenant = data.tenant

      // Store tenant in localStorage
      localStorage.setItem('vysion_tenant', JSON.stringify(tenant))
      
      // ALTIJD naar tenant dashboard via subdomain - geen fallback!
      if (!tenant.tenant_slug) {
        setError('Geen tenant gevonden. Neem contact op met support.')
        setIsLoading(false)
        return
      }
      
      // Redirect to subdomain if not on localhost/main domain
      const isLocalhost = typeof window !== 'undefined' && 
        (window.location.hostname.includes('localhost') || 
         window.location.hostname.includes('vysionhoreca.com'))
      
      if (!isLocalhost) {
        window.location.href = `https://www.${tenant.tenant_slug}.ordervysion.com/admin`
      } else {
        router.push(`/shop/${tenant.tenant_slug}/admin`)
      }
      
    } catch (err) {
      setError(t('login.somethingWentWrong'))
    }
    
    setIsLoading(false)
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      setError(t('login.fillEmailFirst'))
      return
    }
    
    setIsLoading(true)
    setError('')
    
    try {
      if (!supabase) {
        setError(t('login.databaseNotAvailable'))
        setIsLoading(false)
        return
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login/reset-password`,
      })

      if (error) {
        setError(error.message)
      } else {
        setResetEmailSent(true)
      }
    } catch (err) {
      setError(t('login.somethingWentWrong'))
    }
    
    setIsLoading(false)
  }

  return (
    <main className="min-h-screen bg-dark flex flex-col">
      {/* Header */}
      <header className="p-6 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t('login.backToHome')}
        </Link>

        {/* Language Selector */}
        <div className="relative" ref={langRef}>
          <button
            onClick={() => setIsLangOpen(!isLangOpen)}
            className="flex items-center gap-2 text-white hover:text-accent transition-colors px-3 py-2 rounded-lg hover:bg-white/10 bg-white/5 border border-gray-700"
          >
            <span className="text-xl">{localeFlags[locale]}</span>
            <span className="text-sm hidden sm:inline">{localeNames[locale]}</span>
            <svg 
              className={`w-4 h-4 transition-transform ${isLangOpen ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown */}
          {isLangOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-dark rounded-xl shadow-2xl border border-gray-700 py-2 z-50">
              {locales.map((langCode) => (
                <button
                  key={langCode}
                  onClick={() => handleLanguageSelect(langCode)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors ${
                    locale === langCode ? 'text-accent' : 'text-white'
                  }`}
                >
                  <span className="text-xl">{localeFlags[langCode]}</span>
                  <span>{localeNames[langCode]}</span>
                  {locale === langCode && (
                    <svg className="w-5 h-5 ml-auto text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
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
            <p className="text-gray-400 mt-3">
              {showForgotPassword ? t('login.resetPassword') : t('login.logInToAccount')}
            </p>
          </div>

          {/* Reset Email Sent Message */}
          {resetEmailSent ? (
            <div className="space-y-6">
              <div className="p-6 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
                <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <h3 className="text-xl font-bold text-white mb-2">{t('login.emailSent')}</h3>
                <p className="text-gray-300">
                  {t('login.resetLinkSent').replace('{email}', email)}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowForgotPassword(false)
                  setResetEmailSent(false)
                }}
                className="w-full bg-white/10 hover:bg-white/20 text-white py-4 rounded-lg font-semibold transition-colors"
              >
                {t('login.backToLogin')}
              </button>
            </div>
          ) : showForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  {t('login.emailAddress')}
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder={t('login.emailPlaceholder')}
                  className="w-full px-4 py-3 bg-white/10 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !email}
                className="w-full bg-accent hover:bg-accent/90 disabled:bg-accent/50 text-white py-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? t('login.sending') : `${t('login.sendResetLink')} →`}
              </button>

              <button
                type="button"
                onClick={() => setShowForgotPassword(false)}
                className="w-full text-gray-400 hover:text-white transition-colors text-sm"
              >
                ← {t('login.backToLogin')}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  {t('login.emailAddress')}
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder={t('login.emailPlaceholder')}
                  className="w-full px-4 py-3 bg-white/10 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  {t('login.password')}
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-white/10 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !email || !password}
                className="w-full bg-accent hover:bg-accent/90 disabled:bg-accent/50 text-white py-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? t('login.loggingIn') : `${t('login.loginButton')} →`}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(true)
                  setError('')
                }}
                className="w-full text-accent hover:text-accent/80 transition-colors text-sm"
              >
                {t('login.forgotPassword')}
              </button>
            </form>
          )}

          {/* Help Links */}
          {!showForgotPassword && !resetEmailSent && (
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
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="p-6 text-center text-gray-500 text-sm">
        © {new Date().getFullYear()} Vysion Group. {t('login.copyright')}
      </footer>
    </main>
  )
}
