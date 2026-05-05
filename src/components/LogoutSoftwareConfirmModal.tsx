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
      className="fixed inset-0 z-[220] flex items-center justify-center bg-black/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-software-confirm-title"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
        onClick={e => e.stopPropagation()}
      >
        <h2 id="logout-software-confirm-title" className="text-lg font-bold text-gray-900 sm:text-xl">
          {t('adminLayout.logoutSoftwareConfirm.title')}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">
          {t('adminLayout.logoutSoftwareConfirm.message')}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
          >
            {t('adminLayout.logoutSoftwareConfirm.no')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-[#3C4D6B] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2D3A52]"
          >
            {t('adminLayout.logoutSoftwareConfirm.yes')}
          </button>
        </div>
      </div>
    </div>
  )
}
