'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

export default function QrCodesPage({ params }: { params: { tenant: string } }) {
  const [qrCodes, setQrCodes] = useState([
    { id: '1', name: 'Menu kaart', type: 'menu', scans: 234, createdAt: '1 week geleden' },
    { id: '2', name: 'Tafel 1', type: 'table', scans: 89, createdAt: '2 weken geleden' },
    { id: '3', name: 'Flyer actie', type: 'promo', scans: 45, createdAt: '1 maand geleden' },
  ])

  const qrTypes = [
    { id: 'menu', name: 'Menu', icon: '📋', description: 'Link naar je menu' },
    { id: 'table', name: 'Tafel', icon: '🍽️', description: 'Bestellen aan tafel' },
    { id: 'promo', name: 'Promotie', icon: '🎁', description: 'Speciale actie' },
    { id: 'review', name: 'Review', icon: '⭐', description: 'Vraag om review' },
  ]

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">QR-codes</h1>
          <p className="text-gray-500">Maak en beheer QR-codes voor je zaak</p>
        </div>
        <button className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium flex items-center gap-2">
          ➕ Nieuwe QR-code
        </button>
      </div>

      {/* QR Type Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
      >
        {qrTypes.map((type) => (
          <button
            key={type.id}
            className="p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow text-left"
          >
            <span className="text-3xl mb-2 block">{type.icon}</span>
            <p className="font-semibold text-gray-900">{type.name}</p>
            <p className="text-sm text-gray-500">{type.description}</p>
          </button>
        ))}
      </motion.div>

      {/* Existing QR Codes */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl shadow-sm overflow-hidden"
      >
        <div className="p-4 border-b">
          <h2 className="font-semibold text-gray-900">Je QR-codes</h2>
        </div>
        <div className="divide-y">
          {qrCodes.map((qr) => (
            <div key={qr.id} className="p-4 flex items-center gap-4 hover:bg-gray-50">
              {/* QR Preview */}
              <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center">
                <div className="w-16 h-16 bg-white p-1 rounded">
                  <div className="w-full h-full bg-gray-900 rounded-sm" style={{
                    backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, white 2px, white 4px), repeating-linear-gradient(90deg, transparent, transparent 2px, white 2px, white 4px)'
                  }} />
                </div>
              </div>

              {/* Info */}
              <div className="flex-1">
                <p className="font-medium text-gray-900">{qr.name}</p>
                <p className="text-sm text-gray-500">Aangemaakt {qr.createdAt}</p>
              </div>

              {/* Stats */}
              <div className="text-right">
                <p className="text-2xl font-bold text-orange-500">{qr.scans}</p>
                <p className="text-sm text-gray-500">scans</p>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg" title="Download">
                  📥
                </button>
                <button className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg" title="Bewerken">
                  ✏️
                </button>
                <button className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg" title="Verwijderen">
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Tips */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-6"
      >
        <h3 className="font-semibold text-blue-900 mb-2">💡 Tips voor QR-codes</h3>
        <ul className="text-blue-700 text-sm space-y-1">
          <li>• Print QR-codes op menukaarten voor snel bestellen</li>
          <li>• Plaats op elke tafel een unieke QR voor tafelbestellingen</li>
          <li>• Gebruik op flyers voor promoties en speciale acties</li>
          <li>• Vraag klanten om een review na hun bestelling</li>
        </ul>
      </motion.div>
    </div>
  )
}
