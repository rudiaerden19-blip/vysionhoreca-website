'use client'

import { useRef } from 'react'
import { useLanguage } from '@/i18n'
import {
  KASSA_OSK_LINE_SHORTCUT_MAX_LEN,
  KASSA_OSK_LINE_SHORTCUT_SLOTS,
  sanitizeKassaOskLineShortcutLabel,
} from '@/lib/kassa-osk-line-shortcuts'
import {
  KASSA_AZERTY_OSK_NUMPAD_STRIP_WIDTH,
  KASSA_AZERTY_OSK_NUMPAD_WIDTH,
  KASSA_AZERTY_OSK_OPTION_BTN_WIDTH,
} from '@/lib/kassa-azerty-osk-context'

type Props = {
  draft: string[]
  speelsDark?: boolean
  /** Kassa-POS: vaste 3 cm knoppen, geen rek over mand. */
  kassaNumpad?: boolean
  onClose?: () => void
  onDraftChange: (next: string[]) => void
  onInsert: (label: string) => void
}

/** Zelfde rij-hoogte als `kassa-azerty-osk-key` in KassaAzertyOskProvider. */
const OSK_SHORTCUT_FIELD_HEIGHT =
  'min-h-[3rem] w-full max-w-[3cm] min-w-0 sm:min-h-[3.15rem]'

/**
 * Numpad-zone rechts van AZERTY — zelfde behuizing, verticale scheiding (zoals fysiek toetsenbord).
 */
export function KassaOskLineShortcutsPad({
  draft,
  speelsDark = false,
  kassaNumpad = false,
  onClose,
  onDraftChange,
  onInsert,
}: Props) {
  const { t } = useLanguage()
  const pressRef = useRef<{ at: number; index: number; timer?: number } | null>(null)
  const LONG_PRESS_MS = 450

  const setSlot = (index: number, value: string) => {
    const next = [...draft]
    next[index] = sanitizeKassaOskLineShortcutLabel(value)
    onDraftChange(next)
  }

  const fieldClass = speelsDark
    ? `kassa-osk-shortcut-field ${OSK_SHORTCUT_FIELD_HEIGHT} rounded-xl px-1 text-center text-xs font-bold outline-none sm:text-sm`
    : `${OSK_SHORTCUT_FIELD_HEIGHT} rounded-xl border border-neutral-500 bg-neutral-900 px-1 text-center text-xs font-bold text-white outline-none focus:border-[#58CCFF] sm:text-sm`

  const dividerClass = speelsDark ? 'border-[#252525]' : 'border-neutral-600'

  const stripWidth = kassaNumpad ? KASSA_AZERTY_OSK_NUMPAD_STRIP_WIDTH : KASSA_AZERTY_OSK_NUMPAD_WIDTH
  const numpadTitle = t('kassaApp.azertyOskShortcutsNumpadTitle')

  return (
    <div
      className={`flex shrink-0 flex-col self-start border-l pl-2 ${dividerClass}`}
      style={{ width: stripWidth }}
      data-testid="kassa-azerty-osk-shortcuts"
      aria-label={numpadTitle}
    >
      {onClose ? (
        <div className="mb-1 flex h-7 shrink-0 items-center justify-end">
          <button
            type="button"
            className={
              speelsDark
                ? 'flex h-7 w-7 touch-manipulation items-center justify-center text-lg font-bold leading-none text-[#b0b0b0] active:opacity-80'
                : 'flex h-7 w-7 touch-manipulation items-center justify-center text-lg font-bold leading-none text-neutral-300 active:text-white'
            }
            aria-label={t('kassaApp.azertyOskClose')}
            data-testid="kassa-azerty-osk-close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
      ) : null}
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(2, ${KASSA_AZERTY_OSK_OPTION_BTN_WIDTH})` }}
      >
        {Array.from({ length: KASSA_OSK_LINE_SHORTCUT_SLOTS }, (_, index) => {
          const label = draft[index] ?? ''
          return (
            <input
              key={`slot-${index}`}
              type="text"
              maxLength={KASSA_OSK_LINE_SHORTCUT_MAX_LEN}
              value={label}
              onChange={(e) => setSlot(index, e.target.value)}
              onPointerDown={(e) => {
                const trimmed = label.trim()
                const at = Date.now()
                const target = e.currentTarget
                pressRef.current = { at, index }
                if (!trimmed) return
                e.preventDefault()
                pressRef.current.timer = window.setTimeout(() => {
                  target.focus()
                }, LONG_PRESS_MS)
              }}
              onPointerUp={(e) => {
                const trimmed = label.trim()
                const press = pressRef.current
                if (press?.timer !== undefined) window.clearTimeout(press.timer)
                pressRef.current = null
                if (!trimmed || !press || press.index !== index) return
                if (Date.now() - press.at < LONG_PRESS_MS) {
                  e.preventDefault()
                  onInsert(trimmed)
                }
              }}
              onPointerCancel={() => {
                const press = pressRef.current
                if (press?.timer !== undefined) window.clearTimeout(press.timer)
                pressRef.current = null
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  const trimmed = label.trim()
                  if (trimmed) onInsert(trimmed)
                }
              }}
              placeholder={`${index + 1}`}
              title={t('kassaApp.azertyOskShortcutInsertHint')}
              className={fieldClass}
            />
          )
        })}
      </div>
    </div>
  )
}
