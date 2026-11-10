'use client'

import { useEffect, useMemo, type CSSProperties } from 'react'
import { useKassaAzertyOskChrome } from '@/lib/kassa-azerty-osk-context'
import { scheduleScrollInputAboveKeyboard } from '@/lib/scroll-input-above-keyboard'

/** Admin website-formulieren: OSK + scroll (alle tenants, via ShopAzertyOskShell). */
export function useAdminAzertyOskPageChrome(options?: {
  /** Extra deps om scroll opnieuw te plannen (bv. open modal). */
  scrollDeps?: unknown[]
  /** Padding onderaan zonder OSK (bv. `6rem` voor FAB). */
  defaultPaddingBottom?: string
}) {
  const azertyOsk = useKassaAzertyOskChrome()
  const oskContentPad =
    azertyOsk?.visible && azertyOsk.heightPx > 0 ? azertyOsk.heightPx + 16 : 0
  const saveFabBottom = oskContentPad > 0 ? oskContentPad + 16 : 24
  const oskModalMaxHeight =
    oskContentPad > 0 ? `calc(100vh - ${72 + oskContentPad}px)` : undefined
  const defaultPad = options?.defaultPaddingBottom ?? '6rem'

  const pageStyle = useMemo((): CSSProperties | undefined => {
    if (oskContentPad > 0) {
      return { paddingBottom: `${Math.max(96, oskContentPad + 16)}px` }
    }
    return defaultPad ? { paddingBottom: defaultPad } : undefined
  }, [defaultPad, oskContentPad])

  const extraDeps = options?.scrollDeps ?? []
  useEffect(() => {
    if (oskContentPad <= 0) return
    const active = document.activeElement
    if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
      scheduleScrollInputAboveKeyboard(active)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oskContentPad, ...extraDeps])

  const pageRootProps = {
    'data-osk-scroll': true,
    'data-osk-next': 'true' as const,
    'data-testid': 'admin-osk-form-page',
    style: pageStyle,
  }

  return {
    azertyOsk,
    oskContentPad,
    saveFabBottom,
    oskModalMaxHeight,
    pageRootProps,
    dismissOsk: () => azertyOsk?.dismiss(),
  }
}
