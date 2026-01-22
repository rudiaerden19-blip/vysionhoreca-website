'use client'

import { useLanguage } from '@/i18n'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { 
  getActiveStaff,
  getTimesheetEntries,
  saveTimesheetEntry,
  deleteTimesheetEntry,
  approveTimesheetEntries,
  generateMonthlyTimesheet,
  closeMonthlyTimesheet,
  reopenMonthlyTimesheet,
  getMonthlyTimesheet,
  markTimesheetExported,
  Staff,
  TimesheetEntry,
  MonthlyTimesheet,
  AbsenceType,
} from '@/lib/admin-api'

const getMonths = (t: (key: string) => string) => [
  t('urenPage.months.january'), t('urenPage.months.february'), t('urenPage.months.march'),
  t('urenPage.months.april'), t('urenPage.months.may'), t('urenPage.months.june'),
  t('urenPage.months.july'), t('urenPage.months.august'), t('urenPage.months.september'),
  t('urenPage.months.october'), t('urenPage.months.november'), t('urenPage.months.december')
]

const getDays = (t: (key: string) => string) => [
  t('urenPage.days.mon'), t('urenPage.days.tue'), t('urenPage.days.wed'),
  t('urenPage.days.thu'), t('urenPage.days.fri'), t('urenPage.days.sat'), t('urenPage.days.sun')
]

const getAbsenceTypes = (t: (key: string) => string): { id: AbsenceType; label: string; color: string; icon: string }[] => [
  { id: 'WORKED', label: t('urenPage.absenceTypes.worked'), color: '#22c55e', icon: '✅' },
  { id: 'SICK', label: t('urenPage.absenceTypes.sick'), color: '#ef4444', icon: '🤒' },
  { id: 'VACATION', label: t('urenPage.absenceTypes.vacation'), color: '#3b82f6', icon: '🏖️' },
  { id: 'SHORT_LEAVE', label: t('urenPage.absenceTypes.shortLeave'), color: '#f97316', icon: '⏰' },
  { id: 'AUTHORIZED', label: t('urenPage.absenceTypes.authorized'), color: '#8b5cf6', icon: '📋' },
  { id: 'HOLIDAY', label: t('urenPage.absenceTypes.holiday'), color: '#06b6d4', icon: '🎉' },
  { id: 'MATERNITY', label: t('urenPage.absenceTypes.maternity'), color: '#ec4899', icon: '👶' },
  { id: 'PATERNITY', label: t('urenPage.absenceTypes.paternity'), color: '#0ea5e9', icon: '👨‍👧' },
  { id: 'UNPAID', label: t('urenPage.absenceTypes.unpaid'), color: '#6b7280', icon: '💤' },
  { id: 'TRAINING', label: t('urenPage.absenceTypes.training'), color: '#84cc16', icon: '📚' },
  { id: 'OTHER', label: t('urenPage.absenceTypes.other'), color: '#a3a3a3', icon: '📝' },
]

// Format time to HH:MM (remove seconds)
const formatTime = (time: string | undefined | null): string => {
  if (!time) return '-'
  // If time has seconds (HH:MM:SS), take only HH:MM
  return time.length > 5 ? time.slice(0, 5) : time
}

// Format hours as HH,MM (e.g., 7.3 becomes "7,30", 7.45 stays "7,45")
const formatHours = (hours: number | undefined | null): string => {
  if (!hours && hours !== 0) return '0,00'
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 100) // Get the decimal part as minutes
  return `${h},${m.toString().padStart(2, '0')}`
}

