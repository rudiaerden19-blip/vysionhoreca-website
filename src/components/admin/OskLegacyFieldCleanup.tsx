'use client'

import { useEffect } from 'react'
import { disarmAllKassaOskInputs, releaseLegacyOskInputGuards } from '@/lib/kassa-azerty-osk'

/** Ruimt restanten van gepauzeerde AZERTY-pilot op (inputMode=none, …). */
export function OskLegacyFieldCleanup() {
  useEffect(() => {
    releaseLegacyOskInputGuards()
    disarmAllKassaOskInputs()
  }, [])
  return null
}
