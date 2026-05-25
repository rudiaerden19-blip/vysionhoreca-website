'use client'

import type { ReactNode } from 'react'
import { KassaWebKeyboard } from '@/components/kassa/KassaWebKeyboard'

/** Client wrapper: laat SSR layout ongewijzigd; web-toetsenbord alleen voor kassa-route handlers. */
export function KassaKeyboardShell({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <KassaWebKeyboard />
    </>
  )
}
