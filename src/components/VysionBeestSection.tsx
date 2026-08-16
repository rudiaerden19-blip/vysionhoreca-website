'use client'

import { BEEST_HARDWARE_VIDEOS, HardwareVideoStack } from '@/components/HardwareVideoStack'
import { Fragment, useLayoutEffect, useRef, useState } from 'react'
import { useLanguage } from '@/i18n'

/** Zet `**vet**`in vertaalstrings om naar <strong>. */
function InlineBold({ text }: { text: string }) {
  const parts = text.split(/\*\*/)
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold text-gray-900">
            {part}
          </strong>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </>
  )
}

/**
 * Marketing: hardware-USP tussen gratis-websitebanner en platformgrid.
 * Drie hardwarefilmpjes (SUNMI, Epson, Elo) in plaats van productfoto’s.
 */
export default function VysionBeestSection() {
  const { t, locale } = useLanguage()
  const textColRef = useRef<HTMLDivElement>(null)
  /** Op lg: hoogte videostapel = tekstkolom. */
  const [textColPx, setTextColPx] = useState<number | null>(null)

  useLayoutEffect(() => {
    const el = textColRef.current
    if (!el) return

    const mq = window.matchMedia('(min-width: 1024px)')
    const update = () => {
      if (!mq.matches) {
        setTextColPx(null)
        return
      }
      setTextColPx(el.offsetHeight)
    }

    update()
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(update)
    })
    ro.observe(el)
    mq.addEventListener('change', update)
    window.addEventListener('resize', update)
    return () => {
      ro.disconnect()
      mq.removeEventListener('change', update)
      window.removeEventListener('resize', update)
    }
  }, [locale])

  const lockStackToText = textColPx != null

  return (
    <section
      className="border-b border-gray-100 bg-white py-14 sm:py-16 lg:py-20"
      aria-labelledby="vysion-beest-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2 lg:gap-12 xl:gap-16">
          <div
            className="order-2 mx-auto w-full max-w-xl lg:order-1 lg:mx-0 lg:max-w-none lg:pr-2"
            style={
              lockStackToText && textColPx != null
                ? { height: textColPx, maxHeight: textColPx }
                : undefined
            }
          >
            <HardwareVideoStack
              videos={BEEST_HARDWARE_VIDEOS}
              stackClassName={`flex h-full w-full flex-col gap-3 sm:gap-4 ${lockStackToText ? 'min-h-0' : ''}`}
              getTileClassName={() =>
                [
                  'group relative w-full overflow-hidden rounded-xl bg-[#141414] ring-1 ring-gray-100 shadow-sm text-left',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
                  lockStackToText ? 'min-h-0 flex-1 basis-0' : 'aspect-[5/4]',
                ].join(' ')
              }
              labelClassName="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-2 pb-2 pt-6 text-center text-[0.65rem] font-semibold text-white/95 sm:text-xs"
            />
          </div>
          <div ref={textColRef} className="order-1 lg:order-2 lg:min-w-0">
            <h2
              id="vysion-beest-heading"
              className="mb-4 text-2xl font-bold leading-tight tracking-tight text-accent sm:text-3xl lg:text-[1.85rem] xl:text-4xl"
            >
              {t('vysionBeest.headline')}
            </h2>
            <p className="mb-8 text-base leading-relaxed text-gray-600 sm:text-lg">
              <InlineBold text={t('vysionBeest.intro')} />
            </p>

            <h3 className="mb-3 text-lg font-bold text-gray-900 sm:text-xl">{t('vysionBeest.specsHeading')}</h3>
            <ul className="mb-8 space-y-5 text-base leading-relaxed text-gray-600 sm:text-[1.05rem]">
              <li>
                <InlineBold text={t('vysionBeest.specSpeed')} />
              </li>
              <li>
                <p className="mb-2 font-bold text-gray-900">{t('vysionBeest.specDualTitle')}</p>
                <ul className="ml-0 list-none space-y-3 border-l-[3px] border-accent pl-4 sm:border-l-4">
                  <li>
                    <InlineBold text={t('vysionBeest.specDualMain')} />
                  </li>
                  <li>
                    <InlineBold text={t('vysionBeest.specDualCustomer')} />
                  </li>
                </ul>
              </li>
              <li>
                <InlineBold text={t('vysionBeest.specStorage')} />
              </li>
            </ul>

            <h3 className="mb-3 text-lg font-bold text-gray-900 sm:text-xl">{t('vysionBeest.worksHeading')}</h3>
            <p className="mb-4 text-base leading-relaxed text-gray-600 sm:text-[1.05rem]">
              {t('vysionBeest.worksLead')}
            </p>
            <ul className="mb-8 space-y-3 text-base leading-relaxed text-gray-600 sm:text-[1.05rem]">
              <li className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                <span>
                  <InlineBold text={t('vysionBeest.worksBullet1')} />
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                <span>
                  <InlineBold text={t('vysionBeest.worksBullet2')} />
                </span>
              </li>
            </ul>

            <blockquote className="border-l-4 border-accent pl-4 text-base italic leading-relaxed text-gray-700 sm:text-[1.05rem]">
              {t('vysionBeest.quote')}
            </blockquote>
          </div>
        </div>
      </div>
    </section>
  )
}
