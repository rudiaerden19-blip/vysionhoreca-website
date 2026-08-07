'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Locale, useLanguage } from '@/i18n'
import { LocaleFlagEmoji } from '@/components/LocaleFlagEmoji'

const ROW_PX = 40
const MENU_PAD = 12

type LocalePickerPortalMenuProps = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  triggerRef: React.RefObject<HTMLElement | null>
  /** Optional class for the menu panel (background, border, dark theme). */
  panelClassName?: string
  rowHoverClassName?: string
  rowActiveClassName?: string
  rowInactiveClassName?: string
}

export function LocalePickerPortalMenu({
  isOpen,
  onOpenChange,
  triggerRef,
  panelClassName = 'overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl py-1',
  rowHoverClassName = 'hover:bg-gray-50',
  rowActiveClassName = 'bg-blue-50 font-semibold text-blue-600',
  rowInactiveClassName = 'text-gray-700',
}: LocalePickerPortalMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)
  const { locale, setLocale, locales, localeNames, t } = useLanguage()

  const updateMenuPos = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const menuHeight = locales.length * ROW_PX + MENU_PAD
    const gap = 8
    const margin = 8
    let top = r.bottom + gap
    if (top + menuHeight > window.innerHeight - margin) {
      top = Math.max(margin, r.top - menuHeight - gap)
    }
    setMenuPos({ top, right: Math.max(margin, window.innerWidth - r.right) })
  }, [locales.length, triggerRef])

  useLayoutEffect(() => {
    if (!isOpen) return
    updateMenuPos()
    window.addEventListener('resize', updateMenuPos)
    window.addEventListener('scroll', updateMenuPos, true)
    return () => {
      window.removeEventListener('resize', updateMenuPos)
      window.removeEventListener('scroll', updateMenuPos, true)
    }
  }, [isOpen, updateMenuPos])

  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isOpen])

  const pickLocale = (langCode: Locale) => {
    setLocale(langCode)
    onOpenChange(false)
  }

  if (!isOpen || !menuPos || typeof document === 'undefined') return null

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[249] touch-none bg-black/20"
        aria-hidden
        onPointerDown={(e) => {
          e.preventDefault()
          onOpenChange(false)
        }}
      />
      <div
        ref={menuRef}
        role="listbox"
        aria-label={t('nav.language')}
        className={`fixed z-[250] min-w-[180px] ${panelClassName}`}
        style={{ top: menuPos.top, right: menuPos.right }}
      >
        {locales.map((langCode) => (
          <button
            key={langCode}
            type="button"
            role="option"
            aria-selected={locale === langCode}
            onClick={(e) => {
              e.stopPropagation()
              pickLocale(langCode)
            }}
            className={`flex w-full touch-manipulation items-center gap-3 px-4 py-2 text-sm transition-colors ${rowHoverClassName} ${
              locale === langCode ? rowActiveClassName : rowInactiveClassName
            }`}
          >
            <LocaleFlagEmoji locale={langCode} className="text-lg" />
            <span>{localeNames[langCode]}</span>
          </button>
        ))}
      </div>
    </>,
    document.body,
  )
}
