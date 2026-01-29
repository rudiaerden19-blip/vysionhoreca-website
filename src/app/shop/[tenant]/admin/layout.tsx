'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import TrialBanner from '@/components/TrialBanner'
import { useLanguage } from '@/i18n'
import { getTenantSettings } from '@/lib/admin-api'
import { supabase } from '@/lib/supabase'

interface AdminLayoutProps {
  children: React.ReactNode
  params: { tenant: string }
}

const menuItems = [
  {
    categoryKey: 'overview',
    icon: '📊',
    items: [
      { nameKey: 'dashboard', href: '', icon: '📊' },
      { nameKey: 'shopDisplay', href: '/display', icon: '🖥️', fullscreen: true },
      { nameKey: 'kitchenDisplay', href: '/keuken', icon: '👨‍🍳', fullscreen: true },
      { nameKey: 'subscription', href: '/abonnement', icon: '💎' },
      { nameKey: 'businessAnalysis', href: '/analyse', icon: '📊' },
      { nameKey: 'sales', href: '/verkoop', icon: '💰' },
      { nameKey: 'popularItems', href: '/populair', icon: '🔥' },
    ]
  },
  {
    categoryKey: 'settings',
    icon: '⚙️',
    items: [
      { nameKey: 'businessProfile', href: '/profiel', icon: '🏪' },
      { nameKey: 'openingHours', href: '/openingstijden', icon: '🕐' },
      { nameKey: 'deliveryPickup', href: '/levering', icon: '🚗' },
      { nameKey: 'paymentMethods', href: '/betaling', icon: '💳' },
      { nameKey: 'designColors', href: '/design', icon: '🎨' },
      { nameKey: 'texts', href: '/teksten', icon: '✏️' },
      { nameKey: 'ourTeam', href: '/team', icon: '👨‍🍳' },
      { nameKey: 'giftCards', href: '/cadeaubonnen', icon: '🎁' },
      { nameKey: 'seo', href: '/seo', icon: '🔍' },
    ]
  },
  {
    categoryKey: 'menu',
    icon: '🍽️',
    items: [
      { nameKey: 'categories', href: '/categorieen', icon: '📁' },
      { nameKey: 'products', href: '/producten', icon: '🍟' },
      { nameKey: 'optionsExtras', href: '/opties', icon: '➕' },
      { nameKey: 'allergens', href: '/allergenen', icon: '⚠️' },
      { nameKey: 'photosMedia', href: '/media', icon: '📷' },
    ]
  },
  {
    categoryKey: 'marketing',
    icon: '📣',
    items: [
      { nameKey: 'emailMarketing', href: '/marketing', icon: '📧' },
      { nameKey: 'qrCodes', href: '/qr-codes', icon: '📱' },
      { nameKey: 'promotions', href: '/promoties', icon: '🎁' },
      { nameKey: 'reviews', href: '/reviews', icon: '⭐' },
    ]
  },
  {
    categoryKey: 'customers',
    icon: '👥',
    items: [
      { nameKey: 'customerList', href: '/klanten', icon: '👥' },
      { nameKey: 'rewards', href: '/klanten/beloningen', icon: '🎁' },
    ]
  },
  {
    categoryKey: 'staff',
    icon: '👔',
    items: [
      { nameKey: 'employees', href: '/personeel', icon: '👥' },
      { nameKey: 'timeTracking', href: '/uren', icon: '⏰' },
      { nameKey: 'leaveManagement', href: '/verlof', icon: '🏖️' },
      { nameKey: 'vacancies', href: '/vacatures', icon: '📢' },
    ]
  },
  {
    categoryKey: 'costCalculation',
    icon: '🧮',
    items: [
      { nameKey: 'costSettings', href: '/kosten/instellingen', icon: '⚙️' },
      { nameKey: 'ingredients', href: '/kosten/ingredienten', icon: '🥬' },
      { nameKey: 'productCosts', href: '/kosten/producten', icon: '📊' },
    ]
  },
  {
    categoryKey: 'gksReports',
    icon: '🧾',
    items: [
      { nameKey: 'zReport', href: '/z-rapport', icon: '📊' },
    ]
  },
  {
    categoryKey: 'orders',
    icon: '📦',
    items: [
      { nameKey: 'orderList', href: '/bestellingen', icon: '📦' },
      { nameKey: 'reservations', href: '/reserveringen', icon: '📅' },
    ]
  },
]

