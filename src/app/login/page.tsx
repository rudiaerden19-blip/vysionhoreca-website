'use client'

import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useLanguage, Locale } from '@/i18n'
import {
  persistTenantSessionWithToday,
  normalizeLoginNextPath,
  internalShopPathToTenantHostPath,
  isSuperAdminLoggedIn,
} from '@/lib/auth-headers'
import { getCurrentTenantSlug as tenantSlugFromLocation } from '@/lib/tenant-url'
import {
  withPublicDemoSearchOnKassaPath,
  isMarketingDemoTenantSlug,
  normalizeTenantSlugKey,
} from '@/lib/demo-links'
import { mirrorSuperadminSessionFromCookieToLocalStorage } from '@/lib/superadmin-cookies'

/** Zelfde hosts als middleware `exactMainDomains` (+ dev): sessie blijft in localStorage van dit domein. */
function stayOnMainDomainForShopSession(hostname: string): boolean {
  const h = hostname.toLowerCase().split(':')[0]
  return (
    h === 'www.vysionhoreca.com' ||
    h === 'vysionhoreca.com' ||
    h === 'www.ordervysion.com' ||
    h === 'ordervysion.com' ||
    h.includes('localhost') ||
    h === '127.0.0.1' ||
    h.includes('vercel.app')
  )
}

