'use client'

import { useEffect, useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLanguage } from '@/i18n'

/** Boven op-rekening-modal (z 250) en meeste kassa-lagen. */
export const KASSA_OWNER_PIN_OVERLAY_Z = 290

type Props = {
  open: boolean
  tenant: string
  title: string
  busy?: boolean
  onCancel: () => void
  /** Alleen na geldige eigenaar-PIN (4 cijfers). */
  onVerified: () => void | Promise<void>
}

export function KassaOwnerPinOverlay({ open, tenant, title, busy = false, onCancel, onVerified }: Props) {
  const { t } = useLanguage()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [verifying, setVerifying] = useState(false)

  useLayoutEffect(() => {
    if (open) return
    setPin('')
    setError('')
    setVerifying(false)
  }, [open])

  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (busy || verifying) return
      e.preventDefault()
      onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, busy, verifying, onCancel])

  const verifyPin = async (code: string) => {
    if (busy || verifying) return
    setVerifying(true)
    setError('')
    try {
      const res = await fetch('/api/pin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant, pin: code }),
      })
      const data = (await res.json()) as { valid?: boolean; error?: string }
      if (data.valid) {
        setPin('')
        await onVerified()
        return
      }
      setError(res.status === 429 && data.error ? data.error : t('pinGate.incorrectPin'))
      setPin('')
    } catch {
      setError(t('pinGate.incorrectPin'))
      setPin('')
    } finally {
      setVerifying(false)
    }
  }

  const handleDigit = (d: string) => {
    if (busy || verifying || pin.length >= 4) return
    const next = pin + d
    setPin(next)
    setError('')
    if (next.length === 4) void verifyPin(next)
  }

  if (!open || typeof document === 'undefined') return null

  const locked = busy || verifying

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/70 p-4 touch-manipulation"
      style={{ zIndex: KASSA_OWNER_PIN_OVERLAY_Z }}
      role="presentation"
      data-kassa-owner-pin-overlay
      onClick={() => {
        if (!locked) onCancel()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        data-vysion-light-form
        className="w-full max-w-xs rounded-2xl bg-white p-6 shadow-2xl text-center [color-scheme:light]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-gray-900 mb-1">{title}</h2>
        <p className="text-gray-500 text-sm mb-5">{t('pinGate.enterPinHelp')}</p>

        <div className="flex justify-center gap-3 mb-5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-3.5 w-3.5 rounded-full border-2 transition-colors ${
                pin.length > i ? 'border-orange-500 bg-orange-500' : 'border-gray-300'
              }`}
            />
          ))}
        </div>

        {error ? <p className="text-red-600 text-sm mb-4">{error}</p> : null}

        <div className="grid grid-cols-3 gap-2.5 mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'Del'].map((d, i) => (
            <button
              key={i}
              type="button"
              disabled={locked || (!d && d !== '0')}
              onClick={() => {
                if (d === 'Del') {
                  setPin((p) => p.slice(0, -1))
                  setError('')
                } else if (d) handleDigit(d)
              }}
              className={`py-3.5 rounded-xl text-lg font-bold transition-colors ${
                d === ''
                  ? 'invisible'
                  : d === 'Del'
                    ? 'bg-gray-100 text-gray-600 text-sm'
                    : 'bg-gray-100 hover:bg-orange-100 active:scale-95 text-gray-900'
              } disabled:opacity-50`}
            >
              {d}
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={locked}
          onClick={onCancel}
          className="w-full py-2.5 rounded-xl border border-gray-300 text-gray-800 font-semibold disabled:opacity-50"
        >
          {t('kassaApp.cancel')}
        </button>
      </div>
    </div>,
    document.body,
  )
}
