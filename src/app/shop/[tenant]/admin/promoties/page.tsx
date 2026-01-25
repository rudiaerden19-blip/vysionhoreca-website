'use client'

import { useLanguage } from '@/i18n'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getPromotions, savePromotion, togglePromotionActive, deletePromotion, Promotion } from '@/lib/admin-api'

const getPromoTypes = (t: (key: string) => string) => [
  { id: 'percentage', name: t('marketingPromo.types.percentage'), icon: '%', color: 'bg-green-500', description: t('marketingPromo.types.percentageDesc') },
  { id: 'fixed', name: t('marketingPromo.types.fixed'), icon: '€', color: 'bg-blue-500', description: t('marketingPromo.types.fixedDesc') },
  { id: 'freeItem', name: t('marketingPromo.types.freeItem'), icon: '🎁', color: 'bg-purple-500', description: t('marketingPromo.types.freeItemDesc') },
]

export default function PromotiesPage({ params }: { params: { tenant: string } }) {
  const { t } = useLanguage()
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
    if (!confirm(t('marketingPromo.confirmDelete'))) return
    
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

  const promoTypes = getPromoTypes(t)
  const getTypeInfo = (type: string) => promoTypes.find(pt => pt.id === type)

  const activeCount = promos.filter(p => p.is_active).length
  const totalUsage = promos.reduce((sum, p) => sum + (p.usage_count || 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-gray-500">{t('adminPages.common.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('marketingPromo.title')}</h1>
          <p className="text-gray-500">{t('marketingPromo.subtitle')}</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={openCreateModal}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium flex items-center gap-2"
        >
          ➕ {t('marketingPromo.newPromotion')}
        </motion.button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-4 shadow-sm"
        >
          <p className="text-gray-500 text-sm">{t('marketingPromo.activePromotions')}</p>
          <p className="text-3xl font-bold text-green-500">{activeCount}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-4 shadow-sm"
        >
          <p className="text-gray-500 text-sm">{t('marketingPromo.totalUsed')}</p>
          <p className="text-3xl font-bold text-blue-600">{totalUsage}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-4 shadow-sm"
        >
          <p className="text-gray-500 text-sm">{t('marketingPromo.totalPromotions')}</p>
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
          <h3 className="text-xl font-bold text-gray-900 mb-2">{t('marketingPromo.noPromotions')}</h3>
          <p className="text-gray-500 mb-6">{t('marketingPromo.noPromotionsDesc')}</p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={openCreateModal}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-xl"
          >
            + {t('marketingPromo.createFirst')}
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
                  {editingPromo ? t('marketingPromo.editPromotion') : t('marketingPromo.newPromotion')}
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('marketingPromo.type')}</label>
                  <div className="grid grid-cols-3 gap-2">
                    {promoTypes.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => setFormData(prev => ({ ...prev, type: type.id as 'percentage' | 'fixed' | 'freeItem' }))}
                        className={`p-3 rounded-xl border-2 text-center transition-all ${
                          formData.type === type.id
                            ? 'border-blue-500 bg-blue-50'
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('marketingPromo.name')}</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('marketingPromo.namePlaceholder')}
                  />
                </div>

                {/* Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('marketingPromo.code')}</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono uppercase"
                      placeholder={t('marketingPromo.codePlaceholder')}
                    />
                    <button
                      onClick={generateCode}
                      className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium"
                    >
                      🎲 {t('marketingPromo.generate')}
                    </button>
                  </div>
                </div>

                {/* Value (for percentage and fixed) */}
                {formData.type !== 'freeItem' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {formData.type === 'percentage' ? t('marketingPromo.percentageLabel') : t('marketingPromo.amountLabel')}
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formData.value || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={formData.type === 'percentage' ? t('marketingPromo.percentagePlaceholder') : t('marketingPromo.amountPlaceholder')}
                    />
                  </div>
                )}

                {/* Min order amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('marketingPromo.minOrderAmount')}
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formData.min_order_amount || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, min_order_amount: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('marketingPromo.minOrderPlaceholder')}
                  />
                </div>

                {/* Max usage */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('marketingPromo.maxUsage')}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formData.max_usage || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_usage: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('marketingPromo.maxUsagePlaceholder')}
                  />
                </div>

                {/* Expiry */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('marketingPromo.expiryDate')}
                  </label>
                  <input
                    type="date"
                    value={formData.expires_at}
                    onChange={(e) => setFormData(prev => ({ ...prev, expires_at: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">{t('marketingPromo.expiryPlaceholder')}</p>
                </div>
              </div>

              <div className="p-6 border-t bg-gray-50 flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-100 font-medium"
                >
                  {t('adminPages.common.cancel')}
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSave}
                  disabled={saving || !formData.name.trim() || !formData.code.trim()}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl font-medium flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                      />
                      <span>{t('adminPages.common.saving')}</span>
                    </>
                  ) : (
                    <>
                      <span>✓</span>
                      <span>{editingPromo ? t('adminPages.common.save') : t('marketingPromo.create')}</span>
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
