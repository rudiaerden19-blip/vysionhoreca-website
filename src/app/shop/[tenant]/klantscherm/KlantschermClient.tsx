'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  isKassaCustomerDisplayMessage,
  kassaCustomerDisplayChannelName,
  type KassaCustomerDisplayMessage,
} from '@/lib/kassa-customer-display'
import { positionCustomerDisplayWindow } from '@/lib/kassa-customer-display-window'
import { KLANTSCHERM_NL } from '@/lib/klantscherm-nl-copy'
import { KlantschermSlideshow } from '@/components/klantscherm/KlantschermSlideshow'
import QRCode from '@/components/QRCode'

function klantschermOrderDensityStyle(lineCount: number) {
  if (lineCount <= 6) {
    return {
      shellPad: 'px-3 py-4 sm:px-5 sm:py-6 md:px-8 md:py-8',
      headerWrap: 'mb-4 border-b border-white/25 pb-4 sm:mb-6 sm:pb-5',
      businessName: 'text-xl font-black tracking-tight sm:text-2xl md:text-3xl',
      phaseTitle: 'mt-2 text-base font-semibold text-white/90 sm:text-lg',
      listGap: 'gap-2 sm:gap-3',
      row:
        'flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 border-b border-white/15 pb-2 text-sm leading-snug sm:text-base md:text-lg',
      footerWrap: 'mt-auto border-t border-white/25 pt-4 sm:pt-6',
      totalCart: 'flex items-center justify-between text-lg font-black sm:text-2xl md:text-3xl',
    }
  }
  return {
    shellPad: 'px-2 py-2 sm:px-3 sm:py-4',
    headerWrap: 'mb-2 border-b border-white/25 pb-2 sm:mb-3',
    businessName: 'text-lg font-black sm:text-xl',
    phaseTitle: 'mt-1 text-sm font-semibold text-white/90',
    listGap: 'gap-1',
    row:
      'flex flex-wrap items-baseline justify-between gap-x-2 border-b border-white/15 pb-1 text-xs sm:text-sm',
    footerWrap: 'mt-auto border-t border-white/25 pt-2 sm:pt-3',
    totalCart: 'flex items-center justify-between text-base font-black sm:text-lg',
  }
}

type QrSession = {
  providerPaymentId: string
  qrCheckoutUrl: string
  amount: number
}

