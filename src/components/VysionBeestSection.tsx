'use client'

import Image from 'next/image'
import { Fragment } from 'react'
import { useLanguage } from '@/i18n'

/** Zet `**vet**` in vertaalstrings om naar <strong>. */
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

const BEEST_IMAGES = ['/images/vysion-beest-1.png', '/images/vysion-beest-2.png', '/images/vysion-beest-3.png'] as const

const BEEST_ALT_KEYS = ['vysionBeest.imageAlt1', 'vysionBeest.imageAlt2', 'vysionBeest.imageAlt3'] as const

/**
 * Marketing: hardware-USP tussen gratis-websitebanner en platformgrid.
 * Drie losse productfoto’s (`vysion-beest-1..3.png`), gelijk formaat kader, onder elkaar.
 */
export default function VysionBeestSection() {
  const { t } = useLanguage()

  return (
    <section
      className="border-b border-gray-100 bg-white py-14 sm:py-16 lg:py-20"
      aria-labelledby="vysion-beest-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2 lg:gap-12 xl:gap-16">
          <div className="order-2 mx-auto w-full max-w-xl lg:order-1 lg:mx-0 lg:max-w-none lg:pr-2">
            <div className="flex flex-col gap-4 sm:gap-5">
              {BEEST_IMAGES.map((src, i) => (
                <div
                  key={src}
                  className="relative aspect-[5/4] w-full overflow-hidden rounded-xl bg-gray-50 ring-1 ring-gray-100 shadow-sm"
                >
                  <Image
                    src={src}
                    alt={t(BEEST_ALT_KEYS[i])}
                    fill
                    sizes="(min-width: 1024px) 42vw, (min-width: 640px) 90vw, 100vw"
                    className="object-contain object-center p-3 sm:p-4"
                    priority={i === 0}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="order-1 lg:order-2 lg:min-w-0">
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-accent">
              {t('vysionBeest.eyebrow')}
            </p>
            <h2
              id="vysion-beest-heading"
              className="mb-4 text-2xl font-bold leading-tight tracking-tight text-gray-900 sm:text-3xl lg:text-[1.85rem] xl:text-4xl"
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
                <ul className="ml-0 list-none space-y-3 border-l-2 border-gray-200 pl-4">
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
