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
