'use client'

import { useLanguage } from '@/i18n'

export function LoginKassaCloseHintModal({
  open,
  onDismiss,
}: {
  open: boolean
  onDismiss: () => void
}) {
  const { t } = useLanguage()
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[240] flex items-center justify-center bg-black/55 p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={t('login.kassaCloseHint.message')}
    >
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
        <p className="text-base leading-relaxed text-gray-800 sm:text-lg">
          {t('login.kassaCloseHint.message')}
        </p>
        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-xl bg-accent px-8 py-3.5 text-base font-semibold text-white transition-colors hover:bg-accent/90 active:scale-[0.98]"
          >
            {t('login.kassaCloseHint.understood')}
          </button>
        </div>
      </div>
    </div>
  )
}
