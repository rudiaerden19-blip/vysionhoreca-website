'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getPromotions, savePromotion, togglePromotionActive, deletePromotion, Promotion } from '@/lib/admin-api'

const promoTypes = [
  { id: 'percentage', name: 'Percentage', icon: '%', color: 'bg-green-500', description: 'Bijv. 10% korting' },
  { id: 'fixed', name: 'Vast bedrag', icon: '€', color: 'bg-blue-500', description: 'Bijv. €5 korting' },
  { id: 'freeItem', name: 'Gratis item', icon: '🎁', color: 'bg-purple-500', description: 'Bijv. Gratis friet' },
]

export default function PromotiesPage({ params }: { params: { tenant: string } }) {
  const [promos, setPromos] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'percentage' as 'percentage' | 'fixed' | 'freeItem',
    value: 10,
    min_order_amount: 0,
    max_usage: '',
    expires_at: '',
  })

  useEffect(() => {
    loadPromotions()
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
      code: '',
      type: 'percentage',
      value: 10,
      min_order_amount: 0,
      max_usage: '',
      expires_at: '',
    })
    setShowModal(true)
  }

  const openEditModal = (promo: Promotion) => {
    setEditingPromo(promo)
    setFormData({
      name: promo.name,
      code: promo.code,
      type: promo.type,
      value: promo.value,
      min_order_amount: promo.min_order_amount || 0,
      max_usage: promo.max_usage?.toString() || '',
      expires_at: promo.expires_at ? promo.expires_at.split('T')[0] : '',
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.code.trim()) return
    
    setSaving(true)
    
    const promoData: Promotion = {
      id: editingPromo?.id,
      tenant_slug: params.tenant,
      name: formData.name,
      code: formData.code.toUpperCase(),
      type: formData.type,
      value: formData.value,
      min_order_amount: formData.min_order_amount,
      max_usage: formData.max_usage ? parseInt(formData.max_usage) : undefined,
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

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setFormData(prev => ({ ...prev, code }))
  }

  const getTypeInfo = (type: string) => promoTypes.find(t => t.id === type)

  const activeCount = promos.filter(p => p.is_active).length
  const totalUsage = promos.reduce((sum, p) => sum + (p.usage_count || 0), 0)

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
          <h1 className="text-2xl font-bold text-gray-900">Promoties</h1>
          <p className="text-gray-500">Beheer kortingscodes en acties</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={openCreateModal}
          className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium flex items-center gap-2"
        >
          ➕ Nieuwe promotie
        </motion.button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
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
          <p className="text-gray-500 text-sm">Totaal gebruikt</p>
          <p className="text-3xl font-bold text-orange-500">{totalUsage}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
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
          <p className="text-gray-500 mb-6">Maak je eerste kortingscode aan</p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={openCreateModal}
            className="bg-orange-500 hover:bg-orange-600 text-white font-medium px-6 py-3 rounded-xl"
          >
            + Eerste promotie maken
          </motion.button>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl shadow-sm overflow-hidden"
        >
          <div className="divide-y">
            {promos.map((promo) => {
              const typeInfo = getTypeInfo(promo.type)
              const isExpired = promo.expires_at && new Date(promo.expires_at) < new Date()
              
              return (
                <motion.div 
                  key={promo.id} 
                  layout
                  className={`p-4 flex items-center gap-4 ${!promo.is_active || isExpired ? 'opacity-60' : ''}`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold ${typeInfo?.color || 'bg-gray-500'}`}>
                    {typeInfo?.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{promo.name}</p>
                    <p className="text-sm text-gray-500">
                      Code: <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{promo.code}</span>
                      {isExpired && <span className="ml-2 text-red-500 text-xs">Verlopen</span>}
                    </p>
                  </div>

                  <div className="text-center hidden sm:block">
                    <p className="text-lg font-bold text-gray-900">
                      {promo.type === 'percentage' ? `${promo.value}%` :
                       promo.type === 'fixed' ? `€${promo.value}` : 'Gratis item'}
                    </p>
                    <p className="text-xs text-gray-500">korting</p>
                  </div>

                  <div className="text-center hidden sm:block">
                    <p className="text-lg font-bold text-gray-900">{promo.usage_count || 0}</p>
                    <p className="text-xs text-gray-500">
                      {promo.max_usage ? `/ ${promo.max_usage}` : 'gebruikt'}
                    </p>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={promo.is_active}
                      onChange={() => handleToggle(promo.id!, promo.is_active)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                  </label>

                  <div className="relative group">
                    <button className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg">⋯</button>
                    <div className="absolute right-0 top-full mt-1 bg-white border rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 min-w-[140px]">
                      <button
                        onClick={() => openEditModal(promo)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm flex items-center gap-2"
                      >
                        ✏️ Bewerken
                      </button>
                      <button
                        onClick={() => handleDelete(promo.id!)}
                        className="w-full px-4 py-2 text-left hover:bg-red-50 text-red-600 text-sm flex items-center gap-2"
                      >
                        🗑️ Verwijderen
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
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
              className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
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

              <div className="p-6 space-y-4">
                {/* Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {promoTypes.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => setFormData(prev => ({ ...prev, type: type.id as 'percentage' | 'fixed' | 'freeItem' }))}
                        className={`p-3 rounded-xl border-2 text-center transition-all ${
                          formData.type === type.id
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className={`text-2xl block mb-1 w-8 h-8 mx-auto rounded-lg flex items-center justify-center text-white ${type.color}`}>
                          {type.icon}
                        </span>
                        <span className="text-sm font-medium">{type.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Naam</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Bijv. Welkomstkorting"
                  />
                </div>

                {/* Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Code</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono uppercase"
                      placeholder="WELKOM10"
                    />
                    <button
                      onClick={generateCode}
                      className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium"
                    >
                      🎲 Genereer
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
                      min="0"
                      step={formData.type === 'percentage' ? '1' : '0.50'}
                      value={formData.value}
                      onChange={(e) => setFormData(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
                    min="0"
                    step="0.50"
                    value={formData.min_order_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, min_order_amount: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="0 = geen minimum"
                  />
                </div>

                {/* Max usage */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum gebruik
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.max_usage}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_usage: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Leeg = onbeperkt"
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
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
                  disabled={saving || !formData.name.trim() || !formData.code.trim()}
                  className="flex-1 px-4 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-xl font-medium flex items-center justify-center gap-2"
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
