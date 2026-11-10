'use client'

import { useEffect, useState } from 'react'
import { useLanguage } from '@/i18n'
import {
  KASSA_OSK_LINE_SHORTCUT_MAX_LEN,
  KASSA_OSK_LINE_SHORTCUT_SLOTS,
  sanitizeKassaOskLineShortcutLabel,
} from '@/lib/kassa-osk-line-shortcuts'

export function KassaOskLineShortcutsConfigModal({
  open,
  initial,
  onClose,
  onSave,
  saving,
}: {
  open: boolean
  initial: string[]
  onClose: () => void
  onSave: (slots: string[]) => Promise<void>
  saving: boolean
}) {
  const { t } = useLanguage()
  const [draft, setDraft] = useState<string[]>(() => [...initial])

  useEffect(() => {
    if (open) setDraft([...initial])
  }, [initial, open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[520] flex items-center justify-center bg-black/55 p-4"
      data-testid="kassa-osk-shortcuts-config"
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-neutral-600 bg-neutral-900 p-4 shadow-2xl">
        <h2 className="mb-3 text-lg font-bold text-white">{t('kassaApp.azertyOskShortcutsTitle')}</h2>
        <p className="mb-4 text-sm text-neutral-300">{t('kassaApp.azertyOskShortcutsHint')}</p>
        <ol className="mb-4 flex flex-col gap-2">
          {Array.from({ length: KASSA_OSK_LINE_SHORTCUT_SLOTS }, (_, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="w-6 shrink-0 text-right text-xs font-bold text-neutral-400">{i + 1}</span>
              <input
                type="text"
                maxLength={KASSA_OSK_LINE_SHORTCUT_MAX_LEN}
                value={draft[i] ?? ''}
                onChange={(e) => {
                  const v = sanitizeKassaOskLineShortcutLabel(e.target.value)
                  setDraft((prev) => {
                    const next = [...prev]
                    next[i] = v
                    return next
                  })
                }}
                className="min-w-0 flex-1 rounded-lg border border-neutral-500 bg-neutral-800 px-3 py-2 text-base text-white outline-none focus:border-[#58CCFF]"
                placeholder={t('kassaApp.azertyOskShortcutPlaceholder')}
              />
            </li>
          ))}
        </ol>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="rounded-xl border border-neutral-500 px-4 py-2 text-sm font-bold text-white"
            onClick={onClose}
            disabled={saving}
          >
            {t('kassaApp.closeAria')}
          </button>
          <button
            type="button"
            className="rounded-xl bg-[#58CCFF] px-4 py-2 text-sm font-bold text-[#063042] disabled:opacity-50"
            disabled={saving}
            onClick={() =>
              onSave(
                draft.map((s) => sanitizeKassaOskLineShortcutLabel(s)),
              )
            }
          >
            {saving ? t('adminLayout.loading') : t('kassaApp.azertyOskShortcutsSave')}
          </button>
        </div>
      </div>
    </div>
  )
}
