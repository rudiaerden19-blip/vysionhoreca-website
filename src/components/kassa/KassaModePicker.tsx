'use client'

import { useEffect, useRef, useState } from 'react'
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
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const el = rootRef.current
      if (!el || el.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div ref={rootRef} className="relative z-[40] shrink-0">
      <button
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
      {open ? (
        <div
          role="listbox"
          aria-label={t('kassaApp.mode')}
          className={`absolute left-0 top-full z-[130] mt-1 min-w-[12.5rem] py-1 ${panelClassName}`}
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
                className={`flex w-full items-center px-3 py-2.5 text-left text-sm ${
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
        </div>
      ) : null}
    </div>
  )
}
