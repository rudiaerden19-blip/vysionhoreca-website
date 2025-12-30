'use client'

export default function BetalingsplatformPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="bg-dark py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Vysion Payments Platform Overeenkomst
          </h1>
          <p className="text-xl text-gray-300">Laatst bijgewerkt: december 2025</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="prose prose-lg max-w-none">
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Inleiding</h2>
          <p className="text-gray-600 mb-8">
            Deze overeenkomst beschrijft de voorwaarden voor het gebruik van betalingsdiensten 
            via het Vysion Horeca platform. Betalingsverwerking gebeurt via onze partners Mollie en Stripe.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Betalingsverwerking</h2>
          <p className="text-gray-600 mb-8">
            Vysion Horeca integreert met erkende betalingsverwerkers om veilige transacties te garanderen. 
            Alle transacties worden versleuteld en voldoen aan PCI-DSS standaarden.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Ondersteunde Betaalmethodes</h2>
          <ul className="list-disc pl-6 text-gray-600 mb-8 space-y-2">
            <li>Bancontact</li>
            <li>Visa / Mastercard</li>
            <li>iDEAL</li>
            <li>Apple Pay / Google Pay</li>
            <li>Payconiq</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Transactiekosten</h2>
          <p className="text-gray-600 mb-8">
            Transactiekosten worden bepaald door de betalingsverwerker en zijn afhankelijk van 
            de betaalmethode en het transactievolume. Neem contact op voor actuele tarieven.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Uitbetalingen</h2>
          <p className="text-gray-600 mb-8">
            Ontvangen betalingen worden automatisch uitbetaald naar uw zakelijke bankrekening. 
            De uitbetalingsfrequentie is instelbaar (dagelijks, wekelijks of maandelijks).
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Terugboekingen en Geschillen</h2>
          <p className="text-gray-600 mb-8">
            Bij een terugboeking (chargeback) ontvangt u een melding en heeft u de mogelijkheid 
            om bewijs te leveren. Wij ondersteunen u bij het afhandelen van betalingsgeschillen.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Beveiliging</h2>
          <p className="text-gray-600 mb-8">
            Alle betalingsgegevens worden verwerkt conform PCI-DSS Level 1. 
            Kaartgegevens worden nooit opgeslagen op onze servers.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Contact</h2>
          <p className="text-gray-600 mb-8">
            Voor vragen over betalingen kunt u contact opnemen via{' '}
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

