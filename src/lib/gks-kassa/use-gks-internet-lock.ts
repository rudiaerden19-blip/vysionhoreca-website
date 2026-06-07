'use client'

import { useEffect, useState } from 'react'
import {
  ensureGksInternetLockPolling,
  getGksInternetLocked,
  getGksInternetOnline,
  subscribeGksInternetLock,
} from '@/lib/gks-kassa/gks-internet-lock'

export function useGksInternetLock(): {
  gksOnline: boolean
  /** Alleen true bij bevestigde offline — voor volscherm overlay. */
  internetLocked: boolean
} {
  const [snap, setSnap] = useState(() => ({
    locked: getGksInternetLocked(),
    online: getGksInternetOnline(),
  }))

  useEffect(() => {
    ensureGksInternetLockPolling()
    const sync = () => {
      setSnap({
        locked: getGksInternetLocked(),
        online: getGksInternetOnline(),
      })
    }
    sync()
    return subscribeGksInternetLock(sync)
  }, [])

  return {
    gksOnline: snap.online,
    internetLocked: snap.locked,
  }
}
