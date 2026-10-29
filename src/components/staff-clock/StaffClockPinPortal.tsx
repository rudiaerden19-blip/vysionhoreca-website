'use client'

/**
 * PIN-dialoog voor personeelsklok (kassa + admin inklokken).
 *
 * - Rendert via createPortal naar document.body → geen kapotte stacking/focus door geneste modals.
 * - type="tel" + numeric → cijfers zichtbaar op kiosk (donkere kassa zet anders zwart password-vlak).
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
  /** Standaard staff-klok (230); kassa-modals erboven gebruiken bv. 260. */
  zIndex?: number
  /** Standaard 12 (personeel); eigenaar/manager-PIN = 4. */
  maxPinLength?: number
  /** In parent-modal (absolute overlay) i.p.v. portal naar body. */
  nested?: boolean
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
  zIndex = STAFF_CLOCK_PIN_Z_INDEX,
  maxPinLength = STAFF_PIN_MAX_LEN,
  nested = false,
}: StaffClockPinPortalProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open || nested) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [open, nested])

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

  if (!open) return null

  const shellClass = nested
    ? 'absolute inset-0 z-[60] flex items-center justify-center bg-black/65 p-4 touch-manipulation'
    : 'fixed inset-0 flex items-center justify-center bg-black/50 p-4 touch-manipulation'

  const panel = (
    <div
      className={shellClass}
      style={nested ? undefined : { zIndex }}
      role="presentation"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-vysion-light-form
        data-vysion-modal-overlay
        data-staff-clock-pin
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl flex flex-col gap-3"
        style={{ colorScheme: 'light' }}
        onClick={(e) => e.stopPropagation()}
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
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            enterKeyHint="done"
            name="staff-pin"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={maxPinLength}
            value={pinValue}
            onChange={(e) => onPinChange(e.target.value.replace(/\D/g, '').slice(0, maxPinLength))}
            placeholder={placeholder}
            className="vysion-light-form-field w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-lg font-mono tracking-widest text-gray-900 placeholder:text-gray-400"
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
    </div>
  )

  if (nested) return panel
  if (typeof document === 'undefined') return null
  return createPortal(panel, document.body)
}
