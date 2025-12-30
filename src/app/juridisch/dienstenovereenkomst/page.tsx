'use client'

export default function DienstenovereenkomstPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="bg-dark py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Vysion Dienstenovereenkomst
          </h1>
          <p className="text-xl text-gray-300">Laatst bijgewerkt: december 2025</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="prose prose-lg max-w-none">
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Algemeen</h2>
          <p className="text-gray-600 mb-8">
            Deze Dienstenovereenkomst ("Overeenkomst") is van toepassing op het gebruik van de diensten 
            van Vysion Horeca, onderdeel van Vysion Group International. Door gebruik te maken van onze 
            diensten gaat u akkoord met deze voorwaarden.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Diensten</h2>
          <p className="text-gray-600 mb-8">
            Vysion Horeca biedt kassasoftware, online bestelplatform, boekhoudsoftware en aanverwante 
            diensten voor de horecasector. Wij behouden ons het recht voor om onze diensten te wijzigen, 
            uit te breiden of te beperken.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Abonnement en Betaling</h2>
          <p className="text-gray-600 mb-4">
            De toegang tot onze diensten is beschikbaar via een maandelijks of jaarlijks abonnement. 
            Betalingen worden vooraf gefactureerd en zijn niet-restitueerbaar, tenzij anders vermeld.
          </p>
          <ul className="list-disc pl-6 text-gray-600 mb-8 space-y-2">
            <li>Facturen worden maandelijks of jaarlijks verstuurd</li>
            <li>Betalingstermijn is 14 dagen na factuurdatum</li>
            <li>Bij niet-betaling kan toegang worden opgeschort</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Gebruik van de Diensten</h2>
          <p className="text-gray-600 mb-8">
            U bent verantwoordelijk voor het rechtmatige gebruik van onze diensten. Het is verboden om 
            de diensten te gebruiken voor illegale doeleinden, inbreuk te maken op intellectuele 
            eigendomsrechten, of de diensten te verstoren.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Gegevens en Privacy</h2>
          <p className="text-gray-600 mb-8">
            Wij verwerken uw gegevens conform onze Privacyverklaring en de toepasselijke wetgeving, 
            waaronder de AVG/GDPR. U behoudt eigendom over uw bedrijfsgegevens.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Aansprakelijkheid</h2>
          <p className="text-gray-600 mb-8">
            Vysion Horeca is niet aansprakelijk voor indirecte schade, gevolgschade of gederfde winst. 
            Onze totale aansprakelijkheid is beperkt tot het bedrag dat u in de afgelopen 12 maanden 
            aan ons heeft betaald.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Beëindiging</h2>
          <p className="text-gray-600 mb-8">
            U kunt uw abonnement op elk moment opzeggen. De opzegging gaat in aan het einde van de 
            lopende facturatieperiode. Wij kunnen de overeenkomst beëindigen bij schending van deze voorwaarden.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Toepasselijk Recht</h2>
          <p className="text-gray-600 mb-8">
            Op deze overeenkomst is Belgisch recht van toepassing. Geschillen worden voorgelegd aan 
            de bevoegde rechtbank te België.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Contact</h2>
          <p className="text-gray-600 mb-8">
            Voor vragen over deze overeenkomst kunt u contact opnemen via{' '}
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

