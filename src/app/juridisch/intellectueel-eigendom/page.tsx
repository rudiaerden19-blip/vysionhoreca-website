'use client'

export default function IntellectueelEigendomPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="bg-dark py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Beleid inzake Intellectueel Eigendom
          </h1>
          <p className="text-xl text-gray-300">Laatst bijgewerkt: december 2025</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="prose prose-lg max-w-none">
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Eigendom van Vysion</h2>
          <p className="text-gray-600 mb-8">
            Alle intellectuele eigendomsrechten met betrekking tot de Vysion Horeca software, 
            inclusief maar niet beperkt tot de broncode, ontwerpen, logo's, merknamen en documentatie, 
            zijn en blijven eigendom van Vysion Group International.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Licentie</h2>
          <p className="text-gray-600 mb-8">
            Door een abonnement af te sluiten, ontvangt u een beperkte, niet-exclusieve, 
            niet-overdraagbare licentie om de software te gebruiken voor uw bedrijfsvoering. 
            Deze licentie eindigt bij beëindiging van het abonnement.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Verboden Handelingen</h2>
          <p className="text-gray-600 mb-4">Het is niet toegestaan om:</p>
          <ul className="list-disc pl-6 text-gray-600 mb-8 space-y-2">
            <li>De software te kopiëren, wijzigen of reverse-engineeren</li>
            <li>De software te sublicentiëren of door te verkopen</li>
            <li>Beveiligingsmaatregelen te omzeilen</li>
            <li>Onze merknamen of logo's te gebruiken zonder toestemming</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Uw Content</h2>
          <p className="text-gray-600 mb-8">
            U behoudt alle rechten op uw eigen bedrijfsgegevens, productinformatie en klantdata. 
            U verleent ons een licentie om deze gegevens te verwerken voor het leveren van onze diensten.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Meldingen van Inbreuk</h2>
          <p className="text-gray-600 mb-8">
            Als u vermoedt dat er inbreuk wordt gemaakt op intellectuele eigendomsrechten, 
            neem dan contact met ons op. Wij nemen dergelijke meldingen serieus en zullen 
            passende maatregelen treffen.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Contact</h2>
          <p className="text-gray-600 mb-8">
            Voor vragen over intellectueel eigendom kunt u contact opnemen via{' '}
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

