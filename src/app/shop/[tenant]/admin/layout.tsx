'use client'

import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useLanguage } from '@/i18n'
import { getTenantSettings } from '@/lib/admin-api'
import {
  adminPathToModule,
  getFirstAccessibleAdminPath,
  isShopAdminAnyPosPath,
  isHorecaKassaPosScreenEnabled,
  isRetailKassaPosScreenEnabled,
  isShopAdminKassaPosPath,
  isShopAdminRetailKassaPosPath,
  normalizeShopAdminPathname,
  submenuParentAllowedForSubmenuId,
  type TenantModuleId,
} from '@/lib/tenant-modules'
import {
  getSubmenuIdForPathname,
  hasShopAdminPathAccess,
  isAdminSubmenuEnabled,
  isSubmenuEnabledInTenantConfig,
  isSubmenuForcedOn,
} from '@/lib/admin-hamburger-modules'
import {
  TenantModuleFlagsProvider,
  useTenantModuleFlagsContext,
} from '@/lib/tenant-module-flags-context'
import { LocaleFlagEmoji } from '@/components/LocaleFlagEmoji'
import { AdminHamburgerMenu } from '@/components/AdminHamburgerMenu'
import {
  buildShopInternalReturnPath,
  clearTenantOwnerSession,
  isSuperAdminLoggedIn,
  isOwnerSessionFreshForTenant,
  redirectToShopOwnerLogin,
  verifyShopAdminApiSession,
} from '@/lib/auth-headers'
import {
  mirrorSuperadminSessionFromCookieToLocalStorage,
  peekSuperadminFromBrowserCookie,
} from '@/lib/superadmin-cookies'
import {
  isMarketingDemoTenantSlug,
  isPublicDemoKassaSearch,
  persistPublicDemoSessionIfNeeded,
  publicDemoSessionMatchesTenant,
} from '@/lib/demo-links'

interface AdminLayoutProps {
  children: React.ReactNode
  params: { tenant: string }
}

// Vergrendel-knop in topbalk op deze admin-subroutes — niet op dashboard/rapporten/producten/…
const LOCK_PAGES = ['categorieen']

export default function AdminLayout({ children, params }: AdminLayoutProps) {
  return (
    <TenantModuleFlagsProvider tenantSlug={params.tenant}>
      <AdminLayoutBody params={params}>{children}</AdminLayoutBody>
    </TenantModuleFlagsProvider>
  )
}

