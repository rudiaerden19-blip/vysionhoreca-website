'use client'

import { quantizeVolumeUiPercent } from '@/lib/soundtrack/soundtrack-server'
import { useCallback, useEffect, useRef, useState } from 'react'
import styles from './vysion-music.module.css'

function clampUiPercent(n: number): number {
  return Math.round(Math.min(100, Math.max(0, n)))
}

export function VolumeSliderVertical({
  value,
  onChange,
  onCommit,
  onDragChange,
  ariaLabel,
  disabled,
}: {
  value: number
  onChange: (v: number) => void
  onCommit?: (v: number) => void
  onDragChange?: (dragging: boolean) => void
  ariaLabel: string
  disabled?: boolean
}) {
  const innerRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const activePointerRef = useRef<number | null>(null)
  const lastCommittedStepRef = useRef(quantizeVolumeUiPercent(value))
  const lastDragShownRef = useRef<number | null>(null)
  const [dragValue, setDragValue] = useState<number | null>(null)

  const shown = dragValue ?? quantizeVolumeUiPercent(value)

  useEffect(() => {
    if (draggingRef.current) return
    if (dragValue != null && quantizeVolumeUiPercent(value) === dragValue) {
      setDragValue(null)
      lastDragShownRef.current = null
    }
    if (dragValue == null) {
      lastCommittedStepRef.current = quantizeVolumeUiPercent(value)
    }
  }, [value, dragValue])

  const rawFromClientY = useCallback((clientY: number): number => {
    const inner = innerRef.current
    if (!inner) return clampUiPercent(value)
    const r = inner.getBoundingClientRect()
    if (r.height <= 1) return clampUiPercent(value)
    const fromBottom = (r.bottom - clientY) / r.height
    return clampUiPercent(fromBottom * 100)
  }, [value])

  const applyAt = useCallback(
    (clientY: number) => {
      const v = quantizeVolumeUiPercent(rawFromClientY(clientY))
      if (v === lastDragShownRef.current) return v
      lastDragShownRef.current = v
      setDragValue(v)
      onChange(v)
      if (v !== lastCommittedStepRef.current) {
        lastCommittedStepRef.current = v
        onCommit?.(v)
      }
      return v
    },
    [onChange, onCommit, rawFromClientY],
  )

  const finishDrag = useCallback(
    (clientY: number | null) => {
      if (!draggingRef.current) return
      draggingRef.current = false
      activePointerRef.current = null

      const raw =
        clientY != null ? rawFromClientY(clientY) : dragValue ?? clampUiPercent(value)
      const committed = quantizeVolumeUiPercent(raw)
      onChange(committed)
      onDragChange?.(false)
      setDragValue(committed)
      if (committed !== lastCommittedStepRef.current) {
        lastCommittedStepRef.current = committed
        onCommit?.(committed)
      }
    },
    [dragValue, onChange, onCommit, onDragChange, rawFromClientY, value],
  )

  useEffect(() => {
    const onWinPointerMove = (e: PointerEvent) => {
      if (!draggingRef.current) return
      if (activePointerRef.current != null && e.pointerId !== activePointerRef.current) return
      e.preventDefault()
      applyAt(e.clientY)
    }

    const onWinPointerEnd = (e: PointerEvent) => {
      if (!draggingRef.current) return
      if (activePointerRef.current != null && e.pointerId !== activePointerRef.current) return
      e.preventDefault()
      finishDrag(e.clientY)
    }

    window.addEventListener('pointermove', onWinPointerMove, { passive: false })
    window.addEventListener('pointerup', onWinPointerEnd, { passive: false })
    window.addEventListener('pointercancel', onWinPointerEnd, { passive: false })

    return () => {
      window.removeEventListener('pointermove', onWinPointerMove)
      window.removeEventListener('pointerup', onWinPointerEnd)
      window.removeEventListener('pointercancel', onWinPointerEnd)
    }
  }, [applyAt, finishDrag])

  const fillPct = `${shown}%`
  const thumbBottom = `${shown}%`

  return (
    <div
      className={styles.volumeTrack}
      role="slider"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={shown}
      aria-valuetext={`${shown}%`}
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (disabled) return
        const step = e.shiftKey ? 1 : 5
        let next = shown
        if (e.key === 'ArrowUp' || e.key === 'PageUp') next = shown + step
        else if (e.key === 'ArrowDown' || e.key === 'PageDown') next = shown - step
        else if (e.key === 'Home') next = 0
        else if (e.key === 'End') next = 100
        else return
        e.preventDefault()
        const v = quantizeVolumeUiPercent(next)
        onChange(v)
        onCommit?.(v)
      }}
      onPointerDown={(e) => {
        if (disabled) return
        e.preventDefault()
        e.stopPropagation()
        draggingRef.current = true
        activePointerRef.current = e.pointerId
        lastCommittedStepRef.current = quantizeVolumeUiPercent(value)
        onDragChange?.(true)
        try {
          e.currentTarget.setPointerCapture(e.pointerId)
        } catch {
          /* Windows touch: window listeners vangen move/end */
        }
        applyAt(e.clientY)
      }}
      onPointerUp={(e) => {
        if (activePointerRef.current != null && e.pointerId !== activePointerRef.current) return
        e.preventDefault()
        finishDrag(e.clientY)
        try {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId)
          }
        } catch {
          /* ignore */
        }
      }}
    >
      <div ref={innerRef} className={styles.volumeTrackInner}>
        <div className={styles.volumeTrackHit} aria-hidden />
        <div className={styles.volumeTrackRail} aria-hidden />
        <div className={styles.volumeTrackFill} style={{ height: fillPct }} aria-hidden />
        <div className={styles.volumeTrackThumb} style={{ bottom: thumbBottom }} aria-hidden />
      </div>
    </div>
  )
}
