'use client'

import { useState } from 'react'
import { Navigation, Footer } from '@/components'

const categorieen = [
  {
    id: 'aan-de-slag',
    titel: 'Aan de slag',
    beschrijving: 'Eerste stappen met Vysion Horeca',
    icoon: '🚀',
    videos: [],
  },
  {
    id: 'kassa',
    titel: 'Kassa',
    beschrijving: 'Hoe je de kassa gebruikt',
    icoon: '🖥️',
    videos: [],
  },
  {
    id: 'bestellingen',
    titel: 'Bestellingen',
    beschrijving: 'Bestellingen beheren en verwerken',
    icoon: '📋',
    videos: [],
  },
  {
    id: 'producten',
    titel: 'Producten & Menu',
    beschrijving: 'Producten en categorieën aanmaken',
    icoon: '🍽️',
    videos: [],
  },
  {
    id: 'personeel',
    titel: 'Personeel',
    beschrijving: 'Personeel en uren beheren',
    icoon: '👥',
    videos: [],
  },
  {
    id: 'analyse',
    titel: 'Analyse & Rapporten',
    beschrijving: 'Omzet en statistieken bekijken',
    icoon: '📊',
    videos: [],
  },
]

export default function VideosPage() {
  const [actief, setActief] = useState<string | null>(null)

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
              <div
                key={cat.id}
                className="bg-[#E3E3E3] rounded-2xl p-8 cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1"
                onClick={() => setActief(actief === cat.id ? null : cat.id)}
              >
                <div className="text-5xl mb-4">{cat.icoon}</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{cat.titel}</h2>
                <p className="text-gray-600 mb-4">{cat.beschrijving}</p>
                <span className="text-accent font-medium text-sm">
                  {cat.videos.length} video{cat.videos.length !== 1 ? "'s" : ''} — binnenkort beschikbaar
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
