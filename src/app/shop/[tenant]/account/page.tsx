'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getTenantSettings, getCustomer, getCustomerOrders, updateCustomer, getLoyaltyRewards, redeemReward, deleteCustomerAccount, Customer, Order, TenantSettings, LoyaltyReward } from '@/lib/admin-api'

export default function AccountPage({ params }: { params: { tenant: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [tenantSettings, setTenantSettings] = useState<TenantSettings | null>(null)
  const [rewards, setRewards] = useState<LoyaltyReward[]>([])
  const [redeeming, setRedeeming] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', phone: '', address: '', postal_code: '', city: '' })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  const primaryColor = tenantSettings?.primary_color || '#FF6B35'

  useEffect(() => {
    checkAuth()
  }, [params.tenant])

  async function checkAuth() {
    // Check if logged in via localStorage
    const customerId = localStorage.getItem(`customer_${params.tenant}`)
    if (!customerId) {
      router.push(`/shop/${params.tenant}/account/login`)
      return
    }

    const [customerData, settings, rewardsData] = await Promise.all([
      getCustomer(customerId),
      getTenantSettings(params.tenant),
      getLoyaltyRewards(params.tenant),
    ])

    if (!customerData) {
      localStorage.removeItem(`customer_${params.tenant}`)
      router.push(`/shop/${params.tenant}/account/login`)
      return
    }

    setCustomer(customerData)
    setTenantSettings(settings)
    setRewards(rewardsData.filter(r => r.is_active))
    setEditForm({
      name: customerData.name,
      phone: customerData.phone || '',
      address: customerData.address || '',
      postal_code: customerData.postal_code || '',
      city: customerData.city || '',
    })

    // Load orders
    if (customerData.email) {
      const ordersData = await getCustomerOrders(params.tenant, customerData.email)
      setOrders(ordersData)
    }

    setLoading(false)
  }

  const handleLogout = () => {
    localStorage.removeItem(`customer_${params.tenant}`)
    router.push(`/shop/${params.tenant}`)
  }

  // GDPR: Account verwijderen
  const handleDeleteAccount = async () => {
    if (!customer || deleteConfirmText !== 'VERWIJDEREN') return
    
    setDeleting(true)
    const success = await deleteCustomerAccount(customer.id!, params.tenant)
    
    if (success) {
      localStorage.removeItem(`customer_${params.tenant}`)
      alert('Je account en alle gegevens zijn verwijderd.')
      router.push(`/shop/${params.tenant}`)
    } else {
      alert('Er is iets misgegaan. Probeer opnieuw.')
    }
    setDeleting(false)
  }

  const handleSave = async () => {
    if (!customer) return
    setSaving(true)
    
    const success = await updateCustomer(customer.id!, editForm)
    if (success) {
      setCustomer({ ...customer, ...editForm })
      setEditing(false)
    }
    
    setSaving(false)
  }

  const handleRedeem = async (reward: LoyaltyReward) => {
    if (!customer || (customer.loyalty_points || 0) < reward.points_required) return
    
    if (!confirm(`Weet je zeker dat je ${reward.points_required} punten wilt inwisselen voor "${reward.name}"?`)) return
    
    setRedeeming(reward.id!)
    const success = await redeemReward(customer.id!, reward.id!, reward.points_required, params.tenant)
    
    if (success) {
      setCustomer({
        ...customer,
        loyalty_points: (customer.loyalty_points || 0) - reward.points_required,
      })
      alert(`🎉 Gefeliciteerd! Je hebt "${reward.name}" ingewisseld. Toon dit bij je volgende bestelling.`)
    } else {
      alert('Er ging iets mis. Probeer opnieuw.')
    }
    setRedeeming(null)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('nl-BE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const statusColors: Record<string, string> = {
    new: 'bg-blue-100 text-blue-700',
    NEW: 'bg-blue-100 text-blue-700',
    confirmed: 'bg-yellow-100 text-yellow-700',
    CONFIRMED: 'bg-yellow-100 text-yellow-700',
    preparing: 'bg-orange-100 text-orange-700',
    PREPARING: 'bg-orange-100 text-orange-700',
    ready: 'bg-green-100 text-green-700',
    READY: 'bg-green-100 text-green-700',
    completed: 'bg-gray-100 text-gray-700',
    COMPLETED: 'bg-gray-100 text-gray-700',
    cancelled: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-red-100 text-red-700',
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          style={{ borderColor: primaryColor, borderTopColor: 'transparent' }}
          className="w-12 h-12 border-4 rounded-full"
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden w-full">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href={`/shop/${params.tenant}`} className="flex items-center gap-2 text-gray-600 hover:opacity-70 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Terug</span>
          </Link>
          <h1 className="font-bold text-xl text-gray-900">Mijn Account</h1>
          <button onClick={handleLogout} className="text-red-500 font-medium">
            Uitloggen
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm mb-4 sm:mb-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div 
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-xl sm:text-2xl text-white font-bold shrink-0"
                style={{ backgroundColor: primaryColor }}
              >
                {customer?.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{customer?.name}</h2>
                <p className="text-gray-500 text-sm sm:text-base truncate">{customer?.email}</p>
              </div>
            </div>
            <button
              onClick={() => setEditing(!editing)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors text-sm sm:text-base shrink-0"
            >
              {editing ? 'Annuleren' : '✏️ Bewerken'}
            </button>
          </div>

          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Naam</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefoon</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stad</label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adres</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                />
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ backgroundColor: primaryColor }}
                className="w-full text-white font-bold py-3 rounded-xl hover:opacity-90 transition-colors"
              >
                {saving ? 'Opslaan...' : 'Opslaan'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Telefoon</span>
                <p className="font-medium text-gray-900">{customer?.phone || '-'}</p>
              </div>
              <div>
                <span className="text-gray-500">Stad</span>
                <p className="font-medium text-gray-900">{customer?.city || '-'}</p>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500">Adres</span>
                <p className="font-medium text-gray-900">{customer?.address || '-'}</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Loyalty Points */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-6 text-white mb-6"
          style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)` }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium opacity-90">Klantenkaart</h3>
              <p className="text-2xl sm:text-4xl font-bold mt-2">{customer?.loyalty_points || 0} punten</p>
              <p className="text-sm opacity-75 mt-1">
                €{customer?.total_spent?.toFixed(2) || '0.00'} besteed • {customer?.total_orders || 0} bestellingen
              </p>
            </div>
            <div className="text-4xl sm:text-6xl">🎁</div>
          </div>
        </motion.div>

        {/* Rewards */}
        {rewards.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm mb-4 sm:mb-6"
          >
            <h2 className="text-lg font-bold text-gray-900 mb-4">🎁 Beloningen inwisselen</h2>
            <div className="space-y-3">
              {rewards.map((reward) => {
                const canRedeem = (customer?.loyalty_points || 0) >= reward.points_required
                return (
                  <div 
                    key={reward.id} 
                    className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                      canRedeem ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-gray-900">{reward.name}</p>
                      {reward.description && (
                        <p className="text-sm text-gray-500">{reward.description}</p>
                      )}
                      <p className="text-sm font-medium mt-1" style={{ color: canRedeem ? '#16a34a' : '#9ca3af' }}>
                        ⭐ {reward.points_required} punten
                      </p>
                    </div>
                    <button
                      onClick={() => handleRedeem(reward)}
                      disabled={!canRedeem || redeeming === reward.id}
                      style={canRedeem ? { backgroundColor: primaryColor } : undefined}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        canRedeem 
                          ? 'text-white hover:opacity-90' 
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {redeeming === reward.id ? 'Laden...' : canRedeem ? 'Inwisselen' : `Nog ${reward.points_required - (customer?.loyalty_points || 0)} punten`}
                    </button>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* Orders */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm mb-4 sm:mb-6"
        >
          <h2 className="text-lg font-bold text-gray-900 mb-4">Bestellingen</h2>
          
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-5xl mb-4 block">📦</span>
              <p className="text-gray-500">Je hebt nog geen bestellingen geplaatst.</p>
              <Link
                href={`/shop/${params.tenant}/menu`}
                style={{ color: primaryColor }}
                className="font-medium hover:underline mt-2 inline-block"
              >
                Bekijk menu →
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-gray-900">#{order.order_number || order.id?.slice(0, 6)}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[order.status] || 'bg-gray-100 text-gray-700'}`}>
                        {order.status}
                      </span>
                    </div>
                    <span className="font-bold" style={{ color: primaryColor }}>€{order.total?.toFixed(2)}</span>
                  </div>
                  <p className="text-sm text-gray-500">{formatDate(order.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* GDPR: Account verwijderen */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-red-100"
        >
          <h2 className="text-lg font-bold text-red-700 mb-2">⚠️ Account verwijderen</h2>
          <p className="text-gray-600 text-sm mb-4">
            Wanneer je je account verwijdert, worden al je persoonlijke gegevens permanent gewist. 
            Dit kan niet ongedaan worden gemaakt. (GDPR-recht op verwijdering)
          </p>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl font-medium transition-colors"
          >
            Account verwijderen
          </button>
        </motion.div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
          >
            <div className="p-6 bg-red-50 border-b">
              <h2 className="text-xl font-bold text-red-700">⚠️ Account permanent verwijderen?</h2>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-gray-700">
                Dit verwijdert:
              </p>
              <ul className="text-gray-600 text-sm space-y-1 ml-4">
                <li>• Je profiel en persoonlijke gegevens</li>
                <li>• Je spaarpunten ({customer?.loyalty_points || 0} punten)</li>
                <li>• Je bestelgeschiedenis (wordt geanonimiseerd)</li>
              </ul>
              <p className="text-red-600 font-medium text-sm">
                Dit kan NIET ongedaan worden gemaakt!
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Typ <span className="font-bold text-red-600">VERWIJDEREN</span> om te bevestigen:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="VERWIJDEREN"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="p-6 border-t bg-gray-50 flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeleteConfirmText('')
                }}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-100 font-medium"
              >
                Annuleren
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'VERWIJDEREN' || deleting}
                className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-xl font-medium"
              >
                {deleting ? 'Bezig...' : '🗑️ Verwijderen'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
