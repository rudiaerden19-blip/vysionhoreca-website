'use client'

import {
  KASSA_POS_BTN_SHAPE,
  KASSA_POS_MENU_PLATE_SHELL_BG_CLASS,
  kassaPosButtonClass,
} from '@/lib/kassa-pos-surface'

export function KassaCheckoutVatModal({
  open,
  dineInPct,
  takeawayPct,
  onPickDineIn,
  onPickTakeaway,
  onClose,
  appearance = 'light',
}: {
  open: boolean
  dineInPct: number
  takeawayPct: number
  onPickDineIn: () => void
  onPickTakeaway: () => void
  onClose: () => void
  appearance?: 'light' | 'dark'
}) {
  if (!open) return null
  const dark = appearance === 'dark'

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kassa-checkout-vat-title"
    >
      <div
        className={
          dark
            ? `${KASSA_POS_BTN_SHAPE} w-full max-w-md overflow-hidden border border-[#1a1a1a] ${KASSA_POS_MENU_PLATE_SHELL_BG_CLASS}`
            : 'w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl'
        }
      >
        <div className={`border-b px-5 py-4 ${dark ? 'border-[#1a1a1a]' : 'border-gray-200'}`}>
          <h2
            id="kassa-checkout-vat-title"
            className={dark ? 'text-lg font-bold text-zinc-50' : 'text-lg font-bold text-gray-900'}
          >
            Ter plaatse of meenemen?
          </h2>
          <p className={dark ? 'mt-1 text-sm text-zinc-400' : 'mt-1 text-sm text-gray-500'}>
            Kies hoe de BTW op deze bon moet. Verplicht vóór afrekenen.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 p-5">
          <button
            type="button"
            data-testid="kassa-checkout-vat-dine-in"
            onClick={onPickDineIn}
            className={`flex min-h-[7.5rem] flex-col items-center justify-center gap-1 px-3 py-4 text-center ${
              dark ? kassaPosButtonClass(false) : 'rounded-xl border-2 border-gray-200 bg-white font-semibold hover:border-[#3C4D6B]'
            }`}
          >
            <span className={dark ? 'text-base font-bold text-zinc-50' : 'text-base font-bold text-gray-900'}>
              Ter plaatse
            </span>
            <span className={dark ? 'text-sm font-semibold text-zinc-400' : 'text-sm font-semibold text-gray-500'}>
              BTW {dineInPct}%
            </span>
          </button>
          <button
            type="button"
            data-testid="kassa-checkout-vat-takeaway"
            onClick={onPickTakeaway}
            className={`flex min-h-[7.5rem] flex-col items-center justify-center gap-1 px-3 py-4 text-center ${
              dark ? kassaPosButtonClass(false) : 'rounded-xl border-2 border-gray-200 bg-white font-semibold hover:border-[#3C4D6B]'
            }`}
          >
            <span className={dark ? 'text-base font-bold text-zinc-50' : 'text-base font-bold text-gray-900'}>
              Meenemen
            </span>
            <span className={dark ? 'text-sm font-semibold text-zinc-400' : 'text-sm font-semibold text-gray-500'}>
              BTW {takeawayPct}%
            </span>
          </button>
        </div>
        <div className={`border-t px-5 py-3 ${dark ? 'border-[#1a1a1a]' : 'border-gray-100'}`}>
          <button
            type="button"
            onClick={onClose}
            className={
              dark
                ? `w-full py-3 font-semibold ${kassaPosButtonClass(false)}`
                : 'w-full rounded-xl border border-gray-200 py-3 font-semibold text-gray-600 hover:bg-gray-50'
            }
          >
            Annuleer
          </button>
        </div>
      </div>
    </div>
  )
}
