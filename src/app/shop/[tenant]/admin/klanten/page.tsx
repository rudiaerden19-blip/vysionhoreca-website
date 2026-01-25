'use client'

import { useLanguage } from '@/i18n'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { Customer } from '@/lib/admin-api'

export default function KlantenPage({ params }: { params: { tenant: string } }) {
  const { t } = useLanguage()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [editingPoints, setEditingPoints] = useState(false)
  const [newPoints, setNewPoints] = useState(0)

  useEffect(() => {
    loadCustomers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.tenant])

  async function loadCustomers() {
    const { data, error } = await supabase
      .from('shop_customers')
      .select('*')
      .eq('tenant_slug', params.tenant)
      .order('created_at', { ascending: false })
    
    if (!error && data) {
      setCustomers(data)
    }
    setLoading(false)
  }

  const handleUpdatePoints = async () => {
    if (!selectedCustomer) return
    
    const { error } = await supabase
      .from('shop_customers')
      .update({ loyalty_points: newPoints })
      .eq('id', selectedCustomer.id)
    
    if (!error) {
      setCustomers(prev => prev.map(c => 
        c.id === selectedCustomer.id ? { ...c, loyalty_points: newPoints } : c
      ))
      setSelectedCustomer({ ...selectedCustomer, loyalty_points: newPoints })
      setEditingPoints(false)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('nl-BE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone && c.phone.includes(search))
  )

  const totalCustomers = customers.length
  const totalPoints = customers.reduce((sum, c) => sum + (c.loyalty_points || 0), 0)
  const totalSpent = customers.reduce((sum, c) => sum + (c.total_spent || 0), 0)

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
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('customersPage.title')}</h1>
          <p className="text-gray-500">{t('customersPage.subtitle')}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500">{t('customersPage.stats.totalCustomers')}</span>
            <span className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">👥</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalCustomers}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500">{t('customersPage.stats.totalPoints')}</span>
            <span className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">🎁</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalPoints}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500">{t('customersPage.stats.totalRevenue')}</span>
            <span className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">💰</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">€{totalSpent.toFixed(2)}</p>
        </motion.div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`🔍 ${t('customersPage.search')}`}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Customers Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl shadow-sm overflow-hidden"
      >
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-5xl mb-4 block">👥</span>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{t('customersPage.noCustomers')}</h3>
            <p className="text-gray-500">{t('customersPage.noCustomersDesc')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-4 px-6 font-medium text-gray-600">{t('customersPage.table.customer')}</th>
                  <th className="text-left py-4 px-6 font-medium text-gray-600">{t('customersPage.table.contact')}</th>
                  <th className="text-right py-4 px-6 font-medium text-gray-600">{t('customersPage.table.points')}</th>
                  <th className="text-right py-4 px-6 font-medium text-gray-600">{t('customersPage.table.spent')}</th>
                  <th className="text-right py-4 px-6 font-medium text-gray-600">{t('customersPage.table.orders')}</th>
                  <th className="text-left py-4 px-6 font-medium text-gray-600">{t('customersPage.table.memberSince')}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredCustomers.map((customer) => (
                  <tr 
                    key={customer.id} 
                    onClick={() => setSelectedCustomer(customer)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900">{customer.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-gray-900">{customer.email}</p>
                      <p className="text-gray-500 text-sm">{customer.phone || '-'}</p>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full font-medium">
                        🎁 {customer.loyalty_points || 0}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right font-medium text-gray-900">
                      €{(customer.total_spent || 0).toFixed(2)}
                    </td>
                    <td className="py-4 px-6 text-right text-gray-600">
                      {customer.total_orders || 0}
                    </td>
                    <td className="py-4 px-6 text-gray-500">
                      {formatDate(customer.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedCustomer(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-md w-full shadow-2xl"
          >
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-2xl text-blue-600 font-bold">
                    {selectedCustomer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedCustomer.name}</h2>
                    <p className="text-gray-500">{selectedCustomer.email}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedCustomer(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-gray-500 text-sm">{t('customersPage.modal.phone')}</p>
                  <p className="font-medium text-gray-900">{selectedCustomer.phone || '-'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-gray-500 text-sm">{t('customersPage.modal.city')}</p>
                  <p className="font-medium text-gray-900">{selectedCustomer.city || '-'}</p>
                </div>
              </div>

              <div className="bg-yellow-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-yellow-700 font-medium">{t('customersPage.modal.loyaltyPoints')}</p>
                  <button
                    onClick={() => { setEditingPoints(true); setNewPoints(selectedCustomer.loyalty_points || 0) }}
                    className="text-sm text-yellow-600 hover:underline"
                  >
                    {t('customersPage.modal.adjust')}
                  </button>
                </div>
                {editingPoints ? (
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={newPoints}
                      onChange={(e) => setNewPoints(parseInt(e.target.value) || 0)}
                      className="flex-1 px-3 py-2 border border-yellow-200 rounded-lg"
                    />
                    <button
                      onClick={handleUpdatePoints}
                      className="px-4 py-2 bg-yellow-500 text-white rounded-lg font-medium"
                    >
                      {t('adminPages.common.save')}
                    </button>
                  </div>
                ) : (
                  <p className="text-3xl font-bold text-yellow-700">{selectedCustomer.loyalty_points || 0}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 rounded-xl p-4">
                  <p className="text-green-700 text-sm">{t('customersPage.modal.totalSpent')}</p>
                  <p className="text-2xl font-bold text-green-700">€{(selectedCustomer.total_spent || 0).toFixed(2)}</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-blue-700 text-sm">{t('customersPage.modal.orders')}</p>
                  <p className="text-2xl font-bold text-blue-700">{selectedCustomer.total_orders || 0}</p>
                </div>
              </div>

              <div className="text-sm text-gray-500">
                <p>{t('customersPage.modal.registered')}: {formatDate(selectedCustomer.created_at)}</p>
                <p>{t('customersPage.modal.lastLogin')}: {formatDate(selectedCustomer.last_login)}</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
