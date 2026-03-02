'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useLanguage } from '@/i18n'

interface OrderGroup { id: string; name: string; contact_name: string; contact_email: string }

interface GroupSession {
  id: string; group_id: string; tenant_slug: string; title: string | null
  description: string | null; order_deadline: string; delivery_time: string | null
  status: string; total_orders: number; total_amount: number; kitchen_notes: string | null
  created_at: string; order_groups: OrderGroup
}

export default function SessionsPage({ params }: { params: { tenant: string } }) {
  const { t } = useLanguage()
  const [sessions, setSessions] = useState<GroupSession[]>([])
  const [groups, setGroups] = useState<OrderGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({ group_id: '', title: '', description: '', order_deadline: '', delivery_time: '', status: 'open' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadData() }, [params.tenant])

  async function loadData() {
    setLoading(true)
    const groupsRes = await fetch(`/api/groups?tenant_slug=${params.tenant}`)
    if (groupsRes.ok) setGroups(await groupsRes.json() || [])
    const sessionsRes = await fetch(`/api/groups/sessions?tenant_slug=${params.tenant}`)
    if (sessionsRes.ok) setSessions(await sessionsRes.json() || [])
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await fetch('/api/groups/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, tenant_slug: params.tenant })
      })
      setShowModal(false)
      loadData()
    } catch (error) { console.error('Error creating session:', error) }
    setSaving(false)
  }

  async function updateStatus(id: string, status: string) {
    await fetch('/api/groups/sessions', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) })
    loadData()
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  function isDeadlinePassed(deadline: string) { return new Date(deadline) < new Date() }

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700', open: 'bg-green-100 text-green-700',
    closed: 'bg-yellow-100 text-yellow-700', delivered: 'bg-blue-100 text-blue-700', cancelled: 'bg-red-100 text-red-700'
  }

  const statusLabels: Record<string, string> = {
    draft: `📝 ${t('groupsModule.sessions.statusDraft')}`,
    open: `✅ ${t('groupsModule.sessions.statusOpen')}`,
    closed: `🔒 ${t('groupsModule.sessions.statusClosed')}`,
    delivered: `✓ ${t('groupsModule.sessions.statusDelivered')}`,
    cancelled: `✗ ${t('groupsModule.sessions.statusCancelled')}`
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📋 {t('groupsModule.sessions.pageTitle')}</h1>
          <p className="text-gray-600">{t('groupsModule.sessions.pageSubtitle')}</p>
        </div>
        <button
          onClick={() => { setFormData({ group_id: groups[0]?.id || '', title: '', description: '', order_deadline: '', delivery_time: '', status: 'open' }); setShowModal(true) }}
          disabled={groups.length === 0}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('groupsModule.sessions.newSession')}
        </button>
      </div>

      {groups.length === 0 && !loading && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <p className="text-yellow-800">
            ⚠️ {t('groupsModule.sessions.noGroupWarning')}
            <a href={`/shop/${params.tenant}/admin/groepen`} className="underline ml-1">{t('groupsModule.sessions.goToGroups')}</a>
          </p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div></div>
      ) : sessions.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-gray-50 rounded-2xl p-12 text-center">
          <span className="text-6xl mb-4 block">📋</span>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t('groupsModule.sessions.noSessions')}</h2>
          <p className="text-gray-600">{t('groupsModule.sessions.noSessionsDesc')}</p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <motion.div key={session.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-6 shadow-sm border hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">{session.title || `${t('groupsModule.sessions.pageTitle')} ${session.order_groups?.name}`}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${statusColors[session.status]}`}>{statusLabels[session.status]}</span>
                    {session.status === 'open' && isDeadlinePassed(session.order_deadline) && (
                      <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">⏰ {t('groupsModule.sessions.deadlinePassed')}</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 mb-3">🏢 {session.order_groups?.name}</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><span className="text-gray-500">{t('groupsModule.sessions.deadline')}:</span><br /><span className="font-medium">{formatDate(session.order_deadline)}</span></div>
                    {session.delivery_time && <div><span className="text-gray-500">{t('groupsModule.sessions.delivery')}:</span><br /><span className="font-medium">{formatDate(session.delivery_time)}</span></div>}
                    <div><span className="text-gray-500">{t('groupsModule.sessions.orders')}:</span><br /><span className="font-bold text-lg">{session.total_orders}</span></div>
                    <div><span className="text-gray-500">{t('groupsModule.sessions.total')}:</span><br /><span className="font-bold text-lg text-green-600">€{session.total_amount?.toFixed(2)}</span></div>
                  </div>
                  {session.description && <p className="text-sm text-gray-500 mt-2">{session.description}</p>}
                </div>
                <div className="flex flex-col gap-2 ml-4">
                  {session.status === 'open' && (
                    <button onClick={() => updateStatus(session.id, 'closed')} className="px-3 py-1 text-sm bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200">
                      🔒 {t('groupsModule.sessions.close')}
                    </button>
                  )}
                  {session.status === 'closed' && (
                    <button onClick={() => updateStatus(session.id, 'delivered')} className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
                      ✓ {t('groupsModule.sessions.markDelivered')}
                    </button>
                  )}
                  <a href={`/shop/${params.tenant}/admin/groepen/bestellingen?session=${session.id}`} className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-center">
                    📦 {t('groupsModule.sessions.viewOrders')}
                  </a>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl p-6 max-w-lg w-full">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{t('groupsModule.sessions.modalTitle')}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('groupsModule.sessions.group')} *</label>
                <select value={formData.group_id} onChange={(e) => setFormData({ ...formData, group_id: e.target.value })} required className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500">
                  <option value="">{t('groupsModule.sessions.selectGroup')}</option>
                  {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('groupsModule.sessions.titleField')}</label>
                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('groupsModule.sessions.orderDeadline')} *</label>
                <input type="datetime-local" value={formData.order_deadline} onChange={(e) => setFormData({ ...formData, order_deadline: e.target.value })} required className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('groupsModule.sessions.deliveryTime')}</label>
                <input type="datetime-local" value={formData.delivery_time} onChange={(e) => setFormData({ ...formData, delivery_time: e.target.value })} className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('groupsModule.sessions.description')}</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} placeholder={t('groupsModule.sessions.descriptionPlaceholder')} className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl">{t('groupsModule.sessions.cancel')}</button>
                <button type="submit" disabled={saving} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium disabled:opacity-50">
                  {saving ? t('groupsModule.sessions.starting') : t('groupsModule.sessions.startSession')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}
