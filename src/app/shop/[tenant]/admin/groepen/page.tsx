'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { getAuthHeaders } from '@/lib/auth-headers'
import { useLanguage } from '@/i18n'
import { useAdminConfirm } from '@/hooks/useAdminConfirm'

interface OrderGroup {
  id: string
  name: string
  group_type: string
  contact_name: string
  contact_email: string
  contact_phone: string | null
  address_street: string | null
  address_city: string | null
  address_postal: string | null
  max_members: number
  allow_individual_payment: boolean
  company_pays: boolean
  access_code: string
  status: string
  notes: string | null
  created_at: string
  group_members: { count: number }[]
}

export default function GroupsPage({ params }: { params: { tenant: string } }) {
  const { t } = useLanguage()
  const { ask, ConfirmModal } = useAdminConfirm(t)
  const [groups, setGroups] = useState<OrderGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editGroup, setEditGroup] = useState<OrderGroup | null>(null)
  const [featureEnabled, setFeatureEnabled] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    group_type: 'company',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    address_street: '',
    address_city: '',
    address_postal: '',
    max_members: 100,
    allow_individual_payment: true,
    company_pays: false,
    notes: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadGroups()
    checkFeature()
  }, [params.tenant])

  async function checkFeature() {
    const { data } = await supabase
      .from('tenants')
      .select('feature_group_orders')
      .eq('slug', params.tenant)
      .single()
    setFeatureEnabled(data?.feature_group_orders || false)
  }

  async function loadGroups() {
    setLoading(true)
    const response = await fetch(`/api/groups?tenant_slug=${params.tenant}`, {
      headers: getAuthHeaders(),
    })
    if (response.ok) {
      const data = await response.json()
      setGroups(data || [])
    }
    setLoading(false)
  }

  async function enableFeature() {
    const { error } = await supabase
      .from('tenants')
      .update({ feature_group_orders: true })
      .eq('slug', params.tenant)
    if (!error) setFeatureEnabled(true)
  }

  function openCreateModal() {
    setEditGroup(null)
    setFormData({
      name: '', group_type: 'company', contact_name: '', contact_email: '',
      contact_phone: '', address_street: '', address_city: '', address_postal: '',
      max_members: 100, allow_individual_payment: true, company_pays: false, notes: ''
    })
    setShowModal(true)
  }

  function openEditModal(group: OrderGroup) {
    setEditGroup(group)
    setFormData({
      name: group.name, group_type: group.group_type, contact_name: group.contact_name,
      contact_email: group.contact_email, contact_phone: group.contact_phone || '',
      address_street: group.address_street || '', address_city: group.address_city || '',
      address_postal: group.address_postal || '', max_members: group.max_members,
      allow_individual_payment: group.allow_individual_payment,
      company_pays: group.company_pays, notes: group.notes || ''
    })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editGroup) {
        await fetch('/api/groups', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ id: editGroup.id, ...formData })
        })
      } else {
        await fetch('/api/groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ tenant_slug: params.tenant, ...formData })
        })
      }
      setShowModal(false)
      loadGroups()
    } catch (error) {
      console.error('Error saving group:', error)
    }
    setSaving(false)
  }

  async function archiveGroup(id: string) {
    if (!(await ask(t('groupsModule.groups.archiveConfirm')))) return
    await fetch(`/api/groups?id=${id}`, { method: 'DELETE', headers: getAuthHeaders() })
    loadGroups()
  }

  const groupTypeLabels: Record<string, string> = {
    company: `🏢 ${t('groupsModule.groups.typeCompany')}`,
    school: `🏫 ${t('groupsModule.groups.typeSchool')}`,
    organization: `🏛️ ${t('groupsModule.groups.typeOrganization')}`,
    event: `🎉 ${t('groupsModule.groups.typeEvent')}`,
    other: `📋 ${t('groupsModule.groups.typeOther')}`
  }

  if (!featureEnabled) {
    return (
      <div className="max-w-4xl mx-auto">
        <ConfirmModal />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-3xl p-8 text-white text-center"
        >
          <span className="text-6xl mb-4 block">👥</span>
          <h1 className="text-3xl font-bold mb-4">{t('groupsModule.groups.promoTitle')}</h1>
          <p className="text-xl opacity-90 mb-6">{t('groupsModule.groups.promoSubtitle')}</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 text-left">
            <div className="bg-white/10 rounded-xl p-4">
              <span className="text-2xl">🏢</span>
              <h3 className="font-bold mt-2">{t('groupsModule.groups.featureCompanies')}</h3>
              <p className="text-sm opacity-80">{t('groupsModule.groups.featureCompaniesDesc')}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <span className="text-2xl">📋</span>
              <h3 className="font-bold mt-2">{t('groupsModule.groups.featureSessions')}</h3>
              <p className="text-sm opacity-80">{t('groupsModule.groups.featureSessionsDesc')}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <span className="text-2xl">🏷️</span>
              <h3 className="font-bold mt-2">{t('groupsModule.groups.featureLabels')}</h3>
              <p className="text-sm opacity-80">{t('groupsModule.groups.featureLabelsDesc')}</p>
            </div>
          </div>

          <div className="bg-white/20 rounded-xl p-4 mb-6 inline-block">
            <span className="text-2xl font-bold">+€10</span>
            <span className="text-lg">/maand</span>
          </div>

          <button
            onClick={enableFeature}
            className="bg-white text-purple-600 px-8 py-3 rounded-xl font-bold text-lg hover:bg-gray-100 transition-colors"
          >
            {t('groupsModule.groups.activate')}
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <ConfirmModal />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">👥 {t('groupsModule.groups.pageTitle')}</h1>
          <p className="text-gray-600">{t('groupsModule.groups.pageSubtitle')}</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2"
        >
          {t('groupsModule.groups.newGroup')}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : groups.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-gray-50 rounded-2xl p-12 text-center"
        >
          <span className="text-6xl mb-4 block">🏢</span>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t('groupsModule.groups.noGroups')}</h2>
          <p className="text-gray-600 mb-4">{t('groupsModule.groups.noGroupsDesc')}</p>
          <button
            onClick={openCreateModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-medium"
          >
            {t('groupsModule.groups.firstGroup')}
          </button>
        </motion.div>
      ) : (
        <div className="grid gap-4">
          {groups.filter(g => g.status !== 'archived').map((group) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-6 shadow-sm border hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">{group.name}</h3>
                    <span className="text-sm bg-gray-100 px-2 py-1 rounded-lg">
                      {groupTypeLabels[group.group_type]}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      group.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {group.status === 'active' ? `✓ ${t('groupsModule.groups.active')}` : group.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div><span className="font-medium">{t('groupsModule.groups.contact')}:</span><br />{group.contact_name}</div>
                    <div><span className="font-medium">Email:</span><br />{group.contact_email}</div>
                    <div><span className="font-medium">{t('groupsModule.groups.members')}:</span><br />{group.group_members?.[0]?.count || 0} / {group.max_members}</div>
                    <div>
                      <span className="font-medium">{t('groupsModule.groups.accessCode')}:</span><br />
                      <code className="bg-gray-100 px-2 py-0.5 rounded font-mono">{group.access_code}</code>
                    </div>
                  </div>

                  {(group.address_street || group.address_city) && (
                    <div className="mt-2 text-sm text-gray-500">
                      📍 {[group.address_street, group.address_postal, group.address_city].filter(Boolean).join(', ')}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button onClick={() => openEditModal(group)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600" title={t('groupsModule.groups.editGroup')}>✏️</button>
                  <a href={`/shop/${params.tenant}/admin/groepen/leden?group=${group.id}`} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600" title={t('groupsModule.groups.members')}>👥</a>
                  <button onClick={() => archiveGroup(group.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-500" title="Archiveren">🗑️</button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editGroup ? t('groupsModule.groups.editGroup') : t('groupsModule.groups.createGroup')}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('groupsModule.groups.name')} *</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required placeholder="bijv. Kantoor ABC" className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('groupsModule.groups.type')}</label>
                  <select value={formData.group_type} onChange={(e) => setFormData({ ...formData, group_type: e.target.value })} className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="company">🏢 {t('groupsModule.groups.typeCompany')}</option>
                    <option value="school">🏫 {t('groupsModule.groups.typeSchool')}</option>
                    <option value="organization">🏛️ {t('groupsModule.groups.typeOrganization')}</option>
                    <option value="event">🎉 {t('groupsModule.groups.typeEvent')}</option>
                    <option value="other">📋 {t('groupsModule.groups.typeOther')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('groupsModule.groups.contactPerson')} *</label>
                  <input type="text" value={formData.contact_name} onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })} required className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input type="email" value={formData.contact_email} onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })} required className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('groupsModule.groups.phone')}</label>
                  <input type="tel" value={formData.contact_phone} onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })} placeholder="+32 xxx xx xx xx" className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('groupsModule.groups.maxMembers')}</label>
                  <input type="number" value={formData.max_members} onChange={(e) => setFormData({ ...formData, max_members: parseInt(e.target.value) })} min={1} className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium text-gray-900 mb-3">{t('groupsModule.groups.addressSection')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <input type="text" value={formData.address_street} onChange={(e) => setFormData({ ...formData, address_street: e.target.value })} placeholder={t('groupsModule.groups.street')} className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <input type="text" value={formData.address_postal} onChange={(e) => setFormData({ ...formData, address_postal: e.target.value })} placeholder={t('groupsModule.groups.postalCode')} className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div className="md:col-span-3">
                    <input type="text" value={formData.address_city} onChange={(e) => setFormData({ ...formData, address_city: e.target.value })} placeholder={t('groupsModule.groups.city')} className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium text-gray-900 mb-3">{t('groupsModule.groups.paymentOptions')}</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-3">
                    <input type="checkbox" checked={formData.allow_individual_payment} onChange={(e) => setFormData({ ...formData, allow_individual_payment: e.target.checked })} className="w-5 h-5 rounded text-blue-600" />
                    <span>{t('groupsModule.groups.allowIndividualPayment')}</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input type="checkbox" checked={formData.company_pays} onChange={(e) => setFormData({ ...formData, company_pays: e.target.checked })} className="w-5 h-5 rounded text-blue-600" />
                    <span>{t('groupsModule.groups.companyPays')}</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('groupsModule.groups.notes')}</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} placeholder={t('groupsModule.groups.notesPlaceholder')} className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl">
                  {t('groupsModule.groups.cancel')}
                </button>
                <button type="submit" disabled={saving} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium disabled:opacity-50">
                  {saving ? t('groupsModule.groups.saving') : editGroup ? t('groupsModule.groups.save') : t('groupsModule.groups.create')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}
