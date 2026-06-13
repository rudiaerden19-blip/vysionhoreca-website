'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { useLanguage } from '@/i18n'
import {
  buildShopInternalReturnPath,
  isOwnerSessionForTenant,
  isSuperAdminLoggedIn,
} from '@/lib/auth-headers'
import {
  attemptCloseThenOrNavigate,
  applyFullStaffLogoutCleanup,
  broadcastTenantOwnerLogout,
  setTerminalLogout,
  type OwnerLogoutLanding,
} from '@/lib/session-broadcast'
import { LogoutSoftwareConfirmModal } from '@/components/LogoutSoftwareConfirmModal'
import {
  appendKassaCloseTipToLoginPathHref,
} from '@/lib/shop-login-kassa-tip'

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
  const [logoutSoftwareConfirmOpen, setLogoutSoftwareConfirmOpen] = useState(false)

  const performLogout = () => {
    const landing: OwnerLogoutLanding =
      superHere && !ownerHere ? 'superadmin-login' : 'tenant-login'
    applyFullStaffLogoutCleanup()
    if (landing === 'superadmin-login') {
      setTerminalLogout({ kind: 'superadmin' })
    } else {
      setTerminalLogout({ kind: 'staff', tenantSlug })
    }
    broadcastTenantOwnerLogout({ scope: 'full', tenantSlug, landing })
    onClose()
    const origin = window.location.origin
    if (landing === 'superadmin-login') {
      attemptCloseThenOrNavigate(() => {
        window.location.replace(`${origin}/superadmin/login`)
      })
    } else {
      attemptCloseThenOrNavigate(() => {
        window.location.replace(`${origin}${appendKassaCloseTipToLoginPathHref(loginReturnHref)}`)
      })
    }
  }

  return (
    <>
      <div className="border-t border-gray-200 bg-gray-50 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">
        {t('adminLayout.session')}
      </div>
      {ownerHere || superHere ? (
        <button
          type="button"
          onClick={() => setLogoutSoftwareConfirmOpen(true)}
          className="flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-left text-sm font-semibold text-red-700 transition-colors hover:bg-red-50"
        >
          <span aria-hidden></span>
          <span>{t('adminLayout.logout')}</span>
        </button>
      ) : (
        <Link
          href={loginReturnHref}
          prefetch={false}
          onClick={onClose}
          className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-50"
        >
          <span aria-hidden></span>
          <span>{t('adminLayout.login')}</span>
        </Link>
      )}
      <LogoutSoftwareConfirmModal
        open={logoutSoftwareConfirmOpen}
        onCancel={() => setLogoutSoftwareConfirmOpen(false)}
        onConfirm={() => {
          setLogoutSoftwareConfirmOpen(false)
          performLogout()
        }}
      />
    </>
  )
}
