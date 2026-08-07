'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { adminDb } from '@/lib/admin-db-client'
import {
  normalizeReservationStatus,
  reservationStatusNeedsOwnerAlert,
} from '@/lib/reservation-owner-alert'
import {
  startReservationRequestAlarmLoop,
  stopReservationRequestAlarmLoop,
} from '@/lib/reservation-request-alarm-loop'

type ReservationOwnerAlertContextValue = {
  hasAlert: boolean
  unseenCount: number
  unseenIds: string[]
  acknowledge: () => void
  markUnseen: (id: string) => void
}

const ReservationOwnerAlertContext = createContext<ReservationOwnerAlertContextValue | null>(
  null,
)

export function useReservationOwnerAlert(): ReservationOwnerAlertContextValue | null {
  return useContext(ReservationOwnerAlertContext)
}

export function ReservationOwnerAlertProvider({
  tenantSlug,
  enabled,
  children,
}: {
  tenantSlug: string
  enabled: boolean
  children: ReactNode
}) {
  const unacknowledgedIdsRef = useRef<Set<string>>(new Set())
  const previousReservIdsRef = useRef<string[]>([])
  const previousPendingCountRef = useRef<number | null>(null)
  const isFirstPollRef = useRef(true)

  const [tick, setTick] = useState(0)

  const syncFromUnack = useCallback(() => {
    setTick(n => n + 1)
    const has = unacknowledgedIdsRef.current.size > 0
    if (has) startReservationRequestAlarmLoop()
    else stopReservationRequestAlarmLoop()
  }, [])

  const acknowledge = useCallback(() => {
    unacknowledgedIdsRef.current.clear()
    stopReservationRequestAlarmLoop()
    syncFromUnack()
  }, [syncFromUnack])

  const markUnseen = useCallback(
    (id: string) => {
      if (!id) return
      unacknowledgedIdsRef.current.add(id)
      syncFromUnack()
    },
    [syncFromUnack],
  )

  useEffect(() => {
    if (!enabled || !tenantSlug) {
      unacknowledgedIdsRef.current.clear()
      previousReservIdsRef.current = []
      previousPendingCountRef.current = null
      isFirstPollRef.current = true
      stopReservationRequestAlarmLoop()
      setTick(n => n + 1)
      return
    }

    let intervalId: ReturnType<typeof setInterval> | null = null

    const poll = async () => {
      try {
        const [recentRes, pendingRes] = await Promise.all([
          adminDb.select<{ id: string; status: string | null; created_at?: string }[]>(
            'reservations',
            {
              tenantSlug,
              select: 'id,status,created_at',
              order: { column: 'created_at', ascending: false },
              limit: 50,
            },
          ),
          adminDb.select<{ id: string; status: string | null }[]>('reservations', {
            tenantSlug,
            select: 'id,status',
            in: { status: ['PENDING', 'WAITLIST', 'pending', 'waitlist'] },
          }),
        ])

        const reservList =
          recentRes.ok && Array.isArray(recentRes.data) ? recentRes.data : []
        const currentIds = reservList.map(r => r.id)
        const prevIds = previousReservIdsRef.current

        if (!isFirstPollRef.current) {
          for (const r of reservList) {
            if (
              !prevIds.includes(r.id) &&
              reservationStatusNeedsOwnerAlert(normalizeReservationStatus(r.status))
            ) {
              unacknowledgedIdsRef.current.add(r.id)
            }
          }
        } else {
          isFirstPollRef.current = false
          const recentCutoffMs = Date.now() - 15 * 60 * 1000
          const baselineIds: string[] = []
          for (const r of reservList) {
            const createdMs = r.created_at ? new Date(r.created_at).getTime() : 0
            const isRecent = createdMs >= recentCutoffMs
            if (
              isRecent &&
              reservationStatusNeedsOwnerAlert(normalizeReservationStatus(r.status))
            ) {
              unacknowledgedIdsRef.current.add(r.id)
            }
            if (!isRecent) baselineIds.push(r.id)
          }
          previousReservIdsRef.current = baselineIds
          const pendingCount =
            pendingRes.ok && Array.isArray(pendingRes.data) ? pendingRes.data.length : 0
          previousPendingCountRef.current = pendingCount
          syncFromUnack()
          return
        }

        previousReservIdsRef.current = currentIds

        const pendingCount =
          pendingRes.ok && Array.isArray(pendingRes.data) ? pendingRes.data.length : 0
        const prevPending = previousPendingCountRef.current
        if (prevPending !== null && pendingCount > prevPending) {
          const newest = reservList.find(r =>
            reservationStatusNeedsOwnerAlert(normalizeReservationStatus(r.status)),
          )
          if (newest?.id) unacknowledgedIdsRef.current.add(newest.id)
        }
        previousPendingCountRef.current = pendingCount

        syncFromUnack()
      } catch {
        /* ignore */
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        if (intervalId) {
          clearInterval(intervalId)
          intervalId = null
        }
      } else {
        void poll()
        if (!intervalId) intervalId = setInterval(() => void poll(), 3000)
      }
    }

    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      void poll()
      intervalId = setInterval(() => void poll(), 3000)
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      if (intervalId) clearInterval(intervalId)
      unacknowledgedIdsRef.current.clear()
      previousReservIdsRef.current = []
      previousPendingCountRef.current = null
      isFirstPollRef.current = true
      stopReservationRequestAlarmLoop()
    }
  }, [enabled, tenantSlug, syncFromUnack])

  const value = useMemo((): ReservationOwnerAlertContextValue => {
    void tick
    const unseenIds = Array.from(unacknowledgedIdsRef.current)
    return {
      hasAlert: unseenIds.length > 0,
      unseenCount: unseenIds.length,
      unseenIds,
      acknowledge,
      markUnseen,
    }
  }, [tick, acknowledge, markUnseen])

  return (
    <ReservationOwnerAlertContext.Provider value={value}>
      {children}
    </ReservationOwnerAlertContext.Provider>
  )
}
