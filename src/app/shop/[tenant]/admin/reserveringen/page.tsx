'use client'

import { useLanguage } from '@/i18n'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'

interface Reservation {
  id: string
  tenant_slug: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  reservation_date: string
  reservation_time: string
  party_size: number
  notes?: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  created_at: string
}

const getStatusConfig = (t: (key: string) => string): Record<string, { bg: string; text: string; label: string }> => ({
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: `⏳ ${t('reservationsPage.status.pending')}` },
  confirmed: { bg: 'bg-green-100', text: 'text-green-700', label: `✓ ${t('reservationsPage.status.confirmed')}` },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: `❌ ${t('reservationsPage.status.cancelled')}` },
  completed: { bg: 'bg-gray-100', text: 'text-gray-700', label: `✔️ ${t('reservationsPage.status.completed')}` },
})

export default function ReserveringenPage({ params }: { params: { tenant: string } }) {
  const { t } = useLanguage()
  const statusConfig = useMemo(() => getStatusConfig(t), [t])
  
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'upcoming' | 'today' | 'all'>('upcoming')
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [rejectingReservation, setRejectingReservation] = useState<Reservation | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [reservationsEnabled, setReservationsEnabled] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)

  // Helper function to capitalize first letter of each word
  const capitalizeWords = (str: string) => {
    return str.replace(/\b\w/g, (char) => char.toUpperCase())
  }

  // Load reservations enabled setting
  useEffect(() => {
    async function loadSettings() {
      const { data } = await supabase
        .from('tenant_settings')
        .select('reservations_enabled')
        .eq('tenant_slug', params.tenant)
        .single()
      
      if (data) {
        setReservationsEnabled(data.reservations_enabled !== false) // Default to true
      }
    }
    loadSettings()
  }, [params.tenant])

  const toggleReservationsEnabled = async () => {
    setSavingSettings(true)
    const newValue = !reservationsEnabled
    
    // Gebruik upsert zodat het werkt als er nog geen record is
    const { error } = await supabase
      .from('tenant_settings')
      .upsert({ 
        tenant_slug: params.tenant,
        reservations_enabled: newValue 
      }, { 
        onConflict: 'tenant_slug' 
      })
    
    if (!error) {
      setReservationsEnabled(newValue)
    }
    setSavingSettings(false)
  }

  const loadReservations = useCallback(async () => {
    setLoading(true)
    
    const today = new Date().toISOString().split('T')[0]
    
    let query = supabase
      .from('reservations')
      .select('*')
      .eq('tenant_slug', params.tenant)
      .order('reservation_date', { ascending: true })
      .order('reservation_time', { ascending: true })
    
    if (filter === 'upcoming') {
      query = query.gte('reservation_date', today).not('status', 'in', '("cancelled","completed")')
    } else if (filter === 'today') {
      query = query.eq('reservation_date', today)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error loading reservations:', error)
    } else {
      setReservations(data || [])
    }
    
    setLoading(false)
  }, [params.tenant, filter])

  useEffect(() => {
    loadReservations()
  }, [loadReservations])

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('reservations-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations',
          filter: `tenant_slug=eq.${params.tenant}`,
        },
        () => {
          loadReservations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [params.tenant, loadReservations])

  const updateStatus = async (id: string, newStatus: string, reason?: string) => {
    setUpdatingId(id)
    
    const reservation = reservations.find(r => r.id === id)
    
    const { error } = await supabase
      .from('reservations')
      .update({ status: newStatus })
      .eq('id', id)
    
    if (!error) {
      setReservations(prev => 
        prev.map(r => r.id === id ? { ...r, status: newStatus as Reservation['status'] } : r)
      )
      
      // Send email notification to customer
      if (reservation?.customer_email && (newStatus === 'confirmed' || newStatus === 'cancelled')) {
        try {
          await fetch('/api/send-reservation-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              reservationId: id,
              status: newStatus,
              customerEmail: reservation.customer_email,
              customerName: reservation.customer_name,
              customerPhone: reservation.customer_phone,
              reservationDate: reservation.reservation_date,
              reservationTime: reservation.reservation_time,
              partySize: reservation.party_size,
              tenantSlug: params.tenant,
              rejectionReason: reason || '',
            }),
          })
        } catch (emailError) {
          console.error('Failed to send reservation email:', emailError)
        }
      }
    }
    
    setUpdatingId(null)
  }

  const handleRejectReservation = async () => {
    if (!rejectingReservation || !rejectionReason.trim()) return
    
    await updateStatus(rejectingReservation.id, 'cancelled', capitalizeWords(rejectionReason))
    
    setRejectingReservation(null)
    setRejectionReason('')
  }

  const deleteReservation = async (id: string) => {
    if (!confirm(t('reservationsPage.confirmDelete'))) return
    
    const { error } = await supabase
      .from('reservations')
      .delete()
      .eq('id', id)
    
    if (!error) {
      setReservations(prev => prev.filter(r => r.id !== id))
      setSelectedReservation(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    if (dateString === today.toISOString().split('T')[0]) {
      return t('reservationsPage.todayLabel')
    }
    if (dateString === tomorrow.toISOString().split('T')[0]) {
      return t('reservationsPage.tomorrowLabel')
    }
    
    return date.toLocaleDateString('nl-BE', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    })
  }

  const formatTime = (timeString: string) => {
    return timeString.slice(0, 5)
  }

  const pendingCount = reservations.filter(r => r.status === 'pending').length
  const todayCount = reservations.filter(r => r.reservation_date === new Date().toISOString().split('T')[0]).length

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Enable/Disable Toggle */}
      <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{t('reservationsPage.websiteReservations')}</h2>
            <p className="text-gray-500 text-sm">
              {reservationsEnabled ? t('reservationsPage.customersCanReserve') : t('reservationsPage.reservationFormDisabled')}
            </p>
          </div>
          <button
            onClick={toggleReservationsEnabled}
            disabled={savingSettings}
            className={`relative w-12 h-7 rounded-full transition-colors ${
              reservationsEnabled ? 'bg-green-500' : 'bg-gray-300'
            } ${savingSettings ? 'opacity-50' : ''}`}
          >
            <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
              reservationsEnabled ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('reservationsPage.title')}</h1>
          <p className="text-gray-500">
            {pendingCount > 0 && <span className="text-yellow-600 font-medium">{pendingCount} {t('reservationsPage.pending')}</span>}
            {pendingCount > 0 && todayCount > 0 && ' • '}
            {todayCount > 0 && <span className="text-blue-600 font-medium">{todayCount} {t('reservationsPage.today')}</span>}
            {pendingCount === 0 && todayCount === 0 && t('reservationsPage.manageReservations')}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={loadReservations}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl"
            title={t('reservationsPage.refresh')}
          >
            🔄
          </button>
          
          <div className="flex bg-gray-100 rounded-xl p-1">
            {(['upcoming', 'today', 'all'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filter === f ? 'bg-white shadow text-gray-900' : 'text-gray-500'
                }`}
              >
                {t(`reservationsPage.filter.${f}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* New reservations alert */}
      {pendingCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-2xl flex items-center gap-4"
        >
          <span className="text-3xl">📅</span>
          <div>
            <p className="font-bold text-yellow-800">{pendingCount} {pendingCount > 1 ? t('reservationsPage.newReservationsPlural') : t('reservationsPage.newReservations')}</p>
            <p className="text-yellow-700 text-sm">{t('reservationsPage.confirmOrReject')}</p>
          </div>
        </motion.div>
      )}

      {/* Reservations List */}
      <div className="space-y-4">
        <AnimatePresence>
          {reservations.map((reservation, index) => {
            const config = statusConfig[reservation.status] || statusConfig.pending
            const isToday = reservation.reservation_date === new Date().toISOString().split('T')[0]
            
            return (
              <motion.div
                key={reservation.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-white rounded-2xl p-6 shadow-sm ${
                  reservation.status === 'pending' ? 'ring-2 ring-yellow-400' : ''
                } ${isToday ? 'border-l-4 border-blue-500' : ''}`}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  {/* Left: Date & Time */}
                  <div className="flex items-center gap-4">
                    <div className={`text-center p-4 rounded-xl ${isToday ? 'bg-blue-100' : 'bg-gray-100'}`}>
                      <p className={`text-2xl font-bold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                        {formatTime(reservation.reservation_time)}
                      </p>
                      <p className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
                        {formatDate(reservation.reservation_date)}
                      </p>
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-gray-900">{reservation.customer_name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
                          {config.label}
                        </span>
                      </div>
                      <p className="text-gray-600">📞 {reservation.customer_phone}</p>
                      {reservation.customer_email && (
                        <p className="text-gray-500 text-sm">✉️ {reservation.customer_email}</p>
                      )}
                    </div>
                  </div>

                  {/* Right: Party size & Actions */}
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-blue-600">{reservation.party_size}</p>
                      <p className="text-sm text-gray-500">{t('reservationsPage.persons')}</p>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      {reservation.status === 'pending' && (
                        <>
                          <button
                            onClick={() => updateStatus(reservation.id, 'confirmed')}
                            disabled={updatingId === reservation.id}
                            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium text-sm disabled:opacity-50"
                          >
                            ✓ {t('reservationsPage.actions.confirm')}
                          </button>
                          <button
                            onClick={() => setRejectingReservation(reservation)}
                            disabled={updatingId === reservation.id}
                            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium text-sm disabled:opacity-50"
                          >
                            ✕ {t('reservationsPage.actions.reject')}
                          </button>
                        </>
                      )}
                      {reservation.status === 'confirmed' && (
                        <button
                          onClick={() => updateStatus(reservation.id, 'completed')}
                          disabled={updatingId === reservation.id}
                          className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium text-sm disabled:opacity-50"
                        >
                          ✔️ {t('reservationsPage.actions.complete')}
                        </button>
                      )}
                      {(reservation.status === 'completed' || reservation.status === 'cancelled') && (
                        <button
                          onClick={() => deleteReservation(reservation.id)}
                          className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium text-sm"
                        >
                          🗑️ {t('reservationsPage.actions.delete')}
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedReservation(reservation)}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-sm text-gray-700"
                      >
                        📋 {t('reservationsPage.actions.details')}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {reservation.notes && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-600">💬 {reservation.notes}</p>
                  </div>
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Empty state */}
      {reservations.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16 bg-white rounded-2xl shadow-sm"
        >
          <span className="text-6xl mb-4 block">📅</span>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{t('reservationsPage.noReservations')}</h3>
          <p className="text-gray-500">
            {filter === 'upcoming' && t('reservationsPage.noUpcoming')}
            {filter === 'today' && t('reservationsPage.noToday')}
            {filter === 'all' && t('reservationsPage.noAny')}
          </p>
        </motion.div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedReservation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedReservation(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b bg-gray-50 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{t('reservationsPage.detailsTitle')}</h2>
                  <p className="text-gray-500">
                    {formatDate(selectedReservation.reservation_date)} {t('reservationsPage.at')} {formatTime(selectedReservation.reservation_time)}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedReservation(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-blue-600">{selectedReservation.party_size}</p>
                    <p className="text-blue-600 text-sm">{t('reservationsPage.persons')}</p>
                  </div>
                  <div className={`rounded-xl p-4 text-center ${statusConfig[selectedReservation.status]?.bg}`}>
                    <p className={`text-lg font-bold ${statusConfig[selectedReservation.status]?.text}`}>
                      {statusConfig[selectedReservation.status]?.label}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500 mb-1">{t('reservationsPage.customer')}</p>
                  <p className="font-bold text-gray-900 text-lg">{selectedReservation.customer_name}</p>
                  <p className="text-gray-600">📞 {selectedReservation.customer_phone}</p>
                  {selectedReservation.customer_email && (
                    <p className="text-gray-600">✉️ {selectedReservation.customer_email}</p>
                  )}
                </div>

                {selectedReservation.notes && (
                  <div className="bg-blue-50 rounded-xl p-4">
                    <p className="text-sm text-blue-600 mb-1">{t('reservationsPage.notes')}</p>
                    <p className="text-gray-900">{selectedReservation.notes}</p>
                  </div>
                )}

                <div className="text-sm text-gray-500">
                  {t('reservationsPage.createdAt')}: {new Date(selectedReservation.created_at).toLocaleString('nl-BE')}
                </div>
              </div>

              <div className="p-6 border-t bg-gray-50 flex gap-3">
                <button
                  onClick={() => setSelectedReservation(null)}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-100 font-medium"
                >
                  {t('reservationsPage.close')}
                </button>
                <button
                  onClick={() => deleteReservation(selectedReservation.id)}
                  className="px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium"
                >
                  🗑️ {t('reservationsPage.actions.delete')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rejection Modal */}
      <AnimatePresence>
        {rejectingReservation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setRejectingReservation(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b bg-red-50">
                <h2 className="text-xl font-bold text-red-700">{t('reservationsPage.rejection.title')}</h2>
                <p className="text-red-600 text-sm mt-1">
                  {rejectingReservation.customer_name} - {rejectingReservation.reservation_date}
                </p>
              </div>

              <div className="p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('reservationsPage.rejection.reasonLabel')} <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(capitalizeWords(e.target.value))}
                  placeholder={t('reservationsPage.rejection.reasonPlaceholder')}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                />
                <p className="text-gray-500 text-sm mt-2">
                  {t('reservationsPage.rejection.reasonSentToCustomer')}
                </p>
              </div>

              <div className="p-6 border-t bg-gray-50 flex gap-3">
                <button
                  onClick={() => {
                    setRejectingReservation(null)
                    setRejectionReason('')
                  }}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-100 font-medium"
                >
                  {t('reservationsPage.rejection.cancel')}
                </button>
                <button
                  onClick={handleRejectReservation}
                  disabled={!rejectionReason.trim() || updatingId === rejectingReservation.id}
                  className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-xl font-medium"
                >
                  {updatingId === rejectingReservation.id ? t('reservationsPage.rejection.processing') : `✕ ${t('reservationsPage.rejection.confirmReject')}`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
