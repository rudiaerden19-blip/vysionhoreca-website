'use client'

import { useLanguage } from '@/i18n'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getQrCodes, saveQrCode, deleteQrCode, QrCode } from '@/lib/admin-api'

const qrTypes = [
  { id: 'menu', name: 'Menu', icon: '📋', description: 'Link naar je menu' },
  { id: 'table', name: 'Tafel', icon: '🍽️', description: 'Bestellen aan tafel' },
  { id: 'promo', name: 'Promotie', icon: '🎁', description: 'Speciale actie' },
  { id: 'review', name: 'Review', icon: '⭐', description: 'Vraag om review' },
]

export default function QrCodesPage({ params }: { params: { tenant: string } }) {
  const [qrCodes, setQrCodes] = useState<QrCode[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    type: 'menu' as 'menu' | 'table' | 'promo' | 'review',
    table_number: '',
  })

  useEffect(() => {
    loadQrCodes()
  }, [params.tenant])

  async function loadQrCodes() {
    setLoading(true)
    const data = await getQrCodes(params.tenant)
    setQrCodes(data)
    setLoading(false)
  }

  const getTargetUrl = (type: string, tableNumber?: string) => {
    const baseUrl = `https://${params.tenant}.ordervysion.com`
    switch (type) {
      case 'menu':
        return `${baseUrl}/menu`
      case 'table':
        return `${baseUrl}/menu?table=${tableNumber || '1'}`
      case 'promo':
        return `${baseUrl}/menu`
      case 'review':
        return `${baseUrl}/review`
      default:
        return baseUrl
    }
  }

  const getQrImageUrl = (url: string, size: number = 200) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&format=png&margin=10`
  }

  const handleCreate = async () => {
    if (!formData.name.trim()) return
    
    setSaving(true)
    const targetUrl = getTargetUrl(formData.type, formData.table_number)
    
    const newQr: QrCode = {
      tenant_slug: params.tenant,
      name: formData.name,
      type: formData.type,
      target_url: targetUrl,
      table_number: formData.type === 'table' ? parseInt(formData.table_number) || undefined : undefined,
      scans: 0,
      is_active: true,
    }
    
    const saved = await saveQrCode(newQr)
    if (saved) {
      setQrCodes(prev => [saved, ...prev])
      setShowModal(false)
      setSelectedType(null)
      setFormData({ name: '', type: 'menu', table_number: '' })
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Weet je zeker dat je deze QR-code wilt verwijderen?')) return
    
    const success = await deleteQrCode(id)
    if (success) {
      setQrCodes(prev => prev.filter(qr => qr.id !== id))
    }
  }

  const downloadQr = async (qr: QrCode) => {
    const imageUrl = getQrImageUrl(qr.target_url, 400)
    
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `qr-${qr.name.toLowerCase().replace(/\s+/g, '-')}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch {
      // Fallback: open in new tab
      window.open(imageUrl, '_blank')
    }
  }

  const openCreateModal = (type: string) => {
    setSelectedType(type)
    setFormData({
      name: type === 'menu' ? 'Menu QR' : type === 'table' ? 'Tafel ' : type === 'promo' ? 'Promotie' : 'Review',
      type: type as 'menu' | 'table' | 'promo' | 'review',
      table_number: type === 'table' ? '1' : '',
    })
    setShowModal(true)
  }

  const getTypeInfo = (type: string) => qrTypes.find(t => t.id === type)

  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) return 'Vandaag'
    if (days === 1) return 'Gisteren'
    if (days < 7) return `${days} dagen geleden`
    if (days < 30) return `${Math.floor(days / 7)} weken geleden`
    return `${Math.floor(days / 30)} maanden geleden`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-gray-500">Laden...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">QR-codes</h1>
          <p className="text-gray-500">Maak en beheer QR-codes voor je zaak</p>
        </div>
      </div>

      {/* QR Type Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
      >
        {qrTypes.map((type) => (
          <motion.button
            key={type.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => openCreateModal(type.id)}
            className="p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow text-left border-2 border-transparent hover:border-orange-500"
          >
            <span className="text-3xl mb-2 block">{type.icon}</span>
            <p className="font-semibold text-gray-900">{type.name}</p>
            <p className="text-sm text-gray-500">{type.description}</p>
          </motion.button>
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
          <h2 className="font-semibold text-gray-900">Je QR-codes ({qrCodes.length})</h2>
        </div>
        
        {qrCodes.length === 0 ? (
          <div className="p-12 text-center">
            <span className="text-6xl mb-4 block">📱</span>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Nog geen QR-codes</h3>
            <p className="text-gray-500">Klik hierboven op een type om je eerste QR-code te maken</p>
          </div>
        ) : (
          <div className="divide-y">
            {qrCodes.map((qr) => (
              <motion.div 
                key={qr.id} 
                layout
                className="p-4 flex items-center gap-4 hover:bg-gray-50"
              >
                {/* QR Preview */}
                <div className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center">
                  <img 
                    src={getQrImageUrl(qr.target_url, 80)} 
                    alt={qr.name}
                    className="w-16 h-16"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{getTypeInfo(qr.type)?.icon}</span>
                    <p className="font-medium text-gray-900 truncate">{qr.name}</p>
                  </div>
                  <p className="text-sm text-gray-500 truncate">{qr.target_url}</p>
                  <p className="text-xs text-gray-400 mt-1">Aangemaakt {formatDate(qr.created_at)}</p>
                </div>

                {/* Stats */}
                <div className="text-right hidden sm:block">
                  <p className="text-2xl font-bold text-orange-500">{qr.scans}</p>
                  <p className="text-sm text-gray-500">scans</p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => downloadQr(qr)}
                    className="p-2 bg-orange-100 hover:bg-orange-200 text-orange-600 rounded-lg" 
                    title="Download"
                  >
                    📥
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleDelete(qr.id!)}
                    className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg" 
                    title="Verwijderen"
                  >
                    🗑️
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
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

      {/* Create Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{getTypeInfo(selectedType || '')?.icon}</span>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Nieuwe QR-code</h2>
                    <p className="text-gray-500 text-sm">{getTypeInfo(selectedType || '')?.description}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Naam
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Bijv. Menu kaart, Tafel 5..."
                  />
                </div>

                {selectedType === 'table' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tafelnummer
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.table_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, table_number: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="1"
                    />
                  </div>
                )}

                {/* Preview */}
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-sm text-gray-500 mb-3">Preview</p>
                  <img 
                    src={getQrImageUrl(getTargetUrl(formData.type, formData.table_number), 150)}
                    alt="QR Preview"
                    className="mx-auto rounded-lg"
                  />
                  <p className="text-xs text-gray-400 mt-2 break-all">
                    {getTargetUrl(formData.type, formData.table_number)}
                  </p>
                </div>
              </div>

              <div className="p-6 border-t bg-gray-50 flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-100 font-medium"
                >
                  Annuleren
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCreate}
                  disabled={saving || !formData.name.trim()}
                  className="flex-1 px-4 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-xl font-medium flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                      />
                      <span>Maken...</span>
                    </>
                  ) : (
                    <>
                      <span>✓</span>
                      <span>Aanmaken</span>
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
