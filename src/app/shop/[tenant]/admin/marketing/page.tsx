'use client'

import { useLanguage } from '@/i18n'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { getTenantSettings } from '@/lib/admin-api'

interface Customer {
  id: string
  name: string
  email: string
  phone?: string
  total_orders: number
  total_spent: number
  loyalty_points: number
  created_at: string
  marketing_opt_in?: boolean
}

interface CampaignHistory {
  id: string
  subject: string
  sent_at: string
  recipient_count: number
  status: 'sent' | 'failed'
}

export default function MarketingPage({ params }: { params: { tenant: string } }) {
  const { t } = useLanguage()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showComposer, setShowComposer] = useState(false)
  const [businessInfo, setBusinessInfo] = useState<any>(null)
  const [campaigns, setCampaigns] = useState<CampaignHistory[]>([])
  const [sendSuccess, setSendSuccess] = useState(false)
  
  const [emailForm, setEmailForm] = useState({
    subject: '',
    message: '',
    includePromo: false,
    promoCode: '',
    promoDiscount: '10',
  })

  useEffect(() => {
    loadData()
  }, [params.tenant])

  async function loadData() {
    setLoading(true)
    
    // Load customers with email
    const { data: customersData } = await supabase
      .from('shop_customers')
      .select('*')
      .eq('tenant_slug', params.tenant)
      .not('email', 'is', null)
      .order('created_at', { ascending: false })
    
    if (customersData) {
      setCustomers(customersData)
    }

    // Load business info
    const settings = await getTenantSettings(params.tenant)
    if (settings) {
      setBusinessInfo(settings)
    }

    // Load campaign history
    const { data: campaignData } = await supabase
      .from('marketing_campaigns')
      .select('*')
      .eq('tenant_slug', params.tenant)
      .order('sent_at', { ascending: false })
      .limit(20)
    
    if (campaignData) {
      setCampaigns(campaignData)
    }

    setLoading(false)
  }

  const toggleSelectAll = () => {
    if (selectedCustomers.size === customers.length) {
      setSelectedCustomers(new Set())
    } else {
      setSelectedCustomers(new Set(customers.map(c => c.id)))
    }
  }

  const toggleCustomer = (id: string) => {
    const newSelected = new Set(selectedCustomers)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedCustomers(newSelected)
  }

  const openComposer = () => {
    if (selectedCustomers.size === 0) {
      alert(t('marketing.selectCustomersFirst'))
      return
    }
    setEmailForm({
      subject: '',
      message: `Beste klant,\n\n\n\nMet vriendelijke groeten,\n${businessInfo?.business_name || 'Uw zaak'}`,
      includePromo: false,
      promoCode: '',
      promoDiscount: '10',
    })
    setShowComposer(true)
  }

  const sendEmails = async () => {
    if (!emailForm.subject || !emailForm.message) {
      alert(t('marketing.fillAllFields'))
      return
    }

    setSending(true)

    const selectedEmails = customers
      .filter(c => selectedCustomers.has(c.id))
      .map(c => ({ email: c.email, name: c.name }))

    try {
      const response = await fetch('/api/marketing/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantSlug: params.tenant,
          recipients: selectedEmails,
          subject: emailForm.subject,
          message: emailForm.message,
          includePromo: emailForm.includePromo,
          promoCode: emailForm.promoCode,
          promoDiscount: emailForm.promoDiscount,
          businessName: businessInfo?.business_name,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setSendSuccess(true)
        setShowComposer(false)
        setSelectedCustomers(new Set())
        loadData() // Reload campaign history
        setTimeout(() => setSendSuccess(false), 5000)
      } else {
        alert(t('marketing.sendFailed') + ': ' + (result.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Send error:', error)
      alert(t('marketing.sendFailed'))
    }

    setSending(false)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-BE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full"
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">📧 {t('marketing.title')}</h1>
          <p className="text-gray-600">{t('marketing.subtitle')}</p>
        </div>
        <button
          onClick={openComposer}
          disabled={selectedCustomers.size === 0}
          className="px-6 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
        >
          ✉️ {t('marketing.composeEmail')} {selectedCustomers.size > 0 && `(${selectedCustomers.size})`}
        </button>
      </div>

      {/* Success Message */}
      {sendSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-100 border border-green-300 text-green-700 px-4 py-3 rounded-xl flex items-center gap-2"
        >
          ✅ {t('marketing.emailsSent')}
        </motion.div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-3xl font-bold text-gray-800">{customers.length}</div>
          <div className="text-gray-600">{t('marketing.totalCustomers')}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-3xl font-bold text-blue-600">{selectedCustomers.size}</div>
          <div className="text-gray-600">{t('marketing.selected')}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-3xl font-bold text-green-600">{campaigns.length}</div>
          <div className="text-gray-600">{t('marketing.campaignsSent')}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-3xl font-bold text-purple-600">
            {campaigns.reduce((sum, c) => sum + c.recipient_count, 0)}
          </div>
          <div className="text-gray-600">{t('marketing.totalEmailsSent')}</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Customer List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-bold text-gray-800">👥 {t('marketing.customerList')}</h2>
              <button
                onClick={toggleSelectAll}
                className="text-sm text-orange-600 hover:text-orange-700"
              >
                {selectedCustomers.size === customers.length ? t('marketing.deselectAll') : t('marketing.selectAll')}
              </button>
            </div>

            {customers.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-5xl mb-4">👥</div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{t('marketing.noCustomers')}</h3>
                <p className="text-gray-500">{t('marketing.noCustomersDesc')}</p>
              </div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto">
                {customers.map((customer) => (
                  <div
                    key={customer.id}
                    onClick={() => toggleCustomer(customer.id)}
                    className={`p-4 border-b cursor-pointer transition ${
                      selectedCustomers.has(customer.id)
                        ? 'bg-orange-50 border-l-4 border-l-orange-500'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <input
                        type="checkbox"
                        checked={selectedCustomers.has(customer.id)}
                        onChange={() => toggleCustomer(customer.id)}
                        className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-800">{customer.name}</div>
                        <div className="text-sm text-gray-500">{customer.email}</div>
                      </div>
                      <div className="text-right text-sm">
                        <div className="text-gray-600">{customer.total_orders} {t('marketing.orders')}</div>
                        <div className="text-green-600 font-medium">€{(customer.total_spent || 0).toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Campaign History */}
        <div>
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="font-bold text-gray-800">📊 {t('marketing.campaignHistory')}</h2>
            </div>

            {campaigns.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="text-3xl mb-2">📭</div>
                {t('marketing.noCampaigns')}
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto">
                {campaigns.map((campaign) => (
                  <div key={campaign.id} className="p-4 border-b">
                    <div className="font-medium text-gray-800 truncate">{campaign.subject}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      {formatDate(campaign.sent_at)}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        campaign.status === 'sent' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {campaign.status === 'sent' ? '✓ Verzonden' : '✗ Mislukt'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {campaign.recipient_count} {t('marketing.recipients')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Email Composer Modal */}
      {showComposer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">
                ✉️ {t('marketing.composeEmail')}
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                {t('marketing.sendingTo')} {selectedCustomers.size} {t('marketing.customers')}
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('marketing.subject')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder={t('marketing.subjectPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('marketing.message')} <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={emailForm.message}
                  onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })}
                  rows={10}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder={t('marketing.messagePlaceholder')}
                />
              </div>

              {/* Promo Code Option */}
              <div className="bg-orange-50 rounded-lg p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailForm.includePromo}
                    onChange={(e) => setEmailForm({ ...emailForm, includePromo: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                  />
                  <div>
                    <span className="font-medium text-gray-800">🎁 {t('marketing.includePromoCode')}</span>
                    <p className="text-sm text-gray-500">{t('marketing.promoCodeDesc')}</p>
                  </div>
                </label>

                {emailForm.includePromo && (
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('marketing.promoCode')}
                      </label>
                      <input
                        type="text"
                        value={emailForm.promoCode}
                        onChange={(e) => setEmailForm({ ...emailForm, promoCode: e.target.value.toUpperCase() })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 uppercase"
                        placeholder="KORTING10"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('marketing.discount')} (%)
                      </label>
                      <input
                        type="number"
                        value={emailForm.promoDiscount}
                        onChange={(e) => setEmailForm({ ...emailForm, promoDiscount: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                        min="1"
                        max="100"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t flex gap-3 justify-end">
              <button
                onClick={() => setShowComposer(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                {t('adminPages.common.cancel')}
              </button>
              <button
                onClick={sendEmails}
                disabled={sending || !emailForm.subject || !emailForm.message}
                className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition disabled:bg-gray-300 flex items-center gap-2"
              >
                {sending ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                    />
                    {t('marketing.sending')}...
                  </>
                ) : (
                  <>
                    📤 {t('marketing.send')} ({selectedCustomers.size})
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
