'use client'

import { useLanguage } from '@/i18n'

export type KassaQuickPayMethod = 'CASH' | 'CARD' | 'IDEAL' | 'BANCONTACT'

export type KassaPayOption = {
  readonly method: KassaQuickPayMethod
  readonly label: string
  readonly icon: string
  readonly color: string
}

export function KassaPaymentModal({
  open,
  total,
  options,
  onClose,
  onPay,
  onOpenSplit,
}: {
  open: boolean
  total: number
  options: readonly KassaPayOption[]
  onClose: () => void
  onPay: (method: KassaQuickPayMethod) => void
  onOpenSplit: () => void
}) {
  const { t } = useLanguage()
  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-xl font-semibold">{t('kassaApp.payTitle')}</h3>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-2xl">
            ✕
          </button>
        </div>
        <div className="p-6">
          <div className="text-center mb-6">
            <p className="text-gray-500">{t('kassaApp.toPay')}</p>
            <p className="text-5xl font-bold text-[#3C4D6B]">€{total.toFixed(2)}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {options.map((pm) => (
              <button
                key={pm.method}
                type="button"
                onClick={() => onPay(pm.method)}
                className="flex flex-col items-center justify-center h-32 gap-3 rounded-xl border-2 bg-gray-50 hover:scale-[1.02] transition-transform font-semibold text-lg"
                style={{ borderColor: pm.color }}
              >
                <span className="text-4xl">{pm.icon}</span>
                <span style={{ color: pm.color }}>{pm.label}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={onOpenSplit}
              className="col-span-2 flex flex-col items-center justify-center h-32 gap-3 rounded-xl border-2 bg-gray-50 hover:scale-[1.02] transition-transform font-semibold text-lg"
              style={{ borderColor: '#8b5cf6' }}
            >
              <span className="text-4xl">👛</span>
              <span style={{ color: '#8b5cf6' }}>{t('kassaApp.splitPay')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
