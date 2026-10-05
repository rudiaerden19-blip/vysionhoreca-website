'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { KassaHelpVideoPanel } from '@/components/kassa/KassaHelpVideoPanel'
import {
  KASSA_COLUMN_WHEN_HELP_OPEN_CLASS,
  KASSA_HELP_PANEL_COLUMN_CLASS,
} from '@/lib/kassa-help-panel-layout'
import {
  loadKassaHelpVideoSession,
  saveKassaHelpVideoSession,
  type KassaHelpVideoSessionState,
} from '@/lib/kassa-help-video-session'

type Ctx = {
  open: boolean
  topicId: string | null
  stepIndex: number
  openHelp: () => void
  closeHelp: () => void
  openTopic: (topicId: string) => void
  backToTopicList: () => void
  setStepIndex: (index: number) => void
  nextStep: (totalSteps: number) => void
}

const KassaHelpVideoContext = createContext<Ctx | null>(null)

export function useKassaHelpVideoSession(): Ctx {
  const ctx = useContext(KassaHelpVideoContext)
  if (!ctx) {
    throw new Error('useKassaHelpVideoSession buiten KassaHelpVideoProvider')
  }
  return ctx
}

/** Optioneel: kassa-page mag zonder crash als provider ontbreekt (tests). */
export function useKassaHelpVideoSessionOptional(): Ctx | null {
  return useContext(KassaHelpVideoContext)
}

export function KassaHelpVideoProvider({
  tenantSlug,
  children,
}: {
  tenantSlug: string
  children: ReactNode
}) {
  const [session, setSession] = useState<KassaHelpVideoSessionState>(() =>
    loadKassaHelpVideoSession(tenantSlug),
  )

  useEffect(() => {
    saveKassaHelpVideoSession(tenantSlug, session)
  }, [tenantSlug, session])

  useEffect(() => {
    const root = document.documentElement
    if (session.open) {
      root.setAttribute('data-kassa-help-open', '1')
      root.style.setProperty('--vysion-admin-pane-width', '50vw')
    } else {
      root.removeAttribute('data-kassa-help-open')
      root.style.removeProperty('--vysion-admin-pane-width')
    }
    return () => {
      root.removeAttribute('data-kassa-help-open')
      root.style.removeProperty('--vysion-admin-pane-width')
    }
  }, [session.open])

  const openHelp = useCallback(() => {
    setSession((s) => ({ ...s, open: true }))
  }, [])

  const closeHelp = useCallback(() => {
    setSession({ open: false, topicId: null, stepIndex: 0 })
  }, [])

  const openTopic = useCallback((topicId: string) => {
    setSession((s) => ({ ...s, open: true, topicId, stepIndex: 0 }))
  }, [])

  const backToTopicList = useCallback(() => {
    setSession((s) => ({ ...s, topicId: null, stepIndex: 0 }))
  }, [])

  const setStepIndex = useCallback((stepIndex: number) => {
    setSession((s) => ({ ...s, stepIndex }))
  }, [])

  const nextStep = useCallback((totalSteps: number) => {
    setSession((s) => {
      if (s.stepIndex < totalSteps - 1) {
        return { ...s, stepIndex: s.stepIndex + 1 }
      }
      return { ...s, topicId: null, stepIndex: 0 }
    })
  }, [])

  const value = useMemo<Ctx>(
    () => ({
      open: session.open,
      topicId: session.topicId,
      stepIndex: session.stepIndex,
      openHelp,
      closeHelp,
      openTopic,
      backToTopicList,
      setStepIndex,
      nextStep,
    }),
    [session, openHelp, closeHelp, openTopic, backToTopicList, setStepIndex, nextStep],
  )

  return (
    <KassaHelpVideoContext.Provider value={value}>
      {session.open ? (
        <div className="flex h-[100dvh] max-h-[100dvh] min-h-0 w-full flex-row overflow-hidden supports-[height:100dvh]:h-[100dvh] supports-[height:100dvh]:max-h-[100dvh]">
          <div
            className={`${KASSA_COLUMN_WHEN_HELP_OPEN_CLASS} relative isolate max-w-[50vw] bg-gray-100`}
            data-vysion-admin-pane
          >
            {children}
          </div>
          <aside
            className={`relative z-[30] flex min-h-0 max-w-[50vw] flex-col border-l border-white/10 bg-[#0b0f14] text-white shadow-2xl ${KASSA_HELP_PANEL_COLUMN_CLASS}`}
            data-vysion-help-video-pane
          >
            <KassaHelpVideoPanel tenantSlug={tenantSlug} />
          </aside>
        </div>
      ) : (
        children
      )}
    </KassaHelpVideoContext.Provider>
  )
}
