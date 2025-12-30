'use client'

export default function CookiesPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="bg-dark py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Cookiebeleid
          </h1>
          <p className="text-xl text-gray-300">Laatst bijgewerkt: december 2025</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="prose prose-lg max-w-none">
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Wat zijn cookies?</h2>
          <p className="text-gray-600 mb-8">
            Cookies zijn kleine tekstbestanden die op uw computer of mobiel apparaat worden opgeslagen 
            wanneer u onze website bezoekt. Ze helpen ons om de website goed te laten functioneren en 
            uw gebruikerservaring te verbeteren.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">Welke cookies gebruiken wij?</h2>
          
          <h3 className="text-xl font-semibold text-gray-900 mb-3">Noodzakelijke cookies</h3>
          <p className="text-gray-600 mb-6">
            Deze cookies zijn essentieel voor het functioneren van de website. Zonder deze cookies 
            kunnen bepaalde functies niet werken.
          </p>

          <h3 className="text-xl font-semibold text-gray-900 mb-3">Functionele cookies</h3>
          <p className="text-gray-600 mb-6">
            Deze cookies onthouden uw voorkeuren en instellingen om uw ervaring te personaliseren.
          </p>

          <h3 className="text-xl font-semibold text-gray-900 mb-3">Analytische cookies</h3>
          <p className="text-gray-600 mb-8">
            Met uw toestemming gebruiken wij analytische cookies om te begrijpen hoe bezoekers onze 
            website gebruiken. Dit helpt ons om onze diensten te verbeteren.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">Cookies beheren</h2>
          <p className="text-gray-600 mb-8">
            U kunt uw cookievoorkeuren op elk moment aanpassen via uw browserinstellingen. 
            Let op: het uitschakelen van bepaalde cookies kan de functionaliteit van de website beperken.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact</h2>
          <p className="text-gray-600 mb-8">
            Voor vragen over ons cookiebeleid kunt u contact opnemen via{' '}
            <a href="mailto:info@vysionhoreca.com" className="text-accent hover:underline">info@vysionhoreca.com</a>
          </p>

          <div className="mt-12 pt-8 border-t border-gray-200 flex gap-4">
            <a href="/juridisch" className="text-accent hover:underline font-semibold">
              ← Terug naar Juridisch
            </a>
            <a href="/" className="text-gray-500 hover:underline">
              Home
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}

