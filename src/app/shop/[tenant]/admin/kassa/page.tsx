'use client'

import { useLanguage } from '@/i18n'

import { motion } from 'framer-motion'
import Link from 'next/link'

export default function KassaLinkPage({ params }: { params: { tenant: string } }) {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Kassa Display</h1>
      <p className="text-gray-600 mb-8">
        Open het fullscreen order scherm voor op de iPad of tablet aan de balie.
      </p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 text-white"
      >
        <div className="text-center mb-8">
          <span className="text-6xl mb-4 block">🖥️</span>
          <h2 className="text-2xl font-bold mb-2">Fullscreen Order Display</h2>
          <p className="text-gray-400">
            Ideaal voor aan de balie - geen menu, geen afleiding. Alleen orders.
          </p>
        </div>

        <div className="bg-gray-700/50 rounded-2xl p-6 mb-6">
          <h3 className="font-bold mb-4">✨ Features</h3>
          <ul className="space-y-2 text-gray-300">
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              Real-time nieuwe bestellingen
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              Geluid alerts (blijft herhalen tot actie)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              Grote knoppen voor touch
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              Goedkeuren / Afwijzen / Klaar
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              Geen navigatie - puur orders
            </li>
          </ul>
        </div>

        <Link href={`/kassa/${params.tenant}`} target="_blank">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-5 bg-orange-500 hover:bg-orange-600 rounded-2xl font-bold text-xl flex items-center justify-center gap-3"
          >
            <span>🚀</span>
            Open Kassa Display
            <span className="text-sm bg-white/20 px-2 py-1 rounded">nieuw tabblad</span>
          </motion.button>
        </Link>

        <p className="text-center text-gray-500 text-sm mt-4">
          Tip: Zet de iPad in landscape mode en activeer fullscreen
        </p>
      </motion.div>

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-2xl p-6">
        <h3 className="font-bold text-blue-900 mb-2">💡 iPad Kiosk Mode</h3>
        <p className="text-blue-700 text-sm">
          Ga naar iPad Instellingen → Toegankelijkheid → Begeleide toegang om de iPad te vergrendelen op dit scherm. Zo kan personeel niet per ongeluk andere apps openen.
        </p>
      </div>
    </div>
  )
}
