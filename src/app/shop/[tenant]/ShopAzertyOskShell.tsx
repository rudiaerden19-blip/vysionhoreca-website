'use client'

import { KassaAzertyOskProvider } from '@/components/kassa/KassaAzertyOskProvider'

export function ShopAzertyOskShell({ children }: { children: React.ReactNode }) {
  return <KassaAzertyOskProvider>{children}</KassaAzertyOskProvider>
}
