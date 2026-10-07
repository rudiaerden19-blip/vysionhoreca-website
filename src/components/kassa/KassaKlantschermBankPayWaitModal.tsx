'use client'

import { useLanguage } from '@/i18n'
import { KassaIconClose } from '@/lib/kassa-ui-icons'

export function KassaKlantschermBankPayWaitModal({
  open,
  onConfirm,
  onCancel,
  appearance = 'dark',
}: {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
  appearance?: 'light' | 'dark'
}) {
  const { t } = useLanguage()
  if (!open) return null

  const dark = appearance === 'dark'
  const card = dark
    ? 'rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-zinc-600 bg-[#151a21]'
    : 'bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl'

  return (
    <div className="fixed inset-0 z-[185] flex items-center justify-center bg-black/75 p-4">
      <div className={card} role="dialog" aria-labelledby="klantscherm-bank-pay-title">
        <div className="flex items-start justify-between gap-3 border-b border-zinc-600/80 p-4">
          <h3 id="klantscherm-bank-pay-title" className="text-xl font-bold text-white">
            {t('kassaApp.klantschermBankPayWaitTitle')}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className={dark ? 'rounded-lg p-2 hover:bg-zinc-800' : 'rounded-lg p-2 hover:bg-gray-100'}
            aria-label={t('kassaApp.closeAria')}
          >
            <KassaIconClose className="h-6 w-6" />
          </button>
        </div>
        <p className={`p-5 text-base leading-relaxed ${dark ? 'text-zinc-200' : 'text-gray-700'}`}>
          {t('kassaApp.klantschermBankPayWaitBody')}
        </p>
        <div className="flex flex-col gap-2 border-t border-zinc-600/80 p-4 sm:flex-row">
          <button
            type="button"
            onClick={onCancel}
            className={
              dark
                ? 'flex-1 rounded-xl border border-zinc-600 py-3 font-semibold text-zinc-200 hover:bg-zinc-800'
                : 'flex-1 rounded-xl border border-gray-300 py-3 font-semibold text-gray-700'
            }
          >
            {t('kassaApp.klantschermBankPayCancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-500"
          >
            {t('kassaApp.klantschermBankPayConfirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
