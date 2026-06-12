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
  appearance = 'light',
}: {
  open: boolean
  total: number
  options: readonly KassaPayOption[]
  onClose: () => void
  onPay: (method: KassaQuickPayMethod) => void
  onOpenSplit: () => void
  appearance?: 'light' | 'dark'
}) {
  const { t } = useLanguage()
  const dark = appearance === 'dark'
  if (!open) return null

  const card = dark
    ? 'rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-zinc-600 bg-[#151a21]'
    : 'bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl'
  const hdr = dark ? 'p-4 border-b border-zinc-600 flex justify-between items-center' : 'p-4 border-b border-gray-100 flex justify-between items-center'
  const titleCls = dark ? 'text-xl font-semibold text-zinc-50' : 'text-xl font-semibold'
  const btnCloseCls = dark ? 'p-2 rounded-lg hover:bg-zinc-800 text-2xl text-zinc-200' : 'p-2 rounded-lg hover:bg-gray-100 text-2xl'
  const toPayMuted = dark ? 'text-zinc-400' : 'text-gray-500'
  const totalAccent = dark ? 'text-[#6dd5ff]' : 'text-[#3C4D6B]'
  const btnTile = dark
    ? 'flex flex-col items-center justify-center h-32 gap-3 rounded-xl border-2 bg-[#263043] hover:scale-[1.02] transition-transform font-semibold text-lg text-zinc-100'
    : 'flex flex-col items-center justify-center h-32 gap-3 rounded-xl border-2 bg-gray-50 hover:scale-[1.02] transition-transform font-semibold text-lg'

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[180] p-4">
      <div className={card}>
        <div className={hdr}>
          <h3 className={titleCls}>{t('kassaApp.payTitle')}</h3>
          <button type="button" onClick={onClose} className={btnCloseCls}>
            ✕
          </button>
        </div>
        <div className="p-6">
          <div className="text-center mb-6">
            <p className={toPayMuted}>{t('kassaApp.toPay')}</p>
            <p className={`text-5xl font-bold ${totalAccent}`}>€{total.toFixed(2)}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {options.map((pm) => (
              <button
                key={pm.method}
                type="button"
                onClick={() => onPay(pm.method)}
                className={btnTile}
                style={{ borderColor: pm.color }}
              >
                <span className="text-4xl">{pm.icon}</span>
                <span style={{ color: pm.color }}>{pm.label}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={onOpenSplit}
              className={`col-span-2 ${btnTile}`}
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
