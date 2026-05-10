'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useLanguage } from '@/i18n'
import {
  isKassaCustomerDisplayMessage,
  kassaCustomerDisplayChannelName,
  type KassaCustomerDisplayMessage,
} from '@/lib/kassa-customer-display'
import { positionCustomerDisplayWindow } from '@/lib/kassa-customer-display-window'

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

  useEffect(() => {
    if (!token || typeof document === 'undefined') return
    const tryFullscreen = () => {
      if (document.fullscreenElement) return
      const el = document.documentElement
      const req = el.requestFullscreen as ((options?: FullscreenOptions) => Promise<void>) | undefined
      if (!req) return
      void req.call(el, { navigationUI: 'hide' }).catch(() => {})
    }
    const fullscreenTimers = [450, 1200].map((ms) => window.setTimeout(tryFullscreen, ms))
    return () => fullscreenTimers.forEach(clearTimeout)
  }, [token])

  useEffect(() => {
    if (!token) return
    let cancelled = false
    const delays = [0, 80, 200, 450, 900]
    const run = async () => {
      for (const ms of delays) {
        if (cancelled) return
        if (ms > 0) await new Promise((r) => setTimeout(r, ms))
        if (cancelled) return
        await positionCustomerDisplayWindow(window)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [token])

  const formatMoney = (n: number) =>
    new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' }).format(n)

  const shell =
    'box-border flex min-h-[100dvh] w-full max-w-none flex-col bg-black px-3 py-4 text-white sm:px-5 sm:py-6 md:px-8 md:py-8'

  if (!token) {
    return (
      <div className={`${shell} items-center justify-center text-center`}>
        <p className="text-xl font-semibold sm:text-2xl">{t('kassaCustomerDisplay.missingToken')}</p>
      </div>
    )
  }

  if (!msg || msg.phase === 'idle') {
    return (
      <div className={`${shell} items-center justify-center text-center`}>
        <p className="text-lg opacity-90 sm:text-xl md:text-2xl">{t('kassaCustomerDisplay.waiting')}</p>
      </div>
    )
  }

  const lines = msg.lines
  const title =
    msg.phase === 'checkout'
      ? t('kassaCustomerDisplay.checkoutTitle')
      : t('kassaCustomerDisplay.yourOrder')

  return (
    <div className={`${shell} flex-1`}>
      <header className="mb-6 border-b border-white/25 pb-5 text-center sm:mb-8 sm:pb-6">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">{msg.businessName}</h1>
        <p className="mt-3 text-lg font-semibold text-white/90 sm:text-xl md:text-2xl">{title}</p>
      </header>

      {lines.length === 0 ? (
        <p className="text-center text-lg text-white/70 sm:text-xl">{t('kassaCustomerDisplay.emptyCartHint')}</p>
      ) : (
        <ul className="mx-auto w-full max-w-5xl flex-1 space-y-3 sm:space-y-4">
          {lines.map((line, idx) => (
            <li
              key={`${idx}-${line.label}`}
              className="flex flex-wrap items-baseline justify-between gap-3 border-b border-white/15 pb-3 text-base sm:pb-4 sm:text-xl md:text-2xl"
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

      <footer className="mx-auto mt-auto w-full max-w-5xl border-t border-white/25 pt-6 sm:mt-12 sm:pt-8">
        {msg.phase === 'cart' && (
          <div className="flex items-center justify-between text-xl font-black sm:text-3xl md:text-4xl">
            <span>{t('kassaCustomerDisplay.totalInclVat')}</span>
            <span className="tabular-nums">{formatMoney(msg.totalInclVat)}</span>
          </div>
        )}

        {msg.phase === 'checkout' && (
          <div className="space-y-3 text-base sm:space-y-4 sm:text-xl md:text-2xl">
            <div className="flex justify-between text-white/90">
              <span>{t('kassaCustomerDisplay.subtotalExVat')}</span>
              <span className="tabular-nums font-semibold">{formatMoney(msg.subtotalExVat)}</span>
            </div>
            <div className="flex justify-between text-white/90">
              <span>{t('kassaCustomerDisplay.vatLine').replace('{rate}', String(msg.vatRate))}</span>
              <span className="tabular-nums font-semibold">{formatMoney(msg.vatAmount)}</span>
            </div>
            <div className="flex justify-between border-t border-white/25 pt-4 text-xl font-black sm:text-3xl md:text-4xl">
              <span>{t('kassaCustomerDisplay.totalInclVat')}</span>
              <span className="tabular-nums">{formatMoney(msg.totalInclVat)}</span>
            </div>
          </div>
        )}
      </footer>
    </div>
  )
}
