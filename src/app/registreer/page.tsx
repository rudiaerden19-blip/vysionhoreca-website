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
  const [isMounted, setIsMounted] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)

  // Ensure component is mounted before rendering
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Read language from URL parameter on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const langParam = params.get('lang') as Locale | null
      if (langParam && locales.includes(langParam)) {
        setLocale(langParam)
      } else if (!localStorage.getItem('vysion_locale')) {
        // Set default to Dutch if no preference is saved
        setLocale('nl')
      }
    }
  }, [setLocale, locales])

  // Don't render until mounted to prevent hydration issues
  if (!isMounted) {
    return (
      <main className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-white">Laden...</div>
      </main>
    )
  }

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
    if (typeof window !== 'undefined') {
      setLocale(langCode)
      setIsLangOpen(false)
      // Update URL with new language parameter
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
      if (data.tenant) {
        localStorage.setItem('vysion_tenant', JSON.stringify(data.tenant))
      }

      setSuccess(true)
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
      
    } catch (err) {
      setError(t('register.error'))
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <main className="min-h-screen bg-dark flex flex-col">
        <header className="p-6 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('login.backToHome')}
          </Link>
        </header>

        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md text-center">
            <div className="p-6 bg-green-500/10 border border-green-500/30 rounded-lg">
              <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <h3 className="text-xl font-bold text-white mb-2">{t('register.successTitle')}</h3>
              <p className="text-gray-300">{t('register.successMessage')}</p>
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
