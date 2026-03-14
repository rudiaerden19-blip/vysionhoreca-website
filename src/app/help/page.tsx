'use client'

import { Navigation, Footer } from '@/components'

export default function HelpPage() {
  return (
    <main>
      <Navigation />

      {/* Hero */}
      <section className="bg-dark pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
              Help <span className="text-accent">pagina</span>
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Hier vind je antwoorden op je vragen.
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-lg text-gray-600">Inhoud komt hier.</p>
        </div>
      </section>

      <Footer />
    </main>
  )
}
