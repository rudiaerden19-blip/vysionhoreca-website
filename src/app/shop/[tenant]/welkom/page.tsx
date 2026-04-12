'use client'

import { useEffect, useLayoutEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getTenantUrl } from '@/lib/tenant-url'
import { isSuperAdminLoggedIn } from '@/lib/auth-headers'
import { mirrorSuperadminSessionFromCookieToLocalStorage } from '@/lib/superadmin-cookies'

export default function WelkomPage({ params }: { params: { tenant: string } }) {
  const router = useRouter()
  const [showTitle, setShowTitle] = useState(false)
  const [showButton, setShowButton] = useState(false)

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return
    mirrorSuperadminSessionFromCookieToLocalStorage()
    if (!isSuperAdminLoggedIn()) return
    try {
      sessionStorage.setItem(`vysion_welcomed_${params.tenant}`, 'true')
    } catch {
      /* ignore */
    }
    router.replace(`/shop/${params.tenant}/admin`)
  }, [params.tenant, router])

  useEffect(() => {
    const t1 = setTimeout(() => setShowTitle(true), 200)
    const t2 = setTimeout(() => setShowButton(true), 1000)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  const handleEnter = () => {
    try {
      sessionStorage.setItem(`vysion_welcomed_${params.tenant}`, 'true')
      sessionStorage.removeItem(`vysion_kassa_audio_ok_${params.tenant}`)
      sessionStorage.removeItem(`vysion_audio_activated_${params.tenant}`)
    } catch {
      /* ignore */
    }
    const target = getTenantUrl(params.tenant, '/admin/kassa')
    if (target.startsWith('/')) {
      router.push(target)
    } else {
      window.location.href = target
    }
  }

  return (
    <div className="fixed inset-0 flex select-none flex-col items-center justify-center bg-[#e3e3e3] px-6">
      <div
        className={`mb-3 text-center transition-all duration-1000 ease-out ${
          showTitle ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}
      >
        <h1
          className="text-[clamp(2rem,8vw,4.5rem)] font-black leading-tight tracking-tight text-gray-900"
          style={{ letterSpacing: '-0.02em' }}
        >
          Vysion-Horeca
        </h1>
        <p className="mt-3 text-[clamp(1rem,3vw,1.5rem)] font-light uppercase tracking-[0.35em] text-gray-500">
          2026
        </p>
      </div>

      <p
        className={`mb-14 text-center text-sm font-semibold uppercase tracking-[0.2em] text-gray-600 transition-opacity duration-1000 ease-out ${
          showTitle ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ transitionDelay: showTitle ? '200ms' : '0ms' }}
      >
        Horeca Platform
      </p>

      <div
        className={`transition-opacity duration-500 ease-out ${
          showButton ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <button
          type="button"
          onClick={handleEnter}
          className="rounded-xl bg-accent px-12 py-4 text-base font-bold uppercase tracking-[0.2em] text-white shadow-md transition hover:bg-accent/90 hover:shadow-lg active:scale-[0.98]"
        >
          Enter
        </button>
      </div>
    </div>
  )
}
