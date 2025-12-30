'use client'

export default function SubverwerkersPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="bg-dark py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Subverwerkers
          </h1>
          <p className="text-xl text-gray-300">Laatst bijgewerkt: december 2025</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="prose prose-lg max-w-none">
          
          <p className="text-gray-600 mb-8">
            Vysion Horeca maakt gebruik van de volgende subverwerkers voor het leveren van onze diensten. 
            Alle subverwerkers zijn zorgvuldig geselecteerd en voldoen aan de AVG/GDPR vereisten.
          </p>

          <div className="overflow-x-auto mb-8">
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-200 px-4 py-3 text-left font-semibold">Subverwerker</th>
                  <th className="border border-gray-200 px-4 py-3 text-left font-semibold">Doel</th>
                  <th className="border border-gray-200 px-4 py-3 text-left font-semibold">Locatie</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-200 px-4 py-3">Amazon Web Services (AWS)</td>
                  <td className="border border-gray-200 px-4 py-3">Cloud hosting en opslag</td>
                  <td className="border border-gray-200 px-4 py-3">EU (Frankfurt)</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-200 px-4 py-3">Mollie</td>
                  <td className="border border-gray-200 px-4 py-3">Betalingsverwerking</td>
                  <td className="border border-gray-200 px-4 py-3">Nederland</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 px-4 py-3">Stripe</td>
                  <td className="border border-gray-200 px-4 py-3">Betalingsverwerking</td>
                  <td className="border border-gray-200 px-4 py-3">EU</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-200 px-4 py-3">Vercel</td>
                  <td className="border border-gray-200 px-4 py-3">Website hosting</td>
                  <td className="border border-gray-200 px-4 py-3">EU</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 px-4 py-3">SendGrid</td>
                  <td className="border border-gray-200 px-4 py-3">E-mail diensten</td>
                  <td className="border border-gray-200 px-4 py-3">EU</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">Wijzigingen</h2>
          <p className="text-gray-600 mb-8">
            Wij informeren onze klanten bij wijzigingen in de lijst van subverwerkers. 
            Als u bezwaar heeft tegen een nieuwe subverwerker, kunt u contact met ons opnemen.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact</h2>
          <p className="text-gray-600 mb-8">
            Voor vragen over onze subverwerkers kunt u contact opnemen via{' '}
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

