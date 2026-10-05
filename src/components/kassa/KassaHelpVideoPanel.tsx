'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLanguage } from '@/i18n'
import {
  KASSA_HELP_VIDEO_TOPICS,
  findKassaHelpTopic,
  kassaHelpVideoPublicUrl,
  type KassaHelpVideoTopic,
} from '@/lib/kassa-help-video-catalog'
import { KASSA_HELP_PANEL_COLUMN_CLASS } from '@/lib/kassa-help-panel-layout'

type Props = {
  /** Gereserveerd voor tenant-specifieke video’s later */
  tenantSlug: string
  onClose: () => void
}

export function KassaHelpVideoPanel({ onClose }: Props) {
  const { t } = useLanguage()
  const [topicId, setTopicId] = useState<string | null>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [videoFailed, setVideoFailed] = useState(false)

  useEffect(() => {
    setTopicId(null)
    setStepIndex(0)
    setVideoFailed(false)
  }, [])

  const topic = topicId ? findKassaHelpTopic(topicId) : null
  const step = topic?.steps[stepIndex]

  const videoSrc = useMemo(() => {
    if (!step) return null
    return kassaHelpVideoPublicUrl(step.videoPath)
  }, [step])

  useEffect(() => {
    setVideoFailed(false)
  }, [videoSrc, stepIndex, topicId])

  const openTopic = useCallback((id: string) => {
    setTopicId(id)
    setStepIndex(0)
    setVideoFailed(false)
  }, [])

  const backToList = useCallback(() => {
    setTopicId(null)
    setStepIndex(0)
    setVideoFailed(false)
  }, [])

  const onNextStep = useCallback(() => {
    if (!topic) return
    if (stepIndex < topic.steps.length - 1) {
      setStepIndex((i) => i + 1)
      return
    }
    backToList()
  }, [topic, stepIndex, backToList])

  const nextLabel =
    topic && stepIndex >= topic.steps.length - 1
      ? t('kassaApp.helpVideoBackToList')
      : t('kassaApp.helpVideoNextStep')

  return (
    <aside
      className={`flex flex-col border-l border-white/10 bg-[#0b0f14] text-white shadow-2xl ${KASSA_HELP_PANEL_COLUMN_CLASS}`}
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
          onClick={onClose}
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
                onClick={() => openTopic(item.id)}
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
    </aside>
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
  const step = topic.steps[stepIndex]
  const hint = step ? t(step.hintKey) : ''
  const stepLabel = t('kassaApp.helpVideoStepLabel')
    .replace('{current}', String(stepIndex + 1))
    .replace('{total}', String(topic.steps.length))

  useEffect(() => {
    if (!videoSrc || videoFailed) return
    playHelpVideo(videoRef.current)
  }, [videoSrc, videoFailed, stepIndex])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <p className="shrink-0 px-2 pt-1 text-[11px] text-white/60 sm:px-3">{stepLabel}</p>

      <div className="relative mx-1 min-h-0 flex-1 sm:mx-2">
        {videoSrc && !videoFailed ? (
          <div className="absolute inset-0 overflow-hidden rounded-lg bg-black shadow-lg sm:rounded-xl">
            <video
              ref={videoRef}
              key={videoSrc}
              className="size-full object-contain"
              src={videoSrc}
              controls
              autoPlay
              playsInline
              preload="auto"
              onLoadedData={(e) => playHelpVideo(e.currentTarget)}
              onError={onVideoError}
            />
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-black/40 p-4 text-center text-sm text-white/70">
            <span>{t('kassaApp.helpVideoNoVideoYet')}</span>
          </div>
        )}
      </div>

      <div className="line-clamp-2 shrink-0 px-2 py-1 text-[11px] leading-snug text-white/75 sm:px-3 sm:text-xs">
        {hint}
      </div>

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
