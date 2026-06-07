'use client'

import { useEffect, useRef, useState } from 'react'
import type { GksActiveStaff } from '@/lib/gks-kassa/gks-staff'
import { getGksInternetOnline, subscribeGksInternetLock } from '@/lib/gks-kassa/gks-internet-lock'
import {
  getGksAvailability,
  gksAvailabilityDisablesFiscalUi,
  gksAvailabilityShowsOverlay,
  type GksAvailability,
  type GksAvailabilityStatus,
} from '@/lib/gks-kassa/gks-availability'

const FDM_POLL_MS = 30_000

export function useGksAvailability(
  tenantSlug: string,
  staff: GksActiveStaff | null,
  vatNo: string,
): GksAvailability | null {
  const [availability, setAvailability] = useState<GksAvailability | null>(null)
  const busyRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (busyRef.current) return
      if (!getGksInternetOnline()) {
        if (!cancelled) {
          setAvailability({ status: 'INTERNET_OFFLINE', checkedAt: Date.now() })
        }
        return
      }
      busyRef.current = true
      try {
        const next = await getGksAvailability({ tenantSlug, staff, vatNo })
        if (!cancelled) setAvailability(next)
      } finally {
        busyRef.current = false
      }
    }

    void run()
    const id = window.setInterval(() => void run(), FDM_POLL_MS)
    const unsubLock = subscribeGksInternetLock(() => void run())

    return () => {
      cancelled = true
      window.clearInterval(id)
      unsubLock()
    }
  }, [tenantSlug, staff?.id, staff?.insz, vatNo])

  return availability
}

export function useGksFiscalBlocked(
  availability: GksAvailability | null,
): { blocked: boolean; status: GksAvailabilityStatus | null } {
  return {
    blocked: gksAvailabilityDisablesFiscalUi(availability),
    status: availability?.status ?? null,
  }
}

export function useGksAvailabilityOverlay(
  availability: GksAvailability | null,
): { showOverlay: boolean; status: GksAvailabilityStatus | null } {
  const status = availability?.status ?? null
  return {
    showOverlay: gksAvailabilityShowsOverlay(status),
    status,
  }
}
