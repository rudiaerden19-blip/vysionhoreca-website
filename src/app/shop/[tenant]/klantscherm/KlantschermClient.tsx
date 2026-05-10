'use client'

import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useLanguage } from '@/i18n'
import {
  isKassaCustomerDisplayMessage,
  kassaCustomerDisplayChannelName,
  type KassaCustomerDisplayMessage,
} from '@/lib/kassa-customer-display'
import { positionCustomerDisplayWindow } from '@/lib/kassa-customer-display-window'
import {
  formatKlantschermWaitingClockParts,
  formatKlantschermWaitingDateLine,
} from '@/lib/format-kassa-header-date'
import { appLocaleToBcp47 } from '@/lib/print-receipt-html'

export function KlantschermClient({ tenant }: { tenant: string }) {
  const { t, locale } = useLanguage()
  const searchParams = useSearchParams()
  const token = searchParams.get('t')?.trim() ?? ''

  const [msg, setMsg] = useState<KassaCustomerDisplayMessage | null>(null)

  const channelName = useMemo(() => {
    if (!token) return null
    return kassaCustomerDisplayChannelName(tenant, token)
  }, [tenant, token])

  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    html.classList.add('vysion-klantscherm-root')
    body.classList.add('vysion-klantscherm-root')
    return () => {
      html.classList.remove('vysion-klantscherm-root')
      body.classList.remove('vysion-klantscherm-root')
    }
  }, [])

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

  useLayoutEffect(() => {
    if (!token || typeof document === 'undefined') return
    const tryFullscreen = () => {
      if (document.fullscreenElement) return
      const el = document.documentElement
      const req = el.requestFullscreen as ((options?: FullscreenOptions) => Promise<void>) | undefined
      if (!req) return
      void req.call(el, { navigationUI: 'hide' }).catch(() => {})
    }
    tryFullscreen()
  }, [token])

  useEffect(() => {
    if (!token || typeof document === 'undefined') return
    let cleared = false
    let attempts = 0
    const maxAttempts = 48
    const id = window.setInterval(() => {
      if (cleared) return
      if (document.fullscreenElement) {
        window.clearInterval(id)
        return
      }
      attempts += 1
      if (attempts > maxAttempts) {
        window.clearInterval(id)
        return
      }
      const el = document.documentElement
      const req = el.requestFullscreen as ((options?: FullscreenOptions) => Promise<void>) | undefined
      if (!req) return
      void req.call(el, { navigationUI: 'hide' }).catch(() => {})
    }, 220)
    return () => {
      cleared = true
      window.clearInterval(id)
    }
  }, [token])

  useEffect(() => {
    if (!token || typeof document === 'undefined') return
    const tryLateFullscreen = () => {
      if (document.fullscreenElement) return
      const el = document.documentElement
      const req = el.requestFullscreen as ((options?: FullscreenOptions) => Promise<void>) | undefined
      if (!req) return
      void req.call(el, { navigationUI: 'hide' }).catch(() => {})
    }
    const fullscreenTimers = [2800, 5200].map((ms) => window.setTimeout(tryLateFullscreen, ms))
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

  const waitingClock = Boolean(token && (!msg || msg.phase === 'idle'))

  /** Geen `new Date()` tijdens SSR — server-TZ (UTC) gaf verkeerde klok; pas na mount ticken. */
  const [now, setNow] = useState<Date | null>(null)

  const browserTimeZone =
    typeof window !== 'undefined'
      ? (() => {
          try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone
          } catch {
            return undefined
          }
        })()
      : undefined

  useEffect(() => {
    if (!waitingClock) return
    const tick = () => setNow(new Date())
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [waitingClock])

  const formatMoney = (n: number) =>
    new Intl.NumberFormat(appLocaleToBcp47(locale), { style: 'currency', currency: 'EUR' }).format(n)

  const shellCart =
    'box-border flex min-h-0 w-full flex-1 flex-col overflow-y-auto bg-black px-3 py-4 text-white sm:px-5 sm:py-6 md:px-8 md:py-8'

  if (!token) {
    return (
      <div
        className={`${shellCart} items-center justify-center text-center`}
      >
        <p className="text-xl font-semibold sm:text-2xl">{t('kassaCustomerDisplay.missingToken')}</p>
      </div>
    )
  }

  if (msg?.phase === 'thankYou') {
    const amountStr = formatMoney(msg.totalInclVat)
    return (
      <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-10 bg-black px-6 py-8 text-center sm:gap-14 md:gap-16">
        <p
          className="max-w-[96vw] text-[clamp(1.75rem,5.5vw,4rem)] font-bold leading-tight tracking-tight text-white"
          suppressHydrationWarning
        >
          {t('kassaCustomerDisplay.thankYouToPay').replace('{amount}', amountStr)}
        </p>
        <p
          className="max-w-[96vw] text-[clamp(1.35rem,3.8vw,2.75rem)] font-semibold leading-snug text-white/90"
          suppressHydrationWarning
        >
          {t('kassaCustomerDisplay.thankYouClosing')}
        </p>
      </div>
    )
  }

  if (!msg || msg.phase === 'idle') {
    const tzOpts = browserTimeZone ? { timeZone: browserTimeZone } : {}

    if (!now) {
      return (
        <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center bg-black px-[max(0.25rem,env(safe-area-inset-left))] py-[max(0.25rem,env(safe-area-inset-top))] pb-[max(0.25rem,env(safe-area-inset-bottom))] pr-[max(0.25rem,env(safe-area-inset-right))] text-center">
          <div className="flex max-w-[98vw] flex-col items-center gap-8 sm:gap-12 md:gap-16">
            <p className="h-[1.2em] min-w-[12ch] animate-pulse rounded-md bg-white/15 text-[clamp(1.25rem,4vw,2.85rem)]">
              <span className="sr-only">{t('kassaCustomerDisplay.clockLoading')}</span>
            </p>
            <div
              dir="ltr"
              className="flex flex-row flex-nowrap items-center justify-center gap-[clamp(0.25rem,1.8vw,1rem)] opacity-30 [font-family:var(--font-klantscherm-digital),system-ui,sans-serif]"
              aria-hidden
            >
              <span className="text-[clamp(3.25rem,17vw,13rem)] font-black tabular-nums leading-none tracking-[0.05em]">
                –
              </span>
              <span className="translate-y-[-0.05em] select-none text-[clamp(2rem,12vw,9rem)] leading-none">:</span>
              <span className="text-[clamp(3.25rem,17vw,13rem)] font-black tabular-nums leading-none tracking-[0.05em]">
                –
              </span>
            </div>
          </div>
        </div>
      )
    }

    const { hours, minutes } = formatKlantschermWaitingClockParts(now, locale, tzOpts)
    return (
      <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center bg-black px-[max(0.25rem,env(safe-area-inset-left))] py-[max(0.25rem,env(safe-area-inset-top))] pb-[max(0.25rem,env(safe-area-inset-bottom))] pr-[max(0.25rem,env(safe-area-inset-right))] text-center">
        <div className="flex max-w-[98vw] flex-col items-center gap-8 sm:gap-12 md:gap-16">
          <p className="text-[clamp(1.25rem,4vw,2.85rem)] font-medium leading-snug tracking-[0.06em] text-white/90">
            {formatKlantschermWaitingDateLine(now, locale, tzOpts)}
          </p>
          <div
            dir="ltr"
            className="flex flex-row flex-nowrap items-center justify-center gap-[clamp(0.25rem,1.8vw,1rem)] [font-family:var(--font-klantscherm-digital),system-ui,sans-serif]"
            style={{
              textShadow:
                '0 0 28px rgba(255,255,255,0.4), 0 0 72px rgba(160,200,255,0.14)',
            }}
          >
            <span className="text-[clamp(3.25rem,17vw,13rem)] font-black tabular-nums leading-none tracking-[0.05em]">
              {hours}
            </span>
            <span
              aria-hidden
              className="vysion-klantscherm-clock-colon translate-y-[-0.05em] select-none text-[clamp(2rem,12vw,9rem)] leading-none text-white"
            >
              :
            </span>
            <span className="text-[clamp(3.25rem,17vw,13rem)] font-black tabular-nums leading-none tracking-[0.05em]">
              {minutes}
            </span>
          </div>
        </div>
      </div>
    )
  }

  const lines = msg.lines
  const title =
    msg.phase === 'checkout'
      ? t('kassaCustomerDisplay.checkoutTitle')
      : t('kassaCustomerDisplay.yourOrder')

  return (
    <div className={shellCart}>
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
