'use client'

import { useLanguage } from '@/i18n'
import {
  KASSA_POS_BTN_SHAPE,
  KASSA_SPEELS_CHROME_MUTED_TEXT_CLASS,
  KASSA_SPEELS_MENU_PLATE_SHELL_BG_CLASS,
  kassaSpeelsGrayChromeButtonClass,
} from '@/lib/kassa-pos-surface'

/**
 * Bevestiging voor afmelden / software afsluiten (kassa, admin-menu, klant-account).
 */
export function LogoutSoftwareConfirmModal({
  open,
  onConfirm,
  onCancel,
  kassaSpeelsChrome = false,
}: {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
  /** Donkere kassa (alle tenants, layout speels/klassiek): korrel-paneel + grijs glanzende knoppen. */
  kassaSpeelsChrome?: boolean
}) {
  const { t } = useLanguage()
  if (!open) return null

  const speelsBtn = `${KASSA_POS_BTN_SHAPE} ${kassaSpeelsGrayChromeButtonClass()} ${KASSA_SPEELS_CHROME_MUTED_TEXT_CLASS} min-w-[7rem] flex-1 px-6 py-3.5 text-base font-semibold sm:flex-none`

  return (
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center bg-black/55 p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-software-confirm-title"
      onClick={onCancel}
    >
      <div
        className={
          kassaSpeelsChrome
            ? `${KASSA_POS_BTN_SHAPE} w-full max-w-xl border border-[#1a1a1a] p-6 shadow-2xl sm:p-8 ${KASSA_SPEELS_MENU_PLATE_SHELL_BG_CLASS}`
            : 'w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl sm:p-8'
        }
        onClick={e => e.stopPropagation()}
      >
        <h2
          id="logout-software-confirm-title"
          className={
            kassaSpeelsChrome
              ? 'text-xl font-bold text-zinc-50 sm:text-2xl'
              : 'text-xl font-bold text-gray-900 sm:text-2xl'
          }
        >
          {t('adminLayout.logoutSoftwareConfirm.title')}
        </h2>
        <p
          className={
            kassaSpeelsChrome
              ? 'mt-4 whitespace-pre-line text-base leading-relaxed text-zinc-300 sm:text-lg'
              : 'mt-4 whitespace-pre-line text-base leading-relaxed text-gray-600 sm:text-lg'
          }
        >
          {t('adminLayout.logoutSoftwareConfirm.message')}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-end gap-3 sm:gap-4">
          <button
            type="button"
            onClick={onCancel}
            className={
              kassaSpeelsChrome
                ? speelsBtn
                : 'rounded-xl border-2 border-gray-300 bg-white px-6 py-3.5 text-base font-semibold text-gray-800 hover:bg-gray-50 active:scale-[0.98]'
            }
          >
            {t('adminLayout.logoutSoftwareConfirm.no')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={
              kassaSpeelsChrome
                ? speelsBtn
                : 'rounded-xl bg-[#3C4D6B] px-6 py-3.5 text-base font-semibold text-white hover:bg-[#2D3A52] active:scale-[0.98]'
            }
          >
            {t('adminLayout.logoutSoftwareConfirm.yes')}
          </button>
        </div>
      </div>
    </div>
  )
}
