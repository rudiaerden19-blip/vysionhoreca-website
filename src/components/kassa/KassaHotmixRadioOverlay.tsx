'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLanguage } from '@/i18n'
import { ONTBIJTHUISJE_HOTMIX_URL } from '@/lib/kassa-ontbijthuisje-hotmix'

type Props = {
  expanded: boolean
  onRequestExpand: () => void
  onMinimize: () => void
}

/**
 * Hotmix over de kassa. Minimaliseren = terug naar kassa; iframe blijft (radio/sessie).
 * Geen sandbox — anders werkt Hotmix-inlog niet betrouwbaar in een iframe.
 */
export function KassaHotmixRadioOverlay({ expanded, onRequestExpand, onMinimize }: Props) {
  const { t } = useLanguage()
  const [started, setStarted] = useState(false)
  const [hostReady, setHostReady] = useState(false)
  const [frameGeneration, setFrameGeneration] = useState(0)

  useEffect(() => {
    setHostReady(true)
  }, [])

  useEffect(() => {
    if (expanded) setStarted(true)
  }, [expanded])

  useEffect(() => {
    if (!expanded) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onMinimize()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expanded, onMinimize])

  if (!hostReady || typeof document === 'undefined') return null
  if (!started) return null

  const iframe = (
    <iframe
      key={frameGeneration}
      title="Hotmix Radio"
      src={ONTBIJTHUISJE_HOTMIX_URL}
      className={expanded ? 'min-h-0 w-full flex-1 border-0 bg-white' : 'h-full w-full border-0'}
      allow="autoplay; encrypted-media; fullscreen; picture-in-picture; storage-access *"
      referrerPolicy="strict-origin-when-cross-origin"
    />
  )

  return createPortal(
    <>
      <div
        data-testid="kassa-hotmix-overlay"
        data-open={expanded ? 'true' : 'false'}
        role={expanded ? 'dialog' : undefined}
        aria-modal={expanded ? true : undefined}
        aria-label="Hotmix Radio"
        aria-hidden={expanded ? undefined : true}
        className={
          expanded
            ? 'fixed inset-0 z-[800] flex items-center justify-center bg-black/40 p-4'
            : 'pointer-events-none fixed -left-[9999px] top-0 -z-10 h-[480px] w-[640px] overflow-hidden opacity-0'
        }
      >
        <div
          data-testid="kassa-hotmix-panel"
          className={
            expanded
              ? 'flex h-full max-h-[calc(100vh-2rem)] w-full max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl bg-[#151a21] shadow-2xl'
              : 'h-full w-full'
          }
        >
          {expanded ? (
            <div className="flex shrink-0 items-center justify-between gap-2 px-3 py-2">
              <p className="min-w-0 truncate text-sm font-bold text-white sm:text-base">Hotmix Radio</p>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  data-testid="kassa-hotmix-refresh"
                  title={t('kassaApp.hotmixRefreshHint')}
                  onClick={() => setFrameGeneration((n) => n + 1)}
                  className="min-h-[2.25rem] rounded-lg border border-white/25 bg-white/10 px-3 text-sm font-semibold text-white hover:bg-white/20"
                >
                  {t('common.refresh')}
                </button>
                <button
                  type="button"
                  data-testid="kassa-hotmix-minimize"
                  title={t('kassaApp.hotmixMinimizeHint')}
                  onClick={onMinimize}
                  className="min-h-[2.25rem] rounded-lg bg-emerald-500 px-3 text-sm font-bold text-white hover:bg-emerald-600"
                >
                  {t('kassaApp.hotmixMinimize')}
                </button>
              </div>
            </div>
          ) : null}
          {iframe}
        </div>
      </div>

      {!expanded ? (
        <button
          type="button"
          data-testid="kassa-hotmix-restore"
          onClick={onRequestExpand}
          className="fixed bottom-4 left-4 z-[790] flex min-h-[2.75rem] max-w-[min(100vw-2rem,14rem)] items-center justify-center rounded-xl bg-[#151a21] px-4 py-2 text-sm font-bold text-white shadow-lg ring-2 ring-emerald-500/80 hover:bg-[#1f2630]"
        >
          {t('kassaApp.hotmixRestore')}
        </button>
      ) : null}
    </>,
    document.body,
  )
}
