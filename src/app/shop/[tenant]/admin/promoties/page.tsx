'use client'

import { useLanguage } from '@/i18n'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getPromotions, savePromotion, togglePromotionActive, deletePromotion, Promotion } from '@/lib/admin-api'
import MediaPicker from '@/components/MediaPicker'
import Image from 'next/image'

export default function PromotiesPage({ params }: { params: { tenant: string } }) {
  const { t } = useLanguage()
  const [promos, setPromos] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: '',
    type: 'percentage' as 'percentage' | 'fixed' | 'freeItem',
    value: 10,
    min_order_amount: 0,
    expires_at: '',
  })

  useEffect(() => {
    loadPromotions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.tenant])

  async function loadPromotions() {
    setLoading(true)
    const data = await getPromotions(params.tenant)
    setPromos(data)
    setLoading(false)
  }

  const handleToggle = async (id: string, currentActive: boolean) => {
    const success = await togglePromotionActive(id, !currentActive)
    if (success) {
      setPromos(prev => prev.map(p => 
        p.id === id ? { ...p, is_active: !currentActive } : p
      ))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Weet je zeker dat je deze promotie wilt verwijderen?')) return
    
    const success = await deletePromotion(id)
    if (success) {
      setPromos(prev => prev.filter(p => p.id !== id))
    }
  }

  const openCreateModal = () => {
    setEditingPromo(null)
    setFormData({
      name: '',
      description: '',
      image_url: '',
      type: 'percentage',
      value: 10,
      min_order_amount: 0,
      expires_at: '',
    })
    setShowModal(true)
  }

  const openEditModal = (promo: Promotion) => {
    setEditingPromo(promo)
    setFormData({
      name: promo.name,
      description: promo.description || '',
      image_url: promo.image_url || '',
      type: promo.type,
      value: promo.value,
      min_order_amount: promo.min_order_amount || 0,
      expires_at: promo.expires_at ? promo.expires_at.split('T')[0] : '',
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Vul een naam in')
      return
    }
    
    setSaving(true)
    
    const promoData: Promotion = {
      id: editingPromo?.id,
      tenant_slug: params.tenant,
      name: formData.name,
      description: formData.description,
      image_url: formData.image_url,
      type: formData.type,
      value: formData.value,
      min_order_amount: formData.min_order_amount,
      max_usage_per_customer: 1,
      usage_count: editingPromo?.usage_count || 0,
      is_active: editingPromo?.is_active ?? true,
      expires_at: formData.expires_at || undefined,
    }
    
    const saved = await savePromotion(promoData)
    if (saved) {
      if (editingPromo) {
        setPromos(prev => prev.map(p => p.id === saved.id ? saved : p))
      } else {
        setPromos(prev => [saved, ...prev])
      }
      setShowModal(false)
      setEditingPromo(null)
    }
    setSaving(false)
  }

  const activeCount = promos.filter(p => p.is_active).length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
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
          <h1 className="text-2xl font-bold text-gray-900">🎁 Promoties & Aanbiedingen</h1>
          <p className="text-gray-500">Maak aanbiedingen die klanten zien in je webshop</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={openCreateModal}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium flex items-center gap-2"
        >
          ➕ Nieuwe promotie
        </motion.button>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <p className="text-blue-800 text-sm">
          💡 <strong>Tip:</strong> Promoties die je hier aanmaakt worden getoond op je webshop. 
          Klanten kunnen ze zien bij de &quot;Promoties&quot; knop. Zet promoties aan of uit met de schakelaar.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-4 shadow-sm"
        >
          <p className="text-gray-500 text-sm">Actieve promoties</p>
          <p className="text-3xl font-bold text-green-500">{activeCount}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-4 shadow-sm"
        >
          <p className="text-gray-500 text-sm">Totaal promoties</p>
          <p className="text-3xl font-bold text-blue-500">{promos.length}</p>
        </motion.div>
      </div>

      {/* Promos List */}
      {promos.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12 bg-white rounded-2xl shadow-sm"
        >
          <span className="text-6xl mb-4 block">🎁</span>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Nog geen promoties</h3>
          <p className="text-gray-500 mb-6">Maak je eerste promotie aan om klanten te trekken</p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={openCreateModal}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-xl"
          >
            + Maak eerste promotie
          </motion.button>
        </motion.div>
      ) : (
        <div className="grid gap-4">
          {promos.map((promo) => {
            const isExpired = promo.expires_at && new Date(promo.expires_at) < new Date()
            
            return (
              <motion.div 
                key={promo.id} 
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white rounded-2xl shadow-sm overflow-hidden ${!promo.is_active || isExpired ? 'opacity-60' : ''}`}
              >
                <div className="flex">
                  {/* Image */}
                  <div className="w-32 h-32 sm:w-40 sm:h-40 flex-shrink-0 bg-gray-100 relative">
                    {promo.image_url ? (
                      <Image
                        src={promo.image_url}
                        alt={promo.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">
                        🎁
                      </div>
                    )}
                    {/* Korting badge */}
                    <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      {promo.type === 'percentage' ? `-${promo.value}%` :
                       promo.type === 'fixed' ? `-€${promo.value}` : 'GRATIS'}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-gray-900 text-lg">{promo.name}</h3>
                          {promo.description && (
                            <p className="text-gray-500 text-sm mt-1 line-clamp-2">{promo.description}</p>
                          )}
                        </div>
                        
                        {/* Toggle */}
                        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                          <input
                            type="checkbox"
                            checked={promo.is_active}
                            onChange={() => handleToggle(promo.id!, promo.is_active)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                        </label>
                      </div>
                      
                      {/* Status tags */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {promo.is_active ? (
                          <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                            ✓ Zichtbaar in shop
                          </span>
                        ) : (
                          <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                            Verborgen
                          </span>
                        )}
                        {isExpired && (
                          <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full">
                            Verlopen
                          </span>
                        )}
                        {promo.min_order_amount > 0 && (
                          <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
                            Min. €{promo.min_order_amount}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => openEditModal(promo)}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium flex items-center gap-1"
                      >
                        ✏️ Bewerken
                      </button>
                      <button
                        onClick={() => handleDelete(promo.id!)}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium flex items-center gap-1"
                      >
                        🗑️ Verwijderen
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
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
              className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingPromo ? 'Promotie bewerken' : 'Nieuwe promotie'}
                </h2>
                <button 
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="p-6 space-y-5">
                {/* Image */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Foto</label>
                  <MediaPicker
                    tenantSlug={params.tenant}
                    value={formData.image_url || ''}
                    onChange={(url) => setFormData(prev => ({ ...prev, image_url: url }))}
                  />
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Naam <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Bijv. 2e pizza halve prijs"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Beschrijving</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Beschrijf de aanbieding..."
                  />
                </div>

                {/* Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type korting</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, type: 'percentage' }))}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${
                        formData.type === 'percentage'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-2xl block mb-1">%</span>
                      <span className="text-sm font-medium">Percentage</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, type: 'fixed' }))}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${
                        formData.type === 'fixed'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-2xl block mb-1">€</span>
                      <span className="text-sm font-medium">Vast bedrag</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, type: 'freeItem' }))}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${
                        formData.type === 'freeItem'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-2xl block mb-1">🎁</span>
                      <span className="text-sm font-medium">Gratis item</span>
                    </button>
                  </div>
                </div>

                {/* Value (for percentage and fixed) */}
                {formData.type !== 'freeItem' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {formData.type === 'percentage' ? 'Percentage (%)' : 'Bedrag (€)'}
                    </label>
                    <input
                      type="number"
                      value={formData.value || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={formData.type === 'percentage' ? '10' : '5.00'}
                    />
                  </div>
                )}

                {/* Min order amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimale bestelwaarde (€)
                  </label>
                  <input
                    type="number"
                    value={formData.min_order_amount || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, min_order_amount: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Leeg = geen minimum"
                  />
                </div>

                {/* Expiry */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vervaldatum
                  </label>
                  <input
                    type="date"
                    value={formData.expires_at}
                    onChange={(e) => setFormData(prev => ({ ...prev, expires_at: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Leeg = geen vervaldatum</p>
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
                  onClick={handleSave}
                  disabled={saving || !formData.name.trim()}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl font-medium flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                      />
                      <span>Opslaan...</span>
                    </>
                  ) : (
                    <>
                      <span>✓</span>
                      <span>{editingPromo ? 'Opslaan' : 'Aanmaken'}</span>
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
