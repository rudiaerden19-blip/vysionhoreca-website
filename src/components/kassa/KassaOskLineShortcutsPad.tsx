'use client'

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
  onDraftChange: (next: string[]) => void
  onInsert: (label: string) => void
}

/**
 * Numpad-zone rechts van AZERTY — zelfde behuizing, verticale scheiding (zoals fysiek toetsenbord).
 */
export function KassaOskLineShortcutsPad({
  draft,
  speelsDark = false,
  kassaNumpad = false,
  onDraftChange,
  onInsert,
}: Props) {
  const { t } = useLanguage()

  const setSlot = (index: number, value: string) => {
    const next = [...draft]
    next[index] = sanitizeKassaOskLineShortcutLabel(value)
    onDraftChange(next)
  }

  const fieldClass = speelsDark
    ? 'kassa-osk-shortcut-field min-h-[2.75rem] w-full max-w-[3cm] min-w-0 rounded-xl px-1 text-center text-xs font-bold outline-none sm:min-h-[3rem] sm:text-sm'
    : 'min-h-[2.75rem] w-full max-w-[3cm] min-w-0 rounded-xl border border-neutral-500 bg-neutral-900 px-1 text-center text-xs font-bold text-white outline-none focus:border-[#58CCFF] sm:min-h-[3rem] sm:text-sm'

  const dividerClass = speelsDark ? 'border-[#252525]' : 'border-neutral-600'

  const stripWidth = kassaNumpad ? KASSA_AZERTY_OSK_NUMPAD_STRIP_WIDTH : KASSA_AZERTY_OSK_NUMPAD_WIDTH

  return (
    <div
      className={`flex shrink-0 flex-col self-start border-l pl-2 ${dividerClass}`}
      style={{ width: stripWidth }}
      data-testid="kassa-azerty-osk-shortcuts"
    >
      <div className="mb-1 shrink-0 pt-0.5 text-center text-[10px] font-semibold uppercase tracking-wide text-neutral-400 sm:text-xs">
        {t('kassaApp.azertyOskShortcutsNumpadTitle')}
      </div>
      <div
        className="grid gap-1.5"
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
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  const trimmed = label.trim()
                  if (trimmed) onInsert(trimmed)
                }
              }}
              onDoubleClick={() => {
                const trimmed = label.trim()
                if (trimmed) onInsert(trimmed)
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
