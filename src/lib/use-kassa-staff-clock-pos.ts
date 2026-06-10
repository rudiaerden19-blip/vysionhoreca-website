'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { authFetch } from '@/lib/auth-headers'
import { playClick, playSuccess } from '@/lib/sounds'
import type { KassaStaffClockRow, KassaStaffPinState } from '@/components/kassa/KassaStaffClockUi'

export type KassaActiveStaff = { id: string; name: string }

export function useKassaStaffClockPos(opts: {
  tenant: string
  staffClockEnabled: boolean
  staffClockErrorText: (code: string) => string
  t: (key: string) => string
}) {
  const { tenant, staffClockEnabled, staffClockErrorText, t } = opts

  const [staffClockOpen, setStaffClockOpen] = useState(false)
  const [staffSalesPickOpen, setStaffSalesPickOpen] = useState(false)
  const [staffClockList, setStaffClockList] = useState<KassaStaffClockRow[]>([])
  const [staffClockListLoading, setStaffClockListLoading] = useState(false)
  const [staffClockListHydrated, setStaffClockListHydrated] = useState(false)
  const [staffClockBusy, setStaffClockBusy] = useState(false)
  const [staffClockPinModal, setStaffClockPinModal] = useState<KassaStaffPinState | null>(null)
  const [staffClockPinInput, setStaffClockPinInput] = useState('')
  const [staffClockPinError, setStaffClockPinError] = useState<string | null>(null)
  const [activeKassaStaff, setActiveKassaStaff] = useState<KassaActiveStaff | null>(null)
  const staffClockPinReqGen = useRef(0)

  const loadStaffClockList = useCallback(async (loadOpts?: { background?: boolean }) => {
    const background = loadOpts?.background === true
    if (!background) setStaffClockListLoading(true)
    try {
      const res = await authFetch(`/api/kassa/staff-clock?tenant_slug=${encodeURIComponent(tenant)}`, {
        cache: 'no-store',
      })
      const data = (await res.json()) as {
        ok?: boolean
        staff?: KassaStaffClockRow[]
      }
      if (data.ok && data.staff) setStaffClockList(data.staff)
      else if (!background) setStaffClockList([])
    } catch {
      if (!background) setStaffClockList([])
    } finally {
      if (!background) setStaffClockListLoading(false)
      setStaffClockListHydrated(true)
    }
  }, [tenant])

  useEffect(() => {
    if (!staffClockEnabled) {
      setStaffClockListHydrated(true)
      return
    }
    setStaffClockListHydrated(false)
    void loadStaffClockList({ background: true })
  }, [staffClockEnabled, loadStaffClockList])

  useEffect(() => {
    if (!staffClockEnabled || !staffClockListHydrated) return
    const clockedIn = staffClockList.filter((s) => s.hasOpenSession)
    if (activeKassaStaff && !clockedIn.some((s) => s.id === activeKassaStaff.id)) {
      setActiveKassaStaff(null)
      return
    }
    if (!activeKassaStaff && clockedIn.length === 1) {
      setActiveKassaStaff({ id: clockedIn[0].id, name: clockedIn[0].name })
    }
  }, [staffClockEnabled, staffClockListHydrated, staffClockList, activeKassaStaff])

  const clockedInStaff = useMemo(
    () => staffClockList.filter((s) => s.hasOpenSession),
    [staffClockList],
  )

  const startStaffSales = useCallback((s: { id: string; name: string }) => {
    flushSync(() => {
      staffClockPinReqGen.current += 1
      setStaffClockBusy(false)
      setActiveKassaStaff({ id: s.id, name: s.name })
      setStaffSalesPickOpen(false)
      setStaffClockOpen(false)
      setStaffClockPinModal(null)
      setStaffClockPinInput('')
      setStaffClockPinError(null)
    })
    try {
      playSuccess()
    } catch {
      /* optional */
    }
  }, [])

  const openStaffSalesPickModal = useCallback(() => {
    playClick()
    staffClockPinReqGen.current += 1
    setStaffClockBusy(false)
    setStaffClockOpen(false)
    setStaffClockPinModal(null)
    setStaffClockPinInput('')
    setStaffClockPinError(null)
    setStaffSalesPickOpen(true)
    void loadStaffClockList({ background: staffClockList.length > 0 })
  }, [loadStaffClockList, staffClockList.length])

  const openStaffClockModal = useCallback(() => {
    playClick()
    staffClockPinReqGen.current += 1
    setStaffSalesPickOpen(false)
    setStaffClockBusy(false)
    setStaffClockOpen(true)
    setStaffClockPinModal(null)
    setStaffClockPinInput('')
    setStaffClockPinError(null)
    void loadStaffClockList({ background: staffClockList.length > 0 })
  }, [loadStaffClockList, staffClockList.length])

  const submitStaffClockPin = useCallback(async () => {
    const modal = staffClockPinModal
    if (!modal) return
    const pin = staffClockPinInput.trim()
    if (!pin) {
      playClick()
      setStaffClockPinError(t('staffClock.pinRequired'))
      return
    }
    const reqGen = ++staffClockPinReqGen.current
    setStaffClockBusy(true)
    setStaffClockPinError(null)
    try {
      const res = await authFetch('/api/kassa/staff-clock', {
        method: 'POST',
        body: JSON.stringify({
          tenant_slug: tenant,
          staff_id: modal.staffId,
          pin,
          action: modal.action,
        }),
      })
      let data: { ok?: boolean; error?: string }
      try {
        data = (await res.json()) as typeof data
      } catch {
        if (staffClockPinReqGen.current !== reqGen) return
        setStaffClockPinError(t('staffClock.errors.server'))
        return
      }
      if (staffClockPinReqGen.current !== reqGen) return
      if (data.ok) {
        playSuccess()
        setStaffClockPinModal(null)
        setStaffClockPinInput('')
        if (modal.action === 'in') {
          setActiveKassaStaff({ id: modal.staffId, name: modal.staffName })
        }
        if (modal.action === 'out' && activeKassaStaff?.id === modal.staffId) {
          setActiveKassaStaff(null)
        }
        void loadStaffClockList({ background: true })
      } else {
        playClick()
        setStaffClockPinError(staffClockErrorText(data.error || 'unknown'))
      }
    } catch {
      if (staffClockPinReqGen.current !== reqGen) return
      setStaffClockPinError(t('staffClock.errors.server'))
    } finally {
      if (staffClockPinReqGen.current === reqGen) {
        setStaffClockBusy(false)
      }
    }
  }, [staffClockPinModal, staffClockPinInput, tenant, activeKassaStaff?.id, loadStaffClockList, staffClockErrorText, t])

  const hasAnyStaffClockedIn = useMemo(
    () => staffClockList.some((s) => s.hasOpenSession),
    [staffClockList],
  )

  const showKassaStaffClockButton = staffClockEnabled

  const requiresStaffSelectionForSale = useMemo(
    () =>
      staffClockEnabled &&
      (!staffClockListHydrated || hasAnyStaffClockedIn) &&
      !activeKassaStaff,
    [staffClockEnabled, staffClockListHydrated, hasAnyStaffClockedIn, activeKassaStaff],
  )

  const selectActiveKassaStaff = useCallback((s: { id: string; name: string }) => {
    playClick()
    setActiveKassaStaff({ id: s.id, name: s.name })
  }, [])

  const blockSaleWithoutStaffIfNeeded = useCallback((): boolean => {
    if (!requiresStaffSelectionForSale) return false
    playClick()
    alert(t('staffClock.pickStaffInHeader'))
    return true
  }, [requiresStaffSelectionForSale, t])

  return {
    activeKassaStaff,
    clockedInStaff,
    showKassaStaffClockButton,
    requiresStaffSelectionForSale,
    blockSaleWithoutStaffIfNeeded,
    openStaffSalesPickModal,
    openStaffClockModal,
    startStaffSales,
    selectActiveKassaStaff,
    staffClockOpen,
    setStaffClockOpen,
    staffSalesPickOpen,
    setStaffSalesPickOpen,
    staffClockList,
    staffClockListLoading,
    staffClockBusy,
    staffClockPinModal,
    setStaffClockPinModal,
    staffClockPinInput,
    setStaffClockPinInput,
    staffClockPinError,
    setStaffClockPinError,
    staffClockPinReqGen,
    setStaffClockBusy,
    submitStaffClockPin,
    loadStaffClockList,
  }
}
