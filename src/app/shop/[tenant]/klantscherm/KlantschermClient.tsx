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

/** Grotere orders op niet‑touch klantscherm: kleinere tekst/marges naarmate er meer regels zijn (geen scroll/muis). */
function klantschermOrderDensityStyle(lineCount: number, phase: 'cart' | 'checkout') {
  const weight = lineCount + (phase === 'checkout' ? 6 : 2)
  if (weight <= 8) {
    return {
      shellPad: 'px-3 py-4 sm:px-5 sm:py-6 md:px-8 md:py-8',
      headerWrap: 'mb-6 border-b border-white/25 pb-5 sm:mb-8 sm:pb-6',
      businessName: 'text-2xl font-black tracking-tight sm:text-3xl md:text-4xl lg:text-5xl',
      phaseTitle: 'mt-3 text-lg font-semibold text-white/90 sm:text-xl md:text-2xl',
      listGap: 'gap-3 sm:gap-4',
      row:
        'flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-white/15 pb-3 text-base leading-snug sm:pb-4 sm:text-xl md:text-2xl',
      footerWrap: 'mt-auto border-t border-white/25 pt-6 sm:mt-12 sm:pt-8',
      totalCart: 'flex items-center justify-between text-xl font-black sm:text-3xl md:text-4xl',
      checkoutStack: 'space-y-3 text-base sm:space-y-4 sm:text-xl md:text-2xl',
      checkoutGrand:
        'flex justify-between border-t border-white/25 pt-4 text-xl font-black sm:text-3xl md:text-4xl',
    }
  }
  if (weight <= 14) {
    return {
      shellPad: 'px-3 py-3 sm:px-4 sm:py-5 md:px-6 md:py-6',
      headerWrap: 'mb-4 border-b border-white/25 pb-4 sm:mb-5 sm:pb-5',
      businessName: 'text-xl font-black tracking-tight sm:text-2xl md:text-3xl lg:text-4xl',
      phaseTitle: 'mt-2 text-base font-semibold text-white/90 sm:text-lg md:text-xl',
      listGap: 'gap-2 sm:gap-3',
      row:
        'flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 border-b border-white/15 pb-2 text-sm leading-snug sm:pb-3 sm:text-lg md:text-xl',
      footerWrap: 'mt-auto border-t border-white/25 pt-4 sm:pt-6',
      totalCart: 'flex items-center justify-between text-lg font-black sm:text-2xl md:text-3xl',
      checkoutStack: 'space-y-2 text-sm sm:space-y-3 sm:text-base md:text-lg',
      checkoutGrand:
        'flex justify-between border-t border-white/25 pt-3 text-lg font-black sm:text-2xl md:text-3xl',
    }
  }
  return {
    shellPad: 'px-2 py-2 sm:px-3 sm:py-4 md:px-4 md:py-5',
    headerWrap: 'mb-3 border-b border-white/25 pb-3 sm:mb-4 sm:pb-4',
    businessName: 'text-lg font-black tracking-tight sm:text-xl md:text-2xl',
    phaseTitle: 'mt-1.5 text-sm font-semibold text-white/90 sm:text-base md:text-lg',
    listGap: 'gap-1 sm:gap-2',
    row:
      'flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 border-b border-white/15 pb-1 text-xs leading-tight sm:pb-2 sm:text-sm md:text-base',
    footerWrap: 'mt-auto border-t border-white/25 pt-3 sm:pt-4',
    totalCart: 'flex items-center justify-between text-base font-black sm:text-lg md:text-xl',
    checkoutStack: 'space-y-1 text-xs sm:space-y-2 sm:text-sm md:text-base',
    checkoutGrand:
      'flex justify-between border-t border-white/25 pt-2 text-base font-black sm:text-lg md:text-xl',
  }
}

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
        {msg.dineInSubtitle ? (
          <p
            className="max-w-[96vw] text-[clamp(1.1rem,3.2vw,2rem)] font-semibold leading-snug text-white/80"
            suppressHydrationWarning
          >
            {msg.dineInSubtitle}
          </p>
        ) : null}
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
              <span className="select-none text-[clamp(2rem,12vw,9rem)] leading-none">:</span>
              <span className="text-[clamp(3.25rem,17vw,13rem)] font-black tabular-nums leading-none tracking-[0.05em]">
                –
              </span>
            </div>
          </div>
        </div>
      )
    }

    const { hours, minutes } = formatKlantschermWaitingClockParts(now, locale)
    return (
      <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center bg-black px-[max(0.25rem,env(safe-area-inset-left))] py-[max(0.25rem,env(safe-area-inset-top))] pb-[max(0.25rem,env(safe-area-inset-bottom))] pr-[max(0.25rem,env(safe-area-inset-right))] text-center">
        <div className="flex max-w-[98vw] flex-col items-center gap-8 sm:gap-12 md:gap-16">
          <p className="text-[clamp(1.25rem,4vw,2.85rem)] font-medium leading-snug tracking-[0.06em] text-white/90">
            {formatKlantschermWaitingDateLine(now, locale)}
          </p>
          <div
            dir="ltr"
            className="flex flex-row flex-nowrap items-center justify-center gap-[clamp(0.25rem,1.8vw,1rem)] [font-family:var(--font-klantscherm-digital),system-ui,sans-serif]"
            style={{
              /* Mindere blur dan voorheen: gloed leest sneller “zacht/wazig” op lcd zonder hoge PPI */
              textShadow:
                '0 0 12px rgba(255,255,255,0.42), 0 0 28px rgba(160,200,255,0.14), 0 1px 0 rgba(255,255,255,0.08)',
            }}
          >
            <span className="text-[clamp(3.25rem,17vw,13rem)] font-black tabular-nums leading-none tracking-[0.05em]">
              {hours}
            </span>
            <span
              aria-hidden
              className="vysion-klantscherm-clock-colon select-none text-[clamp(2rem,12vw,9rem)] leading-none text-white"
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

  const d = klantschermOrderDensityStyle(lines.length, msg.phase)

  return (
    <div
      className={`box-border flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-black text-white ${d.shellPad}`}
    >
      <header className={`text-center ${d.headerWrap}`}>
        <h1 className={d.businessName}>{msg.businessName}</h1>
        <p className={d.phaseTitle}>{title}</p>
        {msg.dineInSubtitle ? (
          <p className="mt-2 text-[clamp(0.95rem,2.4vw,1.35rem)] font-semibold leading-snug text-white/80">
            {msg.dineInSubtitle}
          </p>
        ) : null}
      </header>

      {lines.length === 0 ? (
        <p className="text-center text-lg text-white/70 sm:text-xl">{t('kassaCustomerDisplay.emptyCartHint')}</p>
      ) : (
        <ul className={`mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col ${d.listGap} overflow-hidden`}>
          {lines.map((line, idx) => (
            <li key={`${idx}-${line.label}`} className={d.row}>
              <span className="min-w-0 flex-1 break-words font-medium">
                <span className="text-white/80">{line.qty} × </span>
                {line.label}
              </span>
              <span className="shrink-0 font-bold tabular-nums">{formatMoney(line.lineTotal)}</span>
            </li>
          ))}
        </ul>
      )}

      <footer className={`mx-auto w-full max-w-5xl ${d.footerWrap}`}>
        {msg.phase === 'cart' && (
          <div className={d.totalCart}>
            <span>{t('kassaCustomerDisplay.totalInclVat')}</span>
            <span className="tabular-nums">{formatMoney(msg.totalInclVat)}</span>
          </div>
        )}

        {msg.phase === 'checkout' && (
          <div className={d.checkoutStack}>
            <div className="flex justify-between text-white/90">
              <span>{t('kassaCustomerDisplay.subtotalExVat')}</span>
              <span className="tabular-nums font-semibold">{formatMoney(msg.subtotalExVat)}</span>
            </div>
            <div className="flex justify-between text-white/90">
              <span>{t('kassaCustomerDisplay.vatLine').replace('{rate}', String(msg.vatRate))}</span>
              <span className="tabular-nums font-semibold">{formatMoney(msg.vatAmount)}</span>
            </div>
            <div className={d.checkoutGrand}>
              <span>{t('kassaCustomerDisplay.totalInclVat')}</span>
              <span className="tabular-nums">{formatMoney(msg.totalInclVat)}</span>
            </div>
          </div>
        )}
      </footer>
    </div>
  )
}
