'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, usePathname } from 'next/navigation'
import { useLanguage } from '@/i18n'
import {
  KASSA_AZERTY_LETTER_ROWS,
  KASSA_AZERTY_NUMBER_ROW,
  applyKassaAzertyOskEdit,
  armKassaOskInput,
  disarmKassaOskInput,
  isKassaAzertyOskEnabled,
  isKassaAzertyOskTextTarget,
  isTenantAzertyOskRoute,
  kassaAzertyKeyDisplay,
} from '@/lib/kassa-azerty-osk'
import {
  releaseAllOskScrollPadding,
  scheduleScrollInputAboveKeyboard,
} from '@/lib/scroll-input-above-keyboard'

/** Ruimte onderaan pagina zodat invoervelden niet achter het toetsenbord verdwijnen. */
const OSK_HEIGHT_PX = 336

export function KassaAzertyOskProvider({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const pathname = usePathname() ?? ''
  const { t } = useLanguage()
  const tenantSlug = typeof params?.tenant === 'string' ? params.tenant : ''
  const enabled =
    isKassaAzertyOskEnabled(tenantSlug) && isTenantAzertyOskRoute(pathname, tenantSlug)

  const [visible, setVisible] = useState(false)
  const [shift, setShift] = useState(false)
  const activeRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
  const suppressedRef = useRef(false)

  const hideKeyboard = useCallback((disarm: boolean) => {
    const prev = activeRef.current
    if (disarm && prev) disarmKassaOskInput(prev)
    activeRef.current = null
    setVisible(false)
    setShift(false)
    releaseAllOskScrollPadding()
  }, [])

  useEffect(() => {
    if (!enabled || !visible || suppressedRef.current) {
      document.documentElement.style.paddingBottom = ''
      return
    }
    document.documentElement.style.paddingBottom = `${OSK_HEIGHT_PX}px`
    return () => {
      document.documentElement.style.paddingBottom = ''
    }
  }, [enabled, visible])

  useEffect(() => {
    if (!enabled) return

    let scrollCancel: (() => void) | undefined

    const onFocusIn = (e: FocusEvent) => {
      if (!isKassaAzertyOskTextTarget(e.target)) return
      const el = e.target
      const prev = activeRef.current
      if (prev && prev !== el) {
        disarmKassaOskInput(prev)
      }
      suppressedRef.current = false
      activeRef.current = el
      armKassaOskInput(el)
      setVisible(true)
      scrollCancel?.()
      scrollCancel = scheduleScrollInputAboveKeyboard(el)
      window.requestAnimationFrame(() => {
        try {
          el.scrollIntoView({ block: 'center', behavior: 'smooth' })
        } catch {
          /* ignore */
        }
      })
    }

    const onFocusOut = () => {
      window.setTimeout(() => {
        const active = document.activeElement
        if (isKassaAzertyOskTextTarget(active) && active === activeRef.current) return
        hideKeyboard(true)
        suppressedRef.current = false
      }, 120)
    }

    document.addEventListener('focusin', onFocusIn, true)
    document.addEventListener('focusout', onFocusOut, true)
    return () => {
      scrollCancel?.()
      document.removeEventListener('focusin', onFocusIn, true)
      document.removeEventListener('focusout', onFocusOut, true)
      hideKeyboard(true)
    }
  }, [enabled, hideKeyboard])

  const onClose = () => {
    suppressedRef.current = true
    setVisible(false)
    setShift(false)
    const el = activeRef.current
    if (el) disarmKassaOskInput(el)
  }

  const sendEdit = (edit: Parameters<typeof applyKassaAzertyOskEdit>[1]) => {
    const el = activeRef.current
    if (!el) return
    applyKassaAzertyOskEdit(el, edit)
  }

  const onKeyPointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
  }

  const keyBtnClass =
    'min-h-[3.25rem] touch-manipulation select-none rounded-xl border border-slate-500 bg-slate-800 px-0.5 text-center text-xl font-bold text-white active:bg-slate-600 sm:min-h-[3.5rem] sm:text-2xl'

  return (
    <>
      {children}
      {enabled && visible && !suppressedRef.current ? (
        <div
          className="fixed bottom-0 left-0 right-0 z-[500] border-t border-slate-600 bg-slate-900/98 px-3 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 shadow-[0_-8px_24px_rgba(0,0,0,0.45)]"
          role="region"
          aria-label={t('kassaApp.azertyOskTitle')}
          style={{ minHeight: OSK_HEIGHT_PX, maxHeight: 'min(44vh, 380px)' }}
          data-testid="kassa-azerty-osk"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 sm:text-sm">
              {t('kassaApp.azertyOskTitle')}
            </span>
            <button
              type="button"
              className="touch-manipulation min-h-[2.75rem] min-w-[2.75rem] rounded-xl border border-slate-500 bg-slate-800 px-4 text-lg font-bold text-slate-100 active:bg-slate-600"
              aria-label={t('kassaApp.azertyOskClose')}
              data-testid="kassa-azerty-osk-close"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-10 gap-1.5 sm:gap-2">
              {KASSA_AZERTY_NUMBER_ROW.map((key) => (
                <button
                  key={`n-${key}`}
                  type="button"
                  className={keyBtnClass}
                  onPointerDown={onKeyPointerDown}
                  onClick={() => sendEdit({ char: kassaAzertyKeyDisplay(key, shift) })}
                >
                  {kassaAzertyKeyDisplay(key, shift)}
                </button>
              ))}
            </div>
            {KASSA_AZERTY_LETTER_ROWS.map((row, ri) => (
              <div
                key={`r-${ri}`}
                className="grid gap-1.5 sm:gap-2"
                style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}
              >
                {row.map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={keyBtnClass}
                    onPointerDown={onKeyPointerDown}
                    onClick={() => sendEdit({ char: kassaAzertyKeyDisplay(key, shift) })}
                  >
                    {kassaAzertyKeyDisplay(key, shift)}
                  </button>
                ))}
              </div>
            ))}
            <div className="grid grid-cols-[auto,1fr,auto,auto] gap-1.5 sm:gap-2">
              <button
                type="button"
                className={`${keyBtnClass} min-w-[3.25rem] px-3 sm:min-w-[3.5rem] ${shift ? 'border-cyan-500 bg-cyan-900' : ''}`}
                onPointerDown={onKeyPointerDown}
                onClick={() => setShift((s) => !s)}
              >
                ⇧
              </button>
              <button
                type="button"
                className={`${keyBtnClass} text-base`}
                onPointerDown={onKeyPointerDown}
                onClick={() => sendEdit('space')}
              >
                {' '}
              </button>
              <button
                type="button"
                className={`${keyBtnClass} min-w-[3.25rem] px-3 sm:min-w-[3.5rem]`}
                onPointerDown={onKeyPointerDown}
                onClick={() => sendEdit('backspace')}
              >
                ⌫
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
