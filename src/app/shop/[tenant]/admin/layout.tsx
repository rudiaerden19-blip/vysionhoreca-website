'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

interface AdminLayoutProps {
  children: React.ReactNode
  params: { tenant: string }
}

const menuItems = [
  {
    category: 'OVERZICHT',
    items: [
      { name: 'Dashboard', href: '', icon: '📊' },
    ]
  },
  {
    category: 'INSTELLINGEN',
    items: [
      { name: 'Zaak profiel', href: '/profiel', icon: '🏪' },
      { name: 'Openingstijden', href: '/openingstijden', icon: '🕐' },
      { name: 'Levering & afhaal', href: '/levering', icon: '🚗' },
      { name: 'Betaalmethodes', href: '/betaling', icon: '💳' },
    ]
  },
  {
    category: 'MENU',
    items: [
      { name: 'Categorieën', href: '/categorieen', icon: '📁' },
      { name: 'Producten', href: '/producten', icon: '🍟' },
      { name: 'Opties & extra\'s', href: '/opties', icon: '➕' },
      { name: 'Allergenen', href: '/allergenen', icon: '⚠️' },
    ]
  },
  {
    category: 'WEBSITE',
    items: [
      { name: 'Design & kleuren', href: '/design', icon: '🎨' },
      { name: 'Foto\'s & media', href: '/media', icon: '📷' },
      { name: 'Teksten', href: '/teksten', icon: '✏️' },
      { name: 'SEO', href: '/seo', icon: '🔍' },
    ]
  },
  {
    category: 'MARKETING',
    items: [
      { name: 'QR-codes', href: '/qr-codes', icon: '📱' },
      { name: 'Promoties', href: '/promoties', icon: '🎁' },
      { name: 'Reviews', href: '/reviews', icon: '⭐' },
    ]
  },
  {
    category: 'KLANTEN',
    items: [
      { name: 'Klanten', href: '/klanten', icon: '👥' },
      { name: 'Beloningen', href: '/klanten/beloningen', icon: '🎁' },
    ]
  },
  {
    category: 'STATISTIEKEN',
    items: [
      { name: 'Verkoop', href: '/verkoop', icon: '💰' },
      { name: 'Bestellingen', href: '/bestellingen', icon: '📦' },
      { name: 'Populaire items', href: '/populair', icon: '🔥' },
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
    <div className="min-h-screen bg-gray-100">
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
      <main className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} pt-16 lg:pt-0`}>
        <div className="p-6">
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
      <nav className="flex-1 overflow-y-auto p-4">
        {menuItems.map((section) => (
          <div key={section.category} className="mb-6">
            {!collapsed && (
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3">
                {section.category}
              </h2>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={`${baseUrl}${item.href}`}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                      isActive(item.href)
                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    title={collapsed ? item.name : undefined}
                  >
                    <span className="text-lg">{item.icon}</span>
                    {!collapsed && <span className="font-medium">{item.name}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t">
        <Link
          href={`/shop/${tenant}`}
          target="_blank"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors ${collapsed ? 'justify-center' : ''}`}
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          {!collapsed && <span className="font-medium text-gray-600">Bekijk website</span>}
        </Link>
      </div>
    </div>
  )
}
