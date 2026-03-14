'use client'

import { useState } from 'react'
import { Navigation, Footer } from '@/components'

type Video = { titel: string; src: string }

const categorieen: { id: string; titel: string; beschrijving: string; icoon: string; videos: Video[] }[] = [
  {
    id: 'registreren',
    titel: 'Registreren',
    beschrijving: 'Account aanmaken en het admin paneel leren kennen',
    icoon: '🚀',
    videos: [
      { titel: 'Registreren', src: '/videos/registratie1.mp4' },
      { titel: 'Admin paneel', src: '/videos/admin-overzicht2.mp4' },
    ],
  },
  {
    id: 'modules',
    titel: 'Overzicht',
    beschrijving: 'Order scherm, analyse, verkoop en meer',
    icoon: '🖥️',
    videos: [
      { titel: 'Order scherm', src: '/videos/keukenscherm3.mp4' },
      { titel: 'Bedrijfs analyse', src: '/videos/analyse-module4.mp4' },
      { titel: 'Verkoop', src: '/videos/verkoop5.mp4' },
      { titel: 'Populaire items', src: '/videos/populaire-items6.mp4' },
    ],
  },
  {
    id: 'instellingen',
    titel: 'Instellingen',
    beschrijving: 'Alles instellen voor je online shop',
    icoon: '⚙️',
    videos: [
      { titel: 'Online shop', src: '/videos/instellingen-online-shop.mp4' },
      { titel: 'Zaak profiel', src: '/videos/zaakprofiel.mp4' },
      { titel: 'Openingstijden', src: '/videos/openingstijden.mp4' },
      { titel: 'Levering en afhaal', src: '/videos/online-instellingen.mp4' },
      { titel: 'Betaal methodes', src: '/videos/betaal-methodes.mp4' },
      { titel: 'Design en kleuren', src: '/videos/design-en-kleuren.mp4' },
      { titel: 'Ons team', src: '/videos/team.mp4' },
      { titel: 'Cadeau bonnen', src: '/videos/cadeau-bonnen.mp4' },
    ],
  },
  {
    id: 'menu',
    titel: 'Menu',
    beschrijving: 'Producten, categorieën en opties beheren',
    icoon: '🍽️',
    videos: [
      { titel: 'Producten, categorieën en opties', src: '/videos/producten.mp4' },
    ],
  },
  {
    id: 'whatsapp-bestellingen',
    titel: 'Whatsapp bestellingen',
    beschrijving: 'Bestellingen via WhatsApp ontvangen en beheren',
    icoon: '💬',
    videos: [
      { titel: 'WhatsApp', src: '/videos/whatsapp.mp4' },
    ],
  },
  {
    id: 'personeel',
    titel: 'Personeel',
    beschrijving: 'Medewerkers, uren en vacatures beheren',
    icoon: '👥',
    videos: [
      { titel: 'Medewerker aanmaken', src: '/videos/medewerker-aanmaken.mp4' },
      { titel: 'Uren registratie', src: '/videos/uren-registratie.mp4' },
      { titel: 'Vacatures', src: '/videos/vacature.mp4' },
    ],
  },
  {
    id: 'kostenberekening',
    titel: 'Kostenberekening',
    beschrijving: 'Ingrediënten en productprijzen berekenen',
    icoon: '🧮',
    videos: [
      { titel: 'Ingrediënten berekening', src: '/videos/berekening1.mp4' },
      { titel: 'Producten berekening', src: '/videos/prijs-berekening2.mp4' },
    ],
  },
  {
    id: 'bonnenprinter',
    titel: 'Bonnenprinter',
    beschrijving: 'Bonnenprinter instellen en gebruiken',
    icoon: '🖨️',
    videos: [
      { titel: 'Bonnenprinter', src: '/videos/printer.mp4' },
    ],
  },
  {
    id: 'groepsbestellingen',
    titel: 'Groepsbestellingen',
    beschrijving: 'Bestellingen beheren voor groepen',
    icoon: '👨‍👩‍👧‍👦',
    videos: [
      { titel: 'Groepsbestellingen', src: '/videos/groepsbestellingen.mp4' },
    ],
  },
  {
    id: 'bestellingen',
    titel: 'Bestellingen',
    beschrijving: 'Bestellingen en reserveringen beheren',
    icoon: '📋',
    videos: [
      { titel: 'Bestellingen', src: '/videos/bestellingen.mp4' },
      { titel: 'Reserveringen', src: '/videos/reserveringen.mp4' },
    ],
  },
  {
    id: 'z-rapporten',
    titel: 'Z Rapporten',
    beschrijving: 'Dagelijkse rapporten en afsluiting',
    icoon: '📊',
    videos: [
      { titel: 'Z Rapport', src: '/videos/z-rapport.mp4' },
    ],
  },
]

export default function VideosPage() {
  const [actief, setActief] = useState<string | null>(null)
  const [actieveVideo, setActieveVideo] = useState<Video | null>(null)

  return (
    <main>
      <Navigation />

      {/* Hero */}
      <section className="bg-dark pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
            Help <span className="text-accent">Video's</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Leer alles over Vysion Horeca in korte video's van 3 minuten.
          </p>
        </div>
      </section>

      {/* Categorieën */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {categorieen.map((cat) => (
              <div key={cat.id}>
                <div
                  className="bg-[#E3E3E3] rounded-2xl p-8 cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1"
                  onClick={() => setActief(actief === cat.id ? null : cat.id)}
                >
                  <div className="text-5xl mb-4">{cat.icoon}</div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{cat.titel}</h2>
                  <p className="text-gray-600 mb-4">{cat.beschrijving}</p>
                  <span className="text-accent font-medium text-sm">
                    {cat.videos.length} video{cat.videos.length !== 1 ? "'s" : ''}
                    {cat.videos.length === 0 ? ' — binnenkort beschikbaar' : ''}
                  </span>
                </div>

                {/* Video lijst */}
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

      {/* Video modal */}
      {actieveVideo && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setActieveVideo(null)}
        >
          <div className="bg-black rounded-2xl overflow-hidden w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4">
              <h3 className="text-white font-semibold text-lg">{actieveVideo.titel}</h3>
              <button onClick={() => setActieveVideo(null)} className="text-gray-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <video
              src={actieveVideo.src}
              controls
              autoPlay
              className="w-full aspect-video"
            />
          </div>
        </div>
      )}

      <Footer />
    </main>
  )
}
