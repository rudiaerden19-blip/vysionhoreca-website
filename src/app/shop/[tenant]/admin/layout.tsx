'use client'

import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import TrialBanner from '@/components/TrialBanner'
import { useLanguage } from '@/i18n'
import { getTenantSettings } from '@/lib/admin-api'
import {
  adminPathToModule,
  allTenantModulesTrue,
  getAdminKassaEntryHref,
  getFirstAccessibleAdminPath,
  hasModuleAccessForPathname,
  isKassaPosScreenEnabled,
  normalizeShopAdminPathname,
  submenuParentAllowedForSubmenuId,
  type TenantModuleId,
} from '@/lib/tenant-modules'
import {
  getSubmenuIdForPathname,
  isSubmenuEnabledInTenantConfig,
  isSubmenuForcedOn,
} from '@/lib/admin-hamburger-modules'
import { useTenantModuleFlags } from '@/lib/use-tenant-modules'
import PostTrialModulePickerModal from '@/components/PostTrialModulePickerModal'
import { AdminHamburgerMenu } from '@/components/AdminHamburgerMenu'
import {
  isSuperAdminLoggedIn,
  isOwnerSessionFreshForTenant,
} from '@/lib/auth-headers'
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

// Vergrendel-knop in topbalk op deze admin-subroutes (o.a. rapportages, Z-rapport, producten, categorieën, analyse)
const LOCK_PAGES = ['categorieen', 'producten', 'analyse', 'rapporten', 'z-rapport']