export default function UrenPage() {
  const { t } = useLanguage()
  const params = useParams()
  const tenant = params.tenant as string
  
  const MONTHS = getMonths(t)
  const DAYS = getDays(t)
  const LOCAL_ABSENCE_TYPES = getAbsenceTypes(t)
  
  const [staff, setStaff] = useState<Staff[]>([])
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)
  const [entries, setEntries] = useState<TimesheetEntry[]>([])
  const [monthlyTimesheet, setMonthlyTimesheet] = useState<MonthlyTimesheet | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  
  const [showEntryModal, setShowEntryModal] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [showReopenModal, setShowReopenModal] = useState(false)
  const [reopenReason, setReopenReason] = useState('')
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [entryForm, setEntryForm] = useState<Partial<TimesheetEntry>>({
    absence_type: 'WORKED',
    clock_in: '',
    clock_out: '',
    break_minutes: undefined,
    worked_hours: 0,
    absence_hours: 8,
    notes: '',
  })
  const [emailForm, setEmailForm] = useState({
    to: '',
    subject: '',
    message: '',
  })
  const [sendingEmail, setSendingEmail] = useState(false)
  
  const printRef = useRef<HTMLDivElement>(null)
  const pdfRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadStaff()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant])

  useEffect(() => {
    if (selectedStaff) {
      loadData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStaff, selectedYear, selectedMonth])

  async function loadStaff() {
    setLoading(true)
    const data = await getActiveStaff(tenant)
    setStaff(data)
    if (data.length > 0) {
      setSelectedStaff(data[0])
    }
    setLoading(false)
  }

  async function loadData() {
    if (!selectedStaff?.id) return
    
    setLoading(true)
    const [entriesData, timesheetData] = await Promise.all([
      getTimesheetEntries(tenant, selectedStaff.id, selectedYear, selectedMonth),
      getMonthlyTimesheet(tenant, selectedStaff.id, selectedYear, selectedMonth)
    ])
    setEntries(entriesData)
    setMonthlyTimesheet(timesheetData)
    setLoading(false)
  }

  function getCalendarDays(): { date: Date; inMonth: boolean }[] {
    const firstDay = new Date(selectedYear, selectedMonth - 1, 1)
    const lastDay = new Date(selectedYear, selectedMonth, 0)
    const days: { date: Date; inMonth: boolean }[] = []
    
    // Days from previous month
    const firstDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(firstDay)
      date.setDate(date.getDate() - i - 1)
      days.push({ date, inMonth: false })
    }
    
    // Days in current month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push({ date: new Date(selectedYear, selectedMonth - 1, d), inMonth: true })
    }
    
    // Days from next month
    const remaining = 42 - days.length // 6 rows * 7 days
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(selectedYear, selectedMonth, i), inMonth: false })
    }
    
    return days
  }

  // Helper to format date as YYYY-MM-DD without timezone issues
  function formatLocalDate(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  function getEntryForDate(date: Date): TimesheetEntry | undefined {
    const dateStr = formatLocalDate(date)
    return entries.find(e => e.date === dateStr)
  }

  // Get ALL entries for a date (multiple types possible)
  function getEntriesForDate(date: Date): TimesheetEntry[] {
    const dateStr = formatLocalDate(date)
    return entries.filter(e => e.date === dateStr)
  }

  const [editingEntry, setEditingEntry] = useState<TimesheetEntry | null>(null)

  function openEntryModal(date: Date, existingEntry?: TimesheetEntry) {
    const dateStr = formatLocalDate(date)
    setSelectedDate(dateStr)
    setEditingEntry(existingEntry || null)
    
    if (existingEntry) {
      // Bewerk bestaande entry
      setEntryForm({
        absence_type: existingEntry.absence_type,
        clock_in: existingEntry.clock_in || '',
        clock_out: existingEntry.clock_out || '',
        break_minutes: existingEntry.break_minutes ?? undefined,
        worked_hours: existingEntry.worked_hours || 0,
        absence_hours: existingEntry.absence_hours || 8,
        notes: existingEntry.notes || '',
      })
    } else {
      // Nieuwe entry toevoegen
      setEntryForm({
        absence_type: 'WORKED',
        clock_in: '09:00',
        clock_out: '17:00',
        break_minutes: undefined,
        worked_hours: 8,
        absence_hours: 8,
        notes: '',
      })
    }
    
    setShowEntryModal(true)
  }

  async function handleSaveEntry() {
    if (!selectedStaff?.id || !selectedDate) return
    
    setSaving(true)
    
    const entry: TimesheetEntry = {
      id: editingEntry?.id,  // Behoud ID als we bewerken
      tenant_slug: tenant,
      staff_id: selectedStaff.id,
      date: selectedDate,
      absence_type: entryForm.absence_type as AbsenceType,
      clock_in: entryForm.absence_type === 'WORKED' ? entryForm.clock_in : undefined,
      clock_out: entryForm.absence_type === 'WORKED' ? entryForm.clock_out : undefined,
      break_minutes: entryForm.absence_type === 'WORKED' ? entryForm.break_minutes || 0 : 0,
      worked_hours: entryForm.worked_hours || 0,
      absence_hours: entryForm.absence_type !== 'WORKED' ? entryForm.absence_hours : undefined,
      notes: entryForm.notes,
      is_approved: editingEntry?.is_approved || false,
    }
    
    const result = await saveTimesheetEntry(entry)
    setSaving(false)
    
    if (result) {
      setShowEntryModal(false)
      setEditingEntry(null)
      loadData()
    } else {
      alert(t('adminPages.common.saveFailed'))
    }
  }

  async function handleDeleteEntry(entry: TimesheetEntry) {
    if (!entry.id) return
    if (!confirm(t('urenPage.confirmDeleteHours'))) return
    
    const success = await deleteTimesheetEntry(entry.id)
    if (success) {
      loadData()
    }
  }

  async function handleApproveAll() {
    if (!selectedStaff?.id) return
    if (!confirm(t('urenPage.confirmApproveAll'))) return
    
    const success = await approveTimesheetEntries(tenant, selectedStaff.id, selectedYear, selectedMonth, selectedStaff.id)
    if (success) {
      loadData()
    }
  }

  async function handleCloseMonth() {
    if (!selectedStaff?.id) return
    if (!confirm(t('urenPage.confirmCloseMonth'))) return
    
    const success = await closeMonthlyTimesheet(tenant, selectedStaff.id, selectedYear, selectedMonth, selectedStaff.id)
    if (success) {
      loadData()
    }
  }

  async function handleReopenMonth() {
    if (!selectedStaff?.id || !reopenReason.trim()) {
      alert(t('urenPage.reopenReasonRequired'))
      return
    }
    
    setSaving(true)
    const success = await reopenMonthlyTimesheet(
      tenant, 
      selectedStaff.id, 
      selectedYear, 
      selectedMonth, 
      selectedStaff.id,
      reopenReason.trim()
    )
    setSaving(false)
    
    if (success) {
      setShowReopenModal(false)
      setReopenReason('')
      loadData()
    } else {
      alert(t('urenPage.reopenFailed'))
    }
  }

  async function handleGenerateSummary() {
    if (!selectedStaff?.id) return
    
    const result = await generateMonthlyTimesheet(tenant, selectedStaff.id, selectedYear, selectedMonth)
    if (result) {
      setMonthlyTimesheet(result)
    }
  }

  // Calculate worked hours from clock in/out
  // Returns hours in HH.MM format (e.g., 7.45 = 7 hours 45 minutes)
  function calculateWorkedHours(clockIn?: string, clockOut?: string, breakMin?: number) {
    const inTime = clockIn || entryForm.clock_in
    const outTime = clockOut || entryForm.clock_out
    const breakMinutes = breakMin !== undefined ? breakMin : (entryForm.break_minutes || 0)
    
    if (inTime && outTime) {
      const [inH, inM] = inTime.split(':').map(Number)
      const [outH, outM] = outTime.split(':').map(Number)
      const totalMinutes = (outH * 60 + outM) - (inH * 60 + inM) - breakMinutes
      
      // Convert to HH.MM format (7 hours 30 min = 7.30, not 7.3 or 7.5)
      const hours = Math.floor(Math.max(0, totalMinutes) / 60)
      const minutes = Math.max(0, totalMinutes) % 60
      // Store as decimal for easy math, but format with padded minutes
      const hoursFormatted = parseFloat(`${hours}.${minutes.toString().padStart(2, '0')}`)
      
      setEntryForm(prev => ({ ...prev, worked_hours: hoursFormatted }))
    }
  }

  // Export to CSV
  function exportToCSV() {
    if (!selectedStaff || entries.length === 0) return
    
    // Calculate km totals for CSV
    const csvWorkedDays = entries.filter(e => e.absence_type === 'WORKED').length
    const csvCommuteKm = csvWorkedDays * (selectedStaff.commute_distance_km || 0) * 2
    const csvKmAllowance = csvCommuteKm * (selectedStaff.km_rate || 0.4297)
    
    const headers = ['Datum', 'Inkloktijd', 'Uitkloktijd', 'Pauze (min)', 'Gewerkte uren', 'Type', 'Notities']
    const rows = entries.map(e => [
      e.date,
      formatTime(e.clock_in) === '-' ? '' : formatTime(e.clock_in),
      formatTime(e.clock_out) === '-' ? '' : formatTime(e.clock_out),
      e.break_minutes || 0,
      e.worked_hours || e.absence_hours || 0,
      LOCAL_ABSENCE_TYPES.find(at => at.id === e.absence_type)?.label || e.absence_type,
      e.notes || ''
    ])
    
    // Add summary rows
    const summaryRows = [
      ['', '', '', '', '', '', ''],
      ['SAMENVATTING', '', '', '', '', '', ''],
      ['Gewerkte dagen', csvWorkedDays, '', '', '', '', ''],
      ['Totaal gewerkte uren', entries.filter(e => e.absence_type === 'WORKED').reduce((sum, e) => sum + (e.worked_hours || 0), 0).toFixed(1), '', '', '', '', ''],
    ]
    
    // Add km info if applicable
    if (selectedStaff.commute_distance_km && selectedStaff.commute_distance_km > 0) {
      summaryRows.push(['Woon-werk afstand (enkele reis)', `${selectedStaff.commute_distance_km} km`, '', '', '', '', ''])
      summaryRows.push(['Totaal km (heen+terug)', `${csvCommuteKm.toFixed(1)} km`, '', '', '', '', ''])
      summaryRows.push(['Km-vergoeding', `€${csvKmAllowance.toFixed(2)}`, '', '', '', '', ''])
    }
    
    // Add meal vouchers if applicable
    if (selectedStaff.has_meal_vouchers) {
      summaryRows.push(['Maaltijdcheques', csvWorkedDays, '', '', '', '', ''])
    }
    
    const csvContent = [headers, ...rows, ...summaryRows].map(row => row.join(';')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `uren_${selectedStaff.name.replace(/\s/g, '_')}_${selectedYear}-${String(selectedMonth).padStart(2, '0')}.csv`
    link.click()
    URL.revokeObjectURL(url)
    
    // Mark as exported
    if (selectedStaff.id) {
      markTimesheetExported(tenant, selectedStaff.id, selectedYear, selectedMonth)
    }
  }

  // Export to PDF (print)
  function exportToPrint() {
    window.print()
  }

  // Export to PDF (download)
  async function exportToPDF() {
    if (!selectedStaff || !pdfRef.current) return
    
    // Dynamically import html2pdf (client-side only)
    const html2pdf = (await import('html2pdf.js')).default
    
    const element = pdfRef.current
    const fileName = `Urenregistratie_${selectedStaff.name.replace(/\s/g, '_')}_${selectedYear}-${String(selectedMonth).padStart(2, '0')}.pdf`
    
    const opt = {
      margin: [10, 15, 10, 15],
      filename: fileName,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 1.5, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }
    
    html2pdf().set(opt).from(element).save()
  }

  // Open email modal
  function openEmailModal() {
    if (!selectedStaff) return
    
    // Calculate km for email
    const emailWorkedDays = entries.filter(e => e.absence_type === 'WORKED').length
    const emailCommuteKm = emailWorkedDays * (selectedStaff.commute_distance_km || 0) * 2
    const emailKmAllowance = emailCommuteKm * (selectedStaff.km_rate || 0.4297)
    
    let kmInfo = ''
    if (selectedStaff.commute_distance_km && selectedStaff.commute_distance_km > 0) {
      kmInfo = `
- Gewerkte dagen: ${emailWorkedDays}
- Woon-werk km: ${emailCommuteKm.toFixed(1)} km
- Km-vergoeding: €${emailKmAllowance.toFixed(2)}`
    }
    
    let mealInfo = ''
    if (selectedStaff.has_meal_vouchers) {
      mealInfo = `
- Maaltijdcheques: ${emailWorkedDays}`
    }
    
    setEmailForm({
      to: '',
      subject: `Urenregistratie ${selectedStaff.name} - ${MONTHS[selectedMonth - 1]} ${selectedYear}`,
      message: `Beste,

Hierbij stuur ik u de urenregistratie van ${selectedStaff.name} voor de maand ${MONTHS[selectedMonth - 1]} ${selectedYear}.

Samenvatting:
- Gewerkte uren: ${totalWorked.toFixed(1)}
- Ziekte-uren: ${totalSick.toFixed(1)}
- Vakantie-uren: ${totalVacation.toFixed(1)}
- Totaal: ${totalHours.toFixed(1)} uren${kmInfo}${mealInfo}

Met vriendelijke groeten`,
    })
    setShowEmailModal(true)
  }

  // Send email to payroll
  async function sendToPayroll() {
    if (!emailForm.to || !selectedStaff) {
      alert('Vul het e-mailadres in')
      return
    }
    
    setSendingEmail(true)
    
    try {
      // Generate CSV data
      const headers = ['Datum', 'Inkloktijd', 'Uitkloktijd', 'Pauze (min)', 'Gewerkte uren', 'Type', 'Notities']
      const rows = entries.map(e => [
        e.date,
        formatTime(e.clock_in) === '-' ? '' : formatTime(e.clock_in),
        formatTime(e.clock_out) === '-' ? '' : formatTime(e.clock_out),
        e.break_minutes || 0,
        e.worked_hours || e.absence_hours || 0,
        LOCAL_ABSENCE_TYPES.find(at => at.id === e.absence_type)?.label || e.absence_type,
        e.notes || ''
      ])
      const csvContent = [headers, ...rows].map(row => row.join(';')).join('\n')
      
      // Send via API
      const response = await fetch('/api/send-timesheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailForm.to,
          subject: emailForm.subject,
          message: emailForm.message,
          csvData: csvContent,
          fileName: `uren_${selectedStaff.name.replace(/\s/g, '_')}_${selectedYear}-${String(selectedMonth).padStart(2, '0')}.csv`,
          staffName: selectedStaff.name,
          month: MONTHS[selectedMonth - 1],
          year: selectedYear,
        }),
      })
      
      if (response.ok) {
        alert(t('urenPage.print.emailSent'))
        setShowEmailModal(false)
        
        // Mark as exported
        if (selectedStaff.id) {
          markTimesheetExported(tenant, selectedStaff.id, selectedYear, selectedMonth)
        }
      } else {
        throw new Error(t('urenPage.print.sendFailed'))
      }
    } catch (error) {
      console.error('Email error:', error)
      alert(t('urenPage.print.sendError'))
    }
    
    setSendingEmail(false)
  }

  // Calculate totals
  const totalWorked = entries.filter(e => e.absence_type === 'WORKED').reduce((sum, e) => sum + (e.worked_hours || 0), 0)
  const totalSick = entries.filter(e => e.absence_type === 'SICK').reduce((sum, e) => sum + (e.absence_hours || 0), 0)
  const totalVacation = entries.filter(e => e.absence_type === 'VACATION').reduce((sum, e) => sum + (e.absence_hours || 0), 0)
  const totalOther = entries.filter(e => !['WORKED', 'SICK', 'VACATION'].includes(e.absence_type)).reduce((sum, e) => sum + (e.absence_hours || e.worked_hours || 0), 0)
  const totalHours = totalWorked + totalSick + totalVacation + totalOther
  const approvedCount = entries.filter(e => e.is_approved).length
  
  // Kilometers berekening: aantal gewerkte dagen * woon-werk afstand * 2 (heen en terug)
  const workedDaysCount = entries.filter(e => e.absence_type === 'WORKED').length
  const commuteDistanceKm = selectedStaff?.commute_distance_km || 0
  const totalCommuteKm = workedDaysCount * commuteDistanceKm * 2
  const kmRate = selectedStaff?.km_rate || 0.4297
  const totalCommuteAllowance = totalCommuteKm * kmRate
  const hasMealVouchers = selectedStaff?.has_meal_vouchers || false

  if (loading && staff.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  if (staff.length === 0) {
    return (
      <div className="bg-white rounded-xl p-12 text-center shadow-sm border">
        <div className="text-5xl mb-4">👥</div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">{t('urenPage.noStaff')}</h2>
        <p className="text-gray-600 mb-6">{t('urenPage.noStaffDesc')}</p>
        <a
          href={`/shop/${tenant}/admin/personeel`}
          className="inline-block px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
        >
          {t('urenPage.goToStaff')}
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">📅 {t('urenPage.title')}</h1>
          <p className="text-gray-600">{t('urenPage.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToCSV}
            className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition"
          >
            📥 CSV
          </button>
          <button
            onClick={exportToPDF}
            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
          >
            📄 PDF
          </button>
          <button
            onClick={exportToPrint}
            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
          >
            🖨️ Print
          </button>
          <button
            onClick={openEmailModal}
            className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition"
          >
            📧 Email
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border flex flex-wrap gap-4 items-center print:hidden">
        <div>
          <label className="block text-xs text-gray-500 mb-1">{t('urenPage.employee')}</label>
          <select
            value={selectedStaff?.id || ''}
            onChange={(e) => setSelectedStaff(staff.find(s => s.id === e.target.value) || null)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            {staff.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-xs text-gray-500 mb-1">{t('urenPage.month')}</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            {MONTHS.map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-xs text-gray-500 mb-1">{t('urenPage.year')}</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div className="flex-1" />

        <button
          onClick={handleApproveAll}
          disabled={monthlyTimesheet?.is_closed}
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50"
        >
          ✓ {t('urenPage.approveAll')}
        </button>
        {monthlyTimesheet?.is_closed ? (
          <button
            onClick={() => setShowReopenModal(true)}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
          >
            🔓 {t('urenPage.reopenMonth')}
          </button>
        ) : (
          <button
            onClick={handleCloseMonth}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition"
          >
            🔒 {t('urenPage.closeMonth')}
          </button>
        )}
      </div>

      {/* Print Header */}
      <div className="hidden print:block print-report">
        <div className="border-b-2 border-gray-800 pb-4 mb-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('urenPage.print.title')}</h1>
              <p className="text-lg text-gray-700 mt-1">{MONTHS[selectedMonth - 1]} {selectedYear}</p>
            </div>
            <div className="text-right text-sm text-gray-600">
              <div className="font-bold text-gray-800">Vysion Horeca</div>
              <div>{t('urenPage.print.generated')}: {new Date().toLocaleDateString()}</div>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-100 p-4 rounded mb-4">
          <h2 className="font-bold text-lg mb-2">👤 {t('urenPage.print.employeeDetails')}</h2>
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="py-1 font-medium w-40">{t('urenPage.print.name')}:</td>
                <td>{selectedStaff?.name}</td>
                <td className="font-medium w-40">{t('urenPage.print.contract')}:</td>
                <td>{selectedStaff?.contract_type || '-'}</td>
              </tr>
              <tr>
                <td className="py-1 font-medium">{t('urenPage.print.email')}:</td>
                <td>{selectedStaff?.email || '-'}</td>
                <td className="font-medium">{t('urenPage.print.hoursWeek')}:</td>
                <td>{selectedStaff?.hours_per_week || '-'}</td>
              </tr>
              <tr>
                <td className="py-1 font-medium">{t('urenPage.print.phone')}:</td>
                <td>{selectedStaff?.phone || '-'}</td>
                <td className="font-medium">{t('urenPage.print.hourlyRate')}:</td>
                <td>{selectedStaff?.hourly_rate ? `€${selectedStaff.hourly_rate}` : '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-5 gap-2 mb-4">
          <div className="bg-green-100 p-3 rounded text-center">
            <div className="text-xl font-bold text-green-700">{totalWorked.toFixed(1)}</div>
            <div className="text-xs text-green-600">{t('urenPage.worked')}</div>
          </div>
          <div className="bg-red-100 p-3 rounded text-center">
            <div className="text-xl font-bold text-red-700">{totalSick.toFixed(1)}</div>
            <div className="text-xs text-red-600">{t('urenPage.sick')}</div>
          </div>
          <div className="bg-blue-100 p-3 rounded text-center">
            <div className="text-xl font-bold text-blue-700">{totalVacation.toFixed(1)}</div>
            <div className="text-xs text-blue-600">{t('urenPage.vacation')}</div>
          </div>
          <div className="bg-orange-100 p-3 rounded text-center">
            <div className="text-xl font-bold text-orange-700">{totalOther.toFixed(1)}</div>
            <div className="text-xs text-orange-600">{t('urenPage.other')}</div>
          </div>
          <div className="bg-gray-200 p-3 rounded text-center">
            <div className="text-xl font-bold text-gray-800">{totalHours.toFixed(1)}</div>
            <div className="text-xs text-gray-600">{t('urenPage.print.total')}</div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border print:border-black">
          <div className="text-2xl font-bold text-green-600">{totalWorked.toFixed(1)}u</div>
          <div className="text-gray-600 text-sm">{t('urenPage.worked')}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border print:border-black">
          <div className="text-2xl font-bold text-red-600">{totalSick.toFixed(1)}u</div>
          <div className="text-gray-600 text-sm">{t('urenPage.sick')}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border print:border-black">
          <div className="text-2xl font-bold text-blue-600">{totalVacation.toFixed(1)}u</div>
          <div className="text-gray-600 text-sm">{t('urenPage.vacation')}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border print:border-black">
          <div className="text-2xl font-bold text-orange-600">{totalOther.toFixed(1)}u</div>
          <div className="text-gray-600 text-sm">{t('urenPage.other')}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border print:border-black">
          <div className="text-2xl font-bold text-gray-800">{totalHours.toFixed(1)}u</div>
          <div className="text-gray-600 text-sm">{t('urenPage.total')}</div>
          {selectedStaff?.hours_per_week && (
            <div className="text-xs text-gray-500 mt-1">
              {t('urenPage.print.contract')}: {(selectedStaff.hours_per_week * 4.33).toFixed(1)} {t('urenPage.print.hoursPerMonth')}
            </div>
          )}
        </div>
      </div>

      {/* Kilometers & Maaltijdcheques */}
      {(commuteDistanceKm > 0 || hasMealVouchers) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {commuteDistanceKm > 0 && (
            <>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-purple-200 print:border-black">
                <div className="text-2xl font-bold text-purple-600">{workedDaysCount}</div>
                <div className="text-gray-600 text-sm">{t('urenPage.workedDays')}</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-purple-200 print:border-black">
                <div className="text-2xl font-bold text-purple-600">{totalCommuteKm.toFixed(1)} km</div>
                <div className="text-gray-600 text-sm">{t('urenPage.commuteKm')}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {workedDaysCount} {t('urenPage.days')} × {commuteDistanceKm} km × 2
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-green-200 print:border-black">
                <div className="text-2xl font-bold text-green-600">€{totalCommuteAllowance.toFixed(2)}</div>
                <div className="text-gray-600 text-sm">{t('urenPage.commuteAllowance')}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {totalCommuteKm.toFixed(1)} km × €{kmRate.toFixed(4)}
                </div>
              </div>
            </>
          )}
          {hasMealVouchers && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-orange-200 print:border-black">
              <div className="text-2xl font-bold text-orange-600">🍽️ {workedDaysCount}</div>
              <div className="text-gray-600 text-sm">{t('urenPage.mealVouchers')}</div>
              <div className="text-xs text-gray-500 mt-1">
                {t('urenPage.mealVouchersCount')}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status badges */}
      {monthlyTimesheet?.is_closed && (
        <div className="bg-purple-100 border border-purple-300 rounded-lg p-3 flex items-center justify-between">
          <span className="text-purple-700">
            🔒 {t('urenPage.print.monthClosed')} {new Date(monthlyTimesheet.closed_at!).toLocaleDateString()}
          </span>
          <button
            onClick={() => setShowReopenModal(true)}
            className="px-3 py-1 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 transition"
          >
            🔓 {t('urenPage.print.reopen')}
          </button>
        </div>
      )}

      {/* Calendar */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden print:border-black" ref={printRef}>
        {/* Calendar Header */}
        <div className="grid grid-cols-7 bg-gray-50 border-b print:bg-gray-100">
          {DAYS.map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-600">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {getCalendarDays().map(({ date, inMonth }, idx) => {
            const dayEntries = getEntriesForDate(date)
            const isToday = date.toDateString() === new Date().toDateString()
            const isWeekend = date.getDay() === 0 || date.getDay() === 6
            
            return (
              <div
                key={idx}
                onClick={() => inMonth && !monthlyTimesheet?.is_closed && openEntryModal(date)}
                className={`min-h-[80px] md:min-h-[100px] p-2 border-b border-r relative ${
                  !inMonth ? 'bg-gray-50 text-gray-300' :
                  isWeekend ? 'bg-gray-50' :
                  ''
                } ${inMonth && !monthlyTimesheet?.is_closed ? 'cursor-pointer hover:bg-orange-50' : ''} print:min-h-[60px]`}
              >
                <div className={`text-sm font-medium mb-1 ${
                  isToday ? 'bg-orange-500 text-white w-7 h-7 rounded-full flex items-center justify-center' : ''
                }`}>
                  {date.getDate()}
                </div>
                
                {/* Toon ALLE entries voor deze dag */}
                {inMonth && dayEntries.map((entry, i) => {
                  const absenceType = LOCAL_ABSENCE_TYPES.find(at => at.id === entry.absence_type)
                  return (
                    <div
                      key={entry.id || i}
                      className="text-xs rounded px-1.5 py-0.5 truncate print:text-[10px] mb-0.5"
                      style={{ 
                        backgroundColor: absenceType?.color + '20',
                        color: absenceType?.color
                      }}
                    >
                      {absenceType?.icon} {entry.absence_type === 'WORKED' ? `${formatHours(entry.worked_hours)}u` : `${entry.absence_hours || 8}u ${absenceType?.label}`}
                      {entry.is_approved && <span className="ml-1">✓</span>}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Entries List (for print) */}
      <div className="hidden print:block">
        <h3 className="font-bold text-lg mt-6 mb-3 border-b pb-2">📋 {t('urenPage.print.detailedOverview')}</h3>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-800 text-white">
              <th className="border border-gray-600 p-2 text-left">{t('urenPage.print.date')}</th>
              <th className="border border-gray-600 p-2 text-left">{t('urenPage.print.day')}</th>
              <th className="border border-gray-600 p-2 text-left">{t('urenPage.print.type')}</th>
              <th className="border border-gray-600 p-2 text-center">{t('urenPage.print.in')}</th>
              <th className="border border-gray-600 p-2 text-center">{t('urenPage.print.out')}</th>
              <th className="border border-gray-600 p-2 text-center">{t('urenPage.print.break')}</th>
              <th className="border border-gray-600 p-2 text-center">{t('urenPage.print.hours')}</th>
              <th className="border border-gray-600 p-2 text-left">{t('urenPage.print.notes')}</th>
              <th className="border border-gray-600 p-2 text-center">✓</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => {
              const date = new Date(e.date)
              const dayName = date.toLocaleDateString(undefined, { weekday: 'short' })
              const absenceType = LOCAL_ABSENCE_TYPES.find(at => at.id === e.absence_type)
              return (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border border-gray-300 p-2">{date.toLocaleDateString()}</td>
                  <td className="border border-gray-300 p-2">{dayName}</td>
                  <td className="border border-gray-300 p-2">
                    <span style={{ color: absenceType?.color }}>{absenceType?.icon}</span> {absenceType?.label}
                  </td>
                  <td className="border border-gray-300 p-2 text-center font-mono">{formatTime(e.clock_in)}</td>
                  <td className="border border-gray-300 p-2 text-center font-mono">{formatTime(e.clock_out)}</td>
                  <td className="border border-gray-300 p-2 text-center">{e.break_minutes || 0}m</td>
                  <td className="border border-gray-300 p-2 text-center font-bold">{formatHours(e.worked_hours || e.absence_hours || 0)}</td>
                  <td className="border border-gray-300 p-2 text-gray-600 text-xs">{e.notes || '-'}</td>
                  <td className="border border-gray-300 p-2 text-center">{e.is_approved ? '✓' : ''}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-200 font-bold">
              <td colSpan={6} className="border border-gray-400 p-2 text-right">{t('urenPage.print.total')}:</td>
              <td className="border border-gray-400 p-2 text-center">{totalHours.toFixed(1)}</td>
              <td colSpan={2} className="border border-gray-400 p-2"></td>
            </tr>
          </tfoot>
        </table>

        {/* Breakdown per type */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-bold mb-2">📊 {t('urenPage.print.breakdownByType')}</h4>
            <table className="w-full text-sm border-collapse">
              <tbody>
                {LOCAL_ABSENCE_TYPES.map(type => {
                  const hours = entries
                    .filter(e => e.absence_type === type.id)
                    .reduce((sum, e) => sum + (e.worked_hours || e.absence_hours || 0), 0)
                  if (hours === 0) return null
                  return (
                    <tr key={type.id}>
                      <td className="border p-1">{type.icon} {type.label}</td>
                      <td className="border p-1 text-right font-mono">{hours.toFixed(1)} {t('urenPage.print.hour')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          
          {selectedStaff?.hours_per_week && (
            <div>
              <h4 className="font-bold mb-2">📈 {t('urenPage.print.contractComparison')}</h4>
              <table className="w-full text-sm border-collapse">
                <tbody>
                  <tr>
                    <td className="border p-1">{t('urenPage.print.contractHoursMonth')}</td>
                    <td className="border p-1 text-right font-mono">{(selectedStaff.hours_per_week * 4.33).toFixed(1)} uur</td>
                  </tr>
                  <tr>
                    <td className="border p-1">{t('urenPage.print.workedHours')}</td>
                    <td className="border p-1 text-right font-mono">{totalWorked.toFixed(1)} uur</td>
                  </tr>
                  <tr className="font-bold">
                    <td className="border p-1">{t('urenPage.print.difference')}</td>
                    <td className={`border p-1 text-right font-mono ${totalWorked - (selectedStaff.hours_per_week * 4.33) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {(totalWorked - (selectedStaff.hours_per_week * 4.33)).toFixed(1)} uur
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Signature section */}
        <div className="mt-8 pt-4 border-t">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-sm text-gray-600 mb-12">{t('urenPage.print.signatureEmployee')}:</p>
              <div className="border-b border-gray-400 mb-1"></div>
              <p className="text-xs text-gray-500">{selectedStaff?.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-12">{t('urenPage.print.signatureEmployer')}:</p>
              <div className="border-b border-gray-400 mb-1"></div>
              <p className="text-xs text-gray-500">{t('urenPage.print.nameAndDate')}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t text-center text-xs text-gray-500">
          <p>{t('urenPage.print.documentGenerated')} {new Date().toLocaleDateString()} {t('urenPage.print.at')} {new Date().toLocaleTimeString()}</p>
          <p>www.vysionhoreca.com</p>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-xl p-4 shadow-sm border print:hidden">
        <h3 className="font-medium text-gray-800 mb-3">{t('urenPage.legend')}</h3>
        <div className="flex flex-wrap gap-3">
          {LOCAL_ABSENCE_TYPES.map(type => (
            <div key={type.id} className="flex items-center gap-1 text-sm">
              <span
                className="w-4 h-4 rounded"
                style={{ backgroundColor: type.color }}
              />
              <span>{type.icon} {type.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Entry Modal */}
      {showEntryModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">
                📅 {new Date(selectedDate).toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h2>
              <p className="text-gray-600">{selectedStaff?.name}</p>
            </div>
            
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Bestaande entries voor deze dag */}
              {!editingEntry && getEntriesForDate(new Date(selectedDate)).length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('urenPage.existingEntries')}</label>
                  <div className="space-y-2">
                    {getEntriesForDate(new Date(selectedDate)).map((entry) => {
                      const absenceType = LOCAL_ABSENCE_TYPES.find(at => at.id === entry.absence_type)
                      return (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between p-3 rounded-lg border"
                          style={{ backgroundColor: absenceType?.color + '10', borderColor: absenceType?.color + '40' }}
                        >
                          <div className="flex items-center gap-2">
                            <span>{absenceType?.icon}</span>
                            <span className="font-medium">{absenceType?.label}</span>
                            <span className="text-gray-600">
                              {entry.absence_type === 'WORKED' 
                                ? `${formatHours(entry.worked_hours)}u` 
                                : `${entry.absence_hours || 8}u`}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                openEntryModal(new Date(selectedDate), entry)
                              }}
                              className="px-2 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteEntry(entry)
                              }}
                              className="px-2 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="border-t my-4 pt-4">
                    <p className="text-sm font-medium text-gray-700">➕ {t('urenPage.addNewEntry')}:</p>
                  </div>
                </div>
              )}
              {/* Absence Type Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('urenPage.type')}</label>
                <div className="grid grid-cols-3 gap-2">
                  {LOCAL_ABSENCE_TYPES.slice(0, 6).map(type => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setEntryForm({ ...entryForm, absence_type: type.id })}
                      className={`p-2 rounded-lg text-sm transition flex flex-col items-center gap-1 ${
                        entryForm.absence_type === type.id 
                          ? 'ring-2 ring-offset-1' 
                          : 'hover:bg-gray-100'
                      }`}
                      style={{
                        backgroundColor: entryForm.absence_type === type.id ? type.color + '30' : undefined,
                        borderColor: type.color,
                        color: entryForm.absence_type === type.id ? type.color : undefined,
                      }}
                    >
                      <span className="text-lg">{type.icon}</span>
                      <span>{type.label}</span>
                    </button>
                  ))}
                </div>
                <select
                  value={entryForm.absence_type}
                  onChange={(e) => setEntryForm({ ...entryForm, absence_type: e.target.value as AbsenceType })}
                  className="w-full mt-2 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  {LOCAL_ABSENCE_TYPES.map(type => (
                    <option key={type.id} value={type.id}>{type.icon} {type.label}</option>
                  ))}
                </select>
              </div>

              {/* Worked Hours Form */}
              {entryForm.absence_type === 'WORKED' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('urenPage.clockIn')}</label>
                      <input
                        type="time"
                        value={entryForm.clock_in || ''}
                        onChange={(e) => {
                          const newVal = e.target.value
                          setEntryForm({ ...entryForm, clock_in: newVal })
                          setTimeout(() => calculateWorkedHours(newVal, undefined, undefined), 0)
                        }}
                        onBlur={() => calculateWorkedHours()}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('urenPage.clockOut')}</label>
                      <input
                        type="time"
                        value={entryForm.clock_out || ''}
                        onChange={(e) => {
                          const newVal = e.target.value
                          setEntryForm({ ...entryForm, clock_out: newVal })
                          setTimeout(() => calculateWorkedHours(undefined, newVal, undefined), 0)
                        }}
                        onBlur={() => calculateWorkedHours()}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('urenPage.breakMin')}</label>
                      <input
                        type="number"
                        value={entryForm.break_minutes ?? ''}
                        placeholder="0"
                        onChange={(e) => {
                          const val = e.target.value === '' ? undefined : parseInt(e.target.value) || 0
                          setEntryForm({ ...entryForm, break_minutes: val })
                          setTimeout(() => calculateWorkedHours(undefined, undefined, val || 0), 0)
                        }}
                        onBlur={() => calculateWorkedHours()}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        min="0"
                        step="5"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('urenPage.workedHours')}</label>
                      <input
                        type="text"
                        value={formatHours(entryForm.worked_hours || 0)}
                        readOnly
                        className="w-full px-4 py-2 border rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Absence Hours */}
              {entryForm.absence_type !== 'WORKED' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('urenPage.hours')}</label>
                  <input
                    type="number"
                    value={entryForm.absence_hours || 8}
                    onChange={(e) => setEntryForm({ ...entryForm, absence_hours: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    step="0.5"
                    min="0"
                    max="24"
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('urenPage.notes')}</label>
                <textarea
                  value={entryForm.notes || ''}
                  onChange={(e) => setEntryForm({ ...entryForm, notes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder={t('urenPage.notesPlaceholder')}
                />
              </div>
            </div>
            
            <div className="p-6 border-t flex gap-3 justify-between">
              {editingEntry ? (
                <button
                  onClick={() => {
                    handleDeleteEntry(editingEntry)
                    setShowEntryModal(false)
                    setEditingEntry(null)
                  }}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
                >
                  🗑️ {t('urenPage.delete')}
                </button>
              ) : (
                <div />
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowEntryModal(false)
                    setEditingEntry(null)
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  {t('adminPages.common.cancel')}
                </button>
                <button
                  onClick={handleSaveEntry}
                  disabled={saving}
                  className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition disabled:opacity-50"
                >
                  {saving ? `${t('adminPages.common.saving')}...` : editingEntry ? t('urenPage.update') : t('urenPage.add')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden PDF Content for Download */}
      <div className="absolute left-[-9999px] top-0">
        <div ref={pdfRef} className="bg-white p-6" style={{ fontFamily: 'Arial, sans-serif', width: '180mm', maxWidth: '180mm' }}>
          {/* PDF Header */}
          <div className="border-b-2 border-gray-800 pb-3 mb-4">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-xl font-bold text-gray-900">{t('urenPage.print.title')}</h1>
                <p className="text-base text-gray-700">{MONTHS[selectedMonth - 1]} {selectedYear}</p>
              </div>
              <div className="text-right text-xs text-gray-600">
                <div className="font-bold text-gray-800 text-sm">Vysion Horeca</div>
                <div>{t('urenPage.print.generated')}: {new Date().toLocaleDateString()}</div>
              </div>
            </div>
          </div>

          {/* Employee Info */}
          <div className="bg-gray-100 p-3 rounded mb-4">
            <h2 className="font-bold text-sm mb-2">👤 {t('urenPage.print.employeeDetails')}</h2>
            <table className="w-full text-xs">
              <tbody>
                <tr>
                  <td className="py-0.5 font-medium" style={{width: '60px'}}>{t('urenPage.print.name')}:</td>
                  <td className="py-0.5">{selectedStaff?.name}</td>
                  <td className="py-0.5 font-medium" style={{width: '70px'}}>{t('urenPage.print.contract')}:</td>
                  <td className="py-0.5">{selectedStaff?.contract_type || '-'}</td>
                </tr>
                <tr>
                  <td className="py-0.5 font-medium">{t('urenPage.print.email')}:</td>
                  <td className="py-0.5">{selectedStaff?.email || '-'}</td>
                  <td className="py-0.5 font-medium">{t('urenPage.print.hoursWeek')}:</td>
                  <td className="py-0.5">{selectedStaff?.hours_per_week || '-'}</td>
                </tr>
                <tr>
                  <td className="py-0.5 font-medium">{t('urenPage.print.phone')}:</td>
                  <td className="py-0.5">{selectedStaff?.phone || '-'}</td>
                  <td className="py-0.5 font-medium">{t('urenPage.print.hourlyRate')}:</td>
                  <td className="py-0.5">{selectedStaff?.hourly_rate ? `€${selectedStaff.hourly_rate}` : '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Summary Boxes */}
          <div className="grid grid-cols-5 gap-2 mb-6">
            <div className="bg-green-100 p-2 rounded text-center">
              <div className="text-lg font-bold text-green-700">{totalWorked.toFixed(1)}</div>
              <div className="text-xs text-green-600">{t('urenPage.worked')}</div>
            </div>
            <div className="bg-red-100 p-2 rounded text-center">
              <div className="text-lg font-bold text-red-700">{totalSick.toFixed(1)}</div>
              <div className="text-xs text-red-600">{t('urenPage.sick')}</div>
            </div>
            <div className="bg-blue-100 p-2 rounded text-center">
              <div className="text-lg font-bold text-blue-700">{totalVacation.toFixed(1)}</div>
              <div className="text-xs text-blue-600">{t('urenPage.vacation')}</div>
            </div>
            <div className="bg-orange-100 p-2 rounded text-center">
              <div className="text-lg font-bold text-orange-700">{totalOther.toFixed(1)}</div>
              <div className="text-xs text-orange-600">{t('urenPage.other')}</div>
            </div>
            <div className="bg-gray-200 p-2 rounded text-center">
              <div className="text-lg font-bold text-gray-800">{totalHours.toFixed(1)}</div>
              <div className="text-xs text-gray-600">{t('urenPage.print.total')}</div>
            </div>
          </div>

          {/* Detail Table */}
          <h3 className="font-bold text-lg mb-3 border-b pb-2">📋 {t('urenPage.print.detailedOverview')}</h3>
          <table className="w-full text-xs border-collapse mb-6">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="border border-gray-600 p-2 text-left">{t('urenPage.print.date')}</th>
                <th className="border border-gray-600 p-2 text-left">{t('urenPage.print.day')}</th>
                <th className="border border-gray-600 p-2 text-left">{t('urenPage.print.type')}</th>
                <th className="border border-gray-600 p-2 text-center">{t('urenPage.print.in')}</th>
                <th className="border border-gray-600 p-2 text-center">{t('urenPage.print.out')}</th>
                <th className="border border-gray-600 p-2 text-center">{t('urenPage.print.break')}</th>
                <th className="border border-gray-600 p-2 text-center">{t('urenPage.print.hours')}</th>
                <th className="border border-gray-600 p-2 text-center">✓</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => {
                const date = new Date(e.date)
                const dayName = date.toLocaleDateString(undefined, { weekday: 'short' })
                const absenceType = LOCAL_ABSENCE_TYPES.find(at => at.id === e.absence_type)
                return (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-300 p-1">{date.toLocaleDateString()}</td>
                    <td className="border border-gray-300 p-1">{dayName}</td>
                    <td className="border border-gray-300 p-1">{absenceType?.label}</td>
                    <td className="border border-gray-300 p-1 text-center font-mono">{formatTime(e.clock_in)}</td>
                    <td className="border border-gray-300 p-1 text-center font-mono">{formatTime(e.clock_out)}</td>
                    <td className="border border-gray-300 p-1 text-center">{e.break_minutes || 0}m</td>
                    <td className="border border-gray-300 p-1 text-center font-bold">{formatHours(e.worked_hours || e.absence_hours || 0)}</td>
                    <td className="border border-gray-300 p-1 text-center">{e.is_approved ? '✓' : ''}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-200 font-bold">
                <td colSpan={6} className="border border-gray-400 p-2 text-right">{t('urenPage.print.total')}:</td>
                <td className="border border-gray-400 p-2 text-center">{totalHours.toFixed(1)}</td>
                <td className="border border-gray-400 p-2"></td>
              </tr>
            </tfoot>
          </table>

          {/* Breakdown */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <h4 className="font-bold mb-2 text-sm">📊 {t('urenPage.print.breakdownByType')}</h4>
              <table className="w-full text-xs border-collapse">
                <tbody>
                  {LOCAL_ABSENCE_TYPES.map(type => {
                    const hours = entries
                      .filter(e => e.absence_type === type.id)
                      .reduce((sum, e) => sum + (e.worked_hours || e.absence_hours || 0), 0)
                    if (hours === 0) return null
                    return (
                      <tr key={type.id}>
                        <td className="border p-1">{type.icon} {type.label}</td>
                        <td className="border p-1 text-right font-mono">{hours.toFixed(1)} {t('urenPage.print.hour')}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            
            {selectedStaff?.hours_per_week && (
              <div>
                <h4 className="font-bold mb-2 text-sm">📈 {t('urenPage.print.contractComparison')}</h4>
                <table className="w-full text-xs border-collapse">
                  <tbody>
                    <tr>
                      <td className="border p-1">{t('urenPage.print.contractHoursMonth')}</td>
                      <td className="border p-1 text-right font-mono">{(selectedStaff.hours_per_week * 4.33).toFixed(1)} {t('urenPage.print.hour')}</td>
                    </tr>
                    <tr>
                      <td className="border p-1">{t('urenPage.print.workedHours')}</td>
                      <td className="border p-1 text-right font-mono">{totalWorked.toFixed(1)} {t('urenPage.print.hour')}</td>
                    </tr>
                    <tr className="font-bold">
                      <td className="border p-1">{t('urenPage.print.difference')}</td>
                      <td className={`border p-1 text-right font-mono ${totalWorked - (selectedStaff.hours_per_week * 4.33) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {(totalWorked - (selectedStaff.hours_per_week * 4.33)).toFixed(1)} {t('urenPage.print.hour')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Kilometers & Maaltijdcheques Section */}
          {(commuteDistanceKm > 0 || hasMealVouchers) && (
            <div className="mb-6">
              <h4 className="font-bold mb-2 text-sm">🚗 {t('urenPage.print.commuteAndBenefits')}</h4>
              <table className="w-full text-xs border-collapse">
                <tbody>
                  {commuteDistanceKm > 0 && (
                    <>
                      <tr>
                        <td className="border p-1">{t('urenPage.workedDays')}</td>
                        <td className="border p-1 text-right font-mono">{workedDaysCount}</td>
                      </tr>
                      <tr>
                        <td className="border p-1">{t('urenPage.print.commuteDistance')}</td>
                        <td className="border p-1 text-right font-mono">{commuteDistanceKm} km</td>
                      </tr>
                      <tr>
                        <td className="border p-1">{t('urenPage.commuteKm')}</td>
                        <td className="border p-1 text-right font-mono">{totalCommuteKm.toFixed(1)} km</td>
                      </tr>
                      <tr className="font-bold bg-green-50">
                        <td className="border p-1">{t('urenPage.commuteAllowance')}</td>
                        <td className="border p-1 text-right font-mono text-green-600">€{totalCommuteAllowance.toFixed(2)}</td>
                      </tr>
                    </>
                  )}
                  {hasMealVouchers && (
                    <tr className="bg-orange-50">
                      <td className="border p-1">🍽️ {t('urenPage.mealVouchers')}</td>
                      <td className="border p-1 text-right font-mono font-bold">{workedDaysCount}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Signature Section */}
          <div className="mt-8 pt-4 border-t">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-sm text-gray-600 mb-10">{t('urenPage.print.signatureEmployee')}:</p>
                <div className="border-b border-gray-400 mb-1"></div>
                <p className="text-xs text-gray-500">{selectedStaff?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-10">{t('urenPage.print.signatureEmployer')}:</p>
                <div className="border-b border-gray-400 mb-1"></div>
                <p className="text-xs text-gray-500">{t('urenPage.print.nameAndDate')}</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t text-center text-xs text-gray-500">
            <p>{t('urenPage.print.documentGenerated')} {new Date().toLocaleDateString()} {t('urenPage.print.at')} {new Date().toLocaleTimeString()}</p>
            <p className="text-orange-500 font-medium">www.vysionhoreca.com</p>
          </div>
        </div>
      </div>

      {/* Reopen Month Modal */}
      {showReopenModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">
                🔓 {t('urenPage.reopenMonth')}
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                {selectedStaff?.name} - {MONTHS[selectedMonth - 1]} {selectedYear}
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-orange-800 text-sm">
                  ⚠️ <strong>{t('adminPages.common.note')}:</strong> {t('urenPage.reopenWarning')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reden voor heropenen <span className="text-red-500">*</span>
                </label>
                <select
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 mb-2"
                >
                  <option value="">Selecteer een reden...</option>
                  <option value="Correctie foute invoer">Correctie foute invoer</option>
                  <option value="Vergeten uren toevoegen">Vergeten uren toevoegen</option>
                  <option value="Ziekte achteraf gemeld">Ziekte achteraf gemeld</option>
                  <option value="Vakantie wijziging">Vakantie wijziging</option>
                  <option value="Verzoek medewerker">Verzoek medewerker</option>
                  <option value="Verzoek loonkantoor">Verzoek loonkantoor</option>
                  <option value="Anders">Anders</option>
                </select>
                {reopenReason === 'Anders' && (
                  <textarea
                    value={reopenReason === 'Anders' ? '' : reopenReason}
                    onChange={(e) => setReopenReason(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Beschrijf de reden..."
                  />
                )}
              </div>
            </div>
            
            <div className="p-6 border-t flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowReopenModal(false)
                  setReopenReason('')
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                {t('adminPages.common.cancel')}
              </button>
              <button
                onClick={handleReopenMonth}
                disabled={saving || !reopenReason.trim()}
                className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition disabled:opacity-50"
              >
                {saving ? `${t('adminPages.common.saving')}...` : `🔓 ${t('urenPage.print.reopen')}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-xl">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">
                📧 {t('urenPage.sendToPayroll')}
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                {selectedStaff?.name} - {MONTHS[selectedMonth - 1]} {selectedYear}
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-mailadres loonkantoor <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={emailForm.to}
                  onChange={(e) => setEmailForm({ ...emailForm, to: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="loonkantoor@voorbeeld.be"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Onderwerp</label>
                <input
                  type="text"
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bericht</label>
                <textarea
                  value={emailForm.message}
                  onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })}
                  rows={8}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-700">
                <div className="font-medium mb-1">📎 {t('urenPage.print.attachment')}:</div>
                <div>uren_{selectedStaff?.name.replace(/\s/g, '_')}_{selectedYear}-{String(selectedMonth).padStart(2, '0')}.csv</div>
              </div>
            </div>
            
            <div className="p-6 border-t flex gap-3 justify-end">
              <button
                onClick={() => setShowEmailModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                {t('adminPages.common.cancel')}
              </button>
              <button
                onClick={sendToPayroll}
                disabled={sendingEmail || !emailForm.to}
                className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition disabled:opacity-50 flex items-center gap-2"
              >
                {sendingEmail ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    {t('urenPage.print.sending')}
                  </>
                ) : (
                  <>
                    📧 {t('urenPage.print.send')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          body * {
            visibility: hidden;
          }
          
          .print-report,
          .print-report *,
          .print\\:block,
          .print\\:block * {
            visibility: visible;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            font-size: 11px;
          }
          
          table {
            page-break-inside: auto;
          }
          
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          thead {
            display: table-header-group;
          }
          
          tfoot {
            display: table-footer-group;
          }
        }
      `}</style>
    </div>
  )
}
