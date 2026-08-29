'use client'

import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '@/i18n'
import { authFetch } from '@/lib/auth-headers'
import { KassaIconClose } from '@/lib/kassa-ui-icons'
import type { KassaPaymentMethod } from '@/lib/kassa-cart-types'
import {
  pickDefaultKassaTerminal,
  type KassaPaymentTerminalPublic,
} from '@/lib/kassa-payment-terminal'

type Phase = 'pick' | 'waiting' | 'failed'

export function KassaTerminalPayModal({
  open,
  tenantSlug,
  total,
  method,
  terminals,
  appearance = 'light',
  onSucceeded,
  onCancelBack,
}: {
  open: boolean
  tenantSlug: string
  total: number
  method: Extract<KassaPaymentMethod, 'CARD' | 'BANCONTACT'>
  terminals: readonly KassaPaymentTerminalPublic[]
  appearance?: 'light' | 'dark'
  onSucceeded: () => void
  onCancelBack: () => void
}) {
  const { t } = useLanguage()
  const dark = appearance === 'dark'
  const [terminalId, setTerminalId] = useState(() => pickDefaultKassaTerminal(terminals)?.id || '')
  const [phase, setPhase] = useState<Phase>('pick')
  const [errorText, setErrorText] = useState('')
  const paymentIdRef = useRef<string | null>(null)
  const pollRef = useRef<number | null>(null)

  useEffect(() => {
    if (!open) return
    setPhase('pick')
    setErrorText('')
    paymentIdRef.current = null
    setTerminalId(pickDefaultKassaTerminal(terminals)?.id || '')
  }, [open, terminals])

  useEffect(() => {
    return () => {
      if (pollRef.current != null) window.clearInterval(pollRef.current)
    }
  }, [])

  if (!open) return null

  const card = dark
    ? 'rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-zinc-600 bg-[#151a21]'
    : 'bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl'
  const hdr = dark
    ? 'p-4 border-b border-zinc-600 flex justify-between items-center'
    : 'p-4 border-b border-gray-100 flex justify-between items-center'
  const titleCls = dark ? 'text-xl font-semibold text-zinc-50' : 'text-xl font-semibold'
  const muted = dark ? 'text-zinc-400' : 'text-gray-500'
  const totalAccent = dark ? 'text-[#6dd5ff]' : 'text-[#3C4D6B]'
  const btnCloseCls = dark
    ? 'p-2 rounded-lg hover:bg-zinc-800 text-2xl text-zinc-200'
    : 'p-2 rounded-lg hover:bg-gray-100 text-2xl'

  const stopPoll = () => {
    if (pollRef.current != null) {
      window.clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  const cancelOnTerminal = async () => {
    stopPoll()
    const pid = paymentIdRef.current
    if (pid) {
      try {
        await authFetch('/api/kassa/payment-terminal/cancel', {
          method: 'POST',
          body: JSON.stringify({ tenant_slug: tenantSlug, payment_id: pid }),
        })
      } catch {
        /* mand blijft staan */
      }
    }
    paymentIdRef.current = null
    onCancelBack()
  }

  const startPay = async () => {
    if (!terminalId) return
    setPhase('waiting')
    setErrorText('')
    try {
      const res = await authFetch('/api/kassa/payment-terminal/pay', {
        method: 'POST',
        body: JSON.stringify({
          tenant_slug: tenantSlug,
          terminal_id: terminalId,
          amount: total,
          payment_method: method,
        }),
      })
      const json = (await res.json()) as { ok?: boolean; payment_id?: string; error?: string }
      if (!res.ok || !json.ok || !json.payment_id) {
        setPhase('failed')
        setErrorText(json.error || t('kassaApp.terminalPayFailed'))
        return
      }
      paymentIdRef.current = json.payment_id
      pollRef.current = window.setInterval(() => {
        void pollStatus(json.payment_id!)
      }, 1500)
      void pollStatus(json.payment_id)
    } catch {
      setPhase('failed')
      setErrorText(t('kassaApp.terminalPayFailed'))
    }
  }

  const pollStatus = async (paymentId: string) => {
    try {
      const res = await authFetch(
        `/api/kassa/payment-terminal/status?tenant_slug=${encodeURIComponent(tenantSlug)}&payment_id=${encodeURIComponent(paymentId)}`,
      )
      const json = (await res.json()) as { ok?: boolean; status?: string }
      if (!res.ok || !json.ok) return
      if (json.status === 'succeeded') {
        stopPoll()
        paymentIdRef.current = null
        onSucceeded()
        return
      }
      if (json.status === 'failed' || json.status === 'canceled') {
        stopPoll()
        paymentIdRef.current = null
        setPhase('failed')
        setErrorText(t('kassaApp.terminalPayFailed'))
      }
    } catch {
      /* volgende tick */
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[185] p-4">
      <div className={card}>
        <div className={hdr}>
          <h3 className={titleCls}>{t('kassaApp.terminalPayTitle')}</h3>
          <button type="button" onClick={() => void cancelOnTerminal()} className={btnCloseCls} aria-label={t('kassaApp.closeAria')}>
            <KassaIconClose className="h-7 w-7" />
          </button>
        </div>
        <div className="p-6">
          <div className="text-center mb-6">
            <p className={muted}>{t('kassaApp.toPay')}</p>
            <p className={`text-5xl font-bold ${totalAccent}`}>€{total.toFixed(2)}</p>
          </div>

          {phase === 'pick' && (
            <>
              <p className={`mb-3 text-sm ${muted}`}>{t('kassaApp.terminalPayPickReader')}</p>
              <div className="space-y-2 mb-6">
                {terminals.map((term) => (
                  <label
                    key={term.id}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer ${
                      dark ? 'border-zinc-600 text-zinc-100' : 'border-gray-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="kassa-terminal"
                      checked={terminalId === term.id}
                      onChange={() => setTerminalId(term.id)}
                    />
                    <span className="font-medium">{term.label}</span>
                    <span className={`ml-auto text-xs uppercase ${muted}`}>{term.provider}</span>
                  </label>
                ))}
              </div>
              <button
                type="button"
                disabled={!terminalId}
                onClick={() => void startPay()}
                className="w-full rounded-xl bg-[#3C4D6B] py-3 font-semibold text-white disabled:opacity-40"
              >
                {t('kassaApp.terminalPaySend')}
              </button>
            </>
          )}

          {phase === 'waiting' && (
            <p className={`text-center text-lg ${dark ? 'text-zinc-100' : 'text-gray-800'}`}>
              {t('kassaApp.terminalPayWaiting')}
            </p>
          )}

          {phase === 'failed' && (
            <p className="mb-4 text-center text-red-500">{errorText || t('kassaApp.terminalPayFailed')}</p>
          )}

          {(phase === 'waiting' || phase === 'failed') && (
            <button
              type="button"
              onClick={() => void cancelOnTerminal()}
              className={`mt-6 w-full rounded-xl py-3 font-semibold ${
                dark ? 'bg-zinc-800 text-zinc-100' : 'bg-gray-100 text-gray-800'
              }`}
            >
              {t('kassaApp.terminalPayCancel')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
