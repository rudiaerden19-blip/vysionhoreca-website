'use client'

import { useLayoutEffect } from 'react'

/** Zwart canvas vóór paint; voorkomt witte body-rand boven het klantscherm. */
export function KlantschermHtmlShell() {
  useLayoutEffect(() => {
    const html = document.documentElement
    const body = document.body
    html.classList.add('vysion-klantscherm-root')
    body.classList.add('vysion-klantscherm-root')
    return () => {
      html.classList.remove('vysion-klantscherm-root')
      body.classList.remove('vysion-klantscherm-root')
    }
  }, [])
  return null
}
