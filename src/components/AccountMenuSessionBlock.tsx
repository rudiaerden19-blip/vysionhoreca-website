'use client'

import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useMemo } from 'react'
import { useLanguage } from '@/i18n'
import {
  buildShopInternalReturnPath,
  isOwnerSessionForTenant,
  isSuperAdminLoggedIn,
} from '@/lib/auth-headers'
import { clearSuperadminSessionCookies } from '@/lib/superadmin-cookies'

/**
 * Onder Account in het admin-/kassa-hamburgermenu: Inloggen of Uitloggen.
 */
export function AccountMenuSessionBlock({
  tenantSlug,
  onClose,
}: {
  tenantSlug: string
  onClose: () => void
}) {
  const { t } = useLanguage()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const searchKey = searchParams.toString()
  const loginReturnHref = useMemo(() => {
    const search = searchKey ? `?${searchKey}` : ''
    const next = buildShopInternalReturnPath(tenantSlug, pathname, search)
    return `/login?next=${encodeURIComponent(next)}`
  }, [tenantSlug, pathname, searchKey])
  const ownerHere = typeof window !== 'undefined' && isOwnerSessionForTenant(tenantSlug)
  const superHere = typeof window !== 'undefined' && isSuperAdminLoggedIn()

  const handleLogout = () => {
    const superOnly = superHere && !ownerHere
    try {
      localStorage.removeItem('vysion_tenant')
      localStorage.removeItem('superadmin_id')
      localStorage.removeItem('superadmin_email')
      localStorage.removeItem('superadmin_name')
      clearSuperadminSessionCookies()
      sessionStorage.removeItem(`vysion_pin_unlocked_${tenantSlug}`)
    } catch {
      /* ignore */
    }
    onClose()
    router.push(superOnly ? '/superadmin/login' : loginReturnHref)
    router.refresh()
  }

  return (
    <>
      <div className="border-t border-gray-200 bg-gray-50 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">
        {t('adminLayout.session')}
      </div>
      {ownerHere || superHere ? (
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-left text-sm font-semibold text-red-700 transition-colors hover:bg-red-50"
        >
          <span aria-hidden>🚪</span>
          <span>{t('adminLayout.logout')}</span>
        </button>
      ) : (
        <Link
          href={loginReturnHref}
          prefetch={false}
          onClick={onClose}
          className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-50"
        >
          <span aria-hidden>🔑</span>
          <span>{t('adminLayout.login')}</span>
        </Link>
      )}
    </>
  )
}
