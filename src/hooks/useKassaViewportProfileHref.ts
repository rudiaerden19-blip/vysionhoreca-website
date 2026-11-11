'use client'

import { useEffect, useState } from 'react'

import { withKassaViewportProfileContext } from '@/lib/kassa-viewport-profile-context'

/** POS-navigatie: voorkomt hydration mismatch; context na mount. */
export function useKassaViewportProfileHref(href: string): string {
  const [resolved, setResolved] = useState(href)
  useEffect(() => {
    setResolved(withKassaViewportProfileContext(href))
  }, [href])
  return resolved
}
