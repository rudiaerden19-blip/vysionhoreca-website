'use client'

import { useCallback } from 'react'
import { useLanguage } from '@/i18n'
import { localeToDateTag } from '@/i18n/locale-date'
import type { ReservationStatus } from '@/components/kassa-reservations/kassa-reservations-model'

export type ReservationKassaRk = (key: string, rep?: Record<string, string>) => string

export function useReservationKassa() {
  const { t, locale } = useLanguage()
  const dateTag = localeToDateTag(locale)

  const rk: ReservationKassaRk = useCallback(
    (key, rep) => {
      let out = t(`reservationKassa.${key}`)
      if (rep) {
        for (const [k, v] of Object.entries(rep)) {
          out = out.split(`{${k}}`).join(v)
        }
      }
      return out
    },
    [t],
  )

  const formatDate = useCallback(
    (date: string, opts?: Intl.DateTimeFormatOptions) => {
      const d = new Date(`${date}T12:00:00`)
      return d.toLocaleDateString(dateTag, opts ?? { weekday: 'short', day: 'numeric', month: 'short' })
    },
    [dateTag],
  )

  const formatDateLong = useCallback(
    (date: string) => {
      const d = new Date(`${date}T12:00:00`)
      return d.toLocaleDateString(dateTag, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    },
    [dateTag],
  )

  const formatDateMedium = useCallback(
    (date: string) => {
      const d = new Date(`${date}T12:00:00`)
      return d.toLocaleDateString(dateTag, { weekday: 'long', day: 'numeric', month: 'long' })
    },
    [dateTag],
  )

  const statusLabel = useCallback((s: ReservationStatus) => rk(`status_${s}`), [rk])

  const monthName = useCallback((monthIndex: number) => rk(`month_${monthIndex}`), [rk])

  const weekdayShort = useCallback((dayIndex: number) => rk(`weekday_${dayIndex}`), [rk])

  return {
    locale,
    dateTag,
    rk,
    formatDate,
    formatDateLong,
    formatDateMedium,
    statusLabel,
    monthName,
    weekdayShort,
  }
}

/** Voor losse modals in hetzelfde bestand zonder hook in elke functie. */
export function makeReservationKassaRk(t: (key: string) => string): ReservationKassaRk {
  return (key, rep) => {
    let out = t(`reservationKassa.${key}`)
    if (rep) {
      for (const [k, v] of Object.entries(rep)) {
        out = out.split(`{${k}}`).join(v)
      }
    }
    return out
  }
}
