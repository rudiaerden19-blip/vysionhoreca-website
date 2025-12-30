'use client'

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-dark py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Privacy & Veiligheid
          </h1>
          <p className="text-xl text-gray-300">
            Hoe wij omgaan met jouw gegevens
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="prose prose-lg max-w-none">
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Inleiding</h2>
          <p className="text-gray-600 mb-8">
            Vysion Horeca, onderdeel van Vysion Group International, hecht veel waarde aan de bescherming van jouw persoonsgegevens. 
            In deze privacyverklaring leggen wij uit welke gegevens wij verzamelen, waarom wij dit doen en hoe wij hiermee omgaan.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Welke gegevens verzamelen wij?</h2>
          <p className="text-gray-600 mb-4">Wij kunnen de volgende persoonsgegevens verzamelen:</p>
          <ul className="list-disc pl-6 text-gray-600 mb-8 space-y-2">
            <li>Naam en contactgegevens (e-mailadres, telefoonnummer)</li>
            <li>Bedrijfsgegevens (bedrijfsnaam, BTW-nummer, adres)</li>
            <li>Betalingsgegevens</li>
            <li>Gebruiksgegevens van onze software</li>
            <li>Communicatie die je met ons voert</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Waarvoor gebruiken wij jouw gegevens?</h2>
          <p className="text-gray-600 mb-4">Wij gebruiken jouw gegevens voor:</p>
          <ul className="list-disc pl-6 text-gray-600 mb-8 space-y-2">
            <li>Het leveren van onze diensten en software</li>
            <li>Het verwerken van betalingen</li>
            <li>Klantenservice en ondersteuning</li>
            <li>Het verbeteren van onze producten</li>
            <li>Communicatie over updates en nieuwe functies</li>
            <li>Naleving van wettelijke verplichtingen (o.a. GKS, fiscale wetgeving)</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Gegevensbeveiliging</h2>
          <p className="text-gray-600 mb-8">
            Wij nemen de beveiliging van jouw gegevens zeer serieus. Onze systemen zijn beveiligd met:
          </p>
          <ul className="list-disc pl-6 text-gray-600 mb-8 space-y-2">
            <li>SSL/TLS encryptie voor alle dataoverdracht</li>
            <li>Versleutelde opslag van gevoelige gegevens</li>
            <li>Regelmatige beveiligingsaudits</li>
            <li>Toegangscontrole en authenticatie</li>
            <li>Dagelijkse back-ups op beveiligde servers</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">5. GKS & Fiscale Compliance</h2>
          <p className="text-gray-600 mb-8">
            Vysion Horeca is volledig GKS-gecertificeerd en voldoet aan alle Belgische fiscale vereisten. 
            Transactiegegevens worden veilig opgeslagen conform de wettelijke bewaartermijnen.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Delen van gegevens</h2>
          <p className="text-gray-600 mb-8">
            Wij delen jouw gegevens alleen met derden wanneer dit noodzakelijk is voor onze dienstverlening 
            (zoals betalingsverwerkers) of wanneer wij hiertoe wettelijk verplicht zijn. Wij verkopen nooit 
            jouw gegevens aan derden.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Jouw rechten</h2>
          <p className="text-gray-600 mb-4">Je hebt het recht om:</p>
          <ul className="list-disc pl-6 text-gray-600 mb-8 space-y-2">
            <li>Inzage te vragen in jouw persoonsgegevens</li>
            <li>Jouw gegevens te laten corrigeren of verwijderen</li>
            <li>Bezwaar te maken tegen de verwerking</li>
            <li>Jouw gegevens over te dragen naar een andere dienst</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Cookies</h2>
          <p className="text-gray-600 mb-8">
            Onze website maakt gebruik van functionele cookies om de werking te verbeteren. 
            Analytische cookies worden alleen geplaatst met jouw toestemming.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Contact</h2>
          <p className="text-gray-600 mb-4">
            Voor vragen over deze privacyverklaring of jouw gegevens kun je contact opnemen via:
          </p>
          <p className="text-gray-600 mb-8">
            <strong>Email:</strong> <a href="mailto:info@vysionhoreca.com" className="text-accent hover:underline">info@vysionhoreca.com</a><br />
            <strong>Telefoon:</strong> +32 (0) 49 21 29 9383
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Wijzigingen</h2>
          <p className="text-gray-600 mb-8">
            Wij kunnen deze privacyverklaring van tijd tot tijd aanpassen. De meest recente versie is altijd 
            beschikbaar op deze pagina. Laatst bijgewerkt: december 2025.
          </p>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <a href="/" className="text-accent hover:underline font-semibold">
              ← Terug naar home
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}