export default function LoginPage() {
  const router = useRouter()
  const { t, locale, setLocale, locales, localeNames, localeFlags } = useLanguage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isLangOpen, setIsLangOpen] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)

  // Superadmin: gedeelde cookie → mirror in isSuperAdminLoggedIn; direct door naar `next` zonder zaak-wachtwoord.
  // (Zonder dit bleef het tenant-loginformulier zichtbaar tot je handmatig logt.)
  // Marketing demo: op www/localhost of op het demo-subdomein zelf → zonder ?demo= al naar publieke demokassa.
  // Niet doen op ander tenant-subdomein met `next` naar frituurnolim (anders blijft de gebruiker de login “kwijt”).
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const nextRaw = params.get('next')

    mirrorSuperadminSessionFromCookieToLocalStorage()
    if (isSuperAdminLoggedIn()) {
      let nextDecoded = (nextRaw || '').trim()
      try {
        if (nextRaw) nextDecoded = decodeURIComponent(nextRaw.trim())
      } catch {
        nextDecoded = nextRaw || ''
      }
      let tenantSlug: string | null = null
      if (nextDecoded.startsWith('/')) {
        const m = nextDecoded.match(/^\/shop\/([^/]+)/)
        if (m) tenantSlug = m[1]
      }
      if (!tenantSlug) tenantSlug = tenantSlugFromLocation()
      if (tenantSlug) {
        const safeNext = normalizeLoginNextPath(nextRaw, tenantSlug) ?? `/shop/${tenantSlug}/admin`
        const host = window.location.hostname.toLowerCase().split(':')[0]
        if (stayOnMainDomainForShopSession(host)) {
          router.replace(safeNext)
        } else {
          const hostPath = internalShopPathToTenantHostPath(safeNext, tenantSlug)
          window.location.replace(`${window.location.origin}${hostPath}`)
        }
        return
      }
    }

    const nextRawDemo = nextRaw || ''
    let nextDecoded = nextRawDemo
    try {
      nextDecoded = decodeURIComponent(nextRawDemo)
    } catch {
      /* ignore */
    }
    if (!nextDecoded.startsWith('/')) return
    const fixed = withPublicDemoSearchOnKassaPath(nextDecoded)
    if (!fixed) return
    const host = window.location.hostname.toLowerCase().split(':')[0]
    if (!stayOnMainDomainForShopSession(host)) {
      const pathMatch = nextDecoded.match(/^\/shop\/([^/]+)\/admin\/kassa/)
      const nextSlug = pathMatch?.[1] || ''
      const sub = host.split('.')[0] || ''
      const allowedHere =
        nextSlug &&
        isMarketingDemoTenantSlug(nextSlug) &&
        normalizeTenantSlugKey(sub) === normalizeTenantSlugKey(nextSlug)
      if (!allowedHere) return
    }
    window.location.replace(fixed)
  }, [router])

  // Read language from URL parameter on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const langParam = params.get('lang') as Locale | null
    if (langParam && locales.includes(langParam)) {
      setLocale(langParam)
    }
  }, [setLocale, locales])

  // Geen programmatische e-mail/wachtwoord: alle tenants gebruiken /login; autofill alleen via browser
  // (Chrome: instellingen → wachtwoorden / opgeslagen gegevens voor dit domein wissen indien nodig).

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
      const nextParam =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('next')
          : null
      let targetTenantSlug: string | undefined
      if (nextParam) {
        try {
          const dec = decodeURIComponent(nextParam.trim())
          const m = dec.match(/^\/shop\/([^/?#]+)/)
          if (m?.[1]) targetTenantSlug = m[1].toLowerCase()
        } catch {
          /* ignore */
        }
      }

      // Server-side API call voor robuuste login
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          ...(targetTenantSlug ? { target_tenant_slug: targetTenantSlug } : {}),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || t('login.loginFailed'))
        setIsLoading(false)
        return
      }

      const tenant = data.tenant

      if (!tenant.tenant_slug) {
        setError('Geen tenant gevonden. Neem contact op met support.')
        setIsLoading(false)
        return
      }

      persistTenantSessionWithToday(tenant as Record<string, unknown>)

      const safeNext = normalizeLoginNextPath(nextParam, tenant.tenant_slug)
      const fallbackAfterLogin = `/shop/${tenant.tenant_slug}/admin`

      const host =
        typeof window !== 'undefined' ? window.location.hostname : ''
      if (stayOnMainDomainForShopSession(host)) {
        router.push(safeNext || fallbackAfterLogin)
      } else {
        const target = safeNext || fallbackAfterLogin
        const hostPath = internalShopPathToTenantHostPath(target, tenant.tenant_slug)
        window.location.assign(`${window.location.origin}${hostPath}`)
      }
      
    } catch (err) {
      setError(t('login.somethingWentWrong'))
    }
    
    setIsLoading(false)
  }

  return (
    <main className="min-h-screen flex flex-col bg-[#e3e3e3]">
      {/* Header */}
      <header className="p-6 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t('login.backToHome')}
        </Link>

        {/* Language Selector */}
        <div className="relative" ref={langRef}>
          <button
            onClick={() => setIsLangOpen(!isLangOpen)}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 transition-colors hover:border-gray-400 hover:bg-gray-50"
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
            <div className="absolute right-0 z-50 mt-2 w-48 rounded-xl border border-gray-200 bg-white py-2 shadow-xl">
              {locales.map((langCode) => (
                <button
                  key={langCode}
                  onClick={() => handleLanguageSelect(langCode)}
                  className={`flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-100 ${
                    locale === langCode ? 'text-accent' : 'text-gray-800'
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
                <span className="ml-1 font-normal text-gray-600">horeca</span>
              </span>
            </Link>
            <p className="mt-3 text-gray-800">
              {t('login.logInToAccount')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off" method="post">
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-800">
                  {t('login.emailAddress')} <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  name="vysion_email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder={t('login.emailPlaceholder')}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition-all placeholder:text-gray-500 focus:border-accent focus:ring-2 focus:ring-accent/25"
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-800">
                  {t('login.password')} <span className="text-red-500">*</span>
                </label>
                <input
                  id="password"
                  name="vysion_password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="off"
                  placeholder=""
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition-all placeholder:text-gray-500 focus:border-accent focus:ring-2 focus:ring-accent/25"
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !email || !password}
                aria-busy={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-4 font-semibold text-white transition-colors hover:bg-accent/90 disabled:bg-accent/50"
              >
                {isLoading ? (
                  <>
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="inline-block h-5 w-5 shrink-0 rounded-full border-2 border-white border-t-transparent"
                      aria-hidden
                    />
                    <span>{t('login.loggingIn')}</span>
                  </>
                ) : (
                  <span>{`${t('login.loginButton')} →`}</span>
                )}
              </button>

              <Link
                href="/login/forgot-password"
                className="block w-full text-center text-sm font-medium text-accent transition-colors hover:text-accent/80"
              >
                {t('login.forgotPassword')}
              </Link>
            </form>

          {/* Help Links */}
          <div className="mt-8 space-y-4">
              <Link
                href="/login/troubleshooting"
                className="group flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15">
                    <svg className="h-5 w-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{t('login.troubleshooting.title')}</p>
                    <p className="text-sm text-gray-600">{t('login.troubleshooting.subtitle')}</p>
                  </div>
                </div>
                <svg className="h-5 w-5 text-gray-400 transition-colors group-hover:text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="p-6 text-center text-sm text-gray-600">
        © {new Date().getFullYear()} Vysion Group. {t('login.copyright')}
      </footer>
    </main>
  )
}
