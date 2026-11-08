'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import {
  disarmAllKassaOskInputs,
  healOskBlockedTextField,
  releaseLegacyOskInputGuards,
} from '@/lib/kassa-azerty-osk'

/** Ruimt restanten van AZERTY-pilot op; herstelt typen na product/modal-wissel. */
export function OskLegacyFieldCleanup() {
  const pathname = usePathname() ?? ''

  useEffect(() => {
    releaseLegacyOskInputGuards()
    disarmAllKassaOskInputs()
  }, [pathname])

  useEffect(() => {
    const onFocusIn = (e: Event) => {
      const t = e.target
      if (!(t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement)) return
      healOskBlockedTextField(t)
    }
    document.addEventListener('focusin', onFocusIn, true)
    return () => document.removeEventListener('focusin', onFocusIn, true)
  }, [])

  return null
}
