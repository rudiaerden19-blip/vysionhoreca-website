'use client'

import { useLanguage } from '@/i18n'
import { KASSA_AZERTY_OSK_TOGGLE_BTN_CLASS } from '@/lib/kassa-azerty-osk'
import {
  KASSA_OSK_LINE_SHORTCUT_MAX_LEN,
  KASSA_OSK_LINE_SHORTCUT_SLOTS,
  sanitizeKassaOskLineShortcutLabel,
} from '@/lib/kassa-osk-line-shortcuts'
import { KASSA_AZERTY_OSK_NUMPAD_WIDTH } from '@/lib/kassa-azerty-osk-context'

type Props = {
  draft: string[]
  saving: boolean
  speelsDark?: boolean
  onDraftChange: (next: string[]) => void
  onInsert: (label: string) => void
  onSave: () => void
}

/**
 * Numpad-zone rechts van AZERTY — zelfde behuizing, verticale scheiding (zoals fysiek toetsenbord).
 */
export function KassaOskLineShortcutsPad({
  draft,
  saving,
  speelsDark = false,
  onDraftChange,
  onInsert,
  onSave,
}: Props) {
  const { t } = useLanguage()

  const setSlot = (index: number, value: string) => {
    const next = [...draft]
    next[index] = sanitizeKassaOskLineShortcutLabel(value)
    onDraftChange(next)
  }

  const onKeyPointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
  }

  const fieldClass = speelsDark
    ? 'kassa-osk-shortcut-field min-h-[2.85rem] w-full min-w-0 rounded-xl px-1.5 text-center text-xs font-bold outline-none sm:min-h-[3rem] sm:text-sm'
    : 'min-h-[2.85rem] w-full min-w-0 rounded-xl border border-neutral-500 bg-neutral-900 px-1.5 text-center text-xs font-bold text-white outline-none focus:border-[#58CCFF] sm:min-h-[3rem] sm:text-sm'

  const dividerClass = speelsDark ? 'border-[#252525]' : 'border-neutral-600'

  return (
    <div
      className={`flex shrink-0 flex-col self-stretch border-l pl-2.5 ${dividerClass}`}
      style={{ width: KASSA_AZERTY_OSK_NUMPAD_WIDTH }}
      data-testid="kassa-azerty-osk-shortcuts"
    >
      <div className="mb-1.5 shrink-0 pt-0.5 text-center text-[10px] font-semibold uppercase tracking-wide text-neutral-400 sm:text-xs">
        {t('kassaApp.azertyOskShortcutsNumpadTitle')}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-1.5 content-start">
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
        <button
          type="button"
          disabled={saving}
          className={`${KASSA_AZERTY_OSK_TOGGLE_BTN_CLASS} col-span-2 min-h-[3rem] w-full text-sm font-bold sm:min-h-[3.15rem] sm:text-base`}
          onPointerDown={onKeyPointerDown}
          onClick={onSave}
        >
          {saving ? t('adminLayout.loading') : t('kassaApp.azertyOskShortcutsSave')}
        </button>
      </div>
    </div>
  )
}
