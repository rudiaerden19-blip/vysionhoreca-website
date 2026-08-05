'use client'

import { useCallback, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import {
  isReservationRequestAlarmLoopRunning,
  startReservationRequestAlarmLoop,
  stopReservationRequestAlarmLoop,
  triggerReservationRequestAlarmSound,
} from '@/lib/reservation-request-alarm-loop'
import { getSoundsEnabled, setSoundsEnabled } from '@/lib/sounds'

const PENDING_OR = 'status.eq.PENDING,status.eq.pending,status.eq.WAITLIST,status.eq.waitlist'

/**
 * Poll + window hooks voor reservatie-alarm op admin/reserveringen (kassa heeft eigen poll).
 */
export function useReservationRequestAlarm(tenant: string, enabled: boolean) {
  const previousReservIdsRef = useRef<string[]>([])
  const previousPendingCountRef = useRef<number | null>(null)
  const latchedRef = useRef(false)

  const syncSoundsEnabled = useCallback(() => {
    setSoundsEnabled(getSoundsEnabled(tenant), tenant)
  }, [tenant])

  const stopIfNoPending = useCallback(async () => {
    try {
      const { count } = await supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_slug', tenant)
        .or(PENDING_OR)
      const pending = count ?? 0
      if (pending === 0) {
        latchedRef.current = false
        stopReservationRequestAlarmLoop()
      }
    } catch {
      /* ignore */
    }
  }, [tenant])

  useEffect(() => {
    if (!enabled) return
    syncSoundsEnabled()

    const stopReservationAlarm = () => {
      latchedRef.current = false
      stopReservationRequestAlarmLoop()
      void stopIfNoPending()
    }

    const w = window as unknown as { stopReservationAlarm?: () => void }
    const prevStop = w.stopReservationAlarm
    w.stopReservationAlarm = () => {
      prevStop?.()
      stopReservationAlarm()
    }

    return () => {
      if (w.stopReservationAlarm === stopReservationAlarm) {
        if (prevStop) w.stopReservationAlarm = prevStop
        else delete w.stopReservationAlarm
      }
      stopReservationRequestAlarmLoop()
      previousPendingCountRef.current = null
      latchedRef.current = false
    }
  }, [enabled, syncSoundsEnabled, stopIfNoPending])

  useEffect(() => {
    if (!enabled) return

    let intervalId: ReturnType<typeof setInterval> | null = null
    let isFirstCheck = true

    const check = async () => {
      try {
        syncSoundsEnabled()
        const [{ data: idRows }, pendingRes] = await Promise.all([
          supabase
            .from('reservations')
            .select('id')
            .eq('tenant_slug', tenant)
            .order('created_at', { ascending: false })
            .limit(50),
          supabase
            .from('reservations')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_slug', tenant)
            .or(PENDING_OR),
        ])

        const pendingAndWl = pendingRes.count ?? 0
        const prevPendingCnt = previousPendingCountRef.current
        if (prevPendingCnt !== null && pendingAndWl > prevPendingCnt) {
          latchedRef.current = true
          triggerReservationRequestAlarmSound()
        }
        previousPendingCountRef.current = pendingAndWl
        if (pendingAndWl === 0) latchedRef.current = false

        const reservList = idRows || []
        const currentIds = reservList.map((r: { id: string }) => r.id)
        const prevIds = previousReservIdsRef.current

        if (!isFirstCheck) {
          const newOnes = reservList.filter((r: { id: string }) => !prevIds.includes(r.id))
          if (newOnes.length > 0) {
            latchedRef.current = true
            triggerReservationRequestAlarmSound()
          }
        } else {
          isFirstCheck = false
        }
        previousReservIdsRef.current = currentIds

        const needAlarm = latchedRef.current && pendingAndWl > 0
        const kassaAlarm =
          typeof window !== 'undefined' &&
          typeof (window as unknown as { isAlarmRunning?: () => boolean }).isAlarmRunning === 'function' &&
          (window as unknown as { isAlarmRunning: () => boolean }).isAlarmRunning()

        if (needAlarm && !kassaAlarm && !isReservationRequestAlarmLoopRunning()) {
          startReservationRequestAlarmLoop()
        } else if (!needAlarm && !kassaAlarm) {
          stopReservationRequestAlarmLoop()
        }
      } catch {
        /* ignore */
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        if (intervalId !== null) {
          clearInterval(intervalId)
          intervalId = null
        }
      } else {
        void check()
        if (intervalId === null) {
          intervalId = setInterval(() => void check(), 3000)
        }
      }
    }

    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      void check()
      intervalId = setInterval(() => void check(), 3000)
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      if (intervalId !== null) clearInterval(intervalId)
    }
  }, [enabled, syncSoundsEnabled, tenant])
}
