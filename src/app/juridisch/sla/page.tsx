'use client'

export default function SLAPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="bg-dark py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Service Level Agreement (SLA)
          </h1>
          <p className="text-xl text-gray-300">Laatst bijgewerkt: december 2025</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="prose prose-lg max-w-none">
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Beschikbaarheid</h2>
          <p className="text-gray-600 mb-8">
            Vysion Horeca garandeert een uptime van <strong>99,9%</strong> voor alle kernservices. 
            Dit is exclusief gepland onderhoud, dat vooraf wordt aangekondigd.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Gepland Onderhoud</h2>
          <p className="text-gray-600 mb-8">
            Gepland onderhoud vindt plaats buiten piekuren, bij voorkeur tussen 02:00 en 06:00 CET. 
            Klanten worden minimaal 48 uur van tevoren geïnformeerd.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Support Responstijden</h2>
          <div className="overflow-x-auto mb-8">
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-200 px-4 py-3 text-left font-semibold">Prioriteit</th>
                  <th className="border border-gray-200 px-4 py-3 text-left font-semibold">Beschrijving</th>
                  <th className="border border-gray-200 px-4 py-3 text-left font-semibold">Responstijd</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-200 px-4 py-3 font-semibold text-red-600">Kritiek</td>
                  <td className="border border-gray-200 px-4 py-3">Systeem volledig onbeschikbaar</td>
                  <td className="border border-gray-200 px-4 py-3">&lt; 1 uur</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-200 px-4 py-3 font-semibold text-orange-600">Hoog</td>
                  <td className="border border-gray-200 px-4 py-3">Belangrijke functie niet werkend</td>
                  <td className="border border-gray-200 px-4 py-3">&lt; 4 uur</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 px-4 py-3 font-semibold text-yellow-600">Medium</td>
                  <td className="border border-gray-200 px-4 py-3">Functie beperkt werkend</td>
                  <td className="border border-gray-200 px-4 py-3">&lt; 8 uur</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-200 px-4 py-3 font-semibold text-green-600">Laag</td>
                  <td className="border border-gray-200 px-4 py-3">Vraag of verbetersuggestie</td>
                  <td className="border border-gray-200 px-4 py-3">&lt; 24 uur</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Support Kanalen</h2>
          <ul className="list-disc pl-6 text-gray-600 mb-8 space-y-2">
            <li><strong>Email:</strong> info@vysionhoreca.com</li>
            <li><strong>Telefoon:</strong> +32 (0) 49 21 29 9383</li>
            <li><strong>In-app support:</strong> Beschikbaar in de Vysion Horeca applicatie</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Support Uren</h2>
          <p className="text-gray-600 mb-8">
            <strong>Light plan:</strong> Maandag t/m vrijdag, 09:00 - 17:00 CET<br />
            <strong>Pro plan:</strong> Maandag t/m zondag, 08:00 - 22:00 CET
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Back-ups</h2>
          <p className="text-gray-600 mb-8">
            Alle gegevens worden dagelijks geback-upt. Back-ups worden 30 dagen bewaard. 
            In geval van dataverlies kunnen wij gegevens herstellen vanaf de meest recente back-up.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Updates</h2>
          <p className="text-gray-600 mb-8">
            Software updates worden automatisch uitgerold, meestal 's nachts. 
            Belangrijke updates worden vooraf gecommuniceerd.
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

