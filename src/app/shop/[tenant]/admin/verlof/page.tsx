'use client'

import { useLanguage } from '@/i18n'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'

interface Staff {
  id: string
  name: string
  role: string
  email?: string
  phone?: string
}

interface LeaveRequest {
  id: string
  tenant_slug: string
  staff_id: string
  leave_type: string
  start_date: string
  end_date: string
  reason?: string
  notes?: string
  status: 'pending' | 'approved' | 'rejected'
  requested_at: string
  reviewed_at?: string
  staff?: Staff
}

const LEAVE_TYPES = [
  { value: 'vacation', icon: '🏖️', colorClass: 'bg-blue-100 text-blue-700' },
  { value: 'sick', icon: '🤒', colorClass: 'bg-red-100 text-red-700' },
  { value: 'maternity', icon: '🤰', colorClass: 'bg-pink-100 text-pink-700' },
  { value: 'paternity', icon: '👶', colorClass: 'bg-purple-100 text-purple-700' },
  { value: 'unpaid', icon: '💰', colorClass: 'bg-gray-100 text-gray-700' },
  { value: 'bereavement', icon: '🕯️', colorClass: 'bg-gray-200 text-gray-800' },
  { value: 'other', icon: '📋', colorClass: 'bg-blue-100 text-blue-700' },
]

