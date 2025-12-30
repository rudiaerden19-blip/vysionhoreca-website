'use client'

export default function HandelsmerkPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="bg-dark py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Vysion Handelsmerk en Auteursrechtrichtlijnen
          </h1>
          <p className="text-xl text-gray-300">Laatst bijgewerkt: december 2025</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="prose prose-lg max-w-none">
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Onze Merken</h2>
          <p className="text-gray-600 mb-8">
            De volgende merknamen en logo's zijn eigendom van Vysion Group International:
          </p>
          <ul className="list-disc pl-6 text-gray-600 mb-8 space-y-2">
            <li>Vysion™</li>
            <li>Vysion Horeca™</li>
            <li>Vysion Apps™</li>
            <li>SCARDA™</li>
            <li>Het Vysion logo en alle varianten</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">Toegestaan Gebruik</h2>
          <p className="text-gray-600 mb-4">U mag onze merknamen gebruiken om:</p>
          <ul className="list-disc pl-6 text-gray-600 mb-8 space-y-2">
            <li>Naar onze producten of diensten te verwijzen in tekst</li>
            <li>Aan te geven dat u Vysion Horeca gebruikt in uw zaak</li>
            <li>Reviews of artikelen over onze diensten te schrijven</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">Niet Toegestaan</h2>
          <p className="text-gray-600 mb-4">Het is niet toegestaan om:</p>
          <ul className="list-disc pl-6 text-gray-600 mb-8 space-y-2">
            <li>Onze logo's te gebruiken zonder schriftelijke toestemming</li>
            <li>Onze merknamen te gebruiken in uw bedrijfsnaam of productnaam</li>
            <li>De indruk te wekken dat u door ons wordt gesponsord of ondersteund</li>
            <li>Onze merknamen te registreren als domeinnaam of social media handle</li>
            <li>Onze merken te wijzigen of te combineren met andere elementen</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">Logo Richtlijnen</h2>
          <p className="text-gray-600 mb-8">
            Als u toestemming heeft om ons logo te gebruiken, houdt u zich aan de volgende richtlijnen:
          </p>
          <ul className="list-disc pl-6 text-gray-600 mb-8 space-y-2">
            <li>Gebruik alleen officiële logo-bestanden die wij aanleveren</li>
            <li>Wijzig de kleuren of verhoudingen niet</li>
            <li>Zorg voor voldoende witruimte rondom het logo</li>
            <li>Plaats het logo niet op drukke achtergronden</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">Toestemming Aanvragen</h2>
          <p className="text-gray-600 mb-8">
            Voor toestemming om onze merknamen of logo's te gebruiken, neem contact op via{' '}
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

