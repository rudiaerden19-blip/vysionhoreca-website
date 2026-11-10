'use client'

import { useEffect, useState } from 'react'
import { isKassaHorecaPosPath } from '@/lib/kassa-osk-line-shortcuts'

/** Kassa dark + speels (mand-korrel + snelmenu-gloss). */
export function useKassaSpeelsDarkOskChrome(pathname: string): boolean {
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (!isKassaHorecaPosPath(pathname)) {
      setActive(false)
      return
    }
    const html = document.documentElement
    const read = () => {
      setActive(
        html.classList.contains('kassa-dark-appearance') &&
          html.classList.contains('kassa-speels-layout'),
      )
    }
    read()
    const obs = new MutationObserver(read)
    obs.observe(html, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [pathname])

  return active
}
