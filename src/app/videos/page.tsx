'use client'

import { useMemo, useState } from 'react'
import { Navigation, Footer } from '@/components'
import { useLanguage } from '@/i18n'

type Video = { titel: string; src: string }

const VIDEO_CATEGORY_DEFS = [
  {
    id: 'registreren',
    icoon: '🚀',
    videoKeys: ['registreren', 'kassa-layout'] as const,
  },
  {
    id: 'modules',
    icoon: '🖥️',
    videoKeys: ['keukenscherm3', 'analyse-module4', 'verkoop5', 'populaire-items6'] as const,
  },
  {
    id: 'instellingen',
    icoon: '⚙️',
    videoKeys: [
      'instellingen-online-shop',
      'zaakprofiel',
      'openingstijden',
      'online-instellingen',
      'betaal-methodes',
      'design-en-kleuren',
      'team',
      'cadeau-bonnen',
    ] as const,
  },
  {
    id: 'menu',
    icoon: '🍽️',
    videoKeys: ['producten'] as const,
  },
  {
    id: 'whatsapp-bestellingen',
    icoon: '💬',
    videoKeys: ['whatsapp'] as const,
  },
  {
    id: 'personeel',
    icoon: '👥',
    videoKeys: ['medewerker-aanmaken', 'uren-registratie', 'vacature'] as const,
  },
  {
    id: 'kostenberekening',
    icoon: '🧮',
    videoKeys: ['berekening1', 'prijs-berekening2'] as const,
  },
  {
    id: 'z-rapporten',
    icoon: '📊',
    videoKeys: ['z-rapport'] as const,
  },
  {
    id: 'bestellingen',
    icoon: '📋',
    videoKeys: ['bestellingen', 'reserveringen'] as const,
  },
  {
    id: 'groepsbestellingen',
    icoon: '👨‍👩‍👧‍👦',
    videoKeys: ['groepsbestellingen'] as const,
  },
  {
    id: 'bonnenprinter',
    icoon: '🖨️',
    videoKeys: ['printer'] as const,
  },
  {
    id: 'de-website',
    icoon: '🌐',
    videoKeys: ['de-website'] as const,
  },
  {
    id: 'de-shop',
    icoon: '🛒',
    videoKeys: ['de-shop'] as const,
  },
  {
    id: 'restaurant-reserveringen',
    icoon: '📅',
    videoKeys: [
      'res-rest-overzicht',
      'res-rest-bewerken',
      'res-rest-online',
      'res-rest-tafel',
      'res-rest-walkin',
    ] as const,
  },
] as const

function videoSrc(key: string): string {
  return `/videos/${key}.mp4`
}

export default function VideosPage() {
  const { t } = useLanguage()
  const [actief, setActief] = useState<string | null>(null)
  const [actieveVideo, setActieveVideo] = useState<Video | null>(null)

  const categorieen = useMemo(
    () =>
      VIDEO_CATEGORY_DEFS.map((def) => ({
        id: def.id,
        icoon: def.icoon,
        titel: t(`videosPage.cats.${def.id}.title`),
        beschrijving: t(`videosPage.cats.${def.id}.desc`),
        videos: def.videoKeys.map((key) => ({
          titel: t(`videosPage.v.${key}`),
          src: videoSrc(key),
        })),
      })),
    [t],
  )

  const videoCountLabel = (n: number) =>
    n === 1 ? t('videosPage.videoCountOne') : t('videosPage.videoCountMany').replace('{{count}}', String(n))

  return (
    <main>
      <Navigation />

      <section className="relative pt-32 pb-20 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(/images/videos-header-bg.png)' }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-black/55" aria-hidden />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 drop-shadow-sm">
            {t('videosPage.heroTitle')} <span className="text-accent">{t('videosPage.heroTitleAccent')}</span>
          </h1>
          <p className="text-xl text-gray-200 max-w-3xl mx-auto">{t('videosPage.heroSubtitle')}</p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {categorieen.map((cat) => (
              <div key={cat.id}>
                <div
                  className="bg-[#E3E3E3] rounded-2xl p-8 cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1 flex flex-col h-56"
                  onClick={() => setActief(actief === cat.id ? null : cat.id)}
                >
                  <div className="text-5xl mb-3">{cat.icoon}</div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">{cat.titel}</h2>
                  <p className="text-gray-600 text-sm flex-1 line-clamp-2">{cat.beschrijving}</p>
                  <span className="text-accent font-medium text-sm mt-3">
                    {videoCountLabel(cat.videos.length)}
                    {cat.videos.length === 0 ? t('videosPage.comingSoon') : ''}
                  </span>
                </div>

                {actief === cat.id && cat.videos.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {cat.videos.map((video, i) => (
                      <button
                        key={i}
                        onClick={() => setActieveVideo(video)}
                        className="w-full flex items-center gap-4 bg-white border border-gray-200 rounded-xl px-6 py-4 hover:border-accent hover:shadow transition-all text-left"
                      >
                        <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                        <span className="font-medium text-gray-900">{video.titel}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {actieveVideo && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setActieveVideo(null)}
        >
          <div className="bg-black rounded-2xl overflow-hidden w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4">
              <h3 className="text-white font-semibold text-lg">{actieveVideo.titel}</h3>
              <button type="button" onClick={() => setActieveVideo(null)} className="text-gray-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <video
              key={actieveVideo.src}
              controls
              className="w-full aspect-video"
              onLoadedMetadata={(e) => {
                void (e.target as HTMLVideoElement).play().catch(() => {})
              }}
            >
              <source src={actieveVideo.src} type="video/mp4" />
            </video>
          </div>
        </div>
      )}

      <Footer />
    </main>
  )
}
