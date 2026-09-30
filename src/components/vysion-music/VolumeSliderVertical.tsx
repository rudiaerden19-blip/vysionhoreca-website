'use client'

import { useCallback, useRef } from 'react'
import styles from './vysion-music.module.css'

function clampVolume(n: number): number {
  return Math.round(Math.min(100, Math.max(0, n)))
}

export function VolumeSliderVertical({
  value,
  onChange,
  onCommit,
  ariaLabel,
  disabled,
}: {
  value: number
  onChange: (v: number) => void
  onCommit?: (v: number) => void
  ariaLabel: string
  disabled?: boolean
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const railRef = useRef<HTMLDivElement>(null)

  const valueFromClientY = useCallback((clientY: number): number => {
    const rail = railRef.current
    if (!rail) return 0
    const r = rail.getBoundingClientRect()
    if (r.height <= 0) return 0
    const y = clientY - r.top
    const ratio = 1 - y / r.height
    return clampVolume(ratio * 100)
  }, [])

  const applyAt = useCallback(
    (clientY: number) => {
      const v = valueFromClientY(clientY)
      onChange(v)
      return v
    },
    [onChange, valueFromClientY],
  )

  return (
    <div
      ref={trackRef}
      className={styles.volumeTrack}
      style={{ ['--vm-vol' as string]: String(value) }}
      role="slider"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      aria-valuetext={`${value}%`}
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (disabled) return
        let next = value
        if (e.key === 'ArrowUp' || e.key === 'PageUp') next = value + (e.shiftKey ? 1 : 5)
        else if (e.key === 'ArrowDown' || e.key === 'PageDown') next = value - (e.shiftKey ? 1 : 5)
        else if (e.key === 'Home') next = 0
        else if (e.key === 'End') next = 100
        else return
        e.preventDefault()
        const v = clampVolume(next)
        onChange(v)
        onCommit?.(v)
      }}
      onPointerDown={(e) => {
        if (disabled) return
        e.preventDefault()
        e.currentTarget.setPointerCapture(e.pointerId)
        applyAt(e.clientY)
      }}
      onPointerMove={(e) => {
        if (disabled || !e.currentTarget.hasPointerCapture(e.pointerId)) return
        e.preventDefault()
        applyAt(e.clientY)
      }}
      onPointerUp={(e) => {
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
        e.preventDefault()
        const v = applyAt(e.clientY)
        onCommit?.(v)
        e.currentTarget.releasePointerCapture(e.pointerId)
      }}
      onPointerCancel={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId)
        }
      }}
    >
      <div ref={railRef} className={styles.volumeTrackRail} aria-hidden />
      <div className={styles.volumeTrackFill} aria-hidden />
      <div className={styles.volumeTrackThumb} aria-hidden />
    </div>
  )
}
