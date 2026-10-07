'use client'

import { useLanguage } from '@/i18n'
import { KassaIconClose } from '@/lib/kassa-ui-icons'

export function KassaKlantschermQrResultModal({
  open,
  status,
  onClose,
  appearance = 'dark',
}: {
  open: boolean
  status: 'paid' | 'failed' | 'canceled' | null
  onClose: () => void
  appearance?: 'light' | 'dark'
}) {
  const { t } = useLanguage()
  if (!open || !status) return null

  const dark = appearance === 'dark'
  const paid = status === 'paid'
  const card = dark
    ? 'rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-zinc-600 bg-[#151a21]'
    : 'bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl'

  const title = paid
    ? t('kassaApp.klantschermQrPaidTitle')
    : t('kassaApp.klantschermQrFailedTitle')
  const body = paid
    ? t('kassaApp.klantschermQrPaidBody')
    : t('kassaApp.klantschermQrFailedBody')

  return (
    <div className="fixed inset-0 z-[190] flex items-center justify-center bg-black/75 p-4">
      <div className={card} role="alertdialog" aria-labelledby="klantscherm-qr-result-title">
        <div className="flex items-start justify-between gap-3 border-b border-zinc-600/80 p-4">
          <h3
            id="klantscherm-qr-result-title"
            className={`text-xl font-bold ${paid ? 'text-emerald-400' : 'text-red-400'} ${dark ? '' : paid ? 'text-emerald-600' : 'text-red-600'}`}
          >
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className={dark ? 'rounded-lg p-2 hover:bg-zinc-800' : 'rounded-lg p-2 hover:bg-gray-100'}
            aria-label={t('kassaApp.closeAria')}
          >
            <KassaIconClose className="h-6 w-6" />
          </button>
        </div>
        <p className={`p-5 text-base leading-relaxed ${dark ? 'text-zinc-200' : 'text-gray-700'}`}>{body}</p>
        <div className="border-t border-zinc-600/80 p-4">
          <button
            type="button"
            onClick={onClose}
            className={
              dark
                ? 'w-full rounded-xl bg-zinc-700 py-3 font-semibold text-white hover:bg-zinc-600'
                : 'w-full rounded-xl bg-[#3C4D6B] py-3 font-semibold text-white hover:bg-[#2D3A52]'
            }
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}
