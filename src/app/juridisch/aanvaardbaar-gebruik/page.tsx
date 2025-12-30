'use client'

export default function AanvaardbaarGebruikPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="bg-dark py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Beleid voor Aanvaardbaar Gebruik
          </h1>
          <p className="text-xl text-gray-300">Laatst bijgewerkt: december 2025</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="prose prose-lg max-w-none">
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Inleiding</h2>
          <p className="text-gray-600 mb-8">
            Dit Beleid voor Aanvaardbaar Gebruik beschrijft de regels voor het gebruik van de 
            diensten van Vysion Horeca. Door onze diensten te gebruiken, gaat u akkoord met dit beleid.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">Toegestaan Gebruik</h2>
          <p className="text-gray-600 mb-4">U mag onze diensten gebruiken voor:</p>
          <ul className="list-disc pl-6 text-gray-600 mb-8 space-y-2">
            <li>Het beheren van uw horecazaak</li>
            <li>Het verwerken van transacties en bestellingen</li>
            <li>Het bijhouden van uw boekhouding en administratie</li>
            <li>Het communiceren met klanten</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">Verboden Gebruik</h2>
          <p className="text-gray-600 mb-4">Het is verboden om onze diensten te gebruiken voor:</p>
          <ul className="list-disc pl-6 text-gray-600 mb-8 space-y-2">
            <li>Illegale activiteiten of fraude</li>
            <li>Het verspreiden van malware of schadelijke software</li>
            <li>Het schenden van intellectuele eigendomsrechten</li>
            <li>Het verstoren van onze diensten of servers</li>
            <li>Het verzamelen van gegevens van andere gebruikers zonder toestemming</li>
            <li>Het omzeilen van beveiligingsmaatregelen</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">Handhaving</h2>
          <p className="text-gray-600 mb-8">
            Bij schending van dit beleid kunnen wij uw account opschorten of beëindigen. 
            In ernstige gevallen kunnen wij juridische stappen ondernemen.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact</h2>
          <p className="text-gray-600 mb-8">
            Voor vragen kunt u contact opnemen via{' '}
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

