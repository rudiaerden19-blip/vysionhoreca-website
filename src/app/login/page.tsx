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
  'flex w-full touch-manipulation select-none items-center justify-center gap-2 rounded-lg bg-accent px-4 py-4 text-base font-semibold tracking-wide text-white transition-colors hover:bg-[#0c5273] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-45'

const LOGIN_FIELD =
  'w-full border-0 border-b border-white/20 bg-transparent py-3.5 text-lg text-white outline-none transition-colors placeholder:text-white/35 focus:border-accent focus:ring-0'

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
  const [showPasswordVisible, setShowPasswordVisible] = useState(false)
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

  const langMenu = (
    <div className="relative" ref={langRef}>
      <button
        type="button"
        onClick={() => setIsLangOpen(!isLangOpen)}
        className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-white/90 transition-colors hover:bg-white/10"
        aria-expanded={isLangOpen}
        aria-haspopup="listbox"
      >
        <LocaleFlagWithCode locale={locale} />
        <span className="hidden text-sm sm:inline">{localeNames[locale]}</span>
        <svg
          className={`h-4 w-4 opacity-70 transition-transform ${isLangOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isLangOpen && (
        <div className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-white/10 bg-[#252528] py-1 shadow-xl ring-1 ring-black/40">
          {locales.map((langCode) => (
            <button
              key={langCode}
              type="button"
              onClick={() => handleLanguageSelect(langCode)}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-white/10 ${
                locale === langCode ? 'font-medium text-accent' : 'text-white/90'
              }`}
            >
              <LocaleFlagEmoji locale={langCode} className="text-xl" />
              <span>{localeNames[langCode]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <main className="flex min-h-screen flex-col lg:flex-row">
      <LoginKassaCloseHintModal open={showKassaCloseHint} onDismiss={dismissKassaCloseHint} />

      <aside className="relative flex min-h-[220px] flex-col justify-between overflow-hidden bg-[#141210] px-8 py-10 lg:min-h-screen lg:w-[46%] xl:w-[50%]">
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/images/abonnement-onboarding-pos-restaurant.png')" }}
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-0 bg-black/50" aria-hidden />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-black/75 via-black/45 to-black/25"
          aria-hidden
        />
        <div className="relative z-10">
          <Link
            href={marketingHomeHref}
            className="inline-flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('login.backToHome')}
          </Link>
        </div>
        <div className="relative z-10 my-auto py-8 lg:py-0">
          <p className="text-4xl font-bold tracking-[0.2em] text-[#e85d04] drop-shadow-sm sm:text-5xl lg:text-6xl">
            VYSION
          </p>
          <p className="mt-6 max-w-md text-base leading-relaxed text-white/80 drop-shadow-sm sm:text-lg">
            {t('login.brandPanelTagline')}
          </p>
        </div>
        <p className="relative z-10 text-xs text-white/35">
          © {new Date().getFullYear()} Vysion Group
        </p>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col bg-[#1a1a1c] text-white">
        <header className="flex items-center justify-end px-5 py-5 sm:px-8 lg:hidden">{langMenu}</header>

        <div className="flex flex-1 flex-col items-center justify-center px-5 pb-10 pt-4 sm:px-10 lg:px-16 xl:px-24">
          <div className="hidden w-full max-w-md justify-end lg:flex">{langMenu}</div>

          <div className="mt-4 w-full max-w-md lg:mt-16">
            <h1 className="mb-10 text-center text-2xl font-light tracking-wide text-white/90 sm:text-3xl">
              {t('login.logInToAccount')}
            </h1>

            <form onSubmit={handleSubmit} className="space-y-10" autoComplete="on" method="post">
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-white/55">
                  {t('login.emailAddress')}
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
                  className={LOGIN_FIELD}
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-white/55">
                  {t('login.password')}
                </label>
                <div className="relative flex items-center border-b border-white/20 focus-within:border-accent">
                  <input
                    ref={passwordInputRef}
                    id="password"
                    name="password"
                    type={showPasswordVisible ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder=""
                    className={`${LOGIN_FIELD} border-b-0 pr-12`}
                  />
                  <button
                    type="button"
                    className="absolute right-0 p-2 text-white/45 transition-colors hover:text-white/80"
                    onClick={() => setShowPasswordVisible((v) => !v)}
                    aria-label={showPasswordVisible ? t('login.hidePassword') : t('login.showPassword')}
                  >
                    {showPasswordVisible ? (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.75}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858 3.029a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.75}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-white/40">{t('login.staySignedInHint')}</p>
              </div>

              {error && (
                <div
                  className="rounded-lg border border-red-500/40 bg-red-950/50 px-4 py-3 text-sm text-red-200"
                  role="alert"
                >
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
                  <span>{t('login.loginButton')}</span>
                )}
              </button>

              <Link
                href="/login/forgot-password"
                className="block text-center text-sm font-medium text-accent/90 transition-colors hover:text-accent"
              >
                {t('login.forgotPassword')}
              </Link>
            </form>

            <Link
              href="/login/troubleshooting"
              className="group mt-12 flex items-center justify-between border-t border-white/10 pt-6 text-sm text-white/55 transition-colors hover:text-white/80"
            >
              <span>{t('login.troubleshooting.title')}</span>
              <svg className="h-4 w-4 opacity-50 group-hover:opacity-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        <footer className="px-5 pb-6 text-center text-xs text-white/30 lg:hidden">
          © {new Date().getFullYear()} Vysion Group. {t('login.copyright')}
        </footer>
      </div>
    </main>
  )
}