export default function LeaveManagementPage({ params }: { params: { tenant: string } }) {
  const { t } = useLanguage()
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedStaff, setSelectedStaff] = useState<string>('all')
  const [showDetail, setShowDetail] = useState<LeaveRequest | null>(null)
  const [showYearOverview, setShowYearOverview] = useState(false)
  const [showNewRequest, setShowNewRequest] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [newRequest, setNewRequest] = useState({
    staff_id: '',
    leave_type: 'vacation',
    start_date: '',
    end_date: '',
    reason: '',
    status: 'approved' as 'pending' | 'approved',
  })

  useEffect(() => {
    loadData()
  }, [params.tenant, selectedYear])

  async function loadData() {
    setLoading(true)

    // Load staff
    const { data: staffData } = await supabase
      .from('staff')
      .select('*')
      .eq('tenant_slug', params.tenant)
      .order('name')

    if (staffData) {
      setStaff(staffData)
    }

    // Load leave requests for the year
    const startOfYear = `${selectedYear}-01-01`
    const endOfYear = `${selectedYear}-12-31`

    const { data: requestsData } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('tenant_slug', params.tenant)
      .gte('start_date', startOfYear)
      .lte('start_date', endOfYear)
      .order('requested_at', { ascending: false })

    if (requestsData && staffData) {
      // Attach staff info to requests
      const enrichedRequests = requestsData.map(req => ({
        ...req,
        staff: staffData.find(s => s.id === req.staff_id)
      }))
      setRequests(enrichedRequests)
    }

    setLoading(false)
  }

  const getLeaveType = (type: string) => {
    return LEAVE_TYPES.find(lt => lt.value === type) || LEAVE_TYPES[6]
  }

  const calculateDays = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-BE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  // Map leave type to timesheet absence type
  const mapLeaveTypeToAbsence = (leaveType: string): string => {
    const mapping: Record<string, string> = {
      'vacation': 'VACATION',
      'sick': 'SICK',
      'maternity': 'MATERNITY',
      'paternity': 'PATERNITY',
      'unpaid': 'UNPAID',
      'bereavement': 'SHORT_LEAVE',
      'other': 'OTHER',
    }
    return mapping[leaveType] || 'OTHER'
  }

  // Generate array of dates between start and end (inclusive)
  // Pure arithmetic - no Date objects to avoid timezone issues
  const getDateRange = (startDateStr: string, endDateStr: string): string[] => {
    console.log('getDateRange called with:', startDateStr, 'to', endDateStr)
    
    // If same day, just return that day directly
    if (startDateStr === endDateStr) {
      console.log('Single day - returning:', [startDateStr])
      return [startDateStr]
    }
    
    // For multi-day ranges, calculate days between
    const dates: string[] = []
    const [sy, sm, sd] = startDateStr.split('-').map(Number)
    const [ey, em, ed] = endDateStr.split('-').map(Number)
    
    // Simple day counter
    let year = sy
    let month = sm
    let day = sd
    
    const daysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate()
    
    for (let i = 0; i < 366; i++) { // Max 1 year safety
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      dates.push(dateStr)
      
      // Check if we reached end date
      if (year === ey && month === em && day === ed) break
      
      // Move to next day
      day++
      if (day > daysInMonth(year, month)) {
        day = 1
        month++
        if (month > 12) {
          month = 1
          year++
        }
      }
    }
    
    console.log('Multi-day range - returning:', dates)
    return dates
  }

  // Create timesheet entries for approved leave
  const createTimesheetEntries = async (request: LeaveRequest) => {
    console.log('=== createTimesheetEntries ===')
    console.log('Request start_date:', request.start_date)
    console.log('Request end_date:', request.end_date)
    
    const absenceType = mapLeaveTypeToAbsence(request.leave_type)
    const dates = getDateRange(request.start_date, request.end_date)
    
    console.log('Dates to create:', dates)
    
    for (const dateStr of dates) {
      const entryData = {
        tenant_slug: params.tenant,
        staff_id: request.staff_id,
        date: dateStr,
        absence_type: absenceType,
        absence_hours: 8,
        worked_hours: 0,
        notes: `${t(`leave.types.${request.leave_type}`)}${request.reason ? ` - ${request.reason}` : ''}`,
        is_approved: true,
      }
      
      // Check if entry already exists for this date
      const { data: existing } = await supabase
        .from('timesheet_entries')
        .select('id')
        .eq('tenant_slug', params.tenant)
        .eq('staff_id', request.staff_id)
        .eq('date', dateStr)
        .maybeSingle()
      
      if (existing) {
        // Update existing entry
        const { error } = await supabase
          .from('timesheet_entries')
          .update({
            absence_type: absenceType,
            absence_hours: 8,
            notes: entryData.notes,
            is_approved: true,
          })
          .eq('id', existing.id)
        
        if (error) console.error('Error updating entry:', error)
      } else {
        // Insert new entry
        console.log('Inserting entry with date:', entryData.date)
        const { error } = await supabase.from('timesheet_entries').insert(entryData)
        if (error) console.error('Error inserting entry:', error)
        else console.log('Successfully inserted entry for:', entryData.date)
      }
    }
  }

  // Delete timesheet entries for a leave request
  const deleteTimesheetEntries = async (request: LeaveRequest) => {
    const absenceType = mapLeaveTypeToAbsence(request.leave_type)
    const dates = getDateRange(request.start_date, request.end_date)
    
    for (const dateStr of dates) {
      await supabase
        .from('timesheet_entries')
        .delete()
        .eq('tenant_slug', params.tenant)
        .eq('staff_id', request.staff_id)
        .eq('date', dateStr)
        .eq('absence_type', absenceType)
    }
  }

  const handleApprove = async (request: LeaveRequest) => {
    setProcessing(true)
    
    // Update leave request status
    await supabase
      .from('leave_requests')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', request.id)
    
    // Create timesheet entries for the approved leave
    await createTimesheetEntries(request)
    
    await loadData()
    setShowDetail(null)
    setProcessing(false)
  }

  const handleRevoke = async (request: LeaveRequest) => {
    if (!confirm(t('leave.confirmRevoke'))) return
    
    setProcessing(true)
    
    // Delete timesheet entries first
    await deleteTimesheetEntries(request)
    
    // Update leave request status back to pending or delete it
    await supabase
      .from('leave_requests')
      .update({
        status: 'pending',
        reviewed_at: null,
        notes: t('leave.revokedNote'),
      })
      .eq('id', request.id)
    
    await loadData()
    setShowDetail(null)
    setProcessing(false)
  }

  const handleDelete = async (request: LeaveRequest) => {
    if (!confirm(t('leave.confirmDelete'))) return
    
    setProcessing(true)
    
    // If it was approved, delete timesheet entries too
    if (request.status === 'approved') {
      await deleteTimesheetEntries(request)
    }
    
    // Delete the leave request
    await supabase
      .from('leave_requests')
      .delete()
      .eq('id', request.id)
    
    await loadData()
    setShowDetail(null)
    setProcessing(false)
  }

  const handleReject = async (request: LeaveRequest, notes?: string) => {
    setProcessing(true)
    await supabase
      .from('leave_requests')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        notes: notes,
      })
      .eq('id', request.id)
    
    await loadData()
    setShowDetail(null)
    setProcessing(false)
  }

  const handleSubmitNewRequest = async () => {
    if (!newRequest.staff_id || !newRequest.start_date || !newRequest.end_date) {
      alert(t('leave.fillAllFields'))
      return
    }

    setProcessing(true)
    
    // Insert leave request
    await supabase.from('leave_requests').insert({
      tenant_slug: params.tenant,
      staff_id: newRequest.staff_id,
      leave_type: newRequest.leave_type,
      start_date: newRequest.start_date,
      end_date: newRequest.end_date,
      reason: newRequest.reason,
      status: newRequest.status,
      reviewed_at: newRequest.status === 'approved' ? new Date().toISOString() : null,
    })

    // If approved, also create timesheet entries
    if (newRequest.status === 'approved') {
      await createTimesheetEntries({
        id: '',
        tenant_slug: params.tenant,
        staff_id: newRequest.staff_id,
        leave_type: newRequest.leave_type,
        start_date: newRequest.start_date,
        end_date: newRequest.end_date,
        reason: newRequest.reason,
        status: 'approved',
        requested_at: new Date().toISOString(),
      })
    }

    await loadData()
    setShowNewRequest(false)
    setNewRequest({
      staff_id: '',
      leave_type: 'vacation',
      start_date: '',
      end_date: '',
      reason: '',
      status: 'approved',
    })
    setProcessing(false)
  }

  const filteredRequests = requests.filter(req => {
    if (filter !== 'all' && req.status !== filter) return false
    if (selectedStaff !== 'all' && req.staff_id !== selectedStaff) return false
    return true
  })

  const pendingCount = requests.filter(r => r.status === 'pending').length

  // Calculate stats for selected staff or all
  const getStaffStats = (staffId: string) => {
    const staffRequests = requests.filter(r => 
      r.staff_id === staffId && r.status === 'approved'
    )
    
    const stats: Record<string, number> = {}
    LEAVE_TYPES.forEach(lt => {
      const days = staffRequests
        .filter(r => r.leave_type === lt.value)
        .reduce((sum, r) => sum + calculateDays(r.start_date, r.end_date), 0)
      if (days > 0) stats[lt.value] = days
    })
    
    return stats
  }

  // Generate calendar data for year overview
  const generateYearCalendar = () => {
    const months = []
    for (let m = 0; m < 12; m++) {
      const daysInMonth = new Date(selectedYear, m + 1, 0).getDate()
      const days = []
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${selectedYear}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        const leavesOnDay = requests.filter(r => {
          if (selectedStaff !== 'all' && r.staff_id !== selectedStaff) return false
          if (r.status !== 'approved') return false
          return dateStr >= r.start_date && dateStr <= r.end_date
        })
        days.push({ day: d, date: dateStr, leaves: leavesOnDay })
      }
      months.push({ month: m, days })
    }
    return months
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🏖️ {t('leave.title')}</h1>
          <p className="text-gray-600">{t('leave.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-medium">
              {pendingCount} {t('leave.pendingRequests')}
            </div>
          )}
          <button
            onClick={() => setShowYearOverview(!showYearOverview)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              showYearOverview 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📅 {t('leave.yearOverview')}
          </button>
          <button
            onClick={() => setShowNewRequest(true)}
            className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition"
          >
            ➕ {t('leave.newRequest')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border flex flex-wrap gap-4 items-center">
        <div>
          <label className="block text-xs text-gray-500 mb-1">{t('leave.year')}</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-2 border rounded-lg"
          >
            {[...Array(5)].map((_, i) => {
              const year = new Date().getFullYear() - 2 + i
              return <option key={year} value={year}>{year}</option>
            })}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">{t('leave.employee')}</label>
          <select
            value={selectedStaff}
            onChange={(e) => setSelectedStaff(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="all">{t('leave.allEmployees')}</option>
            {staff.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">{t('leave.status')}</label>
          <div className="flex gap-1">
            {(['all', 'pending', 'approved', 'rejected'] as const).map(status => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                  filter === status
                    ? status === 'pending' ? 'bg-blue-600 text-white'
                    : status === 'approved' ? 'bg-green-500 text-white'
                    : status === 'rejected' ? 'bg-red-500 text-white'
                    : 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t(`leave.filter.${status}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Year Overview */}
      <AnimatePresence>
        {showYearOverview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-xl shadow-sm border overflow-hidden"
          >
            <div className="p-4 border-b">
              <h2 className="font-bold text-gray-800">
                📅 {t('leave.yearOverview')} {selectedYear}
                {selectedStaff !== 'all' && ` - ${staff.find(s => s.id === selectedStaff)?.name}`}
              </h2>
            </div>
            <div className="p-4 overflow-x-auto">
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {generateYearCalendar().map(({ month, days }) => (
                  <div key={month} className="min-w-[160px]">
                    <h3 className="font-medium text-gray-700 mb-2 text-center">
                      {new Date(selectedYear, month).toLocaleDateString('nl-BE', { month: 'long' })}
                    </h3>
                    <div className="grid grid-cols-7 gap-0.5 text-xs">
                      {['M', 'D', 'W', 'D', 'V', 'Z', 'Z'].map((d, i) => (
                        <div key={i} className="text-center text-gray-400 font-medium py-1">{d}</div>
                      ))}
                      {/* Empty cells for first day offset */}
                      {[...Array((new Date(selectedYear, month, 1).getDay() + 6) % 7)].map((_, i) => (
                        <div key={`empty-${i}`} />
                      ))}
                      {days.map(({ day, leaves }) => {
                        const hasLeave = leaves.length > 0
                        const leaveType = hasLeave ? getLeaveType(leaves[0].leave_type) : null
                        return (
                          <div
                            key={day}
                            className={`text-center py-1 rounded ${
                              hasLeave 
                                ? leaveType?.colorClass 
                                : 'hover:bg-gray-100'
                            }`}
                            title={hasLeave ? `${leaves[0].staff?.name}: ${t(`leave.types.${leaves[0].leave_type}`)}` : ''}
                          >
                            {day}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="p-4 border-t bg-gray-50 flex flex-wrap gap-3">
              {LEAVE_TYPES.map(lt => (
                <div key={lt.value} className="flex items-center gap-2">
                  <span className={`w-4 h-4 rounded ${lt.colorClass}`}></span>
                  <span className="text-sm text-gray-600">{lt.icon} {t(`leave.types.${lt.value}`)}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats per employee */}
      {selectedStaff !== 'all' && (
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <h3 className="font-bold text-gray-800 mb-3">
            📊 {t('leave.statsFor')} {staff.find(s => s.id === selectedStaff)?.name}
          </h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(getStaffStats(selectedStaff)).map(([type, days]) => {
              const lt = getLeaveType(type)
              return (
                <div key={type} className={`px-4 py-2 rounded-lg ${lt.colorClass}`}>
                  <span className="mr-2">{lt.icon}</span>
                  <span className="font-medium">{days} {t('leave.days')}</span>
                  <span className="text-sm ml-1">({t(`leave.types.${type}`)})</span>
                </div>
              )
            })}
            {Object.keys(getStaffStats(selectedStaff)).length === 0 && (
              <p className="text-gray-500">{t('leave.noLeaveYet')}</p>
            )}
          </div>
        </div>
      )}

      {/* Requests List */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-bold text-gray-800">📋 {t('leave.requests')}</h2>
        </div>

        {filteredRequests.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-5xl mb-4">📭</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">{t('leave.noRequests')}</h3>
            <p className="text-gray-500">{t('leave.noRequestsDesc')}</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredRequests.map((request) => {
              const leaveType = getLeaveType(request.leave_type)
              const days = calculateDays(request.start_date, request.end_date)
              
              return (
                <div
                  key={request.id}
                  onClick={() => setShowDetail(request)}
                  className="p-4 hover:bg-gray-50 cursor-pointer transition"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${leaveType.colorClass}`}>
                      {leaveType.icon}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800">{request.staff?.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${leaveType.colorClass}`}>
                          {t(`leave.types.${request.leave_type}`)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDate(request.start_date)} - {formatDate(request.end_date)}
                        <span className="ml-2 text-gray-400">({days} {t('leave.days')})</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        request.status === 'pending' ? 'bg-blue-100 text-blue-700' :
                        request.status === 'approved' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {request.status === 'pending' ? '⏳' : request.status === 'approved' ? '✓' : '✗'}
                        {' '}{t(`leave.status.${request.status}`)}
                      </span>
                      <div className="text-xs text-gray-400 mt-1">
                        {formatDate(request.requested_at)}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetail && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl w-full max-w-lg shadow-xl"
            >
              <div className="p-6 border-b">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  {getLeaveType(showDetail.leave_type).icon}
                  {t('leave.requestDetails')}
                </h2>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500">{t('leave.employee')}</label>
                    <p className="font-medium text-gray-800">{showDetail.staff?.name}</p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">{t('leave.type')}</label>
                    <p className={`inline-block px-2 py-1 rounded ${getLeaveType(showDetail.leave_type).colorClass}`}>
                      {getLeaveType(showDetail.leave_type).icon} {t(`leave.types.${showDetail.leave_type}`)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">{t('leave.startDate')}</label>
                    <p className="font-medium text-gray-800">{formatDate(showDetail.start_date)}</p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">{t('leave.endDate')}</label>
                    <p className="font-medium text-gray-800">{formatDate(showDetail.end_date)}</p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">{t('leave.totalDays')}</label>
                    <p className="font-medium text-gray-800">
                      {calculateDays(showDetail.start_date, showDetail.end_date)} {t('leave.days')}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">{t('leave.requestedAt')}</label>
                    <p className="font-medium text-gray-800">{formatDate(showDetail.requested_at)}</p>
                  </div>
                </div>

                {showDetail.reason && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('leave.reason')}</label>
                    <p className="bg-gray-50 p-3 rounded-lg text-gray-700">{showDetail.reason}</p>
                  </div>
                )}

                {showDetail.notes && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('leave.notes')}</label>
                    <p className="bg-gray-50 p-3 rounded-lg text-gray-700">{showDetail.notes}</p>
                  </div>
                )}

                <div className={`p-4 rounded-lg ${
                  showDetail.status === 'pending' ? 'bg-blue-50' :
                  showDetail.status === 'approved' ? 'bg-green-50' :
                  'bg-red-50'
                }`}>
                  <span className={`font-medium ${
                    showDetail.status === 'pending' ? 'text-blue-700' :
                    showDetail.status === 'approved' ? 'text-green-700' :
                    'text-red-700'
                  }`}>
                    {t(`leave.statusMessage.${showDetail.status}`)}
                  </span>
                  {showDetail.reviewed_at && (
                    <span className="text-sm text-gray-500 ml-2">
                      ({formatDate(showDetail.reviewed_at)})
                    </span>
                  )}
                </div>
              </div>

              <div className="p-6 border-t flex gap-3 justify-between">
                <button
                  onClick={() => handleDelete(showDetail)}
                  disabled={processing}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition disabled:opacity-50"
                >
                  🗑️ {t('leave.delete')}
                </button>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDetail(null)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                  >
                    {t('adminPages.common.close')}
                  </button>
                  
                  {showDetail.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleReject(showDetail)}
                        disabled={processing}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50"
                      >
                        ✗ {t('leave.reject')}
                      </button>
                      <button
                        onClick={() => handleApprove(showDetail)}
                        disabled={processing}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50"
                      >
                        ✓ {t('leave.approve')}
                      </button>
                    </>
                  )}
                  
                  {showDetail.status === 'approved' && (
                    <button
                      onClick={() => handleRevoke(showDetail)}
                      disabled={processing}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      ↩️ {t('leave.revoke')}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New Request Modal */}
      <AnimatePresence>
        {showNewRequest && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl w-full max-w-lg shadow-xl"
            >
              <div className="p-6 border-b">
                <h2 className="text-xl font-bold text-gray-800">
                  ➕ {t('leave.newRequest')}
                </h2>
                <p className="text-gray-500 text-sm mt-1">{t('leave.registerLeave')}</p>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('leave.employee')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newRequest.staff_id}
                    onChange={(e) => setNewRequest({ ...newRequest, staff_id: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{t('leave.selectEmployee')}</option>
                    {staff.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('leave.type')} <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {LEAVE_TYPES.map(lt => (
                      <button
                        key={lt.value}
                        type="button"
                        onClick={() => setNewRequest({ ...newRequest, leave_type: lt.value })}
                        className={`p-3 rounded-lg border-2 transition text-left ${
                          newRequest.leave_type === lt.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="text-xl mr-2">{lt.icon}</span>
                        <span className="text-sm font-medium">{t(`leave.types.${lt.value}`)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('leave.startDate')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={newRequest.start_date}
                      onChange={(e) => setNewRequest({ ...newRequest, start_date: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('leave.endDate')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={newRequest.end_date}
                      onChange={(e) => setNewRequest({ ...newRequest, end_date: e.target.value })}
                      min={newRequest.start_date}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('leave.reason')}
                  </label>
                  <textarea
                    value={newRequest.reason}
                    onChange={(e) => setNewRequest({ ...newRequest, reason: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder={t('leave.reasonPlaceholder')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('leave.initialStatus')}
                  </label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setNewRequest({ ...newRequest, status: 'approved' })}
                      className={`flex-1 py-2 px-4 rounded-lg border-2 transition ${
                        newRequest.status === 'approved'
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 text-gray-600'
                      }`}
                    >
                      ✓ {t('leave.status.approved')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewRequest({ ...newRequest, status: 'pending' })}
                      className={`flex-1 py-2 px-4 rounded-lg border-2 transition ${
                        newRequest.status === 'pending'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-600'
                      }`}
                    >
                      ⏳ {t('leave.status.pending')}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{t('leave.statusHint')}</p>
                </div>
              </div>

              <div className="p-6 border-t flex gap-3 justify-end">
                <button
                  onClick={() => setShowNewRequest(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  {t('adminPages.common.cancel')}
                </button>
                <button
                  onClick={handleSubmitNewRequest}
                  disabled={processing || !newRequest.staff_id || !newRequest.start_date || !newRequest.end_date}
                  className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50"
                >
                  {processing ? '...' : `➕ ${t('leave.add')}`}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
