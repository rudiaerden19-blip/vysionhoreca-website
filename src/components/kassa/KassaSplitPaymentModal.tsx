'use client'

import { useLanguage } from '@/i18n'

export function KassaSplitPaymentModal({
  open,
  total,
  splitCash,
  splitCard,
  setSplitCash,
  setSplitCard,
  onCloseBack,
  onConfirm,
}: {
  open: boolean
  total: number
  splitCash: number
  splitCard: number
  setSplitCash: (n: number) => void
  setSplitCard: (n: number) => void
  onCloseBack: () => void
  onConfirm: () => void
}) {
  const { t } = useLanguage()
  if (!open) return null

  const balanced = Math.abs(total - splitCash - splitCard) < 0.01

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <span className="text-purple-500">👛</span> {t('kassaApp.splitPayTitle')}
          </h3>
          <button type="button" onClick={onCloseBack} className="p-2 rounded-lg hover:bg-gray-100 text-2xl">
            ✕
          </button>
        </div>
        <div className="p-6 space-y-5">
          <div className="text-center p-4 bg-gray-50 rounded-xl">
            <p className="text-gray-500">{t('kassaApp.totalToPay')}</p>
            <p className="text-4xl font-bold text-[#3C4D6B]">€{total.toFixed(2)}</p>
          </div>
          <div className="space-y-1">
            <label className="flex items-center gap-2 text-gray-500 text-sm">
              💵 {t('kassaApp.splitCashLabel')}
            </label>
            <input
              type="number"
              value={splitCash || ''}
              onChange={(e) => {
                const v = parseFloat(e.target.value) || 0
                setSplitCash(v)
                setSplitCard(Math.max(0, total - v))
              }}
              className="w-full px-4 py-4 text-2xl font-bold rounded-xl bg-white border-2 border-green-400 focus:border-green-500 outline-none"
              placeholder={t('kassaApp.numpadPlaceholder')}
              step="0.01"
              min="0"
            />
          </div>
          <div className="space-y-1">
            <label className="flex items-center gap-2 text-gray-500 text-sm">
              💳 {t('kassaApp.splitCardLabel')}
            </label>
            <input
              type="number"
              value={splitCard || ''}
              onChange={(e) => {
                const v = parseFloat(e.target.value) || 0
                setSplitCard(v)
                setSplitCash(Math.max(0, total - v))
              }}
              className="w-full px-4 py-4 text-2xl font-bold rounded-xl bg-white border-2 border-blue-400 focus:border-blue-500 outline-none"
              placeholder={t('kassaApp.numpadPlaceholder')}
              step="0.01"
              min="0"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: t('kassaApp.split5050'), cash: total / 2, card: total / 2 },
              { label: t('kassaApp.split100Cash'), cash: total, card: 0 },
              { label: t('kassaApp.split100Card'), cash: 0, card: total },
            ].map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => {
                  setSplitCash(opt.cash)
                  setSplitCard(opt.card)
                }}
                className="py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold transition-colors"
              >
                {opt.label}
              </button>
            ))}
          </div>
          {Math.abs(total - splitCash - splitCard) > 0.01 && (
            <div
              className={`p-3 rounded-xl text-center text-sm font-semibold ${
                total - splitCash - splitCard > 0 ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {total - splitCash - splitCard > 0
                ? t('kassaApp.splitRemainOwed').replace('{amount}', (total - splitCash - splitCard).toFixed(2))
                : t('kassaApp.splitOverpaid').replace('{amount}', Math.abs(total - splitCash - splitCard).toFixed(2))}
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              if (balanced) onConfirm()
            }}
            disabled={!balanced}
            className="w-full py-4 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-bold text-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {t('kassaApp.splitConfirm').replace('{amount}', (splitCash + splitCard).toFixed(2))}
          </button>
        </div>
      </div>
    </div>
  )
}
