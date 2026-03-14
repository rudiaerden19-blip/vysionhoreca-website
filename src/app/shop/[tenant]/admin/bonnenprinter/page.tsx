'use client'

const TESTFLIGHT_URL = 'https://testflight.apple.com/join/jtdBJyAk'

export default function BonnenprinterPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">🖨️ Bonnenprinter</h1>
        <p className="text-gray-600 mt-1">Stel uw bonnenprinter in voor automatisch printen van bestellingen</p>
      </div>

      {/* Stap 1 */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-orange-500 text-white font-bold flex items-center justify-center flex-shrink-0">1</div>
          <h2 className="text-lg font-bold text-gray-900">Download de Vysion Print App</h2>
        </div>
        <p className="text-gray-600 text-sm">
          Open deze link op uw iPad om de gratis Vysion Print App te installeren via TestFlight.
        </p>
        <div className="bg-gray-50 rounded-xl p-4 space-y-2 border border-gray-200">
          <p className="text-sm font-semibold text-gray-800">Installatie stappen:</p>
          <ol className="list-decimal list-inside space-y-1.5 text-sm text-gray-700">
            <li>Open Safari op uw iPad</li>
            <li>Klik op de download knop hieronder</li>
            <li>Installeer TestFlight (gratis Apple app)</li>
            <li>Installeer de Vysion Print App</li>
            <li>Log in met uw email en wachtwoord</li>
          </ol>
        </div>
        <a
          href={TESTFLIGHT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download Print App (TestFlight)
        </a>
      </div>

      {/* Stap 2 */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-orange-500 text-white font-bold flex items-center justify-center flex-shrink-0">2</div>
          <h2 className="text-lg font-bold text-gray-900">Printer verbinden</h2>
        </div>
        <p className="text-gray-600 text-sm">
          Zorg dat uw bonnenprinter op hetzelfde WiFi netwerk zit als uw iPad.
        </p>
        <div className="space-y-3">
          {[
            { title: 'Zelfde WiFi netwerk', desc: 'iPad en printer moeten op hetzelfde netwerk zitten' },
            { title: 'Thermische bonnenprinter', desc: 'Epson, Star of andere ESC/POS compatibele printers' },
            { title: 'Automatische detectie', desc: 'De app zoekt automatisch naar uw printer (poort 9100)' },
          ].map(({ title, desc }) => (
            <div key={title} className="flex items-start gap-3">
              <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-gray-900">{title}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hoe werkt het */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Hoe werkt het automatisch printen?</h2>
        <div className="space-y-3">
          {[
            'Klant bestelt via uw webshop of WhatsApp',
            'Bestelling komt binnen in uw admin panel',
            'De Print App op uw iPad print automatisch de bon',
            'Klant ontvangt zijn bon ✅',
          ].map((text, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 text-sm font-bold flex items-center justify-center flex-shrink-0">
                {i + 1}
              </div>
              <p className="text-sm text-gray-700">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Support */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-between">
        <div>
          <p className="font-semibold text-sm text-gray-900">Hulp nodig bij het instellen?</p>
          <p className="text-xs text-gray-500">Neem contact op met Vysion support</p>
        </div>
        <a
          href="mailto:support@vysionhoreca.com"
          className="text-blue-600 text-sm font-semibold hover:underline"
        >
          Contact →
        </a>
      </div>
    </div>
  )
}
