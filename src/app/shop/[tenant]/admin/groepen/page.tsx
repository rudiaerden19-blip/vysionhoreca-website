'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/i18n'

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
  const [groups, setGroups] = useState<OrderGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editGroup, setEditGroup] = useState<OrderGroup | null>(null)
  const [featureEnabled, setFeatureEnabled] = useState(false)
  
  // Form state
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
    const response = await fetch(`/api/groups?tenant_slug=${params.tenant}`)
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
    
    if (!error) {
      setFeatureEnabled(true)
    }
  }

  function openCreateModal() {
    setEditGroup(null)
    setFormData({
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
    setShowModal(true)
  }

  function openEditModal(group: OrderGroup) {
    setEditGroup(group)
    setFormData({
      name: group.name,
      group_type: group.group_type,
      contact_name: group.contact_name,
      contact_email: group.contact_email,
      contact_phone: group.contact_phone || '',
      address_street: group.address_street || '',
      address_city: group.address_city || '',
      address_postal: group.address_postal || '',
      max_members: group.max_members,
      allow_individual_payment: group.allow_individual_payment,
      company_pays: group.company_pays,
      notes: group.notes || ''
    })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      if (editGroup) {
        // Update
        await fetch('/api/groups', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editGroup.id, ...formData })
        })
      } else {
        // Create
        await fetch('/api/groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
    if (!confirm('Weet je zeker dat je deze groep wilt archiveren?')) return
    
    await fetch(`/api/groups?id=${id}`, { method: 'DELETE' })
    loadGroups()
  }

  const groupTypeLabels: Record<string, string> = {
    company: '🏢 Bedrijf',
    school: '🏫 School',
    organization: '🏛️ Organisatie',
    event: '🎉 Evenement',
    other: '📋 Overig'
  }

  if (!featureEnabled) {
    return (
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-3xl p-8 text-white text-center"
        >
          <span className="text-6xl mb-4 block">👥</span>
          <h1 className="text-3xl font-bold mb-4">Groepsbestellingen</h1>
          <p className="text-xl opacity-90 mb-6">
            Laat bedrijven, scholen en organisaties gebundeld bestellen!
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 text-left">
            <div className="bg-white/10 rounded-xl p-4">
              <span className="text-2xl">🏢</span>
              <h3 className="font-bold mt-2">Bedrijven</h3>
              <p className="text-sm opacity-80">Medewerkers bestellen individueel, orders gebundeld</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <span className="text-2xl">📋</span>
              <h3 className="font-bold mt-2">Sessies</h3>
              <p className="text-sm opacity-80">Deadline-gebaseerde bestellingen met overzicht</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <span className="text-2xl">🏷️</span>
              <h3 className="font-bold mt-2">Labels</h3>
              <p className="text-sm opacity-80">Print labels met naam per bestelling</p>
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
            Activeer Groepsbestellingen
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">👥 Groepen beheren</h1>
          <p className="text-gray-600">Beheer bedrijven, scholen en organisaties die gebundeld bestellen</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2"
        >
          <span>+</span> Nieuwe groep
        </button>
      </div>

      {/* Groups List */}
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
          <h2 className="text-xl font-bold text-gray-900 mb-2">Nog geen groepen</h2>
          <p className="text-gray-600 mb-4">Maak je eerste groep aan voor bedrijven of scholen</p>
          <button
            onClick={openCreateModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-medium"
          >
            + Eerste groep aanmaken
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
                      {group.status === 'active' ? '✓ Actief' : group.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Contact:</span><br />
                      {group.contact_name}
                    </div>
                    <div>
                      <span className="font-medium">Email:</span><br />
                      {group.contact_email}
                    </div>
                    <div>
                      <span className="font-medium">Leden:</span><br />
                      {group.group_members?.[0]?.count || 0} / {group.max_members}
                    </div>
                    <div>
                      <span className="font-medium">Toegangscode:</span><br />
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
                  <button
                    onClick={() => openEditModal(group)}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                    title="Bewerken"
                  >
                    ✏️
                  </button>
                  <a
                    href={`/shop/${params.tenant}/admin/groepen/leden?group=${group.id}`}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                    title="Leden beheren"
                  >
                    👥
                  </a>
                  <button
                    onClick={() => archiveGroup(group.id)}
                    className="p-2 hover:bg-red-50 rounded-lg text-red-500"
                    title="Archiveren"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editGroup ? 'Groep bewerken' : 'Nieuwe groep aanmaken'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Naam *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="bijv. Kantoor ABC"
                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={formData.group_type}
                    onChange={(e) => setFormData({ ...formData, group_type: e.target.value })}
                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="company">🏢 Bedrijf</option>
                    <option value="school">🏫 School</option>
                    <option value="organization">🏛️ Organisatie</option>
                    <option value="event">🎉 Evenement</option>
                    <option value="other">📋 Overig</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contactpersoon *</label>
                  <input
                    type="text"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    required
                    placeholder="Naam contactpersoon"
                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    required
                    placeholder="contact@bedrijf.nl"
                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefoon</label>
                  <input
                    type="tel"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    placeholder="+32 xxx xx xx xx"
                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max. leden</label>
                  <input
                    type="number"
                    value={formData.max_members}
                    onChange={(e) => setFormData({ ...formData, max_members: parseInt(e.target.value) })}
                    min={1}
                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h3 className="font-medium text-gray-900 mb-3">Adres (voor levering)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      value={formData.address_street}
                      onChange={(e) => setFormData({ ...formData, address_street: e.target.value })}
                      placeholder="Straat + nummer"
                      className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={formData.address_postal}
                      onChange={(e) => setFormData({ ...formData, address_postal: e.target.value })}
                      placeholder="Postcode"
                      className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <input
                      type="text"
                      value={formData.address_city}
                      onChange={(e) => setFormData({ ...formData, address_city: e.target.value })}
                      placeholder="Stad"
                      className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h3 className="font-medium text-gray-900 mb-3">Betalingsopties</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.allow_individual_payment}
                      onChange={(e) => setFormData({ ...formData, allow_individual_payment: e.target.checked })}
                      className="w-5 h-5 rounded text-blue-600"
                    />
                    <span>Leden mogen individueel betalen</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.company_pays}
                      onChange={(e) => setFormData({ ...formData, company_pays: e.target.checked })}
                      className="w-5 h-5 rounded text-blue-600"
                    />
                    <span>Bedrijf betaalt alles (factuur)</span>
                  </label>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notities</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  placeholder="Interne notities..."
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium disabled:opacity-50"
                >
                  {saving ? 'Opslaan...' : editGroup ? 'Opslaan' : 'Aanmaken'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}