export default function AdminLayout({ children, params }: AdminLayoutProps) {
  const pathname = usePathname()
  const adminPath = normalizeShopAdminPathname(pathname, params.tenant)
  const router = useRouter()
  const { t } = useLanguage()
  const [tenantExists, setTenantExists] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  /** Na mount: alleen superadmin of eigenaar met wachtwoord-sessie vandaag voor exact deze URL-tenant. */
  const [adminAccess, setAdminAccess] = useState<'pending' | 'ok' | 'login'>('pending')
  const baseUrl = `/shop/${params.tenant}/admin`
  const {
    moduleAccess,
    enabledModulesJson,
    featureGroupOrders,
    featureLabelPrinting,
    loading: modulesLoading,
    needsPostTrialModulePicker,
    refetch: refetchModules,
  } = useTenantModuleFlags(params.tenant)

  const showLockButton =
    adminPath === baseUrl ||
    adminPath === `${baseUrl}/` ||
    LOCK_PAGES.some(p => adminPath.includes(`/admin/${p}`))

  useEffect(() => {
    async function checkTenant() {
      setLoading(true)
      const tenantData = await getTenantSettings(params.tenant)
      setTenantExists(tenantData !== null)
      setLoading(false)
    }
    checkTenant()
  }, [params.tenant])

  useEffect(() => {
    setAdminAccess('pending')
  }, [params.tenant])

  /**
   * Marketing-demo (frituurnolim / frituur-nolim): `?demo=bekijk` of `alleen_lezen=1`, of actieve
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

  useEffect(() => {
    if (loading || tenantExists === null) return
    if (tenantExists === false) return
    if (typeof window === 'undefined') return
    if (demoPublicUnauthenticated) {
      setAdminAccess('ok')
      return
    }
    if (isSuperAdminLoggedIn() || isOwnerSessionFreshForTenant(params.tenant)) {
      setAdminAccess('ok')
      return
    }
    setAdminAccess('login')
    const next = `${window.location.pathname}${window.location.search}`
    router.replace(`/login?next=${encodeURIComponent(next)}`)
  }, [loading, tenantExists, params.tenant, router, demoPublicUnauthenticated])

  /**
   * Welkom-splash (/welkom) wordt getoond vanuit admin/page als `vysion_welcomed_*` ontbreekt.
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

  useEffect(() => {
    if (loading || modulesLoading || tenantExists === false) return
    if (demoPublicUnauthenticated) return
    if (typeof window !== 'undefined' && isSuperAdminLoggedIn()) return
    const gate = adminPathToModule(adminPath, params.tenant)
    if (gate.kind === 'module' && !hasModuleAccessForPathname(adminPath, params.tenant, moduleAccess)) {
      router.replace(
        getFirstAccessibleAdminPath(params.tenant, moduleAccess, enabledModulesJson)
      )
      return
    }
    const subId = getSubmenuIdForPathname(adminPath, params.tenant)
    if (
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

  if (!tenantExists) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-12 shadow-xl max-w-md w-full text-center">
          <span className="text-6xl mb-6 block">🔍</span>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('adminLayout.shopNotFound')}</h1>
          <p className="text-gray-600 mb-6">{t('adminLayout.shopNotFoundDesc')}</p>
          <a href="https://www.vysionhoreca.com" className="text-blue-600 hover:text-blue-700 font-medium inline-block">
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
            {adminAccess === 'login' ? t('adminLayout.redirectLogin') : t('adminLayout.loading')}
          </p>
        </div>
      </div>
    )
  }

  // Kassa POS: geen layout wrapper; module uit of alleen pincode (geen POS-submenu) → niet op /kassa laten
  if (adminPath.includes('/kassa')) {
    if (demoPublicUnauthenticated) {
      return <>{children}</>
    }
    if (
      typeof window !== 'undefined' &&
      isSuperAdminLoggedIn()
    ) {
      return <>{children}</>
    }
    if (!modulesLoading && moduleAccess['kassa'] === false) {
      return (
        <RedirectToFirstAccessibleModule
          tenant={params.tenant}
          access={moduleAccess}
          enabledModulesJson={enabledModulesJson}
        />
      )
    }
    if (
      !modulesLoading &&
      moduleAccess['kassa'] &&
      !isKassaPosScreenEnabled(enabledModulesJson, true)
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

  return (
    <div style={{ maxWidth: '100vw', overflowX: 'hidden', width: '100%' }} className="min-h-screen bg-gray-100">
      <PostTrialModulePickerModal
        tenantSlug={params.tenant}
        open={
          needsPostTrialModulePicker &&
          !demoPublicUnauthenticated &&
          !isSuperAdminLoggedIn()
        }
        onConfirmed={refetchModules}
      />
      {!demoPublicUnauthenticated && <TrialBanner tenantSlug={params.tenant} />}

      {/* ── Slanke blauwe topbalk (zelfde stijl als kassa) ── */}
      <div
        className="fixed top-0 left-0 right-0 z-[100] flex items-center gap-2 bg-[#1e293b] px-2 sm:px-3"
        style={{ height: 56 }}
      >
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          <AdminHamburgerMenu
            tenantSlug={params.tenant}
            moduleAccess={moduleAccess}
            featureGroupOrders={featureGroupOrders}
            featureLabelPrinting={featureLabelPrinting}
            enabledModulesJson={enabledModulesJson}
            loading={modulesLoading}
          />
          <Link
            href={`${baseUrl}/`}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-orange-500 px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-400"
          >
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>{t('adminLayout.back')}</span>
          </Link>
          {!modulesLoading && (isSuperAdminLoggedIn() || moduleAccess['kassa']) && (
            <Link
              href={
                getAdminKassaEntryHref(
                  params.tenant,
                  isSuperAdminLoggedIn() ? allTenantModulesTrue() : moduleAccess,
                  isSuperAdminLoggedIn() ? null : enabledModulesJson
                ) ?? `${baseUrl}/kassa`
              }
              className="flex shrink-0 items-center gap-2 rounded-xl bg-orange-500 px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-400"
            >
              <span className="text-base leading-none" aria-hidden>
                🧾
              </span>
              <span>{t('adminLayout.pos')}</span>
            </Link>
          )}
        </div>

        {/* Tenant naam midden */}
        <div className="flex min-w-0 flex-1 items-center justify-center px-1">
          <span className="truncate text-center text-sm font-medium tracking-normal text-red-400 sm:text-base">
            {params.tenant.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
          </span>
        </div>

        {/* Rechts: display knop + vergrendel + taal */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {(isSuperAdminLoggedIn() || moduleAccess['online-bestellingen']) && (
            <Link
              href={`/shop/${params.tenant}/display`}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-sm font-bold transition-colors"
            >
              <span className="text-base">🖥️</span>
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
      <main className="pt-14 overflow-x-hidden min-h-screen">
        <div className="p-4 md:p-6 max-w-full pb-24">
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
      🔒 <span className="hidden sm:inline">{t('adminLayout.lock')}</span>
    </button>
  )
}

function LanguageSelector() {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { locale, setLocale, locales, localeNames, localeFlags } = useLanguage()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-sm font-bold transition-colors"
      >
        <span className="text-base">{localeFlags[locale]}</span>
        <span className="hidden sm:inline">{(localeNames[locale] || '').slice(0, 3).toUpperCase()}</span>
        <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 bg-white rounded-xl shadow-xl border z-50 min-w-[180px] max-h-80 overflow-y-auto">
          {locales.map((langCode) => (
            <button
              key={langCode}
              onClick={() => { setLocale(langCode as typeof locale); setIsOpen(false) }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors ${locale === langCode ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
            >
              <span className="text-lg">{localeFlags[langCode]}</span>
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
