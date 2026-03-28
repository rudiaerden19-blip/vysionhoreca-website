'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useLanguage } from '@/i18n'
import type { TenantModuleId } from '@/lib/tenant-modules'
import { allTenantModulesTrue } from '@/lib/tenant-modules'
import {
  buildHamburgerModules,
  filterHamburgerModulesForAccess,
} from '@/lib/admin-hamburger-modules'

/**
 * Zelfde module-structuur als kassa; alleen modules die de tenant aan heeft staan.
 * Gebruikt data uit de parent layout (één keer useTenantModuleFlags).
 */
export function AdminHamburgerMenu({
  tenantSlug,
  moduleAccess,
  featureGroupOrders,
  featureLabelPrinting,
  enabledModulesJson,
  loading,
}: {
  tenantSlug: string
  moduleAccess: Record<TenantModuleId, boolean>
  featureGroupOrders: boolean
  featureLabelPrinting: boolean
  enabledModulesJson: Record<string, boolean> | null
  loading: boolean
}) {
  const { t } = useLanguage()
  const baseUrl = `/shop/${tenantSlug}/admin`

  const filteredModules = useMemo(() => {
    const all = buildHamburgerModules(baseUrl, tenantSlug)
    const access = loading ? allTenantModulesTrue() : moduleAccess
    const g = loading ? true : featureGroupOrders
    const l = loading ? true : featureLabelPrinting
    const json = loading ? null : enabledModulesJson
    return filterHamburgerModulesForAccess(all, access, g, l, json)
  }, [baseUrl, tenantSlug, loading, moduleAccess, featureGroupOrders, featureLabelPrinting, enabledModulesJson])

  const [open, setOpen] = useState(false)
  const [subOpen, setSubOpen] = useState<string | null>(null)

  const closeAll = () => {
    setOpen(false)
    setSubOpen(null)
  }

  const activeMod = filteredModules.find((m) => m.key === subOpen)

  return (
    <div className="relative z-[110] shrink-0">
      {(open || subOpen) && (
        <div className="fixed inset-0 z-[105]" aria-hidden onClick={closeAll} />
      )}
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o)
          setSubOpen(null)
        }}
        className={`flex min-h-[44px] min-w-[44px] items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold shadow-md transition-colors ${
          open
            ? 'bg-slate-200 text-slate-900 ring-2 ring-white'
            : 'bg-white text-[#1e293b] ring-2 ring-white/50 hover:bg-slate-100'
        }`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <span className="max-w-[7rem] truncate sm:max-w-none">{t('adminLayout.modulesMenu')}</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-[120] mt-1 flex">
          <div
            className="max-h-[85vh] overflow-y-auto rounded-2xl border border-gray-100 bg-white shadow-2xl"
            style={{ width: 240 }}
          >
            <div className="sticky top-0 rounded-t-2xl bg-[#1e293b] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white">
              Menu
            </div>
            <Link
              href={baseUrl}
              prefetch={false}
              onClick={closeAll}
              className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-800 transition-colors hover:bg-blue-50"
            >
              <span>🏠</span>
              <span>Overzicht</span>
            </Link>
            {filteredModules.map((mod) => (
              <div key={mod.key} className="border-b border-gray-100 last:border-0">
                <button
                  type="button"
                  onClick={() => setSubOpen(subOpen === mod.key ? null : mod.key)}
                  className={`flex w-full items-center justify-between px-4 py-3 transition-colors ${
                    subOpen === mod.key ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{mod.icon}</span>
                    <span className="text-sm font-semibold text-gray-700">{mod.label}</span>
                  </div>
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {activeMod && (
            <div
              className="ml-2 max-h-[85vh] self-start overflow-y-auto rounded-2xl border border-gray-100 bg-white shadow-2xl"
              style={{ width: 220 }}
            >
              <div className="sticky top-0 flex items-center gap-2 rounded-t-2xl bg-[#1e293b] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white">
                <span>{activeMod.icon}</span> {activeMod.label}
              </div>
              {activeMod.items.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  prefetch={item.href === baseUrl ? false : undefined}
                  onClick={closeAll}
                  className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 text-sm text-gray-700 transition-colors last:border-0 hover:bg-blue-50"
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
