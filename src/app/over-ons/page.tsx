'use client'

import { Navigation, Footer } from '@/components'

export default function OverOnsPage() {
  return (
    <main>
      <Navigation />
      
      {/* Hero Section */}
      <section className="bg-dark pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
              Over <span className="text-accent">Vysion</span> Horeca
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Ontstaan uit de praktijk, gebouwd door horecaondernemers, voor horecaondernemers.
            </p>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                Ons verhaal
              </h2>
              <div className="space-y-4 text-lg text-gray-600">
                <p>
                  Vysion Horeca is ontstaan uit ervaring. Als horecaondernemers merkten we dat bestaande kassasystemen te duur waren, te complex, en nooit precies deden wat we nodig hadden.
                </p>
                <p>
                  We betaalden voor vijf verschillende abonnementen: een kassa, een bestelplatform, boekhoudsoftware, een betaalterminal en analysesoftware. Niets werkte goed samen en de kosten liepen op tot honderden euro's per maand.
                </p>
                <p>
                  Daarom besloten we het zelf te bouwen. Een alles-in-één platform dat precies doet wat een horecaondernemer nodig heeft, zonder gedoe en tegen een eerlijke prijs.
                </p>
              </div>
            </div>
            <div className="bg-[#E3E3E3] rounded-3xl p-8 lg:p-12">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">Opgericht in 2013</h3>
                    <p className="text-gray-600">Door horecaondernemers met meer dan 15 jaar ervaring</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">Gevestigd in België</h3>
                    <p className="text-gray-600">Pelt, Limburg - het hart van de Benelux</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">Actief in 20+ landen</h3>
                    <p className="text-gray-600">Van België tot China, van Nederland tot het VK</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 bg-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              Onze missie
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Horecaondernemers laten focussen op wat ze het beste doen: gasten verwelkomen en geweldige ervaringen creëren. De rest regelen wij.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white/10 backdrop-blur rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Betrouwbaarheid</h3>
              <p className="text-gray-300">
                99.9% uptime. Je kassa werkt altijd, ook als het internet even wegvalt.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Snelheid</h3>
              <p className="text-gray-300">
                Razendsnelle updates. Vraag een functie aan en zie het de volgende dag in je systeem.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Persoonlijk</h3>
              <p className="text-gray-300">
                Geen callcenters. Directe lijnen met ons team. We kennen elke klant bij naam.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-[#E3E3E3]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
              Waar we voor staan
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">🎯 Eenvoud boven alles</h3>
              <p className="text-gray-600 text-lg">
                Technologie moet je helpen, niet in de weg zitten. Daarom is Vysion zo intuïtief dat je binnen 5 minuten aan de slag kunt - zonder handleiding.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">💰 Eerlijke prijzen</h3>
              <p className="text-gray-600 text-lg">
                Geen verborgen kosten, geen langlopende contracten, geen verrassingen. Wat je ziet is wat je betaalt.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">🚀 Continu verbeteren</h3>
              <p className="text-gray-600 text-lg">
                We luisteren naar onze klanten en bouwen wat zij nodig hebben. Elke week komen er nieuwe functies bij, gebaseerd op echte feedback.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">🌍 Lokaal én internationaal</h3>
              <p className="text-gray-600 text-lg">
                GKS-gecertificeerd in België, maar ook beschikbaar in 9 talen en 20+ landen. Van frituur tot sterrenrestaurant.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Company Info */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                Vysion Group International
              </h2>
              <div className="space-y-4 text-lg text-gray-600">
                <p>
                  Vysion Horeca is een onderdeel van de Vysion Group International, een technologiebedrijf gespecialiseerd in software voor de horeca- en retailsector.
                </p>
                <p>
                  Naast Vysion Horeca ontwikkelen we ook custom applicaties en digitale oplossingen voor bedrijven die hun processen willen automatiseren.
                </p>
              </div>

              <div className="mt-8 space-y-4">
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-gray-700">Siberiëstraat 24, 3900 Pelt, België</span>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <a href="mailto:info@vysionhoreca.com" className="text-accent hover:underline">info@vysionhoreca.com</a>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <a href="tel:+32492129383" className="text-accent hover:underline">+32 492 12 93 83</a>
                </div>
              </div>
            </div>

            <div className="bg-[#E3E3E3] rounded-3xl p-8 lg:p-12 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl font-bold text-accent mb-4">500+</div>
                <p className="text-xl text-gray-700 mb-8">Tevreden horecazaken</p>
                
                <div className="text-6xl font-bold text-accent mb-4">€2.5M+</div>
                <p className="text-xl text-gray-700 mb-8">Verwerkt per maand</p>
                
                <div className="text-6xl font-bold text-accent mb-4">24/7</div>
                <p className="text-xl text-gray-700">Support beschikbaar</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-accent">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Klaar om te starten?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Probeer Vysion Horeca 7 dagen gratis. Geen creditcard nodig.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/#demo" className="bg-white text-accent px-8 py-4 rounded-full font-semibold text-lg hover:bg-gray-100 transition-all">
              Start gratis proefperiode
            </a>
            <a href="/#contact" className="border-2 border-white text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-white hover:text-accent transition-all">
              Neem contact op
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
