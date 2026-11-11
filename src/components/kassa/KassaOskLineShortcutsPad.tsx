'use client'

import { useLanguage } from '@/i18n'
import {
  KASSA_OSK_LINE_SHORTCUT_MAX_LEN,
  KASSA_OSK_LINE_SHORTCUT_SLOTS,
  sanitizeKassaOskLineShortcutLabel,
} from '@/lib/kassa-osk-line-shortcuts'
import {
  KASSA_AZERTY_OSK_ROW_MIN_HEIGHT_CLASS,
  readKassaOskFieldValue,
} from '@/lib/kassa-azerty-osk'
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
  /** Alleen bij vast «Toetsenbord» bovenaan; anders tik = naar opmerking. */
  slotsEditable?: boolean
  onClose?: () => void
  onDraftChange: (next: string[]) => void
  onSlotFocus?: (input: HTMLInputElement) => void
  onInsert: (label: string) => void
}

/** Zelfde rij-hoogte als standaard OSK-toets (niet de hogere kassa-AZERTY-middenkolom). */
const OSK_SHORTCUT_FIELD_HEIGHT = `${KASSA_AZERTY_OSK_ROW_MIN_HEIGHT_CLASS} w-full min-w-0`

/**
 * Numpad-zone rechts van AZERTY — zelfde behuizing, verticale scheiding (zoals fysiek toetsenbord).
 */
