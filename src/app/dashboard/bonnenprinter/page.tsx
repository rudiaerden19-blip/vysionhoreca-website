'use client'

const TESTFLIGHT_URL = 'https://testflight.apple.com/join/jtdBJyAk'

export default function BonnenprinterPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">🖨️ Bonnenprinter</h1>
        <p className="text-gray-400 mt-1">Stel uw bonnenprinter in voor automatisch printen van bestellingen</p>
      </div>

      {/* Stap 1 */}
      <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-gray-800 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-orange-500 text-white font-bold flex items-center justify-center flex-shrink-0">1</div>
          <h2 className="text-lg font-bold text-white">Download de Vysion Print App</h2>
        </div>
        <p className="text-gray-400 text-sm">
          Open deze link op uw iPad om de gratis Vysion Print App te installeren. De app is nodig om bonnen te printen op uw bonnenprinter.
        </p>
        <div className="bg-[#0f0f0f] rounded-xl p-4 space-y-2">
          <p className="text-sm font-medium text-white">Installatie stappen:</p>
          <ol className="list-decimal list-inside space-y-1.5 text-sm text-gray-400">
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
      <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-gray-800 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-orange-500 text-white font-bold flex items-center justify-center flex-shrink-0">2</div>
          <h2 className="text-lg font-bold text-white">Printer verbinden</h2>
        </div>
        <p className="text-gray-400 text-sm">
          Zorg dat iPad en bonnenprinter op hetzelfde WiFi zitten. In het onlinescherm en de keuken stelt u het{' '}
          <strong className="text-gray-300">lokale IPv4-adres</strong> van de iPad/print-server in (bijv. 192.168.1.50) — geen hostnaam of cloud-zoekfunctie.
        </p>
        <div className="space-y-3">
          {[
            { title: 'Zelfde WiFi netwerk', desc: 'iPad en printer moeten op hetzelfde netwerk zitten' },
            { title: 'Thermische bonnenprinter', desc: 'Epson, Star of andere ESC/POS compatibele printers' },
            { title: 'Vast IP-adres', desc: 'Vul in het onlinescherm het IPv4-adres in van het toestel waar Vysion Print op draait (print-server op poort 3001).' },
          ].map(({ title, desc }) => (
            <div key={title} className="flex items-start gap-3">
              <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-white">{title}</p>
                <p className="text-xs text-gray-400">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hoe werkt het */}
      <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-gray-800 space-y-4">
        <h2 className="text-lg font-bold text-white">Hoe werkt het automatisch printen?</h2>
        <div className="space-y-3">
          {[
            'Klant bestelt via uw webshop of WhatsApp',
            'Bestelling komt binnen in uw admin panel',
            'De Print App op uw iPad print automatisch de bon',
            'Klant ontvangt zijn bon van de bonnenprinter ✅',
          ].map((text, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-orange-500/20 text-orange-400 text-sm font-bold flex items-center justify-center flex-shrink-0">
                {i + 1}
              </div>
              <p className="text-sm text-gray-300">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Support */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex items-center justify-between">
        <div>
          <p className="font-medium text-sm text-white">Hulp nodig bij het instellen?</p>
          <p className="text-xs text-gray-400">Neem contact op met Vysion support</p>
        </div>
        <a
          href="mailto:support@vysionhoreca.com"
          className="text-blue-400 text-sm font-medium hover:underline"
        >
          Contact →
        </a>
      </div>
    </div>
  )
}
