'use client'

import { useEffect, useState } from 'react'
import { useLanguage } from '@/i18n'
import { KassaIconClose } from '@/lib/kassa-ui-icons'

export type KassaQuickPayMethod = 'CASH' |  'CARD' |  'IDEAL' |  'BANCONTACT'

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
  payBusy = false,
  onClose,
  onPay,
  onOpenSplit,
  onOpenJeton,
  jetonLabel,
  appearance = 'light',
  ticketDiscount,
}: {
  open: boolean
  total: number
  options: readonly KassaPayOption[]
  payBusy?: boolean
  onClose: () => void
  onPay: (method: KassaQuickPayMethod) => void
  onOpenSplit: () => void
  /** Alleen tenants met kassa_jeton_enabled (ijs/terras-profiel). */
  onOpenJeton?: () => void
  jetonLabel?: string
  appearance?: 'light' |  'dark'
  /** Alleen Oh Green: −20% op de hele rekening, in dit venster. */
  ticketDiscount?: { active: boolean; onToggle: () => void }
}) {
  const { t } = useLanguage()
  const dark = appearance === 'dark'
  const [optimisticPayBusy, setOptimisticPayBusy] = useState(false)
  const payLocked = payBusy || optimisticPayBusy

  useEffect(() => {
    if (!open) setOptimisticPayBusy(false)
  }, [open])

  if (!open) return null

  const card = dark
    ? 'rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-zinc-600 bg-[#151a21]'
    : 'bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl'
  const hdr = dark ? 'p-4 border-b border-zinc-600 flex justify-between items-center': 'p-4 border-b border-gray-100 flex justify-between items-center'
  const titleCls = dark ? 'text-xl font-semibold text-zinc-50': 'text-xl font-semibold'
  const btnCloseCls = dark ? 'p-2 rounded-lg hover:bg-zinc-800 text-2xl text-zinc-200': 'p-2 rounded-lg hover:bg-gray-100 text-2xl'
  const toPayMuted = dark ? 'text-zinc-400': 'text-gray-500'
  const totalAccent = dark ? 'text-[#6dd5ff]': 'text-[#3C4D6B]'
  const btnTile = dark
    ? 'flex flex-col items-center justify-center h-32 gap-3 rounded-xl border-2 bg-[#263043] hover:scale-[1.02] transition-transform font-semibold text-lg text-zinc-100'
    : 'flex flex-col items-center justify-center h-32 gap-3 rounded-xl border-2 bg-gray-50 hover:scale-[1.02] transition-transform font-semibold text-lg'

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[180] p-4">
      <div className={card}>
        <div className={hdr}>
          <h3 className={titleCls}>{t('kassaApp.payTitle')}</h3>
          <button type="button" onClick={onClose} className={btnCloseCls} aria-label={t('kassaApp.closeAria')}>
            <KassaIconClose className="h-7 w-7" />
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
                disabled={payLocked}
                onClick={() => {
                  if (payLocked) return
                  setOptimisticPayBusy(true)
                  onPay(pm.method)
                }}
                className={`${btnTile} disabled:opacity-40 disabled:pointer-events-none disabled:scale-100`}
                style={{ borderColor: pm.color }}
              >
                <span style={{ color: pm.color }}>{pm.label}</span>
              </button>
            ))}
            {onOpenJeton && jetonLabel ? (
              <button
                type="button"
                disabled={payLocked}
                onClick={() => {
                  if (payLocked) return
                  onOpenJeton()
                }}
                className={`col-span-2 ${btnTile} disabled:opacity-40 disabled:pointer-events-none disabled:scale-100`}
                style={{ borderColor: '#111827' }}
              >
                <span style={{ color: '#f3f4f6' }}>{jetonLabel}</span>
              </button>
            ) : null}
            <button
              type="button"
              disabled={payLocked}
              onClick={() => {
                if (payLocked) return
                onOpenSplit()
              }}
              className={`col-span-2 ${btnTile} disabled:opacity-40 disabled:pointer-events-none disabled:scale-100`}
              style={{ borderColor: '#8b5cf6'}}
            >
              <span style={{ color: '#8b5cf6'}}>{t('kassaApp.splitPay')}</span>
            </button>
            {ticketDiscount ? (
              <button
                type="button"
                data-testid="kassa-ticket-discount"
                aria-pressed={ticketDiscount.active}
                disabled={payLocked}
                onClick={() => {
                  if (payLocked) return
                  ticketDiscount.onToggle()
                }}
                className={`col-span-2 ${btnTile} disabled:opacity-40 disabled:pointer-events-none disabled:scale-100`}
                style={{
                  borderColor: '#22c55e',
                  background: ticketDiscount.active ? (dark ? '#14532d' : '#dcfce7') : undefined,
                }}
              >
                <span style={{ color: dark ? '#4ade80' : '#15803d' }}>-20%</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