export function KassaOskLineShortcutsPad({
  draft,
  speelsDark = false,
  kassaNumpad = false,
  slotsEditable = false,
  onClose,
  onDraftChange,
  onSlotFocus,
  onInsert,
}: Props) {
  const { t } = useLanguage()

  const setSlot = (index: number, value: string) => {
    const next = [...draft]
    next[index] = value.slice(0, KASSA_OSK_LINE_SHORTCUT_MAX_LEN)
    onDraftChange(next)
  }

  const fieldClass = speelsDark
    ? `kassa-osk-shortcut-field ${OSK_SHORTCUT_FIELD_HEIGHT} w-full rounded-xl pl-1 pr-8 text-center text-xs font-bold outline-none sm:text-sm`
    : `${OSK_SHORTCUT_FIELD_HEIGHT} w-full rounded-xl border border-neutral-500 bg-neutral-900 pl-1 pr-8 text-center text-xs font-bold text-white outline-none focus:border-[#58CCFF] sm:text-sm`

  const insertBtnClass = speelsDark
    ? 'absolute right-0.5 top-1/2 flex h-7 w-7 -translate-y-1/2 touch-manipulation items-center justify-center rounded-md text-base font-bold text-[#58CCFF] active:opacity-80'
    : 'absolute right-0.5 top-1/2 flex h-7 w-7 -translate-y-1/2 touch-manipulation items-center justify-center rounded-md border border-neutral-600 bg-neutral-700 text-base font-bold text-[#58CCFF] active:bg-neutral-600'

  const dividerClass = speelsDark ? 'border-[#252525]' : 'border-neutral-600'

  const readSlotInsertLabel = (input: HTMLInputElement): string =>
    sanitizeKassaOskLineShortcutLabel(readKassaOskFieldValue(input))

  const insertShortcutLabel = (rawLabel: string) => {
    const insertLabel = sanitizeKassaOskLineShortcutLabel(rawLabel)
    if (insertLabel) onInsert(insertLabel)
  }

  const insertSlotBtnClass = speelsDark
    ? `kassa-osk-shortcut-field relative ${OSK_SHORTCUT_FIELD_HEIGHT} w-full touch-manipulation rounded-xl border border-neutral-500 bg-neutral-900 pl-1 pr-7 text-center text-xs font-bold text-white active:border-[#58CCFF] sm:text-sm`
    : `relative ${OSK_SHORTCUT_FIELD_HEIGHT} w-full touch-manipulation rounded-xl border border-neutral-500 bg-neutral-900 pl-1 pr-7 text-center text-xs font-bold text-white active:border-[#58CCFF] sm:text-sm`

  const stripWidth = kassaNumpad ? KASSA_AZERTY_OSK_NUMPAD_STRIP_WIDTH : KASSA_AZERTY_OSK_NUMPAD_WIDTH
  const numpadTitle = t('kassaApp.azertyOskShortcutsNumpadTitle')

  return (
    <div
      className={`flex shrink-0 flex-col self-start border-l pl-2 ${dividerClass}`}
      style={{ width: stripWidth }}
      data-testid="kassa-azerty-osk-shortcuts"
      aria-label={numpadTitle}
    >
      <div className="mb-1 flex h-7 shrink-0 items-center justify-between gap-1">
        <span
          className={`min-w-0 flex-1 truncate text-[10px] font-semibold leading-tight sm:text-[11px] ${
            speelsDark ? 'text-[#909090]' : 'text-neutral-400'
          }`}
        >
          {t('kassaApp.azertyOskInsertLineNoteLabel')}
        </span>
        {onClose ? (
          <button
            type="button"
            className={
              speelsDark
                ? 'flex h-7 w-7 shrink-0 touch-manipulation items-center justify-center text-lg font-bold leading-none text-[#b0b0b0] active:opacity-80'
                : 'flex h-7 w-7 shrink-0 touch-manipulation items-center justify-center text-lg font-bold leading-none text-neutral-300 active:text-white'
            }
            aria-label={t('kassaApp.azertyOskClose')}
            data-testid="kassa-azerty-osk-close"
            onClick={onClose}
          >
            ✕
          </button>
        ) : (
          <span className="h-7 w-7 shrink-0" aria-hidden="true" />
        )}
      </div>
      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(2, ${KASSA_AZERTY_OSK_OPTION_BTN_WIDTH})` }}
      >
        {Array.from({ length: KASSA_OSK_LINE_SHORTCUT_SLOTS }, (_, index) => {
          const label = draft[index] ?? ''
          const trimmed = label.trim()
          return (
            <div
              key={`slot-${index}`}
              className="relative w-full min-w-0"
              style={{ maxWidth: KASSA_AZERTY_OSK_OPTION_BTN_WIDTH }}
            >
              {slotsEditable ? (
                <>
                  <input
                    type="text"
                    maxLength={KASSA_OSK_LINE_SHORTCUT_MAX_LEN}
                    value={label}
                    autoComplete="off"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    inputMode="text"
                    data-no-capitalize="true"
                    data-kassa-osk-force="true"
                    data-kassa-osk-shortcut-slot="true"
                    data-kassa-osk-shortcut-index={String(index)}
                    onChange={(e) => setSlot(index, e.target.value)}
                    onPointerDown={(e) => {
                      const input = e.currentTarget
                      if (!(input instanceof HTMLInputElement)) return
                      input.focus()
                      onSlotFocus?.(input)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const insertLabel = readSlotInsertLabel(e.currentTarget)
                        if (insertLabel) onInsert(insertLabel)
                      }
                    }}
                    placeholder={`${index + 1}`}
                    title={t('kassaApp.azertyOskShortcutEditHint')}
                    className={fieldClass}
                  />
                  <button
                    type="button"
                    title={t('kassaApp.azertyOskShortcutInsertHint')}
                    aria-label={t('kassaApp.azertyOskShortcutInsertHint')}
                    aria-disabled={!trimmed}
                    className={`${insertBtnClass} ${!trimmed ? 'pointer-events-none opacity-25' : ''}`}
                    onPointerDown={(e) => {
                      if (e.button !== 0) return
                      e.preventDefault()
                      e.stopPropagation()
                      const row = e.currentTarget.parentElement
                      const input = row?.querySelector('input[data-kassa-osk-shortcut-slot="true"]')
                      if (!(input instanceof HTMLInputElement)) return
                      const insertLabel = readSlotInsertLabel(input)
                      if (insertLabel) onInsert(insertLabel)
                    }}
                  >
                    ›
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={!trimmed}
                  title={t('kassaApp.azertyOskShortcutInsertHint')}
                  aria-label={t('kassaApp.azertyOskShortcutInsertHint')}
                  data-testid={`kassa-osk-shortcut-insert-${index}`}
                  className={`${insertSlotBtnClass} disabled:opacity-25`}
                  onPointerDown={(e) => {
                    if (e.button !== 0) return
                    e.preventDefault()
                    e.stopPropagation()
                    insertShortcutLabel(label)
                  }}
                >
                  <span className="block truncate px-0.5">{trimmed || `${index + 1}`}</span>
                  <span className={`${insertBtnClass} pointer-events-none`}>›</span>
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