export default function AdminLayout({ children, params }: AdminLayoutProps) {
  const pathname = usePathname()
  const { t } = useLanguage()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [tenantExists, setTenantExists] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const baseUrl = `/shop/${params.tenant}/admin`

  // Check of tenant bestaat
  useEffect(() => {
    async function checkTenant() {
      const tenantData = await getTenantSettings(params.tenant)
      setTenantExists(tenantData !== null)
      setLoading(false)
    }
    checkTenant()
  }, [params.tenant])

  const isActive = (href: string) => {
    const fullPath = `${baseUrl}${href}`
    if (href === '') {
      return pathname === baseUrl || pathname === `${baseUrl}/`
    }
    return pathname.startsWith(fullPath)
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Laden...</p>
        </div>
      </div>
    )
  }

  // Tenant niet gevonden
  if (!tenantExists) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-12 shadow-xl max-w-md w-full text-center"
        >
          <span className="text-6xl mb-6 block">🔍</span>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('shopPage.notFoundTitle') || 'Shop niet gevonden'}</h1>
          <p className="text-gray-600 mb-6">
            {t('shopPage.notFoundDescription') || 'Deze shop bestaat niet of is verwijderd.'}
          </p>
          <a href="https://www.vysionhoreca.com" className="text-blue-600 hover:text-blue-600 font-medium inline-block">
            ← {t('shopPage.backToVysion') || 'Terug naar Vysion'}
          </a>
        </motion.div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '100vw', overflowX: 'hidden', width: '100%' }} className="min-h-screen bg-gray-100">
      {/* Trial Banner */}
      <TrialBanner tenantSlug={params.tenant} />
      
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b z-50 flex items-center justify-between px-4">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="font-bold text-gray-900">Admin Panel</span>
        <Link 
          href={`/shop/${params.tenant}`}
          className="p-2 hover:bg-gray-100 rounded-lg text-blue-600"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </Link>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/50 z-50"
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl overflow-y-auto"
            >
              <SidebarContent 
                baseUrl={baseUrl} 
                isActive={isActive} 
                tenant={params.tenant}
                onClose={() => setMobileMenuOpen(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className={`hidden lg:block fixed left-0 top-0 h-full bg-white border-r shadow-sm z-40 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'}`}>
        <SidebarContent 
          baseUrl={baseUrl} 
          isActive={isActive} 
          tenant={params.tenant}
          collapsed={!sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />
      </aside>

      {/* Top Bar with Language Selector and Display Link - Fixed top right */}
      <div className="hidden lg:flex fixed top-4 right-8 z-50 items-center gap-3">
        <Link
          href={`/shop/${params.tenant}/display`}
          className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg transition-colors font-medium shadow-lg"
        >
          🖥️ {t('admin.display')}
        </Link>
        <LanguageSelector />
      </div>

      {/* Main Content */}
      <main className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} pt-16 lg:pt-20 overflow-x-hidden min-h-screen`}>
        <div className="p-4 md:p-6 max-w-full pb-96">
          {children}
        </div>
      </main>
    </div>
  )
}

// Language Selector Component for top-right header
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
        className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
      >
        <span className="text-xl">{localeFlags[locale]}</span>
        <span className="text-sm font-medium text-gray-700">{localeNames[locale]}</span>
        <svg 
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 bg-white rounded-xl shadow-xl border z-50 min-w-[180px] max-h-80 overflow-y-auto">
          {locales.map((langCode) => (
            <button
              key={langCode}
              onClick={() => {
                setLocale(langCode as typeof locale)
                setIsOpen(false)
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors ${
                locale === langCode ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
              }`}
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

// Flyout Menu Component - renders with fixed positioning to escape overflow
function FlyoutMenu({ 
  section, 
  categoryName, 
  sectionIndex,
  baseUrl, 
  tenant, 
  isActive, 
  onClose,
  t,
  pendingReservations = 0
}: { 
  section: typeof menuItems[0]
  categoryName: string
  sectionIndex: number
  baseUrl: string
  tenant: string
  isActive: (href: string) => boolean
  onClose: () => void
  t: (key: string) => string
  pendingReservations?: number
}) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  useEffect(() => {
    // Get the button position to align the flyout
    const button = document.getElementById(`menu-btn-${section.categoryKey}`)
    if (button) {
      const rect = button.getBoundingClientRect()
      setPosition({
        top: rect.top,
        left: rect.right + 8 // 8px gap from sidebar
      })
    }
  }, [section.categoryKey])

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        const button = document.getElementById(`menu-btn-${section.categoryKey}`)
        if (button && !button.contains(event.target as Node)) {
          onClose()
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose, section.categoryKey])

  return (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, x: -10, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -10, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 9999
      }}
      className="bg-white rounded-xl shadow-2xl border border-gray-200 py-2 min-w-[220px] max-h-[70vh] overflow-y-auto"
    >
      <div className="px-4 py-2 border-b border-gray-100 mb-1">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{categoryName}</span>
      </div>
      <ul>
        {section.items.map((item) => {
          const getHref = () => {
            if (item.fullscreen) {
              if (item.href === '/display') return `/shop/${tenant}/display`
              if (item.href === '/keuken') return `/keuken/${tenant}`
            }
            return `${baseUrl}${item.href}`
          }
          
          return (
            <li key={item.href}>
              <Link
                href={getHref()}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-2.5 transition-all ${
                  isActive(item.href)
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm font-medium flex items-center gap-2">
                  {t(`admin.menu.${item.nameKey}`)}
                  {item.fullscreen && <span className="text-xs opacity-60">↗</span>}
                  {/* Badge voor pending reserveringen */}
                  {item.nameKey === 'reservations' && pendingReservations > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                      {pendingReservations}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </motion.div>
  )
}

function SidebarContent({ 
  baseUrl, 
  isActive, 
  tenant,
  collapsed = false,
  onClose,
  onToggle 
}: { 
  baseUrl: string
  isActive: (href: string) => boolean
  tenant: string
  collapsed?: boolean
  onClose?: () => void
  onToggle?: () => void
}) {
  const pathname = usePathname()
  const [expandedSections, setExpandedSections] = useState<string[]>([])
  const [isLangOpen, setIsLangOpen] = useState(false)
  const [pendingReservations, setPendingReservations] = useState(0)
  const langRef = useRef<HTMLDivElement>(null)
  const { locale, setLocale, t, locales, localeNames, localeFlags } = useLanguage()

  // Load pending reservations count
  useEffect(() => {
    async function loadPendingCount() {
      const { count } = await supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_slug', tenant)
        .eq('status', 'pending')
      
      setPendingReservations(count || 0)
    }
    loadPendingCount()
    
    // Poll every 30 seconds
    const interval = setInterval(loadPendingCount, 30000)
    return () => clearInterval(interval)
  }, [tenant])

  // Close language dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setIsLangOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Don't auto-expand sections - only expand when user clicks

  const toggleSection = (categoryKey: string) => {
    // Only one section open at a time - clicking another closes the previous
    setExpandedSections(prev => 
      prev.includes(categoryKey) 
        ? [] // Close if clicking same section
        : [categoryKey] // Open only this one, close all others
    )
  }

  const isSectionExpanded = (categoryKey: string) => expandedSections.includes(categoryKey)
  
  const hasActiveItemInSection = (section: typeof menuItems[0]) => {
    return section.items.some((item) => isActive(item.href))
  }

  const handleLanguageSelect = (langCode: string) => {
    setLocale(langCode as any)
    setIsLangOpen(false)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        {!collapsed && (
          <div>
            <h1 className="font-bold text-xl text-gray-900">Vysion</h1>
            <p className="text-sm text-gray-500 truncate">{tenant}</p>
          </div>
        )}
        {collapsed && (
          <div className="w-full flex justify-center">
            <span className="text-2xl">🍟</span>
          </div>
        )}
        {onToggle && (
          <button
            onClick={onToggle}
            className="p-2 hover:bg-gray-100 rounded-lg hidden lg:block"
          >
            <svg className={`w-5 h-5 transition-transform ${collapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        )}
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg lg:hidden"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {menuItems.map((section, sectionIndex) => {
          const isExpanded = isSectionExpanded(section.categoryKey)
          const hasActive = hasActiveItemInSection(section)
          const categoryName = t(`admin.categories.${section.categoryKey}`)
          
          return (
            <div key={section.categoryKey} className="mb-1">
              {/* Category Header - Clickable */}
              <button
                id={`menu-btn-${section.categoryKey}`}
                onClick={() => !collapsed && toggleSection(section.categoryKey)}
                className={`w-full flex items-center justify-between px-4 py-3 transition-all ${
                  hasActive 
                    ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-500' 
                    : 'text-gray-700 hover:bg-gray-50 border-l-4 border-transparent'
                } ${collapsed ? 'justify-center' : ''}`}
                title={collapsed ? categoryName : undefined}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{section.icon}</span>
                  {!collapsed && (
                    <span className="font-semibold text-sm uppercase tracking-wide">{categoryName}</span>
                  )}
                  {/* Badge voor pending reserveringen bij Bestellingen categorie */}
                  {section.categoryKey === 'orders' && pendingReservations > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center animate-pulse">
                      {pendingReservations}
                    </span>
                  )}
                </div>
                {!collapsed && (
                  <svg 
                    className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
              
              {/* Submenu Items - Flyout to the right using fixed positioning */}
              {!collapsed && isExpanded && (
                <FlyoutMenu
                  section={section}
                  categoryName={categoryName}
                  sectionIndex={sectionIndex}
                  baseUrl={baseUrl}
                  tenant={tenant}
                  isActive={isActive}
                  onClose={() => {
                    onClose?.()
                    toggleSection(section.categoryKey)
                  }}
                  t={t}
                  pendingReservations={pendingReservations}
                />
              )}
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t space-y-2">
        <Link
          href={`/shop/${tenant}`}
          target="_blank"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors ${collapsed ? 'justify-center' : ''}`}
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          {!collapsed && <span className="font-medium text-gray-600">{t('admin.viewWebsite')}</span>}
        </Link>
        <button
          onClick={() => {
            localStorage.removeItem('vysion_tenant')
            window.location.href = '/login'
          }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 transition-colors text-red-600 ${collapsed ? 'justify-center' : ''}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {!collapsed && <span className="font-medium">{t('admin.logout')}</span>}
        </button>
      </div>
    </div>
  )
}
