'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useLanguage } from '@/i18n'
import {
  isKassaCustomerDisplayMessage,
  kassaCustomerDisplayChannelName,
  type KassaCustomerDisplayMessage,
} from '@/lib/kassa-customer-display'

export function KlantschermClient({ tenant }: { tenant: string }) {
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const token = searchParams.get('t')?.trim() ?? ''

  const [msg, setMsg] = useState<KassaCustomerDisplayMessage | null>(null)

  const channelName = useMemo(() => {
    if (!token) return null
    return kassaCustomerDisplayChannelName(tenant, token)
  }, [tenant, token])

  useEffect(() => {
    if (!channelName || typeof BroadcastChannel === 'undefined') return

    const bc = new BroadcastChannel(channelName)
    bc.onmessage = (ev: MessageEvent<unknown>) => {
      const data = ev.data
      if (!isKassaCustomerDisplayMessage(data)) return
      if (data.tenantSlug !== tenant) return
      setMsg(data)
    }
    return () => bc.close()
  }, [channelName, tenant])

  const formatMoney = (n: number) =>
    new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' }).format(n)

  if (!token) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-black px-6 text-center text-white">
        <p className="text-xl font-semibold">{t('kassaCustomerDisplay.missingToken')}</p>
      </div>
    )
  }

  if (!msg || msg.phase === 'idle') {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-black px-6 text-center text-white">
        {msg?.phase === 'idle' && msg.businessName ? (
          <p className="text-2xl font-bold">{msg.businessName}</p>
        ) : null}
        <p className={`text-xl opacity-90 ${msg?.phase === 'idle' && msg.businessName ? 'mt-6' : ''}`}>
          {t('kassaCustomerDisplay.waiting')}
        </p>
      </div>
    )
  }

  const lines = msg.lines
  const title =
    msg.phase === 'checkout'
      ? t('kassaCustomerDisplay.checkoutTitle')
      : t('kassaCustomerDisplay.yourOrder')

  return (
    <div className="min-h-[100dvh] bg-black px-6 py-8 text-white">
      <header className="mb-8 border-b border-white/25 pb-6 text-center">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{msg.businessName}</h1>
        <p className="mt-3 text-xl font-semibold text-white/90">{title}</p>
      </header>

      {lines.length === 0 ? (
        <p className="text-center text-xl text-white/70">{t('kassaCustomerDisplay.emptyCartHint')}</p>
      ) : (
        <ul className="mx-auto max-w-3xl space-y-4">
          {lines.map((line, idx) => (
            <li
              key={`${idx}-${line.label}`}
              className="flex flex-wrap items-baseline justify-between gap-3 border-b border-white/15 pb-4 text-lg sm:text-xl"
            >
              <span className="min-w-0 flex-1 font-medium leading-snug">
                <span className="text-white/80">{line.qty} × </span>
                {line.label}
              </span>
              <span className="shrink-0 font-bold tabular-nums">{formatMoney(line.lineTotal)}</span>
            </li>
          ))}
        </ul>
      )}

      <footer className="mx-auto mt-12 max-w-3xl border-t border-white/25 pt-8">
        {msg.phase === 'cart' && (
          <div className="flex items-center justify-between text-2xl font-black sm:text-3xl">
            <span>{t('kassaCustomerDisplay.totalInclVat')}</span>
            <span className="tabular-nums">{formatMoney(msg.totalInclVat)}</span>
          </div>
        )}

        {msg.phase === 'checkout' && (
          <div className="space-y-4 text-lg sm:text-xl">
            <div className="flex justify-between text-white/90">
              <span>{t('kassaCustomerDisplay.subtotalExVat')}</span>
              <span className="tabular-nums font-semibold">{formatMoney(msg.subtotalExVat)}</span>
            </div>
            <div className="flex justify-between text-white/90">
              <span>{t('kassaCustomerDisplay.vatLine').replace('{rate}', String(msg.vatRate))}</span>
              <span className="tabular-nums font-semibold">{formatMoney(msg.vatAmount)}</span>
            </div>
            <div className="flex justify-between border-t border-white/25 pt-4 text-2xl font-black sm:text-3xl">
              <span>{t('kassaCustomerDisplay.totalInclVat')}</span>
              <span className="tabular-nums">{formatMoney(msg.totalInclVat)}</span>
            </div>
          </div>
        )}
      </footer>
    </div>
  )
}
