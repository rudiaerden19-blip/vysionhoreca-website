'use client'

export default function VerwerkersovereenkomstPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="bg-dark py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Verwerkersovereenkomst
          </h1>
          <p className="text-xl text-gray-300">Laatst bijgewerkt: december 2025</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="prose prose-lg max-w-none">
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Definities</h2>
          <p className="text-gray-600 mb-8">
            In deze verwerkersovereenkomst wordt verstaan onder:<br />
            <strong>Verwerkingsverantwoordelijke:</strong> de klant die gebruik maakt van Vysion Horeca diensten<br />
            <strong>Verwerker:</strong> Vysion Horeca / Vysion Group International<br />
            <strong>Persoonsgegevens:</strong> alle gegevens die betrekking hebben op een geïdentificeerde of identificeerbare natuurlijke persoon
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Onderwerp en Duur</h2>
          <p className="text-gray-600 mb-8">
            Deze overeenkomst regelt de verwerking van persoonsgegevens door Vysion Horeca namens u. 
            De overeenkomst is van kracht zolang u gebruik maakt van onze diensten.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Aard en Doel van de Verwerking</h2>
          <p className="text-gray-600 mb-4">Wij verwerken persoonsgegevens voor:</p>
          <ul className="list-disc pl-6 text-gray-600 mb-8 space-y-2">
            <li>Het leveren van kassasoftware en gerelateerde diensten</li>
            <li>Het verwerken van transacties en bestellingen</li>
            <li>Het bijhouden van klantgegevens en bestelhistorie</li>
            <li>Het genereren van rapporten en analyses</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Categorieën Persoonsgegevens</h2>
          <ul className="list-disc pl-6 text-gray-600 mb-8 space-y-2">
            <li>Contactgegevens (naam, adres, e-mail, telefoon)</li>
            <li>Transactiegegevens</li>
            <li>Bestelgegevens</li>
            <li>Personeelsgegevens (indien van toepassing)</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Verplichtingen Verwerker</h2>
          <p className="text-gray-600 mb-4">Vysion Horeca zal:</p>
          <ul className="list-disc pl-6 text-gray-600 mb-8 space-y-2">
            <li>Persoonsgegevens alleen verwerken volgens uw instructies</li>
            <li>Passende technische en organisatorische maatregelen nemen</li>
            <li>Vertrouwelijkheid garanderen</li>
            <li>U bijstaan bij het nakomen van uw verplichtingen onder de AVG</li>
            <li>Na beëindiging gegevens verwijderen of retourneren</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Subverwerkers</h2>
          <p className="text-gray-600 mb-8">
            Wij maken gebruik van subverwerkers voor bepaalde diensten. Een actuele lijst is 
            beschikbaar op onze subverwerkers pagina. Wij informeren u bij wijzigingen.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Beveiliging</h2>
          <p className="text-gray-600 mb-8">
            Wij implementeren passende beveiligingsmaatregelen waaronder encryptie, 
            toegangscontrole, en regelmatige beveiligingsaudits.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Datalekken</h2>
          <p className="text-gray-600 mb-8">
            Bij een datalek informeren wij u zonder onredelijke vertraging, zodat u aan uw 
            meldingsplicht kunt voldoen.
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

