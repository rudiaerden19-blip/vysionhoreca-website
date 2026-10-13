'use client'

import { useEffect, useMemo, useState } from 'react'
import { useLanguage } from '@/i18n'
import { KassaIconClose } from '@/lib/kassa-ui-icons'
import {
  eurosToJetonCents,
  kassaJetonBreakdownFromCents,
  kassaJetonChangeFromTender,
  type KassaJetonDenominations,
} from '@/lib/kassa-jeton-math'
import type { KassaJetonSalePoint } from '@/lib/kassa-jeton-sale-point'

function formatEuro(cents: number): string {
  return `€ ${(cents / 100).toFixed(2).replace('.', ',')}`
}

function JetonChip({
  kind,
  label,
}: {
  kind: 'black' | 'white'
  label: string
}) {
  const isBlack = kind === 'black'
  return (
    <span
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
        isBlack
          ? 'bg-black text-white ring-2 ring-zinc-500'
          : 'bg-white text-black ring-2 ring-zinc-400'
      }`}
      aria-hidden
    >
      {label}
    </span>
  )
}

function CountStepper({
  value,
  onChange,
  disabled,
  ariaLabel,
}: {
  value: number
  onChange: (n: number) => void
  disabled?: boolean
  ariaLabel: string
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={disabled || value <= 0}
        aria-label={`${ariaLabel} −`}
        className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-700 text-2xl font-bold text-white disabled:opacity-30"
        onClick={() => onChange(Math.max(0, value - 1))}
      >
        −
      </button>
      <span className="min-w-[2.5rem] text-center text-2xl font-bold tabular-nums text-zinc-50">
        {value}
      </span>
      <button
        type="button"
        disabled={disabled}
        aria-label={`${ariaLabel} +`}
        className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-700 text-2xl font-bold text-white disabled:opacity-30"
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  )
}

export function KassaJetonPaymentModal({
  open,
  totalEuros,
  denoms,
  salePoint,
  payBusy = false,
  onClose,
  onConfirm,
  onSwitchSalePoint,
  onOpenCashCardPay,
}: {
  open: boolean
  totalEuros: number
  denoms: KassaJetonDenominations
  salePoint: KassaJetonSalePoint
  payBusy?: boolean
  onClose: () => void
  onConfirm: () => void
  onSwitchSalePoint: (next: KassaJetonSalePoint) => void
  onOpenCashCardPay: () => void
}) {
  const { t } = useLanguage()
  const [blackIn, setBlackIn] = useState(0)
  const [whiteIn, setWhiteIn] = useState(0)

  const orderCents = eurosToJetonCents(totalEuros)

  useEffect(() => {
    if (!open) return
    setBlackIn(0)
    setWhiteIn(0)
  }, [open, totalEuros])

  const suggested = useMemo(
    () => kassaJetonBreakdownFromCents(orderCents, denoms),
    [orderCents, denoms],
  )

  const tender = useMemo(
    () => kassaJetonChangeFromTender(orderCents, { black: blackIn, white: whiteIn }, denoms),
    [orderCents, blackIn, whiteIn, denoms],
  )

  if (!open) return null

  const card =
    'rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-zinc-600 bg-[#151a21]'

  return (
    <div className="fixed inset-0 z-[185] flex items-center justify-center bg-black/70 p-4">
      <div className={card}>
        <div className="flex items-center justify-between border-b border-zinc-600 p-4">
          <h3 className="text-xl font-semibold text-zinc-50">
            {t('kassaApp.jetonPayTitle')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={payBusy}
            className="rounded-lg p-2 text-2xl text-zinc-200 hover:bg-zinc-800 disabled:opacity-40"
            aria-label={t('kassaApp.closeAria')}
          >
            <KassaIconClose className="h-7 w-7" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                salePoint === 'bar'
                  ? 'bg-[#6dd5ff] text-zinc-900'
                  : 'bg-zinc-800 text-zinc-300'
              }`}
              onClick={() => onSwitchSalePoint('bar')}
            >
              {t('kassaApp.jetonSalePointBar')}
            </button>
            <button
              type="button"
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                salePoint === 'ijs'
                  ? 'bg-[#6dd5ff] text-zinc-900'
                  : 'bg-zinc-800 text-zinc-300'
              }`}
              onClick={() => onSwitchSalePoint('ijs')}
            >
              {t('kassaApp.jetonSalePointIjs')}
            </button>
          </div>

          <div className="flex items-center justify-between text-lg text-zinc-200">
            <span>{t('kassaApp.jetonOrderLabel')}</span>
            <span className="font-bold tabular-nums">{formatEuro(orderCents)}</span>
          </div>

          {suggested && (
            <p className="rounded-xl bg-zinc-800/80 px-4 py-3 text-base text-zinc-200">
              {t('kassaApp.jetonSuggestedPay')
                .replace('{black}', String(suggested.black))
                .replace('{white}', String(suggested.white))}
            </p>
          )}

          <div className="rounded-xl border border-zinc-600 bg-zinc-900/50 p-4">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
              {t('kassaApp.jetonReceivedLabel')}
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <JetonChip kind="black" label="3" />
                <CountStepper
                  value={blackIn}
                  onChange={setBlackIn}
                  disabled={payBusy}
                  ariaLabel={t('kassaApp.jetonBlackLabel')}
                />
                <span className="text-zinc-400">{t('kassaApp.jetonBlackLabel')}</span>
              </div>
              <div className="flex items-center gap-3">
                <JetonChip kind="white" label="50" />
                <CountStepper
                  value={whiteIn}
                  onChange={setWhiteIn}
                  disabled={payBusy}
                  ariaLabel={t('kassaApp.jetonWhiteLabel')}
                />
                <span className="text-zinc-400">{t('kassaApp.jetonWhiteLabel')}</span>
              </div>
            </div>
            <div className="mt-3 flex justify-end text-zinc-300 tabular-nums">
              {formatEuro(tender.receivedCents)}
            </div>
          </div>

          {tender.changeCents >= 0 && tender.change && (
            <div className="flex items-center justify-between gap-3 text-lg text-zinc-100">
              <div className="flex items-center gap-2">
                <JetonChip kind="white" label="50" />
                <span>
                  {t('kassaApp.jetonChangeLabel')
                    .replace('{black}', String(tender.change.black))
                    .replace('{white}', String(tender.change.white))}
                </span>
              </div>
              <span className="tabular-nums">{formatEuro(tender.changeCents)}</span>
            </div>
          )}

          {tender.changeCents < 0 && (
            <p className="text-base font-semibold text-amber-400">
              {t('kassaApp.jetonInsufficient').replace(
                '{amount}',
                formatEuro(-tender.changeCents),
              )}
            </p>
          )}

          <div className="flex items-center justify-between border-t border-zinc-700 pt-3 text-xl">
            <span className="font-semibold text-zinc-200">
              {t('kassaApp.jetonNetPaidLabel')}
            </span>
            <span
              className={`font-bold tabular-nums ${
                tender.sufficient ? 'text-emerald-400' : 'text-zinc-500'
              }`}
            >
              {formatEuro(tender.sufficient ? orderCents : Math.max(0, tender.netCents))}
            </span>
          </div>

          <button
            type="button"
            disabled={payBusy || !tender.sufficient}
            onClick={onConfirm}
            className="w-full rounded-xl bg-emerald-600 py-4 text-lg font-bold text-white disabled:opacity-40"
          >
            {t('kassaApp.jetonConfirmPay')}
          </button>

          {salePoint === 'ijs' && (
            <button
              type="button"
              disabled={payBusy}
              onClick={onOpenCashCardPay}
              className="w-full rounded-xl border border-zinc-500 py-3 text-base font-semibold text-zinc-200"
            >
              {t('kassaApp.jetonOpenCashCardPay')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
