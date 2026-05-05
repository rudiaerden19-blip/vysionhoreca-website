'use client'

import { useLanguage } from '@/i18n'

/**
 * Bevestiging voor afmelden / software afsluiten (kassa, admin-menu, klant-account).
 */
export function LogoutSoftwareConfirmModal({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const { t } = useLanguage()
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center bg-black/55 p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-software-confirm-title"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
        onClick={e => e.stopPropagation()}
      >
        <h2 id="logout-software-confirm-title" className="text-xl font-bold text-gray-900 sm:text-2xl">
          {t('adminLayout.logoutSoftwareConfirm.title')}
        </h2>
        <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-gray-600 sm:text-lg">
          {t('adminLayout.logoutSoftwareConfirm.message')}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-end gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border-2 border-gray-300 bg-white px-6 py-3.5 text-base font-semibold text-gray-800 hover:bg-gray-50 active:scale-[0.98]"
          >
            {t('adminLayout.logoutSoftwareConfirm.no')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-[#3C4D6B] px-6 py-3.5 text-base font-semibold text-white hover:bg-[#2D3A52] active:scale-[0.98]"
          >
            {t('adminLayout.logoutSoftwareConfirm.yes')}
          </button>
        </div>
      </div>
    </div>
  )
}
