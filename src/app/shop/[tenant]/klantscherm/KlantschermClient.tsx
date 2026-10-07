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
import { klantschermSlideshowRefreshChannel } from '@/lib/klantscherm-slideshow-server'
import { KlantschermQrPayView } from '@/components/klantscherm/KlantschermQrPayView'
import { KlantschermDisplayShell } from '@/components/klantscherm/KlantschermDisplayShell'

function klantschermOrderDensityStyle(lineCount: number) {
  if (lineCount <= 6) {
    return {
      shellPad: 'px-3 py-4 sm:px-5 sm:py-6 md:px-8 md:py-8',
      headerWrap: 'mb-5 border-b border-white/20 pb-5 sm:mb-6 sm:pb-6',
      businessName: 'text-[clamp(1.75rem,4vw,2.75rem)] font-black tracking-tight text-white',
      phaseTitle: 'mt-2 text-[clamp(1.1rem,2.5vw,1.5rem)] font-medium text-orange-100/90',
      listGap: 'gap-2 sm:gap-3',
      row:
        'flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-white/10 pb-3 text-[clamp(1rem,2.2vw,1.35rem)] leading-snug',
      footerWrap: 'mt-auto border-t border-white/20 pt-5 sm:pt-6',
      totalCart:
        'flex items-center justify-between text-[clamp(1.35rem,3.2vw,2.25rem)] font-black text-white',
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
  qrPayload: string
  amount: number
  iban?: string
  beneficiaryName?: string
}

export function KlantschermClient({ tenant }: { tenant: string }) {
  const searchParams = useSearchParams()
  const token = searchParams.get('t')?.trim() ?? ''

  const [msg, setMsg] = useState<KassaCustomerDisplayMessage | null>(null)
  const [klantschermActive, setKlantschermActive] = useState(false)
  const [slideshowSlides, setSlideshowSlides] = useState<
    { url: string; type: 'image' | 'video' }[]
  >([])
  const [qrSession, setQrSession] = useState<QrSession | null>(null)
  const [qrState, setQrState] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle')
  const [qrFailureMessage, setQrFailureMessage] = useState<string | undefined>()
  const qrCreateKeyRef = useRef<string>('')

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
    return () => {
      bc.close()
    }
  }, [channelName, tenant])

  const checkoutShowQr = msg?.phase === 'checkout' && msg.showKlantschermQr === true
  const qrPayAmount =
    msg?.phase === 'checkout' ? (msg.qrPayAmount ?? msg.totalInclVat) : 0

  useEffect(() => {
    if (!token) return
    let cancelled = false

    const applySlideshowJson = (json: {
      slides?: { url: string; type: 'image' | 'video' }[]
      klantschermEnabled?: boolean
    }) => {
      if (cancelled) return
      setKlantschermActive(json.klantschermEnabled === true)
      if (!Array.isArray(json.slides)) {
        setSlideshowSlides([])
        return
      }
      setSlideshowSlides(
        json.slides.filter((s) => s?.url && (s.type === 'image' || s.type === 'video')),
      )
    }

    const loadSlides = () => {
      void fetch(
        `/api/shop/${encodeURIComponent(tenant)}/klantscherm/slideshow?_=${Date.now()}`,
        {
          cache: 'no-store',
          credentials: 'include',
        },
      )
        .then((r) => r.json())
        .then(applySlideshowJson)
        .catch(() => {})
    }

    loadSlides()
    const intervalId = window.setInterval(loadSlides, 45_000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadSlides()
    }
    document.addEventListener('visibilitychange', onVisible)

    let refreshBc: BroadcastChannel | null = null
    if (typeof BroadcastChannel !== 'undefined') {
      refreshBc = new BroadcastChannel(klantschermSlideshowRefreshChannel(tenant))
      refreshBc.onmessage = (ev: MessageEvent<unknown>) => {
        const data = ev.data as { type?: string }
        if (data?.type === 'reload-slideshow') loadSlides()
      }
    }

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisible)
      refreshBc?.close()
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
    if (!checkoutShowQr) {
      setQrSession(null)
      setQrState('idle')
      setQrFailureMessage(undefined)
      qrCreateKeyRef.current = ''
      return
    }
    const amount = qrPayAmount
    const key = `${amount}-${msg?.phase === 'checkout' ? msg.lines.length : 0}`
    if (qrCreateKeyRef.current === key && qrSession) return
    qrCreateKeyRef.current = key
    setQrState('loading')
    setQrFailureMessage(undefined)
    let cancelled = false
    void fetch(`/api/shop/${encodeURIComponent(tenant)}/klantscherm/qr/create`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    })
      .then(async (r) => {
        const json = (await r.json()) as {
          ok?: boolean
          error?: string
          qr_payload?: string
          iban?: string
          beneficiary_name?: string
        }
        return { status: r.status, json }
      })
      .then(({ status, json }) => {
          if (cancelled) return
          if (!json.ok || !json.qr_payload) {
            setQrState('failed')
            if (json.error === 'iban_missing' || json.error === 'invalid_iban') {
              setQrFailureMessage(KLANTSCHERM_NL.qrIbanMissing)
            } else if (json.error === 'klantscherm_disabled') {
              setQrFailureMessage(KLANTSCHERM_NL.qrCreateFailed)
            } else if (status === 403 || json.error === 'unauthorized') {
              setQrFailureMessage(KLANTSCHERM_NL.qrCreateFailed)
            } else {
              setQrFailureMessage(KLANTSCHERM_NL.qrCreateFailed)
            }
            return
          }
          setQrSession({
            qrPayload: json.qr_payload,
            amount,
            iban: json.iban,
            beneficiaryName: json.beneficiary_name,
          })
          setQrState('ready')
      })
      .catch(() => {
        if (!cancelled) {
          setQrState('failed')
          setQrFailureMessage(KLANTSCHERM_NL.qrCreateFailed)
        }
      })
    return () => {
      cancelled = true
    }
  }, [checkoutShowQr, qrPayAmount, msg, tenant])

  const formatMoney = (n: number) =>
    new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' }).format(n)

  const shellCart =
    'box-border flex min-h-0 w-full flex-1 flex-col overflow-y-auto bg-black px-3 py-4 text-white sm:px-5 sm:py-6 md:px-8 md:py-8'
  const shellFill = 'flex min-h-0 w-full flex-1 flex-col bg-black'

  if (!token) {
    return (
      <div className={`${shellCart} items-center justify-center text-center`}>
        <p className="text-xl font-semibold sm:text-2xl">{KLANTSCHERM_NL.missingToken}</p>
      </div>
    )
  }

  if (msg?.phase === 'thankYou') {
    return (
      <KlantschermDisplayShell className="items-center justify-center gap-8 px-6 py-8 text-center">
        <p className="max-w-[96vw] text-[clamp(2rem,6vw,4.25rem)] font-black leading-tight text-emerald-300">
          {KLANTSCHERM_NL.paymentSuccessTitle}
        </p>
        <p className="max-w-[96vw] text-[clamp(1.35rem,3.8vw,2.75rem)] font-semibold text-white/95">
          {KLANTSCHERM_NL.thankYouClosing}
        </p>
        {msg.dineInSubtitle ? (
          <p className="max-w-2xl text-lg font-medium text-white/75">{msg.dineInSubtitle}</p>
        ) : null}
      </KlantschermDisplayShell>
    )
  }

  if (!msg || msg.phase === 'idle') {
    if (slideshowSlides.length > 0) {
      return (
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <KlantschermSlideshow slides={slideshowSlides} />
        </div>
      )
    }
    if (klantschermActive) {
      return (
        <div className={`${shellFill} items-center justify-center px-6 text-center text-white/70`}>
          <p className="max-w-lg text-lg font-medium sm:text-xl">{KLANTSCHERM_NL.waitingForKassa}</p>
        </div>
      )
    }
    return <div className={shellFill} aria-hidden />
  }

  if (msg.phase !== 'cart' && msg.phase !== 'checkout') {
    return <div className={shellFill} />
  }

  const lines = msg.lines
  const isCheckout = msg.phase === 'checkout'
  const title = isCheckout ? KLANTSCHERM_NL.checkoutTitle : KLANTSCHERM_NL.yourOrder
  const d = klantschermOrderDensityStyle(lines.length)

  if (isCheckout && msg.showKlantschermQr) {
    const viewStatus =
      qrState === 'ready' ? 'ready' : qrState === 'failed' ? 'failed' : 'loading'
    return (
      <KlantschermQrPayView
        amount={qrPayAmount}
        qrPayload={qrSession?.qrPayload ?? ''}
        iban={qrSession?.iban}
        beneficiaryName={qrSession?.beneficiaryName}
        status={viewStatus}
        failureMessage={qrFailureMessage}
      />
    )
  }

  return (
    <KlantschermDisplayShell>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-[3vmin] py-[4vmin]">
        <div className="flex min-h-0 w-full max-w-3xl flex-1 flex-col overflow-hidden rounded-[1.75rem] border border-white/35 bg-white/20 px-6 py-7 shadow-[0_32px_90px_rgba(49,46,129,0.45)] backdrop-blur-xl sm:rounded-[2rem] sm:px-10 sm:py-9">
          <header className={`text-center ${d.headerWrap}`}>
            <h1 className={d.businessName}>{msg.businessName}</h1>
            <p className={d.phaseTitle}>{title}</p>
            {msg.dineInSubtitle ? (
              <p className="mt-2 text-sm font-medium text-white/75">{msg.dineInSubtitle}</p>
            ) : null}
          </header>

          {lines.length === 0 ? (
            <p className="text-center text-lg text-white/75">{KLANTSCHERM_NL.emptyCartHint}</p>
          ) : (
            <ul className={`flex min-h-0 flex-1 flex-col ${d.listGap} overflow-y-auto`}>
              {lines.map((line, idx) => (
                <li key={`${idx}-${line.label}`} className={d.row}>
                  <span className="min-w-0 flex-1 break-words font-medium text-white/95">
                    <span className="text-orange-200/90">{line.qty} × </span>
                    {line.label}
                  </span>
                  <span className="shrink-0 font-bold tabular-nums text-white">{formatMoney(line.lineTotal)}</span>
                </li>
              ))}
            </ul>
          )}

          <footer className={d.footerWrap}>
            <div className={d.totalCart}>
              <span className="text-white/90">{KLANTSCHERM_NL.totalInclVat}</span>
              <span className="tabular-nums">{formatMoney(msg.totalInclVat)}</span>
            </div>
          </footer>
        </div>
      </div>
    </KlantschermDisplayShell>
  )
}
