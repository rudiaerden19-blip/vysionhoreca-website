'use client'

import { KassaAzertyOskProvider } from '@/components/kassa/KassaAzertyOskProvider'

export function KassaAzertyOskLayoutClient({ children }: { children: React.ReactNode }) {
  return <KassaAzertyOskProvider>{children}</KassaAzertyOskProvider>
}
