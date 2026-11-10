'use client'

import { useLanguage } from '@/i18n'
import { KASSA_AZERTY_OSK_TOGGLE_BTN_CLASS } from '@/lib/kassa-azerty-osk'
import {
  KASSA_OSK_LINE_SHORTCUT_MAX_LEN,
  KASSA_OSK_LINE_SHORTCUT_SLOTS,
  sanitizeKassaOskLineShortcutLabel,
} from '@/lib/kassa-osk-line-shortcuts'

type Props = {
  draft: string[]
  saving: boolean
  onDraftChange: (next: string[]) => void
  onInsert: (label: string) => void
  onSave: () => void
}

export function KassaOskLineShortcutsPad({
  draft,
  saving,
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

  return (
    <div
      className="flex w-[min(11rem,28vw)] min-w-[9.5rem] shrink-0 flex-col gap-1.5 rounded-r-2xl border border-l-0 border-neutral-600 bg-neutral-800/95 p-2 shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-md"
      data-testid="kassa-azerty-osk-shortcuts"
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
            className="min-h-[2.65rem] w-full rounded-xl border border-neutral-500 bg-neutral-900 px-2 text-center text-sm font-bold text-white outline-none focus:border-[#58CCFF] sm:min-h-[2.85rem] sm:text-base"
          />
        )
      })}
      <button
        type="button"
        disabled={saving}
        className={`${KASSA_AZERTY_OSK_TOGGLE_BTN_CLASS} min-h-[2.85rem] w-full sm:min-h-[3rem]`}
        onPointerDown={onKeyPointerDown}
        onClick={onSave}
      >
        {saving ? t('adminLayout.loading') : t('kassaApp.azertyOskShortcutsSave')}
      </button>
    </div>
  )
}
