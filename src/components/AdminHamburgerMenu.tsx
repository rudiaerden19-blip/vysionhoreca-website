'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useLanguage } from '@/i18n'
import { AccountMenuSessionBlock } from '@/components/AccountMenuSessionBlock'
import {
  buildHamburgerModules,
  filterHamburgerModulesForAccess,
} from '@/lib/admin-hamburger-modules'
import { useTenantModuleFlagsContext } from '@/lib/tenant-module-flags-context'

/**
 * Zelfde module-structuur als kassa; alleen modules die de tenant aan heeft staan.
 * Deelt module-flags met layout via TenantModuleFlagsProvider (één fetch).
 */
export function AdminHamburgerMenu({ tenantSlug }: { tenantSlug: string }) {
  const { t } = useLanguage()
  const baseUrl = `/shop/${tenantSlug}/admin`
  const {
    moduleAccess,
    enabledModulesJson,
    featureLabelPrinting,
    loading,
  } = useTenantModuleFlagsContext()

  const filteredModules = useMemo(() => {
    const all = buildHamburgerModules(baseUrl, tenantSlug)
    if (loading) return []
    return filterHamburgerModulesForAccess(
      all,
      moduleAccess,
      featureLabelPrinting,
      enabledModulesJson,
    )
  }, [baseUrl, tenantSlug, loading, moduleAccess, featureLabelPrinting, enabledModulesJson])

  const [open, setOpen] = useState(false)
  const [subOpen, setSubOpen] = useState<string | null>(null)

  const closeAll = () => {
    setOpen(false)
    setSubOpen(null)
  }

  const activeMod = filteredModules.find((m) => m.rowKey === subOpen)

  return (
    <div className="relative z-[110] shrink-0">
      {(open || subOpen) && (
        <div className="fixed inset-0 z-[105]" aria-hidden onClick={closeAll} />
      )}
      <button
        type="button"
        disabled={loading}
        onClick={() => {
          if (loading) return
          setSubOpen(null)
          setOpen((o) => !o)
        }}
        className={`flex min-h-[44px] min-w-[44px] items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold shadow-md transition-colors ${
          loading
            ? 'cursor-wait bg-[#58CCFF]/70 text-[#063042]/80'
            : open
              ? 'bg-[#47c6fe] text-[#063042]'
              : 'bg-[#58CCFF] text-[#063042] hover:bg-[#47c6fe]'
        }`}
        aria-expanded={open}
        aria-haspopup="true"
        aria-busy={loading}
      >
        <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <span className="max-w-[7rem] truncate sm:max-w-none">{t('adminLayout.menu')}</span>
      </button>

      {open && !loading && (
        <div className="absolute left-0 top-full z-[120] mt-1 flex max-w-none">
          <div
            className="max-h-[85vh] max-w-none shrink-0 overflow-y-auto rounded-2xl border border-gray-100 bg-white shadow-2xl"
            style={{ width: 240, maxWidth: 'none' }}
          >
            <div className="sticky top-0 rounded-t-2xl bg-[#1e293b] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white">
              {t('adminLayout.menu')}
            </div>
            <Link
              href={baseUrl}
              prefetch={false}
              onClick={closeAll}
              className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-800 transition-colors hover:bg-blue-50"
            >
              <span>{t('adminLayout.overview')}</span>
            </Link>
            {filteredModules.map((mod) => (
              <div key={mod.rowKey} className="border-b border-gray-100 last:border-0">
                <div
                  className={`flex w-full items-stretch transition-colors ${
                    subOpen === mod.rowKey ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  {mod.entryHref ? (
                    <Link
                      href={mod.entryHref}
                      prefetch={false}
                      onClick={closeAll}
                      className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 no-underline"
                    >
                      <span className="text-sm font-semibold text-gray-700">
                        {mod.labelKey ? t(mod.labelKey) : mod.label}
                      </span>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSubOpen(subOpen === mod.rowKey ? null : mod.rowKey)}
                      className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left"
                    >
                      <span className="text-sm font-semibold text-gray-700">
                        {mod.labelKey ? t(mod.labelKey) : mod.label}
                      </span>
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label={t('adminLayout.menu')}
                    onClick={() => setSubOpen(subOpen === mod.rowKey ? null : mod.rowKey)}
                    className="flex shrink-0 items-center px-3 py-3 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {open && subOpen && activeMod && (
            <div
              className="ml-2 max-h-[85vh] max-w-none shrink-0 self-start overflow-y-auto rounded-2xl border border-gray-100 bg-white shadow-2xl"
              style={{ width: 220, maxWidth: 'none' }}
            >
              <div className="sticky top-0 flex items-center gap-2 rounded-t-2xl bg-[#1e293b] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white">
                {activeMod.labelKey ? t(activeMod.labelKey) : activeMod.label}
              </div>
              {activeMod.items.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  prefetch={item.href === baseUrl ? false : undefined}
                  onClick={closeAll}
                  className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 text-sm text-gray-700 transition-colors hover:bg-blue-50"
                >
                  <span>{item.labelKey ? t(item.labelKey) : item.label}</span>
                </Link>
              ))}
              {activeMod.rowKey === 'account' && (
                <AccountMenuSessionBlock tenantSlug={tenantSlug} onClose={closeAll} />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
