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
      className="fixed inset-0 z-[240] flex items-center justify-center bg-black/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('login.kassaCloseHint.message')}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
        <p className="text-sm leading-relaxed text-gray-800 sm:text-base">
          {t('login.kassaCloseHint.message')}
        </p>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
          >
            {t('login.kassaCloseHint.understood')}
          </button>
        </div>
      </div>
    </div>
  )
}
