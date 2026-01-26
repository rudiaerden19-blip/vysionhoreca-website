'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage, Locale } from '@/i18n'

export default function RegisterPage() {
  const router = useRouter()
  const { t, locale, setLocale, locales, localeNames, localeFlags } = useLanguage()
  const [formData, setFormData] = useState({
    businessName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isLangOpen, setIsLangOpen] = useState(false)
  const [showInstallPopup, setShowInstallPopup] = useState(false)
  const [tenantSlug, setTenantSlug] = useState('')
  const langRef = useRef<HTMLDivElement>(null)

  // Read language from URL parameter on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const langParam = params.get('lang') as Locale | null
      if (langParam && locales.includes(langParam)) {
        setLocale(langParam)
      }
    }
  }, [setLocale, locales])

  // Close dropdown when clicking outside
  useEffect(() => {
    if (typeof window === 'undefined') return
    
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
    // Update URL with new language parameter
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('lang', langCode)
      window.history.replaceState({}, '', url.toString())
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError('')
  }

  const validateForm = (): boolean => {
    if (!formData.businessName.trim()) {
      setError(t('register.required') + ': ' + t('register.businessName'))
      return false
    }

    if (!formData.email.trim()) {
      setError(t('register.required') + ': ' + t('register.email'))
      return false
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError(t('register.invalidEmail'))
      return false
    }

    if (!formData.phone.trim()) {
      setError(t('register.required') + ': ' + t('register.phone'))
      return false
    }

    if (!formData.password) {
      setError(t('register.required') + ': ' + t('register.password'))
      return false
    } else if (formData.password.length < 8) {
      setError(t('register.passwordTooShort'))
      return false
    }

    if (!formData.confirmPassword) {
      setError(t('register.required') + ': ' + t('register.confirmPassword'))
      return false
    } else if (formData.password !== formData.confirmPassword) {
      setError(t('register.passwordsDontMatch'))
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!validateForm()) {
      return
    }
    
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: formData.businessName.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
          password: formData.password,
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || t('register.error'))
        setIsLoading(false)
        return
      }

      // Store tenant in localStorage (same as login does)
      if (!data.tenant || !data.tenant.tenant_slug) {
        setError('Fout: Geen tenant_slug ontvangen. Neem contact op met support.')
        setIsLoading(false)
        return
      }
      
      localStorage.setItem('vysion_tenant', JSON.stringify(data.tenant))
      
      // Show install popup first, then redirect
      setTenantSlug(data.tenant.tenant_slug)
      setShowInstallPopup(true)
      setSuccess(true)
      
    } catch (err) {
      setError(t('register.error'))
      setIsLoading(false)
    }
  }

  const handleContinueToDashboard = () => {
    const isLocalhost = typeof window !== 'undefined' && 
      (window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1'))
    
    if (isLocalhost) {
      router.push(`/shop/${tenantSlug}/admin`)
    } else {
      window.location.href = `https://${tenantSlug}.ordervysion.com/admin`
    }
  }

  // TestFlight and Play Store links
  const TESTFLIGHT_URL = process.env.NEXT_PUBLIC_TESTFLIGHT_LINK || 'https://testflight.apple.com/join/XXXXXX'
  const PLAYSTORE_URL = process.env.NEXT_PUBLIC_PLAYSTORE_LINK || 'https://play.google.com/store/apps/details?id=com.vysionhoreca.bestelplatform'

  if (success && showInstallPopup) {
    return (
      <main className="min-h-screen bg-dark flex flex-col">
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-lg">
            {/* Success checkmark */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">{t('register.successTitle')}</h2>
              <p className="text-gray-400">Account aangemaakt! Installeer nu de app.</p>
            </div>

            {/* Install App Card */}
            <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-2xl p-8">
              <div className="text-center mb-6">
                {/* Blue V Icon */}
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
                  <span className="text-5xl font-bold text-white">V</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Installeer Vysion Bestelplatform</h3>
                <p className="text-gray-400 text-sm">Download de app op uw tablet voor de beste ervaring</p>
              </div>

              {/* Download Buttons */}
              <div className="space-y-4">
                {/* iPad / iOS Button */}
                <a
                  href={TESTFLIGHT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 w-full bg-black hover:bg-gray-900 text-white p-4 rounded-xl transition-all hover:scale-[1.02] border border-gray-700"
                >
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-xs text-gray-400">Download voor</div>
                    <div className="text-lg font-semibold">iPad & iPhone</div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>

                {/* Android Button */}
                <a
                  href={PLAYSTORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 w-full bg-black hover:bg-gray-900 text-white p-4 rounded-xl transition-all hover:scale-[1.02] border border-gray-700"
                >
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 0 1 0 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.802 8.99l-2.303 2.303-8.635-8.635z"/>
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-xs text-gray-400">Download voor</div>
                    <div className="text-lg font-semibold">Android Tablet</div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>

              {/* Continue Button */}
              <button
                onClick={handleContinueToDashboard}
                className="w-full mt-6 bg-accent hover:bg-accent/90 text-white py-4 rounded-xl font-semibold transition-colors"
              >
                Doorgaan naar Dashboard →
              </button>

              <p className="text-center text-gray-500 text-xs mt-4">
                U kunt de app ook later downloaden vanuit uw dashboard
              </p>
            </div>
          </div>
        </div>
      </main>
    )
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

      {/* Registration Form */}
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
              {t('register.title')}
            </p>
            <p className="text-gray-500 text-sm mt-1">
              {t('register.subtitle')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="businessName" className="block text-sm font-medium text-gray-300 mb-2">
                {t('register.businessName')} *
              </label>
              <input
                id="businessName"
                name="businessName"
                type="text"
                value={formData.businessName}
                onChange={handleChange}
                required
                placeholder={t('register.businessNamePlaceholder')}
                className="w-full px-4 py-3 bg-white/10 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                {t('register.email')} *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder={t('register.emailPlaceholder')}
                className="w-full px-4 py-3 bg-white/10 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
                {t('register.phone')} *
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                required
                placeholder={t('register.phonePlaceholder')}
                className="w-full px-4 py-3 bg-white/10 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                {t('register.password')} *
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder={t('register.passwordPlaceholder')}
                className="w-full px-4 py-3 bg-white/10 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                {t('register.confirmPassword')} *
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder={t('register.confirmPasswordPlaceholder')}
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
              disabled={isLoading}
              className="w-full bg-accent hover:bg-accent/90 disabled:bg-accent/50 text-white py-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? t('register.registering') : `${t('register.registerButton')} →`}
            </button>

            <div className="text-center">
              <p className="text-gray-400 text-sm">
                {t('register.alreadyHaveAccount')}{' '}
                <Link href={`/login?lang=${locale}`} className="text-accent hover:text-accent/80 transition-colors">
                  {t('register.loginLink')}
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>

      {/* Footer */}
      <footer className="p-6 text-center text-gray-500 text-sm">
        © {new Date().getFullYear()} Vysion Group. {t('login.copyright')}
      </footer>
    </main>
  )
}
