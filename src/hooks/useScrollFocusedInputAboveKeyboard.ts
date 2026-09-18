'use client'

import { useEffect, useRef, useState } from 'react'
import {
  focusNextCatalogField,
  isEditableCatalogTextField,
  releaseAllOskScrollPadding,
  scheduleScrollInputAboveKeyboard,
  scrollInputAboveKeyboard,
} from '@/lib/scroll-input-above-keyboard'

/**
 * Bij focus op een tekstvak: veld boven het OS-schermtoetsenbord houden.
 * Alleen mounten op admin catalogus-pagina's — niet op de kassa-POS.
 */
export function useScrollFocusedInputAboveKeyboard(opts?: {
  onEditableFocus?: (el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) => void
}): void {
  const onEditableFocusRef = useRef(opts?.onEditableFocus)
  onEditableFocusRef.current = opts?.onEditableFocus

  useEffect(() => {
    let cancel: (() => void) | undefined
    let blurTimer: number | undefined
    const onFocusIn = (e: Event) => {
      const t = e.target
      if (!isEditableCatalogTextField(t)) return
      window.clearTimeout(blurTimer)
      onEditableFocusRef.current?.(t)
      cancel?.()
      cancel = scheduleScrollInputAboveKeyboard(t)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return
      const t = e.target
      if (!(t instanceof HTMLElement) || !isEditableCatalogTextField(t)) return
      if (focusNextCatalogField(t)) e.preventDefault()
    }
    const onFocusOut = () => {
      window.clearTimeout(blurTimer)
      blurTimer = window.setTimeout(() => {
        if (isEditableCatalogTextField(document.activeElement)) return
        releaseAllOskScrollPadding()
      }, 220)
    }
    const onViewport = () => {
      const t = document.activeElement
      if (!isEditableCatalogTextField(t)) return
      scrollInputAboveKeyboard(t)
    }
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('focusout', onFocusOut)
    window.visualViewport?.addEventListener('resize', onViewport)
    window.visualViewport?.addEventListener('scroll', onViewport)
    return () => {
      cancel?.()
      window.clearTimeout(blurTimer)
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('focusout', onFocusOut)
      window.visualViewport?.removeEventListener('resize', onViewport)
      window.visualViewport?.removeEventListener('scroll', onViewport)
      releaseAllOskScrollPadding()
    }
  }, [])
}

/** Overlay van een admin-modal in het zichtbare scherm (iOS krimpt visualViewport). */
export function useVisualViewportBox(): { offsetTop: number; height: number } {
  const [box, setBox] = useState({ offsetTop: 0, height: 800 })

  useEffect(() => {
    const update = () => {
      const vv = window.visualViewport
      setBox({
        offsetTop: vv?.offsetTop ?? 0,
        height: Math.max(1, Math.round(vv?.height ?? window.innerHeight)),
      })
    }
    update()
    window.visualViewport?.addEventListener('resize', update)
    window.visualViewport?.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    return () => {
      window.visualViewport?.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return box
}
