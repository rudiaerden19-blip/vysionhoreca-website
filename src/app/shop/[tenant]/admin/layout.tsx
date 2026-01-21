'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import TrialBanner from '@/components/TrialBanner'
import { useLanguage } from '@/i18n'

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
    ]
  },
  {
    categoryKey: 'website',
    icon: '🌐',
    items: [
      { nameKey: 'designColors', href: '/design', icon: '🎨' },
      { nameKey: 'photosMedia', href: '/media', icon: '📷' },
      { nameKey: 'texts', href: '/teksten', icon: '✏️' },
      { nameKey: 'ourTeam', href: '/team', icon: '👨‍🍳' },
      { nameKey: 'giftCards', href: '/cadeaubonnen', icon: '🎁' },
      { nameKey: 'seo', href: '/seo', icon: '🔍' },
    ]
  },
  {
    categoryKey: 'marketing',
    icon: '📣',
    items: [
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
      { nameKey: 'vacancies', href: '/vacatures', icon: '📢' },
    ]
  },
  {
    categoryKey: 'accounting',
    icon: '📒',
    items: [
      { nameKey: 'scrada', href: '/scrada', icon: '📊' },
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
  {
    categoryKey: 'statistics',
    icon: '📈',
    items: [
      { nameKey: 'businessAnalysis', href: '/analyse', icon: '📊' },
      { nameKey: 'sales', href: '/verkoop', icon: '💰' },
      { nameKey: 'popularItems', href: '/populair', icon: '🔥' },
    ]
  },
]

export default function AdminLayout({ children, params }: AdminLayoutProps) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const baseUrl = `/shop/${params.tenant}/admin`

  const isActive = (href: string) => {
    const fullPath = `${baseUrl}${href}`
    if (href === '') {
      return pathname === baseUrl || pathname === `${baseUrl}/`
    }
    return pathname.startsWith(fullPath)
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
          className="p-2 hover:bg-gray-100 rounded-lg text-orange-500"
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

      {/* Main Content */}
      <main className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} pt-16 lg:pt-0 overflow-x-hidden`}>
        <div className="p-4 md:p-6 max-w-full">
          {children}
        </div>
      </main>
    </div>
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
  const langRef = useRef<HTMLDivElement>(null)
  const { locale, setLocale, t, locales, localeNames, localeFlags } = useLanguage()

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

  // Auto-expand section that contains active item
  useEffect(() => {
    menuItems.forEach((section) => {
      const hasActiveItem = section.items.some((item) => isActive(item.href))
      if (hasActiveItem && !expandedSections.includes(section.categoryKey)) {
        setExpandedSections(prev => [...prev, section.categoryKey])
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  const toggleSection = (categoryKey: string) => {
    setExpandedSections(prev => 
      prev.includes(categoryKey) 
        ? prev.filter(c => c !== categoryKey)
        : [...prev, categoryKey]
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

      {/* Language Selector */}
      {!collapsed && (
        <div ref={langRef} className="px-4 py-2 border-b relative">
          <button
            onClick={() => setIsLangOpen(!isLangOpen)}
            className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">{localeFlags[locale]}</span>
              <span className="text-sm font-medium text-gray-700">{localeNames[locale]}</span>
            </div>
            <svg 
              className={`w-4 h-4 text-gray-500 transition-transform ${isLangOpen ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {isLangOpen && (
            <div className="absolute left-4 right-4 mt-1 bg-white rounded-lg shadow-lg border z-50 max-h-64 overflow-y-auto">
              {locales.map((langCode) => (
                <button
                  key={langCode}
                  onClick={() => handleLanguageSelect(langCode)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors ${
                    locale === langCode ? 'bg-orange-50 text-orange-600' : 'text-gray-700'
                  }`}
                >
                  <span className="text-lg">{localeFlags[langCode]}</span>
                  <span className="text-sm">{localeNames[langCode]}</span>
                  {locale === langCode && (
                    <svg className="w-4 h-4 ml-auto text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {menuItems.map((section) => {
          const isExpanded = isSectionExpanded(section.categoryKey)
          const hasActive = hasActiveItemInSection(section)
          const categoryName = t(`admin.categories.${section.categoryKey}`)
          
          return (
            <div key={section.categoryKey} className="mb-1">
              {/* Category Header - Clickable */}
              <button
                onClick={() => !collapsed && toggleSection(section.categoryKey)}
                className={`w-full flex items-center justify-between px-4 py-3 transition-all ${
                  hasActive 
                    ? 'bg-orange-50 text-orange-600 border-l-4 border-orange-500' 
                    : 'text-gray-700 hover:bg-gray-50 border-l-4 border-transparent'
                } ${collapsed ? 'justify-center' : ''}`}
                title={collapsed ? categoryName : undefined}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{section.icon}</span>
                  {!collapsed && (
                    <span className="font-semibold text-sm">{categoryName}</span>
                  )}
                </div>
                {!collapsed && (
                  <svg 
                    className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>
              
              {/* Submenu Items */}
              <AnimatePresence initial={false}>
                {!collapsed && isExpanded && (
                  <motion.ul
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden bg-gray-50"
                  >
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
                            className={`flex items-center gap-3 pl-12 pr-4 py-2.5 transition-all ${
                              isActive(item.href)
                                ? 'bg-orange-500 text-white'
                                : 'text-gray-600 hover:bg-gray-100'
                            } ${item.fullscreen ? 'border-l-2 border-dashed border-gray-300' : ''}`}
                          >
                            <span className="text-base">{item.icon}</span>
                            <span className="text-sm flex items-center gap-2">
                              {t(`admin.menu.${item.nameKey}`)}
                              {item.fullscreen && <span className="text-xs opacity-60">↗</span>}
                            </span>
                          </Link>
                        </li>
                      )
                    })}
                  </motion.ul>
                )}
              </AnimatePresence>
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
