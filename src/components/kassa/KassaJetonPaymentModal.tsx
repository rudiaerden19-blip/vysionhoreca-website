'use client'

import { useEffect, useMemo, useState } from 'react'
import { useLanguage } from '@/i18n'
import { KassaIconClose } from '@/lib/kassa-ui-icons'
import {
  eurosToJetonCents,
  kassaJetonBreakdownFromCents,
  kassaJetonChangeFromReceived,
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
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
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
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={disabled || value <= 0}
        aria-label={`${ariaLabel} −`}
        className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-700 text-2xl font-bold text-white disabled:opacity-30"
        onClick={() => onChange(Math.max(0, value - 1))}
      >
        −
      </button>
      <span className="min-w-[3rem] text-center text-3xl font-bold tabular-nums text-zinc-50">
        {value}
      </span>
      <button
        type="button"
        disabled={disabled}
        aria-label={`${ariaLabel} +`}
        className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-700 text-2xl font-bold text-white disabled:opacity-30"
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  )
}

export type KassaJetonOrderLine = {
  quantity: number
  name: string
}

export function KassaJetonPaymentModal({
  open,
  totalEuros,
  orderLines,
  denoms,
  salePoint,
  payBusy = false,
  onClose,
  onConfirm,
  onSwitchSalePoint,
  onPayCash,
  onOpenCashCardPay,
}: {
  open: boolean
  totalEuros: number
  orderLines: readonly KassaJetonOrderLine[]
  denoms: KassaJetonDenominations
  salePoint: KassaJetonSalePoint
  payBusy?: boolean
  onClose: () => void
  onConfirm: () => void
  onSwitchSalePoint: (next: KassaJetonSalePoint) => void
  /** Uitzondering dancing: klant betaalt contant i.p.v. jetons. */
  onPayCash: () => void
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

  const customerMustGive = useMemo(
    () => kassaJetonBreakdownFromCents(orderCents, denoms),
    [orderCents, denoms],
  )

  const tender = useMemo(
    () =>
      kassaJetonChangeFromReceived(
        orderCents,
        { black: blackIn, white: whiteIn },
        denoms,
      ),
    [orderCents, blackIn, whiteIn, denoms],
  )

  const anyReceived = blackIn > 0 || whiteIn > 0

  if (!open) return null

  const card =
    'rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-zinc-600 bg-[#151a21]'

  const blackChipLabel =
    denoms.blackCents % 100 === 0
      ? String(denoms.blackCents / 100)
      : String(denoms.blackCents)
  const whiteChipLabel =
    denoms.whiteCents % 100 === 0
      ? String(denoms.whiteCents / 100)
      : String(denoms.whiteCents)

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
          <button
            type="button"
            disabled={payBusy}
            onClick={onPayCash}
            className="w-full rounded-xl border-2 border-emerald-500/80 bg-emerald-950/50 py-3 text-base font-bold text-emerald-300 disabled:opacity-40"
          >
            {t('kassaApp.jetonPayCash')}
          </button>

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

          <div className="rounded-xl border border-zinc-600 bg-zinc-900/50 p-4">
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
              {t('kassaApp.jetonOrderLabel')}
            </p>
            <ul className="space-y-1 text-base text-zinc-100">
              {orderLines.map((line, idx) => (
                <li key={`${line.name}-${idx}`}>
                  {line.quantity}× {line.name}
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center justify-between border-t border-zinc-700 pt-3 text-lg font-bold text-zinc-50">
              <span>{t('kassaApp.toPay')}</span>
              <span className="tabular-nums">{formatEuro(orderCents)}</span>
            </div>
          </div>

          {customerMustGive && (
            <div className="rounded-xl border border-sky-600/60 bg-sky-950/35 p-4">
              <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-sky-200/90">
                {t('kassaApp.jetonCustomerMustGiveLabel')}
              </p>
              <div className="flex flex-col items-center gap-3 text-xl font-bold text-sky-50 sm:flex-row sm:justify-center">
                {customerMustGive.black > 0 && (
                  <div className="flex items-center gap-2">
                    <JetonChip kind="black" label={blackChipLabel} />
                    <span>
                      {customerMustGive.black} {t('kassaApp.jetonBlackLabel')}
                    </span>
                  </div>
                )}
                {customerMustGive.black > 0 && customerMustGive.white > 0 && (
                  <span className="text-sky-300/80">+</span>
                )}
                {customerMustGive.white > 0 && (
                  <div className="flex items-center gap-2">
                    <JetonChip kind="white" label={whiteChipLabel} />
                    <span>
                      {customerMustGive.white} {t('kassaApp.jetonWhiteLabel')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-zinc-600 bg-zinc-900/50 p-4">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
              {t('kassaApp.jetonBlackReceivedLabel')}
            </p>
            <div className="flex items-center justify-center gap-4">
              <JetonChip kind="black" label={blackChipLabel} />
              <CountStepper
                value={blackIn}
                onChange={setBlackIn}
                disabled={payBusy}
                ariaLabel={t('kassaApp.jetonBlackLabel')}
              />
            </div>
          </div>

          <div className="rounded-xl border border-zinc-600 bg-zinc-900/50 p-4">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
              {t('kassaApp.jetonWhiteReceivedLabel')}
            </p>
            <div className="flex items-center justify-center gap-4">
              <JetonChip kind="white" label={whiteChipLabel} />
              <CountStepper
                value={whiteIn}
                onChange={setWhiteIn}
                disabled={payBusy}
                ariaLabel={t('kassaApp.jetonWhiteLabel')}
              />
            </div>
            <p className="mt-3 text-center text-base font-semibold text-zinc-200 tabular-nums">
              {t('kassaApp.jetonReceivedTotalLabel')}: {formatEuro(tender.receivedCents)}
            </p>
          </div>

          {anyReceived && tender.sufficient && tender.whiteChange > 0 && (
            <div className="rounded-xl border border-emerald-700/50 bg-emerald-950/40 p-4">
              <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-emerald-200/80">
                {t('kassaApp.jetonGiveBackLabel')}
              </p>
              <div className="flex items-center justify-center gap-3 text-2xl font-bold text-emerald-300">
                <JetonChip kind="white" label={whiteChipLabel} />
                <span>
                  {t('kassaApp.jetonChangeWhiteOnly').replace(
                    '{white}',
                    String(tender.whiteChange),
                  )}
                </span>
              </div>
            </div>
          )}

          {anyReceived && tender.sufficient && tender.whiteChange === 0 && (
            <p className="text-center text-base font-semibold text-emerald-400">
              {t('kassaApp.jetonNoChange')}
            </p>
          )}

          {anyReceived && !tender.sufficient && tender.changeCents < 0 && (
            <p className="text-center text-base font-semibold text-amber-400">
              {t('kassaApp.jetonInsufficient').replace(
                '{amount}',
                formatEuro(-tender.changeCents),
              )}
            </p>
          )}

          <button
            type="button"
            disabled={payBusy || !tender.sufficient || !anyReceived}
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
