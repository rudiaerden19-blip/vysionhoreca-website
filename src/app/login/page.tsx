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
  isOwnerSessionFreshForTenant,
  readRememberedOwnerLoginEmail,
  readRememberedOwnerLoginPassword,
  rememberOwnerLoginEmail,
  rememberOwnerLoginPassword,
} from '@/lib/auth-headers'
import { clearTerminalLogout, readTerminalLogout } from '@/lib/session-broadcast'
import { getCurrentTenantSlug as tenantSlugFromLocation } from '@/lib/tenant-url'
import {
  withPublicDemoSearchOnKassaPath,
  isMarketingDemoTenantSlug,
  normalizeTenantSlugKey,
} from '@/lib/demo-links'
import { mirrorSuperadminSessionFromCookieToLocalStorage } from '@/lib/superadmin-cookies'
import { LocaleFlagEmoji, LocaleFlagWithCode } from '@/components/LocaleFlagEmoji'
import { LoginKassaCloseHintModal } from '@/components/LoginKassaCloseHintModal'
import { LOGIN_QUERY_KASSA_CLOSE_TIP } from '@/lib/shop-login-kassa-tip'
import { isVysionMainPortalHost } from '@/lib/vysion-site'
import { marketingHomeHrefFromSearchParams } from '@/lib/registration-product-line'

const LOGIN_PRIMARY_BTN =
  'flex w-full touch-manipulation select-none items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-[#0c5273] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50'

/** Zelfde hosts als middleware `exactMainDomains`(+ dev): sessie blijft in localStorage van dit domein. */
function stayOnMainDomainForShopSession(hostname: string): boolean {
  const h = hostname.toLowerCase().split(':')[0]
  return (
    isVysionMainPortalHost(h) ||
    h.includes('localhost') ||
    h === '127.0.0.1' ||
    h.includes('vercel.app')
  )
}

