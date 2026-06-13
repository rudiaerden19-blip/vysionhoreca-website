'use client'

/**
 * PIN-dialoog voor personeelsklok (kassa + admin inklokken).
 *
 * - Rendert via createPortal naar document.body → geen kapotte stacking/focus door geneste modals.
 * - type="password" → standaard maskering in alle browsers (geen non‑standard inline styles in TS).
 * - Form + submit → Enter bevestigt; inputMode numeric hint voor mobiele toetsenborden.
 */

import { useEffect, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

export const STAFF_CLOCK_PIN_Z_INDEX = 230
export const STAFF_PIN_MAX_LEN = 12

export type StaffClockPinPortalProps = {
  open: boolean
  titleId?: string
  title: string
  placeholder: string
  pinValue: string
  onPinChange: (digitsOnly: string) => void
  pinError: string | null
  busy: boolean
  cancelLabel: string
  confirmLabel: string
  onCancel: () => void
  onConfirm: () => void
}

export function StaffClockPinPortal({
  open,
  titleId = 'staff-clock-pin-title',
  title,
  placeholder,
  pinValue,
  onPinChange,
  pinError,
  busy,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
}: StaffClockPinPortalProps) {
  const inputRef = useRef<HTMLInputElement>(null)

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
      if (busy) return
      e.preventDefault()
      onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, busy, onCancel])

  useLayoutEffect(() => {
    if (!open) return
    const el = inputRef.current
    if (!el) return
    try {
      el.focus({ preventScroll: true })
    } catch {
      el.focus()
    }
  }, [open, title])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/50 p-4 touch-manipulation"
      style={{ zIndex: STAFF_CLOCK_PIN_Z_INDEX }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl flex flex-col gap-3"
      >
        <p id={titleId} className="font-bold text-gray-900">
          {title}
        </p>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (!busy) onConfirm()
          }}
        >
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            enterKeyHint="done"
            name="staff-pin"
            data-web-kb-pin="1"
            autoComplete="new-password"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={STAFF_PIN_MAX_LEN}
            value={pinValue}
            onChange={(e) => onPinChange(e.target.value.replace(/\D/g, '').slice(0, STAFF_PIN_MAX_LEN))}
            placeholder={placeholder}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-lg font-mono tracking-widest text-gray-900"
            aria-invalid={pinError ? true : undefined}
            aria-describedby={pinError ? `${titleId}-error`: undefined}
          />
          {pinError ? (
            <p id={`${titleId}-error`} className="text-sm font-medium text-red-600" role="alert">
              {pinError}
            </p>
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold"
            >
              {cancelLabel}
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 py-2.5 rounded-xl bg-[#3C4D6B] text-white font-bold disabled:opacity-50"
            >
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
