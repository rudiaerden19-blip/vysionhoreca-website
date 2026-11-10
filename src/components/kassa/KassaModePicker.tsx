'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { KASSA_UI_LAYOUT_OPTIONS, type KassaUiLayoutId } from '@/lib/kassa-ui-layout'

type Props = {
  layout: KassaUiLayoutId
  onSelect: (layout: KassaUiLayoutId) => void
  triggerClassName: string
  labelClassName: string
  panelClassName: string
  rowHoverClassName: string
  rowActiveClassName: string
  rowInactiveClassName: string
  t: (key: string) => string
}

const ROW_PX = 42
const MENU_PAD = 8

export function KassaModePicker({
  layout,
  onSelect,
  triggerClassName,
  labelClassName,
  panelClassName,
  rowHoverClassName,
  rowActiveClassName,
  rowInactiveClassName,
  t,
}: Props) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; minWidth: number } | null>(
    null,
  )

  const updateMenuPos = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const menuHeight = KASSA_UI_LAYOUT_OPTIONS.length * ROW_PX + MENU_PAD
    const gap = 4
    const margin = 8
    let top = r.bottom + gap
    if (top + menuHeight > window.innerHeight - margin) {
      top = Math.max(margin, r.top - menuHeight - gap)
    }
    const left = Math.min(Math.max(margin, r.left), window.innerWidth - margin - 200)
    setMenuPos({ top, left, minWidth: Math.max(r.width, 200) })
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    updateMenuPos()
    window.addEventListener('resize', updateMenuPos)
    window.addEventListener('scroll', updateMenuPos, true)
    return () => {
      window.removeEventListener('resize', updateMenuPos)
      window.removeEventListener('scroll', updateMenuPos, true)
    }
  }, [open, updateMenuPos])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const panel =
    open && menuPos && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={panelRef}
            role="listbox"
            aria-label={t('kassaApp.mode')}
            className={`fixed z-[250] py-1 ${panelClassName}`}
            style={{
              top: menuPos.top,
              left: menuPos.left,
              minWidth: menuPos.minWidth,
            }}
          >
            {KASSA_UI_LAYOUT_OPTIONS.map((option) => {
              const selected = option.id === layout
              return (
                <button
                  key={option.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  data-testid={`kassa-mode-${option.id}`}
                  className={`kassa-mode-picker__option flex w-full items-center px-3 py-2.5 text-left text-sm ${
                    selected ? rowActiveClassName : `${rowInactiveClassName} ${rowHoverClassName}`
                  }`}
                  onClick={() => {
                    onSelect(option.id)
                    setOpen(false)
                  }}
                >
                  {t(option.labelKey)}
                </button>
              )
            })}
          </div>,
          document.body,
        )
      : null

  return (
    <div className="kassa-mode-picker relative z-[40] shrink-0">
      <button
        ref={triggerRef}
        type="button"
        data-testid="kassa-mode-picker"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('kassaApp.mode')}
        title={t('kassaApp.mode')}
        onClick={() => setOpen((o) => !o)}
        className={triggerClassName}
      >
        <span className={labelClassName}>{t('kassaApp.mode')}</span>
        <svg
          className={`size-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {panel}
    </div>
  )
}
