'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLanguage } from '@/i18n'
import {
  KASSA_HELP_VIDEO_TOPICS,
  findKassaHelpTopic,
  kassaHelpVideoPublicUrl,
  type KassaHelpVideoTopic,
} from '@/lib/kassa-help-video-catalog'
import { useKassaHelpVideoSession } from '@/components/kassa/KassaHelpVideoSession'

/** 100% = volledige opname (menu zichtbaar). Klant kan zelf + gebruiken voor tekst. */
const HELP_VIDEO_DEFAULT_ZOOM = 1
const HELP_VIDEO_ZOOM_MIN = 1
const HELP_VIDEO_ZOOM_MAX = 2.5
const HELP_VIDEO_ZOOM_STEP = 0.1

type Props = {
  tenantSlug: string
}

export function KassaHelpVideoPanel({ tenantSlug: _tenantSlug }: Props) {
  const { t } = useLanguage()
  const {
    topicId,
    stepIndex,
    closeHelp,
    openTopic,
    backToTopicList,
    nextStep,
  } = useKassaHelpVideoSession()
  const [videoFailed, setVideoFailed] = useState(false)

  const topic = topicId ? findKassaHelpTopic(topicId) : null
  const step = topic?.steps[stepIndex]

  const videoSrc = useMemo(() => {
    if (!step) return null
    return kassaHelpVideoPublicUrl(step.videoPath)
  }, [step])

  useEffect(() => {
    setVideoFailed(false)
  }, [videoSrc, stepIndex, topicId])

  const onOpenTopic = useCallback(
    (id: string) => {
      setVideoFailed(false)
      openTopic(id)
    },
    [openTopic],
  )

  const backToList = useCallback(() => {
    setVideoFailed(false)
    backToTopicList()
  }, [backToTopicList])

  const onNextStep = useCallback(() => {
    if (!topic) return
    setVideoFailed(false)
    nextStep(topic.steps.length)
  }, [topic, nextStep])

  const nextLabel =
    topic && stepIndex >= topic.steps.length - 1
      ? t('kassaApp.helpVideoBackToList')
      : t('kassaApp.helpVideoNextStep')

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      data-testid="kassa-help-panel"
      aria-label={t('kassaApp.helpVideoPanelTitle')}
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2 sm:px-4">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-white/60">
            {t('kassaApp.helpVideoPanelTitle')}
          </p>
          <h2 className="truncate text-base font-bold sm:text-lg">
            {topic ? t(topic.titleKey) : t('kassaApp.helpVideoPickTopic')}
          </h2>
        </div>
        <button
          type="button"
          onClick={closeHelp}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-lg font-bold hover:bg-white/20"
          aria-label={t('kassaApp.helpVideoClose')}
        >
          ✕
        </button>
      </header>

      {!topic ? (
        <ul className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-2 sm:p-3">
          {KASSA_HELP_VIDEO_TOPICS.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onOpenTopic(item.id)}
                className="mb-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-left text-sm font-semibold hover:bg-white/10 sm:text-base"
              >
                {t(item.titleKey)}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <TopicPlayer
          topic={topic}
          stepIndex={stepIndex}
          videoSrc={videoSrc}
          videoFailed={videoFailed}
          onVideoError={() => setVideoFailed(true)}
          t={t}
          nextLabel={nextLabel}
          onNextStep={onNextStep}
          onBackToList={backToList}
        />
      )}
    </div>
  )
}

function playHelpVideo(el: HTMLVideoElement | null) {
  if (!el) return
  el.currentTime = 0
  void el.play().catch(() => {
    /* sommige browsers blokkeren zonder recente tik — knop Volgende stap telt als gesture */
  })
}