export function KlantschermClient({ tenant }: { tenant: string }) {
  const searchParams = useSearchParams()
  const token = searchParams.get('t')?.trim() ?? ''

  const [msg, setMsg] = useState<KassaCustomerDisplayMessage | null>(null)
  const [slideshowImages, setSlideshowImages] = useState<string[]>([])
  const [qrSession, setQrSession] = useState<QrSession | null>(null)
  const [qrPaidHint, setQrPaidHint] = useState(false)
  const qrCreateKeyRef = useRef<string>('')

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

  useEffect(() => {
    if (!token) return
    let cancelled = false
    void fetch(`/api/shop/${encodeURIComponent(tenant)}/klantscherm/slideshow`, {
      cache: 'no-store',
      credentials: 'include',
    })
      .then((r) => r.json())
      .then((json: { images?: string[] }) => {
        if (cancelled) return
        setSlideshowImages(Array.isArray(json.images) ? json.images.filter(Boolean) : [])
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [tenant, token])

  useLayoutEffect(() => {
    if (!token || typeof document === 'undefined') return
    const el = document.documentElement
    const req = el.requestFullscreen as ((options?: FullscreenOptions) => Promise<void>) | undefined
    if (req) void req.call(el, { navigationUI: 'hide' }).catch(() => {})
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

  useEffect(() => {
    if (msg?.phase !== 'checkout') {
      setQrSession(null)
      setQrPaidHint(false)
      qrCreateKeyRef.current = ''
      return
    }
    const amount = msg.totalInclVat
    const key = `${amount}-${msg.lines.length}`
    if (qrCreateKeyRef.current === key && qrSession) return
    qrCreateKeyRef.current = key
    let cancelled = false
    void fetch(`/api/shop/${encodeURIComponent(tenant)}/klantscherm/qr/create`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    })
      .then((r) => r.json())
      .then(
        (json: {
          ok?: boolean
          provider_payment_id?: string
          qr_checkout_url?: string
          amount_cents?: number
        }) => {
          if (cancelled || !json.ok || !json.provider_payment_id || !json.qr_checkout_url) return
          setQrSession({
            providerPaymentId: json.provider_payment_id,
            qrCheckoutUrl: json.qr_checkout_url,
            amount,
          })
        },
      )
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [msg, tenant])

  useEffect(() => {
    if (!qrSession) return
    let cancelled = false
    const poll = async () => {
      if (cancelled) return
      try {
        const q = new URLSearchParams({ provider_payment_id: qrSession.providerPaymentId })
        const res = await fetch(
          `/api/shop/${encodeURIComponent(tenant)}/klantscherm/qr/status?${q.toString()}`,
          { credentials: 'include', cache: 'no-store' },
        )
        const json = (await res.json()) as { ok?: boolean; status?: string }
        if (json.ok && json.status === 'paid') {
          setQrPaidHint(true)
        }
      } catch {
        /* retry */
      }
    }
    void poll()
    const id = window.setInterval(() => void poll(), 2500)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [qrSession, tenant])

  const formatMoney = (n: number) =>
    new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' }).format(n)

  const shellCart =
    'box-border flex min-h-0 w-full flex-1 flex-col overflow-y-auto bg-black px-3 py-4 text-white sm:px-5 sm:py-6 md:px-8 md:py-8'

  if (!token) {
    return (
      <div className={`${shellCart} items-center justify-center text-center`}>
        <p className="text-xl font-semibold sm:text-2xl">{KLANTSCHERM_NL.missingToken}</p>
      </div>
    )
  }

  if (msg?.phase === 'thankYou') {
    const amountStr = formatMoney(msg.totalInclVat)
    return (
      <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-10 bg-black px-6 py-8 text-center">
        <p className="max-w-[96vw] text-[clamp(1.75rem,5.5vw,4rem)] font-bold leading-tight text-white">
          {KLANTSCHERM_NL.thankYouToPay.replace('{amount}', amountStr)}
        </p>
        <p className="max-w-[96vw] text-[clamp(1.35rem,3.8vw,2.75rem)] font-semibold text-white/90">
          {KLANTSCHERM_NL.thankYouClosing}
        </p>
      </div>
    )
  }

  if (!msg || msg.phase === 'idle') {
    if (slideshowImages.length > 0) {
      return <KlantschermSlideshow images={slideshowImages} />
    }
    return <div className="min-h-0 w-full flex-1 bg-black" aria-hidden />
  }

  if (msg.phase !== 'cart' && msg.phase !== 'checkout') {
    return <div className="min-h-0 w-full flex-1 bg-black" />
  }

  const lines = msg.lines
  const isCheckout = msg.phase === 'checkout'
  const title = isCheckout ? KLANTSCHERM_NL.checkoutTitle : KLANTSCHERM_NL.yourOrder
  const d = klantschermOrderDensityStyle(lines.length)

  return (
    <div
      className={`box-border flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-black text-white lg:flex-row ${d.shellPad}`}
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className={`text-center lg:text-left ${d.headerWrap}`}>
          <h1 className={d.businessName}>{msg.businessName}</h1>
          <p className={d.phaseTitle}>{title}</p>
          {msg.dineInSubtitle ? (
            <p className="mt-1 text-sm font-semibold text-white/80">{msg.dineInSubtitle}</p>
          ) : null}
        </header>

        {lines.length === 0 ? (
          <p className="text-center text-lg text-white/70 lg:text-left">{KLANTSCHERM_NL.emptyCartHint}</p>
        ) : (
          <ul className={`flex min-h-0 flex-1 flex-col ${d.listGap} overflow-hidden`}>
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

        <footer className={d.footerWrap}>
          <div className={d.totalCart}>
            <span>{KLANTSCHERM_NL.totalInclVat}</span>
            <span className="tabular-nums">{formatMoney(msg.totalInclVat)}</span>
          </div>
        </footer>
      </div>

      {isCheckout ? (
        <div className="mt-6 flex shrink-0 flex-col items-center justify-center border-t border-white/20 pt-6 text-center lg:mt-0 lg:w-[min(42vw,420px)] lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <p className="text-lg font-semibold sm:text-xl">{KLANTSCHERM_NL.qrTitle}</p>
          <p className="mt-1 text-sm text-white/75">{KLANTSCHERM_NL.qrHint}</p>
          <p className="mt-3 text-3xl font-black tabular-nums sm:text-4xl">
            {formatMoney(msg.totalInclVat)}
          </p>
          {qrPaidHint ? (
            <p className="mt-6 max-w-xs text-lg font-semibold text-emerald-400">
              {KLANTSCHERM_NL.qrPaidStaffHint}
            </p>
          ) : qrSession ? (
            <div className="mt-4">
              <QRCode url={qrSession.qrCheckoutUrl} size={280} className="mx-auto shadow-2xl" />
            </div>
          ) : (
            <p className="mt-6 text-sm text-white/60">{KLANTSCHERM_NL.qrCreateFailed}</p>
          )}
        </div>
      ) : null}
    </div>
  )
}
