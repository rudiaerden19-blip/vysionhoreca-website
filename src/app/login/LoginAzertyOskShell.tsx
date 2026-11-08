'use client'

import { KassaAzertyOskProvider } from '@/components/kassa/KassaAzertyOskProvider'

export function LoginAzertyOskShell({ children }: { children: React.ReactNode }) {
  return <KassaAzertyOskProvider>{children}</KassaAzertyOskProvider>
}