function AdminLayoutBody({ children, params }: AdminLayoutProps) {
  const pathname = usePathname()
  const adminPath = normalizeShopAdminPathname(pathname, params.tenant)
  const isHorecaKassaPos = isShopAdminKassaPosPath(adminPath, params.tenant)
  const isRetailKassaPos = isShopAdminRetailKassaPosPath(adminPath, params.tenant)
  const isAnyKassaPos = isHorecaKassaPos || isRetailKassaPos
  const router = useRouter()
  const { t } = useLanguage()
  const [tenantExists, setTenantExists] = useState<boolean | null>(null)
  const [adminHeaderTitle, setAdminHeaderTitle] = useState(() =>
    params.tenant
      .split('-')
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  )
  const [loading, setLoading] = useState(true)
  /** Na mount: superadmin (platform) óf zaak-eigenaar met wachtwoord vandaag. Klanten zonder geldige `vysion_tenant`blijven naar /login — géén automatische tenant-sessie via cookies. */
  /** `verifying`= client dacht ingelogd; wacht op `/api/auth/verify-tenant-session`(zelfde regels als schrijf-API’s). */
  const [adminAccess, setAdminAccess] = useState<'pending' |  'verifying' |  'ok' |  'login'>('pending')
  const baseUrl = `/shop/${params.tenant}/admin`
  const {
    moduleAccess,
    enabledModulesJson,
    featureLabelPrinting,
    loading: modulesLoading,
  } = useTenantModuleFlagsContext()

  const showLockButton = LOCK_PAGES.some(p => adminPath.includes(`/admin/${p}`))

  const isAdminDashboardRoot =
    adminPath === baseUrl || adminPath === `${baseUrl}/`

  useEffect(() => {
    async function checkTenant() {
      setLoading(true)
      const fromSlug = params.tenant
        .split('-')
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
      setAdminHeaderTitle(fromSlug)
      const tenantData = await getTenantSettings(params.tenant)
      setTenantExists(tenantData !== null)
      const bn = tenantData?.business_name?.trim()
      setAdminHeaderTitle(bn || fromSlug)
      setLoading(false)
    }
    checkTenant()
  }, [params.tenant])

  useEffect(() => {
    setAdminAccess('pending')
  }, [params.tenant])

  /**
   * Marketing-demo (frituurnolim / frituur-nolim): `?demo=bekijk`of `alleen_lezen=1`, of actieve
   * sessie na eerdere demo-URL — hele /admin/* zonder login (niet alleen kassa).
   */
  const [demoPublicUnauthenticated, setDemoPublicUnauthenticated] = useState(false)

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return
    if (!isMarketingDemoTenantSlug(params.tenant)) {
      setDemoPublicUnauthenticated(false)
      return
    }
    if (!adminPath.startsWith(baseUrl)) {
      setDemoPublicUnauthenticated(false)
      return
    }
    const q = window.location.search
    if (isPublicDemoKassaSearch(q)) {
      persistPublicDemoSessionIfNeeded(params.tenant, q)
      setDemoPublicUnauthenticated(true)
      return
    }
    if (publicDemoSessionMatchesTenant(params.tenant)) {
      setDemoPublicUnauthenticated(true)
      return
    }
    setDemoPublicUnauthenticated(false)
  }, [params.tenant, adminPath, baseUrl])

  useLayoutEffect(() => {
    if (tenantExists === false) return
    if (typeof window === 'undefined') return
    /** POS: auth meteen (niet wachten op getTenantSettings) — voorkomt audio vóór login. */
    if (!isAnyKassaPos && (loading || tenantExists === null)) return

    const stripHandoffParamFromSearch = (search: string) => {
      if (!search || search === '?') return ''
      const raw = search.startsWith('?') ? search.slice(1) : search
      const p = new URLSearchParams(raw)
      p.delete('sa_handoff')
      const s = p.toString()
      return s ? `?${s}`: ''
    }

    const removeHandoffFromAddressBar = () => {
      const clean = stripHandoffParamFromSearch(window.location.search)
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${clean}${window.location.hash}`
      )
    }

    const goTenantLogin = () => {
      setAdminAccess('login')
      const clean = stripHandoffParamFromSearch(window.location.search)
      const next = buildShopInternalReturnPath(
        params.tenant,
        window.location.pathname,
        clean
      )
      // Volledige navigatie: voorkomt vastloper tussen client router.replace, RSC en middleware
      // (superadmin-cookie op /login → 302 terug naar /shop terwijl client superadmin nog niet ziet).
      window.location.assign(`${window.location.origin}/login?next=${encodeURIComponent(next)}`)
    }

    mirrorSuperadminSessionFromCookieToLocalStorage()
    const sp = new URLSearchParams(
      window.location.search.startsWith('?') ? window.location.search.slice(1) : window.location.search
    )
    const fromSaHandoff = sp.get('sa_handoff') === '1'

    if (demoPublicUnauthenticated) {
      setAdminAccess('ok')
      return
    }

    const hasAccess =
      isSuperAdminLoggedIn() || isOwnerSessionFreshForTenant(params.tenant)

    if (hasAccess) {
      if (fromSaHandoff) removeHandoffFromAddressBar()
      setAdminAccess('verifying')
      return
    }

    // Direct na superadmin-handoff: cookie kan vlak na 302 nog niet in document.cookie staan — één korte retry.
    if (fromSaHandoff) {
      let cancelled = false
      const t = window.setTimeout(() => {
        if (cancelled) return
        mirrorSuperadminSessionFromCookieToLocalStorage()
        if (isSuperAdminLoggedIn() || isOwnerSessionFreshForTenant(params.tenant)) {
          removeHandoffFromAddressBar()
          setAdminAccess('verifying')
        } else if (peekSuperadminFromBrowserCookie()) {
          mirrorSuperadminSessionFromCookieToLocalStorage()
          if (isSuperAdminLoggedIn() || isOwnerSessionFreshForTenant(params.tenant)) {
            removeHandoffFromAddressBar()
            setAdminAccess('verifying')
          } else {
            goTenantLogin()
          }
        } else {
          goTenantLogin()
        }
      }, 100)
      return () => {
        cancelled = true
        window.clearTimeout(t)
      }
    }

    goTenantLogin()
  }, [loading, tenantExists, params.tenant, demoPublicUnauthenticated, isAnyKassaPos])

  /** Server moet dezelfde sessie zien als schrijf-API’s; ruimt verouderde `vysion_tenant`op bij mismatch. */
  useEffect(() => {
    if (adminAccess !== 'verifying') return
    if (demoPublicUnauthenticated) return
    if (typeof window === 'undefined') return

    let cancelled = false

    const finishLogin = () => {
      if (cancelled) return
      setAdminAccess('login')
      redirectToShopOwnerLogin(params.tenant)
    }

    void (async () => {
      let outcome = await verifyShopAdminApiSession(params.tenant)
      if (cancelled) return

      if (outcome === 'ok') {
        setAdminAccess('ok')
        return
      }

      if (outcome === 'network_error') {
        console.error('[admin] verify-tenant-session unreachable after retries; allowing UI')
        setAdminAccess('ok')
        return
      }

      clearTenantOwnerSession()
      mirrorSuperadminSessionFromCookieToLocalStorage()
      outcome = await verifyShopAdminApiSession(params.tenant)
      if (cancelled) return

      if (outcome === 'ok') {
        setAdminAccess('ok')
        return
      }
      if (outcome === 'network_error') {
        setAdminAccess('ok')
        return
      }

      finishLogin()
    })()

    return () => {
      cancelled = true
    }
  }, [adminAccess, params.tenant, demoPublicUnauthenticated])

  /**
   * Welkom-splash (/welkom) wordt getoond vanuit admin/page als `vysion_welcomed_*`ontbreekt.
   * Wie eerst een subpagina opent (b.v. Rapporten) had die flag niet → bij later bezoek aan
   * /admin springt de app "ineens" naar het ENTER-scherm. Zet de flag hier als we al op een
   * admin-subroute zitten (niet alleen dashboard-root).
   */
  useEffect(() => {
    try {
      const key = `vysion_welcomed_${params.tenant}`
      if (sessionStorage.getItem(key)) return
      if (adminPath.includes('/kassa')) return
      const root = `/shop/${params.tenant}/admin`
      const isDashboardRoot = adminPath === root || adminPath === `${root}/`
      if (!isDashboardRoot) {
        sessionStorage.setItem(key, 'true')
      }
    } catch { /* ignore */ }
  }, [params.tenant, adminPath])

  /** Overzicht en andere admin-pagina’s: altijd bovenaan (geen witte band na kassa / browser scroll-restore). */
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return
    if (adminPath.includes('/kassa')) return
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [adminPath])

  useEffect(() => {
    if (loading || modulesLoading || tenantExists === false) return
    if (demoPublicUnauthenticated) return
    if (adminPath.includes('/admin/pincode')) return
    const gate = adminPathToModule(adminPath, params.tenant)
    if (
      gate.kind === 'module' &&
      !hasShopAdminPathAccess(adminPath, params.tenant, moduleAccess, enabledModulesJson)
    ) {
      router.replace(
        getFirstAccessibleAdminPath(params.tenant, moduleAccess, enabledModulesJson)
      )
      return
    }
    const subId = getSubmenuIdForPathname(adminPath, params.tenant, moduleAccess)
    if (
      !isShopAdminAnyPosPath(adminPath, params.tenant) &&
      subId &&
      !isSubmenuForcedOn(subId) &&
      !isSubmenuEnabledInTenantConfig(
        subId,
        enabledModulesJson,
        submenuParentAllowedForSubmenuId(subId, gate, moduleAccess)
      )
    ) {
      router.replace(`/shop/${params.tenant}/admin`)
    }
  }, [
    loading,
    modulesLoading,
    tenantExists,
    adminPath,
    params.tenant,
    moduleAccess,
    enabledModulesJson,
    router,
    demoPublicUnauthenticated,
  ])

  const ownerSessionFreshOnClient =
    typeof window !== 'undefined' && isOwnerSessionFreshForTenant(params.tenant)

  /** Kassa alleen na login-verify — nooit vóór /login (pending/login). */
  const canShowKassaPos =
    demoPublicUnauthenticated ||
    (typeof window !== 'undefined' && isSuperAdminLoggedIn()) ||
    adminAccess === 'ok' ||
    (adminAccess === 'verifying' && ownerSessionFreshOnClient)

  const renderKassaPosChildren = () => {
    if (isHorecaKassaPos) {
      if (demoPublicUnauthenticated) {
        return <>{children}</>
      }
      if (typeof window !== 'undefined' && isSuperAdminLoggedIn()) {
        return <>{children}</>
      }
      if (!modulesLoading && !isHorecaKassaPosScreenEnabled(moduleAccess)) {
        return (
          <RedirectToFirstAccessibleModule
            tenant={params.tenant}
            access={moduleAccess}
            enabledModulesJson={enabledModulesJson}
          />
        )
      }
      return <>{children}</>
    }

    if (isRetailKassaPos) {
      if (
        !modulesLoading &&
        !isRetailKassaPosScreenEnabled(moduleAccess, enabledModulesJson)
      ) {
        return (
          <RedirectToFirstAccessibleModule
            tenant={params.tenant}
            access={moduleAccess}
            enabledModulesJson={enabledModulesJson}
          />
        )
      }
      return <>{children}</>
    }

    return null
  }

  /**
   * Kassa-POS: geen admin-laadschermen na login; vóór login geen kassa/audio (leeg grijs).
   */
  if (isAnyKassaPos) {
    if (tenantExists === false) {
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-12 shadow-xl max-w-md w-full text-center">
            <span className="text-6xl mb-6 block"></span>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('adminLayout.shopNotFound')}</h1>
            <p className="text-gray-600 mb-6">{t('adminLayout.shopNotFoundDesc')}</p>
            <a href="https://www.vysion-kassa.com" className="text-blue-600 hover:text-blue-700 font-medium inline-block">
              {t('adminLayout.backToVysion')}
            </a>
          </div>
        </div>
      )
    }
    if (!canShowKassaPos) {
      return <div className="min-h-[100svh] bg-[#e3e3e3]" aria-busy="true" />
    }
    return renderKassaPosChildren()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">{t('adminLayout.loading')}</p>
        </div>
      </div>
    )
  }

  if (tenantExists === false) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-12 shadow-xl max-w-md w-full text-center">
          <span className="text-6xl mb-6 block"></span>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('adminLayout.shopNotFound')}</h1>
          <p className="text-gray-600 mb-6">{t('adminLayout.shopNotFoundDesc')}</p>
          <a href="https://www.vysion-kassa.com" className="text-blue-600 hover:text-blue-700 font-medium inline-block">
            {t('adminLayout.backToVysion')}
          </a>
        </div>
      </div>
    )
  }

  if (tenantExists && adminAccess !== 'ok') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">
            {adminAccess === 'login'? t('adminLayout.redirectLogin') : t('adminLayout.loading')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '100%', overflowX: 'hidden', width: '100%'}} className="min-h-screen bg-gray-100">
      {/* ── Zwarte topbalk (zelfde stijl als kassa). Z-index 100 — modals/dialoog: min. z-[130] zodat ze boven deze balk blijven (iPad). ── */}
      <div
        className="fixed top-0 left-0 right-0 z-[100] flex items-center gap-2 bg-black px-2 sm:px-3"
        style={{ height: 56 }}
      >
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          <AdminHamburgerMenu tenantSlug={params.tenant} />
          {!modulesLoading &&
            (isHorecaKassaPosScreenEnabled(moduleAccess) ||
              isRetailKassaPosScreenEnabled(moduleAccess, enabledModulesJson)) && (
            <>
              {isHorecaKassaPosScreenEnabled(moduleAccess) ? (
                <a
                  href={`${baseUrl}/kassa`}
                  className="touch-manipulation [-webkit-tap-highlight-color:transparent] flex shrink-0 items-center gap-2 rounded-xl bg-[#58CCFF] px-3 py-2 text-sm font-bold text-[#063042] shadow-md transition-colors hover:bg-[#47c6fe] no-underline"
                >
                  <span>{t('adminLayout.pos')}</span>
                </a>
              ) : null}
              {isRetailKassaPosScreenEnabled(moduleAccess, enabledModulesJson) ? (
                <a
                  href={`${baseUrl}/retail-kassa`}
                  className="touch-manipulation [-webkit-tap-highlight-color:transparent] flex shrink-0 items-center gap-2 rounded-xl bg-emerald-400 px-3 py-2 text-sm font-bold text-[#063042] shadow-md transition-colors hover:bg-emerald-300 no-underline"
                >
                  <span>{t('adminLayout.retailPos')}</span>
                </a>
              ) : null}
            </>
          )}
        </div>

        {/* Tenant naam midden */}
        <div className="flex min-w-0 flex-1 items-center justify-center px-1">
          <span className="truncate text-center text-base font-bold tracking-normal !text-white sm:text-lg">
            {adminHeaderTitle}
          </span>
        </div>

        {/* Rechts: display knop + vergrendel + taal */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {isAdminSubmenuEnabled(
            'sm_orders_display',
            params.tenant,
            moduleAccess,
            enabledModulesJson
          ) && (
            <Link
              href={`/shop/${params.tenant}/display`}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-sm font-bold transition-colors"
            >
              <span className="hidden sm:inline">{t('adminLayout.onlineDisplay')}</span>
            </Link>
          )}
          {showLockButton && (
            <LockButton
              tenant={params.tenant}
              afterLockHref={
                modulesLoading
                  ? `/shop/${params.tenant}/admin`
                  : getFirstAccessibleAdminPath(
                      params.tenant,
                      moduleAccess,
                      enabledModulesJson
                    )
              }
            />
          )}
          <LanguageSelector />
        </div>
      </div>

      {/* Hoofdinhoud — geen sidebar, volle breedte */}
      <main
        data-vysion-admin-scroll
        className="fixed inset-x-0 bottom-0 top-14 z-0 overflow-x-hidden overflow-y-auto overscroll-y-contain touch-manipulation [-webkit-overflow-scrolling:touch]"
      >
        <div
          className={`max-w-full p-4 md:p-6 ${
            isAdminDashboardRoot ? 'pb-0': 'pb-[max(6rem,env(safe-area-inset-bottom))]'
          }`}
        >
          {children}
        </div>
      </main>
    </div>
  )
}

function RedirectToFirstAccessibleModule({
  tenant,
  access,
  enabledModulesJson,
}: {
  tenant: string
  access: Record<TenantModuleId, boolean>
  enabledModulesJson: Record<string, boolean> | null
}) {
  const router = useRouter()
  useEffect(() => {
    router.replace(getFirstAccessibleAdminPath(tenant, access, enabledModulesJson))
  }, [tenant, router, access, enabledModulesJson])
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-3 text-white">
      <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-slate-400">Doorverwijzen…</p>
    </div>
  )
}

function LockButton({ tenant, afterLockHref }: { tenant: string; afterLockHref: string }) {
  const router = useRouter()
  const { t } = useLanguage()
  const handleLock = () => {
    sessionStorage.removeItem(`vysion_pin_unlocked_${tenant}`)
    router.push(afterLockHref)
  }
  return (
    <button
      onClick={handleLock}
      className="flex items-center gap-1.5 px-3 py-2 bg-red-500 hover:bg-red-600 rounded-xl text-white text-sm font-bold transition-colors"
    >
      <span className="hidden sm:inline">{t('adminLayout.lock')}</span>
    </button>
  )
}

function LanguageSelector() {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { locale, setLocale, locales, localeNames } = useLanguage()

  useEffect(() => {
    function handlePointerOutside(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerOutside, true)
    return () => document.removeEventListener('pointerdown', handlePointerOutside, true)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex touch-manipulation items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-sm font-bold transition-colors"
      >
        <LocaleFlagEmoji locale={locale} className="text-base text-white" />
        <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180': ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 bg-white rounded-xl shadow-xl border z-[130] min-w-[180px] max-h-80 overflow-y-auto">
          {locales.map((langCode) => (
            <button
              key={langCode}
              onClick={() => { setLocale(langCode as typeof locale); setIsOpen(false) }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors ${locale === langCode ? 'bg-blue-50 text-blue-600': 'text-gray-700'}`}
            >
              <LocaleFlagEmoji locale={langCode} className="text-lg" />
              <span className="text-sm">{localeNames[langCode]}</span>
              {locale === langCode && (
                <svg className="w-4 h-4 ml-auto text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
