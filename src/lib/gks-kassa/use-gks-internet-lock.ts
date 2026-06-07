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
  internetLocked: boolean
} {
  const [locked, setLocked] = useState(() => getGksInternetLocked())

  useEffect(() => {
    ensureGksInternetLockPolling()
    return subscribeGksInternetLock(() => {
      setLocked(getGksInternetLocked())
    })
  }, [])

  return {
    gksOnline: !locked,
    internetLocked: locked,
  }
}