export default function LoginPage() {
  const router = useRouter()
  const { t, locale, setLocale, locales, localeNames } = useLanguage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isLangOpen, setIsLangOpen] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)
  const passwordInputRef = useRef<HTMLInputElement>(null)
  const [showKassaCloseHint, setShowKassaCloseHint] = useState(false)
  const [marketingHomeHref, setMarketingHomeHref] = useState('/')

  // Superadmin: gedeelde cookie → mirror in isSuperAdminLoggedIn; direct door naar `next`zonder zaak-wachtwoord.
  // (Zonder dit bleef het tenant-loginformulier zichtbaar tot je handmatig logt.)
  // Marketing demo: op www/localhost of op het demo-subdomein zelf → zonder ?demo= al naar publieke demokassa.
  // Niet doen op ander tenant-subdomein met `next`naar frituurnolim (anders blijft de gebruiker de login “kwijt”).
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return
    const origin = window.location.origin
    const term = readTerminalLogout()
    // Superadmin terminal-logout: /login blijft zaak-login (geen redirect naar /superadmin/login).

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

    // Zaak nog ingelogd op dit apparaat (rollende 14 dagen) → kassa/admin zonder opnieuw wachtwoord.
    if (term?.kind !== 'staff') {
      let ownerSlug = tenantSlugFromLocation()
      if (nextRaw) {
        try {
          const dec = decodeURIComponent(nextRaw.trim())
          const m = dec.match(/^\/shop\/([^/?#]+)/)
          if (m?.[1]) ownerSlug = m[1]
        } catch {
          /* ignore */
        }
      }
      if (ownerSlug && isOwnerSessionFreshForTenant(ownerSlug)) {
        const safeNext = normalizeLoginNextPath(nextRaw, ownerSlug) ?? `/shop/${ownerSlug}/admin`
        const host = window.location.hostname.toLowerCase().split(':')[0]
        if (stayOnMainDomainForShopSession(host)) {
          router.replace(safeNext)
        } else {
          const hostPath = internalShopPathToTenantHostPath(safeNext, ownerSlug)
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

  /** Na uitloggen POS: `?kassa_sluit_tip=1`— popup over venster sluiten. */
  useEffect(() => {
    if (typeof window === 'undefined') return
    const p = new URLSearchParams(window.location.search)
    setShowKassaCloseHint(p.get(LOGIN_QUERY_KASSA_CLOSE_TIP) === '1')
    setMarketingHomeHref(
      marketingHomeHrefFromSearchParams(p),
    )
  }, [])

  const dismissKassaCloseHint = () => {
    setShowKassaCloseHint(false)
    const p = new URLSearchParams(window.location.search)
    p.delete(LOGIN_QUERY_KASSA_CLOSE_TIP)
    const q = p.toString()
    router.replace(`/login${q ? `?${q}`: ''}`)
  }

  // Read language from URL parameter on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const langParam = params.get('lang') as Locale | null
    if (langParam && locales.includes(langParam)) {
      setLocale(langParam)
    }
  }, [setLocale, locales])

  // E-mail + wachtwoord van vorige login op dit apparaat (blijft na uitloggen).
  useEffect(() => {
    if (typeof window === 'undefined') return
    const remembered = readRememberedOwnerLoginEmail()
    if (remembered) setEmail(remembered)
    const rememberedPw = readRememberedOwnerLoginPassword()
    if (rememberedPw) setPassword(rememberedPw)
  }, [])

  // Geen programmatische e-mail/wachtwoord: alle tenants gebruiken /login; autofill alleen via browser

  // Sluit taalmenu (pointerdown = betrouwbaar op Windows-touch)
  useEffect(() => {
    function handlePointerOutside(event: PointerEvent) {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setIsLangOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerOutside, true)
    return () => document.removeEventListener('pointerdown', handlePointerOutside, true)
  }, [])

  const handleLanguageSelect = (langCode: Locale) => {
    setLocale(langCode)
    setIsLangOpen(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const passwordValue =
      password.trim() || passwordInputRef.current?.value.trim() || ''
    if (!email || !passwordValue) return
    
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
        headers: { 'Content-Type': 'application/json'},
        body: JSON.stringify({
          email,
          password: passwordValue,
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
        setError(t('login.tenantNotFound'))
        setIsLoading(false)
        return
      }

      persistTenantSessionWithToday(tenant as Record<string, unknown>)
      rememberOwnerLoginEmail(email)
      rememberOwnerLoginPassword(passwordValue)
      clearTerminalLogout()

      const safeNext = normalizeLoginNextPath(nextParam, tenant.tenant_slug)
      const fallbackAfterLogin = `/shop/${tenant.tenant_slug}/admin`
      const dest = safeNext || fallbackAfterLogin
      const destPath = dest.split('?')[0] ?? ''
      const isKassaPosAfterLogin =
        /\/admin\/(?:retail-kassa|kassa)(?:\/|$)/.test(destPath)
      const isAdminHomeAfterLogin =
        destPath === `/shop/${tenant.tenant_slug}/admin` ||
        destPath === `/shop/${tenant.tenant_slug}/admin/`

      const host =
        typeof window !== 'undefined'? window.location.hostname : ''
      const origin = typeof window !== 'undefined'? window.location.origin : ''

      if ((isKassaPosAfterLogin || isAdminHomeAfterLogin) && origin) {
        /** Volledige load: één mount → één audioscherm (geen router.push-flits). */
        window.location.assign(`${origin}${dest.startsWith('/') ? dest : `/${dest}`}`)
        return
      }

      if (stayOnMainDomainForShopSession(host)) {
        router.push(dest)
      } else {
        const hostPath = internalShopPathToTenantHostPath(dest, tenant.tenant_slug)
        window.location.assign(`${origin}${hostPath}`)
      }
      
    } catch (err) {
      setError(t('login.somethingWentWrong'))
    }
    
    setIsLoading(false)
  }

  return (
    <main className="relative flex min-h-screen flex-col bg-slate-50">
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(14,93,130,0.12),transparent_55%)]"
        aria-hidden
      />
      <LoginKassaCloseHintModal open={showKassaCloseHint} onDismiss={dismissKassaCloseHint} />

      <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <Link
          href={marketingHomeHref}
          className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-white/60 hover:text-slate-900"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t('login.backToHome')}
        </Link>

        <div className="relative" ref={langRef}>
          <button
            type="button"
            onClick={() => setIsLangOpen(!isLangOpen)}
            className="flex items-center gap-2 rounded-full border border-slate-200/90 bg-white/90 px-3 py-2 text-slate-800 shadow-sm backdrop-blur-sm transition-colors hover:border-slate-300 hover:bg-white"
            aria-expanded={isLangOpen}
            aria-haspopup="listbox"
          >
            <LocaleFlagWithCode locale={locale} />
            <span className="hidden text-sm text-slate-600 sm:inline">{localeNames[locale]}</span>
            <svg
              className={`h-4 w-4 text-slate-500 transition-transform ${isLangOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isLangOpen && (
            <div className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-black/5">
              {locales.map((langCode) => (
                <button
                  key={langCode}
                  type="button"
                  onClick={() => handleLanguageSelect(langCode)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-slate-50 ${
                    locale === langCode ? 'bg-accent/5 font-medium text-accent' : 'text-slate-800'
                  }`}
                >
                  <LocaleFlagEmoji locale={langCode} className="text-xl" />
                  <span>{localeNames[langCode]}</span>
                  {locale === langCode && (
                    <svg className="ml-auto h-4 w-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-[420px]">
          <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_16px_48px_-24px_rgba(14,93,130,0.35)]">
            <div className="h-1 bg-gradient-to-r from-accent via-[#12739f] to-[#0a4a68]" aria-hidden />
            <div className="px-6 pb-8 pt-8 sm:px-8">
              <div className="mb-8 text-center">
                <Link href={marketingHomeHref} className="inline-block">
                  <span className="text-[1.75rem] font-bold tracking-tight text-accent sm:text-3xl">Vysion</span>
                </Link>
                <p className="mt-2 text-sm text-slate-600 sm:text-base">{t('login.logInToAccount')}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5" autoComplete="on" method="post">
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-800">
                    {t('login.emailAddress')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="username"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder={t('login.emailPlaceholder')}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/20"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-800">
                    {t('login.password')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={passwordInputRef}
                    id="password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder=""
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/20"
                  />
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">{t('login.staySignedInHint')}</p>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200/80 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !email || !password.trim()}
                  aria-busy={isLoading}
                  className={LOGIN_PRIMARY_BTN}
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
                  className="block w-full text-center text-sm font-medium text-accent transition-colors hover:text-[#0c5273]"
                >
                  {t('login.forgotPassword')}
                </Link>
              </form>
            </div>
          </div>

          <Link
            href="/login/troubleshooting"
            className="group mt-5 flex w-full items-center justify-between rounded-xl border border-slate-200/90 bg-white/80 px-4 py-3.5 shadow-sm backdrop-blur-sm transition-colors hover:border-slate-300 hover:bg-white"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                <svg className="h-5 w-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
              <div className="min-w-0 text-left">
                <p className="font-medium text-slate-900">{t('login.troubleshooting.title')}</p>
                <p className="truncate text-sm text-slate-600 sm:whitespace-normal">{t('login.troubleshooting.subtitle')}</p>
              </div>
            </div>
            <svg
              className="h-5 w-5 shrink-0 text-slate-400 transition-colors group-hover:text-accent"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      <footer className="relative z-10 px-4 py-6 text-center text-xs text-slate-500 sm:text-sm">
        © {new Date().getFullYear()} Vysion Group. {t('login.copyright')}
      </footer>
    </main>
  )
}