function TopicPlayer({
  topic,
  stepIndex,
  videoSrc,
  videoFailed,
  onVideoError,
  t,
  nextLabel,
  onNextStep,
  onBackToList,
}: {
  topic: KassaHelpVideoTopic
  stepIndex: number
  videoSrc: string | null
  videoFailed: boolean
  onVideoError: () => void
  t: (key: string) => string
  nextLabel: string
  onNextStep: () => void
  onBackToList: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [zoom, setZoom] = useState(HELP_VIDEO_DEFAULT_ZOOM)
  const step = topic.steps[stepIndex]
  const hint = step ? t(step.hintKey) : ''
  const stepLabel = t('kassaApp.helpVideoStepLabel')
    .replace('{current}', String(stepIndex + 1))
    .replace('{total}', String(topic.steps.length))

  useEffect(() => {
    setZoom(HELP_VIDEO_DEFAULT_ZOOM)
  }, [videoSrc])

  useEffect(() => {
    if (!videoSrc || videoFailed) return
    playHelpVideo(videoRef.current)
  }, [videoSrc, videoFailed, stepIndex])

  const nudgeZoom = (delta: number) => {
    setZoom((z) => {
      const next = Math.round((z + delta) * 10) / 10
      return Math.min(HELP_VIDEO_ZOOM_MAX, Math.max(HELP_VIDEO_ZOOM_MIN, next))
    })
  }

  const enterFullscreen = () => {
    const el = videoRef.current
    if (!el) return
    const req =
      el.requestFullscreen?.bind(el) ??
      (el as HTMLVideoElement & { webkitEnterFullscreen?: () => void }).webkitEnterFullscreen?.bind(el)
    req?.()
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 px-2 pt-1 sm:px-3">
        <p className="text-[11px] text-white/60">{stepLabel}</p>
        {videoSrc && !videoFailed ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => nudgeZoom(-HELP_VIDEO_ZOOM_STEP)}
              className="rounded-md bg-white/10 px-2 py-0.5 text-sm font-bold text-white hover:bg-white/20"
              aria-label={t('kassaApp.helpVideoZoomOut')}
            >
              −
            </button>
            <span className="min-w-[3rem] text-center text-[11px] tabular-nums text-white/80">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => nudgeZoom(HELP_VIDEO_ZOOM_STEP)}
              className="rounded-md bg-white/10 px-2 py-0.5 text-sm font-bold text-white hover:bg-white/20"
              aria-label={t('kassaApp.helpVideoZoomIn')}
            >
              +
            </button>
            <button
              type="button"
              onClick={() => setZoom(HELP_VIDEO_DEFAULT_ZOOM)}
              className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-white/20"
            >
              {t('kassaApp.helpVideoZoomReset')}
            </button>
            <button
              type="button"
              onClick={enterFullscreen}
              className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-white/20"
            >
              {t('kassaApp.helpVideoFullscreen')}
            </button>
          </div>
        ) : null}
      </div>

      <div className="relative mx-0.5 min-h-0 flex-1 sm:mx-1">
        {videoSrc && !videoFailed ? (
          <div className="absolute inset-0 overflow-auto rounded-lg bg-black shadow-lg sm:rounded-xl">
            <div
              className="flex min-h-full min-w-full items-center justify-center"
              style={
                zoom !== 1
                  ? { transform: `scale(${zoom})`, transformOrigin: 'center center' }
                  : undefined
              }
            >
              <video
                ref={videoRef}
                key={videoSrc}
                className="size-full object-contain object-center [transform:translateZ(0)]"
                src={videoSrc}
                controls
                autoPlay
                playsInline
                preload="auto"
                onLoadedMetadata={(e) => playHelpVideo(e.currentTarget)}
                onError={onVideoError}
              />
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-black/40 p-4 text-center text-sm text-white/70">
            <span>{t('kassaApp.helpVideoNoVideoYet')}</span>
          </div>
        )}
      </div>

      <details className="shrink-0 px-2 py-0.5 text-[11px] text-white/75 sm:px-3 sm:text-xs">
        <summary className="cursor-pointer select-none text-white/60">{t('kassaApp.helpVideoShowHint')}</summary>
        <p className="pt-1 leading-snug">{hint}</p>
      </details>

      <footer className="flex shrink-0 flex-col gap-2 border-t border-white/10 p-3 sm:flex-row sm:p-3">
        <button
          type="button"
          onClick={onBackToList}
          className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/5"
        >
          {t('kassaApp.helpVideoBackToList')}
        </button>
        <button
          type="button"
          onClick={onNextStep}
          className="rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1d4ed8] sm:ml-auto"
        >
          {nextLabel}
        </button>
      </footer>
    </div>
  )
}
