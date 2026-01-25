'use client'

import { useLanguage } from '@/i18n'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { getLoyaltyRewards, saveLoyaltyReward, deleteLoyaltyReward, LoyaltyReward } from '@/lib/admin-api'

export default function BeloningenPage({ params }: { params: { tenant: string } }) {
  const { t } = useLanguage()
  const [rewards, setRewards] = useState<LoyaltyReward[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingReward, setEditingReward] = useState<LoyaltyReward | null>(null)
  const [formData, setFormData] = useState<Partial<LoyaltyReward>>({
    name: '',
    description: '',
    points_required: 50,
    reward_type: 'free_item',
    reward_value: 0,
    is_active: true,
  })

  useEffect(() => {
    loadRewards()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.tenant])

  async function loadRewards() {
    const data = await getLoyaltyRewards(params.tenant)
    setRewards(data)
    setLoading(false)
  }

  const openAddModal = () => {
    setEditingReward(null)
    setFormData({
      name: '',
      description: '',
      points_required: 50,
      reward_type: 'free_item',
      reward_value: 0,
      is_active: true,
    })
    setShowModal(true)
  }

  const openEditModal = (reward: LoyaltyReward) => {
    setEditingReward(reward)
    setFormData({
      name: reward.name,
      description: reward.description,
      points_required: reward.points_required,
      reward_type: reward.reward_type,
      reward_value: reward.reward_value,
      is_active: reward.is_active,
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formData.name || !formData.points_required) return
    setSaving(true)

    const rewardData: LoyaltyReward = {
      ...(editingReward?.id && { id: editingReward.id }),
      tenant_slug: params.tenant,
      name: formData.name!,
      description: formData.description,
      points_required: formData.points_required!,
      reward_type: formData.reward_type as LoyaltyReward['reward_type'],
      reward_value: formData.reward_value,
      is_active: formData.is_active!,
    }

    const success = await saveLoyaltyReward(rewardData)
    if (success) {
      await loadRewards()
      setShowModal(false)
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('rewardsPage.confirmDelete'))) return
    await deleteLoyaltyReward(id)
    setRewards(rewards.filter(r => r.id !== id))
  }

  const toggleActive = async (reward: LoyaltyReward) => {
    const updated = { ...reward, is_active: !reward.is_active }
    const success = await saveLoyaltyReward(updated)
    if (success) {
      setRewards(rewards.map(r => r.id === reward.id ? updated : r))
    }
  }

  const rewardTypeLabels = {
    free_item: `🎁 ${t('rewardsPage.types.freeItem')}`,
    discount_fixed: `💰 ${t('rewardsPage.types.fixedDiscount')}`,
    discount_percentage: `📊 ${t('rewardsPage.types.percentDiscount')}`,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link href={`/shop/${params.tenant}/admin/klanten`} className="text-gray-400 hover:text-gray-600">
              ← {t('customersPage.title')}
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t('rewardsPage.title')}</h1>
          <p className="text-gray-500">{t('rewardsPage.subtitle')}</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={openAddModal}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors flex items-center gap-2"
        >
          <span>+</span>
          <span>{t('rewardsPage.addReward')}</span>
        </motion.button>
      </div>

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 mb-8"
      >
        <h3 className="font-semibold text-yellow-800 mb-2">💡 {t('rewardsPage.howItWorks.title')}</h3>
        <ul className="text-yellow-700 space-y-1 text-sm">
          <li>• {t('rewardsPage.howItWorks.point1')}</li>
          <li>• {t('rewardsPage.howItWorks.point2')}</li>
          <li>• {t('rewardsPage.howItWorks.point3')}</li>
        </ul>
      </motion.div>

      {/* Rewards List */}
      {rewards.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-12 shadow-sm text-center"
        >
          <span className="text-6xl mb-4 block">🎁</span>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{t('rewardsPage.noRewards')}</h3>
          <p className="text-gray-500 mb-6">{t('rewardsPage.noRewardsDesc')}</p>
          <button
            onClick={openAddModal}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
          >
            {t('rewardsPage.addFirstReward')}
          </button>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {rewards.map((reward, index) => (
            <motion.div
              key={reward.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`bg-white rounded-2xl p-6 shadow-sm ${!reward.is_active ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-yellow-100 rounded-2xl flex items-center justify-center text-3xl">
                    🎁
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{reward.name}</h3>
                    {reward.description && (
                      <p className="text-gray-500 text-sm">{reward.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                        ⭐ {reward.points_required} {t('rewardsPage.points')}
                      </span>
                      <span className="text-sm text-gray-500">
                        {rewardTypeLabels[reward.reward_type]}
                        {reward.reward_type === 'discount_fixed' && reward.reward_value && ` (€${reward.reward_value})`}
                        {reward.reward_type === 'discount_percentage' && reward.reward_value && ` (${reward.reward_value}%)`}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleActive(reward)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      reward.is_active 
                        ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {reward.is_active ? `✓ ${t('rewardsPage.active')}` : t('rewardsPage.inactive')}
                  </button>
                  <button
                    onClick={() => openEditModal(reward)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                  >
                    ✏️ {t('adminPages.common.edit')}
                  </button>
                  <button
                    onClick={() => handleDelete(reward.id!)}
                    className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg font-medium transition-colors"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
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
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-md w-full shadow-2xl"
            >
              <div className="p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingReward ? t('rewardsPage.editReward') : t('rewardsPage.newReward')}
                </h2>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('rewardsPage.form.name')} *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t('rewardsPage.form.namePlaceholder')}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('rewardsPage.form.description')}
                  </label>
                  <input
                    type="text"
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={t('rewardsPage.form.descriptionPlaceholder')}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('rewardsPage.form.pointsRequired')} *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.points_required}
                    onChange={(e) => setFormData({ ...formData, points_required: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('rewardsPage.form.rewardType')}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'free_item', label: `🎁 ${t('rewardsPage.types.freeItem')}`, desc: t('rewardsPage.types.freeItemDesc') },
                      { value: 'discount_fixed', label: `💰 ${t('rewardsPage.types.discountEuro')}`, desc: t('rewardsPage.types.fixedAmount') },
                      { value: 'discount_percentage', label: `📊 ${t('rewardsPage.types.discountPercent')}`, desc: t('rewardsPage.types.percentage') },
                    ].map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, reward_type: type.value as LoyaltyReward['reward_type'] })}
                        className={`p-3 rounded-xl border-2 text-center transition-all ${
                          formData.reward_type === type.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="block text-lg">{type.label.split(' ')[0]}</span>
                        <span className="text-xs text-gray-500">{type.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {(formData.reward_type === 'discount_fixed' || formData.reward_type === 'discount_percentage') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {formData.reward_type === 'discount_fixed' ? t('rewardsPage.form.discountAmount') : t('rewardsPage.form.discountPercentage')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step={formData.reward_type === 'discount_fixed' ? '0.01' : '1'}
                      value={formData.reward_value || ''}
                      onChange={(e) => setFormData({ ...formData, reward_value: parseFloat(e.target.value) || 0 })}
                      placeholder={formData.reward_type === 'discount_fixed' ? '5.00' : '10'}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}
              </div>

              <div className="p-6 border-t bg-gray-50 flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-100 font-medium transition-colors"
                >
                  {t('adminPages.common.cancel')}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !formData.name || !formData.points_required}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-xl font-medium transition-colors"
                >
                  {saving ? `${t('adminPages.common.save')}...` : t('adminPages.common.save')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
