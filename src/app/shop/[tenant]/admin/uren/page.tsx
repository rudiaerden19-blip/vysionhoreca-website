'use client'

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
  getMonthlyTimesheet,
  markTimesheetExported,
  Staff,
  TimesheetEntry,
  MonthlyTimesheet,
  AbsenceType,
  ABSENCE_TYPES,
} from '@/lib/admin-api'

const MONTHS = [
  'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
  'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'
]

const DAYS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']

export default function UrenPage() {
  const params = useParams()
  const tenant = params.tenant as string
  
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
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [entryForm, setEntryForm] = useState<Partial<TimesheetEntry>>({
    absence_type: 'WORKED',
    clock_in: '',
    clock_out: '',
    break_minutes: 30,
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
  }, [tenant])

  useEffect(() => {
    if (selectedStaff) {
      loadData()
    }
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

  function getEntryForDate(date: Date): TimesheetEntry | undefined {
    const dateStr = date.toISOString().split('T')[0]
    return entries.find(e => e.date === dateStr)
  }

  function openEntryModal(date: Date) {
    const dateStr = date.toISOString().split('T')[0]
    setSelectedDate(dateStr)
    
    const existingEntry = getEntryForDate(date)
    if (existingEntry) {
      setEntryForm({
        absence_type: existingEntry.absence_type,
        clock_in: existingEntry.clock_in || '',
        clock_out: existingEntry.clock_out || '',
        break_minutes: existingEntry.break_minutes || 30,
        worked_hours: existingEntry.worked_hours || 0,
        absence_hours: existingEntry.absence_hours || 8,
        notes: existingEntry.notes || '',
      })
    } else {
      setEntryForm({
        absence_type: 'WORKED',
        clock_in: '09:00',
        clock_out: '17:00',
        break_minutes: 30,
        worked_hours: 7.5,
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
      is_approved: false,
    }
    
    const result = await saveTimesheetEntry(entry)
    setSaving(false)
    
    if (result) {
      setShowEntryModal(false)
      loadData()
    } else {
      alert('Opslaan mislukt')
    }
  }

  async function handleDeleteEntry(entry: TimesheetEntry) {
    if (!entry.id) return
    if (!confirm('Weet je zeker dat je deze uren wilt verwijderen?')) return
    
    const success = await deleteTimesheetEntry(entry.id)
    if (success) {
      loadData()
    }
  }

  async function handleApproveAll() {
    if (!selectedStaff?.id) return
    if (!confirm('Alle uren voor deze maand goedkeuren?')) return
    
    const success = await approveTimesheetEntries(tenant, selectedStaff.id, selectedYear, selectedMonth, selectedStaff.id)
    if (success) {
      loadData()
    }
  }

  async function handleCloseMonth() {
    if (!selectedStaff?.id) return
    if (!confirm('Maand afsluiten? Na afsluiting kunnen uren niet meer worden gewijzigd.')) return
    
    const success = await closeMonthlyTimesheet(tenant, selectedStaff.id, selectedYear, selectedMonth, selectedStaff.id)
    if (success) {
      loadData()
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
  function calculateWorkedHours() {
    if (entryForm.clock_in && entryForm.clock_out) {
      const [inH, inM] = entryForm.clock_in.split(':').map(Number)
      const [outH, outM] = entryForm.clock_out.split(':').map(Number)
      const totalMinutes = (outH * 60 + outM) - (inH * 60 + inM) - (entryForm.break_minutes || 0)
      const hours = Math.max(0, totalMinutes / 60)
      setEntryForm(prev => ({ ...prev, worked_hours: Math.round(hours * 100) / 100 }))
    }
  }

  // Export to CSV
  function exportToCSV() {
    if (!selectedStaff || entries.length === 0) return
    
    const headers = ['Datum', 'Inkloktijd', 'Uitkloktijd', 'Pauze (min)', 'Gewerkte uren', 'Type', 'Notities']
    const rows = entries.map(e => [
      e.date,
      e.clock_in || '',
      e.clock_out || '',
      e.break_minutes || 0,
      e.worked_hours || e.absence_hours || 0,
      ABSENCE_TYPES.find(t => t.id === e.absence_type)?.label || e.absence_type,
      e.notes || ''
    ])
    
    const csvContent = [headers, ...rows].map(row => row.join(';')).join('\n')
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
      margin: 10,
      filename: fileName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }
    
    html2pdf().set(opt).from(element).save()
  }

  // Open email modal
  function openEmailModal() {
    if (!selectedStaff) return
    
    setEmailForm({
      to: '',
      subject: `Urenregistratie ${selectedStaff.name} - ${MONTHS[selectedMonth - 1]} ${selectedYear}`,
      message: `Beste,

Hierbij stuur ik u de urenregistratie van ${selectedStaff.name} voor de maand ${MONTHS[selectedMonth - 1]} ${selectedYear}.

Samenvatting:
- Gewerkte uren: ${totalWorked.toFixed(1)}
- Ziekte-uren: ${totalSick.toFixed(1)}
- Vakantie-uren: ${totalVacation.toFixed(1)}
- Totaal: ${totalHours.toFixed(1)} uren

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
        e.clock_in || '',
        e.clock_out || '',
        e.break_minutes || 0,
        e.worked_hours || e.absence_hours || 0,
        ABSENCE_TYPES.find(t => t.id === e.absence_type)?.label || e.absence_type,
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
        alert('Urenregistratie succesvol verzonden!')
        setShowEmailModal(false)
        
        // Mark as exported
        if (selectedStaff.id) {
          markTimesheetExported(tenant, selectedStaff.id, selectedYear, selectedMonth)
        }
      } else {
        throw new Error('Verzenden mislukt')
      }
    } catch (error) {
      console.error('Email error:', error)
      alert('Er is een fout opgetreden bij het verzenden. Probeer het opnieuw of gebruik CSV export.')
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
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Geen medewerkers</h2>
        <p className="text-gray-600 mb-6">Voeg eerst medewerkers toe bij Personeel</p>
        <a
          href={`/shop/${tenant}/admin/personeel`}
          className="inline-block px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
        >
          Naar Personeel
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">📅 Uren Registratie</h1>
          <p className="text-gray-600">Beheer werkuren en verzuim per medewerker</p>
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
          <label className="block text-xs text-gray-500 mb-1">Medewerker</label>
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
          <label className="block text-xs text-gray-500 mb-1">Maand</label>
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
          <label className="block text-xs text-gray-500 mb-1">Jaar</label>
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
          ✓ Alles goedkeuren
        </button>
        <button
          onClick={handleCloseMonth}
          disabled={monthlyTimesheet?.is_closed}
          className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition disabled:opacity-50"
        >
          🔒 Maand afsluiten
        </button>
      </div>

      {/* Print Header */}
      <div className="hidden print:block print-report">
        <div className="border-b-2 border-gray-800 pb-4 mb-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">URENREGISTRATIE</h1>
              <p className="text-lg text-gray-700 mt-1">{MONTHS[selectedMonth - 1]} {selectedYear}</p>
            </div>
            <div className="text-right text-sm text-gray-600">
              <div className="font-bold text-gray-800">Vysion Horeca</div>
              <div>Gegenereerd: {new Date().toLocaleDateString('nl-BE')}</div>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-100 p-4 rounded mb-4">
          <h2 className="font-bold text-lg mb-2">👤 Medewerker gegevens</h2>
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="py-1 font-medium w-40">Naam:</td>
                <td>{selectedStaff?.name}</td>
                <td className="font-medium w-40">Contract:</td>
                <td>{selectedStaff?.contract_type || '-'}</td>
              </tr>
              <tr>
                <td className="py-1 font-medium">Email:</td>
                <td>{selectedStaff?.email || '-'}</td>
                <td className="font-medium">Uren/week:</td>
                <td>{selectedStaff?.hours_per_week || '-'}</td>
              </tr>
              <tr>
                <td className="py-1 font-medium">Telefoon:</td>
                <td>{selectedStaff?.phone || '-'}</td>
                <td className="font-medium">Uurloon:</td>
                <td>{selectedStaff?.hourly_rate ? `€${selectedStaff.hourly_rate}` : '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-5 gap-2 mb-4">
          <div className="bg-green-100 p-3 rounded text-center">
            <div className="text-xl font-bold text-green-700">{totalWorked.toFixed(1)}</div>
            <div className="text-xs text-green-600">Gewerkt</div>
          </div>
          <div className="bg-red-100 p-3 rounded text-center">
            <div className="text-xl font-bold text-red-700">{totalSick.toFixed(1)}</div>
            <div className="text-xs text-red-600">Ziekte</div>
          </div>
          <div className="bg-blue-100 p-3 rounded text-center">
            <div className="text-xl font-bold text-blue-700">{totalVacation.toFixed(1)}</div>
            <div className="text-xs text-blue-600">Vakantie</div>
          </div>
          <div className="bg-orange-100 p-3 rounded text-center">
            <div className="text-xl font-bold text-orange-700">{totalOther.toFixed(1)}</div>
            <div className="text-xs text-orange-600">Overig</div>
          </div>
          <div className="bg-gray-200 p-3 rounded text-center">
            <div className="text-xl font-bold text-gray-800">{totalHours.toFixed(1)}</div>
            <div className="text-xs text-gray-600">TOTAAL</div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border print:border-black">
          <div className="text-2xl font-bold text-green-600">{totalWorked.toFixed(1)}u</div>
          <div className="text-gray-600 text-sm">Gewerkt</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border print:border-black">
          <div className="text-2xl font-bold text-red-600">{totalSick.toFixed(1)}u</div>
          <div className="text-gray-600 text-sm">Ziekte</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border print:border-black">
          <div className="text-2xl font-bold text-blue-600">{totalVacation.toFixed(1)}u</div>
          <div className="text-gray-600 text-sm">Vakantie</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border print:border-black">
          <div className="text-2xl font-bold text-orange-600">{totalOther.toFixed(1)}u</div>
          <div className="text-gray-600 text-sm">Overig</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border print:border-black">
          <div className="text-2xl font-bold text-gray-800">{totalHours.toFixed(1)}u</div>
          <div className="text-gray-600 text-sm">Totaal</div>
          {selectedStaff?.hours_per_week && (
            <div className="text-xs text-gray-500 mt-1">
              Contract: {(selectedStaff.hours_per_week * 4.33).toFixed(1)}u/maand
            </div>
          )}
        </div>
      </div>

      {/* Status badges */}
      {monthlyTimesheet?.is_closed && (
        <div className="bg-purple-100 border border-purple-300 rounded-lg p-3 flex items-center gap-2">
          <span className="text-purple-700">🔒 Maand is afgesloten op {new Date(monthlyTimesheet.closed_at!).toLocaleDateString('nl-BE')}</span>
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
            const entry = getEntryForDate(date)
            const isToday = date.toDateString() === new Date().toDateString()
            const isWeekend = date.getDay() === 0 || date.getDay() === 6
            const absenceType = entry ? ABSENCE_TYPES.find(t => t.id === entry.absence_type) : null
            
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
                
                {entry && inMonth && (
                  <div
                    className="text-xs rounded px-1.5 py-0.5 truncate print:text-[10px]"
                    style={{ 
                      backgroundColor: absenceType?.color + '20',
                      color: absenceType?.color
                    }}
                  >
                    {absenceType?.icon} {entry.absence_type === 'WORKED' ? `${entry.worked_hours?.toFixed(1)}u` : absenceType?.label}
                    {entry.is_approved && <span className="ml-1">✓</span>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Entries List (for print) */}
      <div className="hidden print:block">
        <h3 className="font-bold text-lg mt-6 mb-3 border-b pb-2">📋 Gedetailleerd overzicht</h3>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-800 text-white">
              <th className="border border-gray-600 p-2 text-left">Datum</th>
              <th className="border border-gray-600 p-2 text-left">Dag</th>
              <th className="border border-gray-600 p-2 text-left">Type</th>
              <th className="border border-gray-600 p-2 text-center">In</th>
              <th className="border border-gray-600 p-2 text-center">Uit</th>
              <th className="border border-gray-600 p-2 text-center">Pauze</th>
              <th className="border border-gray-600 p-2 text-center">Uren</th>
              <th className="border border-gray-600 p-2 text-left">Notities</th>
              <th className="border border-gray-600 p-2 text-center">✓</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => {
              const date = new Date(e.date)
              const dayName = date.toLocaleDateString('nl-BE', { weekday: 'short' })
              const absenceType = ABSENCE_TYPES.find(t => t.id === e.absence_type)
              return (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border border-gray-300 p-2">{date.toLocaleDateString('nl-BE')}</td>
                  <td className="border border-gray-300 p-2">{dayName}</td>
                  <td className="border border-gray-300 p-2">
                    <span style={{ color: absenceType?.color }}>{absenceType?.icon}</span> {absenceType?.label}
                  </td>
                  <td className="border border-gray-300 p-2 text-center font-mono">{e.clock_in || '-'}</td>
                  <td className="border border-gray-300 p-2 text-center font-mono">{e.clock_out || '-'}</td>
                  <td className="border border-gray-300 p-2 text-center">{e.break_minutes || 0}m</td>
                  <td className="border border-gray-300 p-2 text-center font-bold">{(e.worked_hours || e.absence_hours || 0).toFixed(1)}</td>
                  <td className="border border-gray-300 p-2 text-gray-600 text-xs">{e.notes || '-'}</td>
                  <td className="border border-gray-300 p-2 text-center">{e.is_approved ? '✓' : ''}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-200 font-bold">
              <td colSpan={6} className="border border-gray-400 p-2 text-right">TOTAAL:</td>
              <td className="border border-gray-400 p-2 text-center">{totalHours.toFixed(1)}</td>
              <td colSpan={2} className="border border-gray-400 p-2"></td>
            </tr>
          </tfoot>
        </table>

        {/* Breakdown per type */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-bold mb-2">📊 Uitsplitsing per type</h4>
            <table className="w-full text-sm border-collapse">
              <tbody>
                {ABSENCE_TYPES.map(type => {
                  const hours = entries
                    .filter(e => e.absence_type === type.id)
                    .reduce((sum, e) => sum + (e.worked_hours || e.absence_hours || 0), 0)
                  if (hours === 0) return null
                  return (
                    <tr key={type.id}>
                      <td className="border p-1">{type.icon} {type.label}</td>
                      <td className="border p-1 text-right font-mono">{hours.toFixed(1)} uur</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          
          {selectedStaff?.hours_per_week && (
            <div>
              <h4 className="font-bold mb-2">📈 Contractvergelijking</h4>
              <table className="w-full text-sm border-collapse">
                <tbody>
                  <tr>
                    <td className="border p-1">Contract uren/maand</td>
                    <td className="border p-1 text-right font-mono">{(selectedStaff.hours_per_week * 4.33).toFixed(1)} uur</td>
                  </tr>
                  <tr>
                    <td className="border p-1">Gewerkte uren</td>
                    <td className="border p-1 text-right font-mono">{totalWorked.toFixed(1)} uur</td>
                  </tr>
                  <tr className="font-bold">
                    <td className="border p-1">Verschil</td>
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
              <p className="text-sm text-gray-600 mb-12">Handtekening medewerker:</p>
              <div className="border-b border-gray-400 mb-1"></div>
              <p className="text-xs text-gray-500">{selectedStaff?.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-12">Handtekening werkgever:</p>
              <div className="border-b border-gray-400 mb-1"></div>
              <p className="text-xs text-gray-500">Naam + datum</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t text-center text-xs text-gray-500">
          <p>Dit document is gegenereerd door Vysion Horeca op {new Date().toLocaleDateString('nl-BE')} om {new Date().toLocaleTimeString('nl-BE')}</p>
          <p>www.vysionhoreca.com</p>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-xl p-4 shadow-sm border print:hidden">
        <h3 className="font-medium text-gray-800 mb-3">Legenda</h3>
        <div className="flex flex-wrap gap-3">
          {ABSENCE_TYPES.map(type => (
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
              {/* Absence Type Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {ABSENCE_TYPES.slice(0, 6).map(type => (
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
                  {ABSENCE_TYPES.map(type => (
                    <option key={type.id} value={type.id}>{type.icon} {type.label}</option>
                  ))}
                </select>
              </div>

              {/* Worked Hours Form */}
              {entryForm.absence_type === 'WORKED' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Inkloktijd</label>
                      <input
                        type="time"
                        value={entryForm.clock_in || ''}
                        onChange={(e) => {
                          setEntryForm({ ...entryForm, clock_in: e.target.value })
                          setTimeout(calculateWorkedHours, 0)
                        }}
                        onBlur={calculateWorkedHours}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Uitkloktijd</label>
                      <input
                        type="time"
                        value={entryForm.clock_out || ''}
                        onChange={(e) => {
                          setEntryForm({ ...entryForm, clock_out: e.target.value })
                          setTimeout(calculateWorkedHours, 0)
                        }}
                        onBlur={calculateWorkedHours}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pauze (min)</label>
                      <input
                        type="number"
                        value={entryForm.break_minutes || 0}
                        onChange={(e) => {
                          setEntryForm({ ...entryForm, break_minutes: parseInt(e.target.value) || 0 })
                          setTimeout(calculateWorkedHours, 0)
                        }}
                        onBlur={calculateWorkedHours}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        min="0"
                        step="5"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Gewerkte uren</label>
                      <input
                        type="number"
                        value={entryForm.worked_hours || 0}
                        onChange={(e) => setEntryForm({ ...entryForm, worked_hours: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-gray-50"
                        step="0.5"
                        min="0"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Absence Hours */}
              {entryForm.absence_type !== 'WORKED' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Uren</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Notities</label>
                <textarea
                  value={entryForm.notes || ''}
                  onChange={(e) => setEntryForm({ ...entryForm, notes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Optionele opmerkingen..."
                />
              </div>
            </div>
            
            <div className="p-6 border-t flex gap-3 justify-between">
              <button
                onClick={() => {
                  const entry = getEntryForDate(new Date(selectedDate))
                  if (entry) handleDeleteEntry(entry)
                  setShowEntryModal(false)
                }}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
              >
                🗑️ Verwijderen
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEntryModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  Annuleren
                </button>
                <button
                  onClick={handleSaveEntry}
                  disabled={saving}
                  className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition disabled:opacity-50"
                >
                  {saving ? 'Opslaan...' : 'Opslaan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden PDF Content for Download */}
      <div className="absolute left-[-9999px] top-0">
        <div ref={pdfRef} className="bg-white p-8 w-[210mm]" style={{ fontFamily: 'Arial, sans-serif' }}>
          {/* PDF Header */}
          <div className="border-b-2 border-gray-800 pb-4 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">URENREGISTRATIE</h1>
                <p className="text-lg text-gray-700 mt-1">{MONTHS[selectedMonth - 1]} {selectedYear}</p>
              </div>
              <div className="text-right text-sm text-gray-600">
                <div className="font-bold text-gray-800 text-lg">Vysion Horeca</div>
                <div>Gegenereerd: {new Date().toLocaleDateString('nl-BE')}</div>
              </div>
            </div>
          </div>

          {/* Employee Info */}
          <div className="bg-gray-100 p-4 rounded mb-6">
            <h2 className="font-bold text-lg mb-3">👤 Medewerker gegevens</h2>
            <table className="w-full text-sm">
              <tbody>
                <tr>
                  <td className="py-1 font-medium w-32">Naam:</td>
                  <td className="py-1">{selectedStaff?.name}</td>
                  <td className="py-1 font-medium w-32">Contract:</td>
                  <td className="py-1">{selectedStaff?.contract_type || '-'}</td>
                </tr>
                <tr>
                  <td className="py-1 font-medium">Email:</td>
                  <td className="py-1">{selectedStaff?.email || '-'}</td>
                  <td className="py-1 font-medium">Uren/week:</td>
                  <td className="py-1">{selectedStaff?.hours_per_week || '-'}</td>
                </tr>
                <tr>
                  <td className="py-1 font-medium">Telefoon:</td>
                  <td className="py-1">{selectedStaff?.phone || '-'}</td>
                  <td className="py-1 font-medium">Uurloon:</td>
                  <td className="py-1">{selectedStaff?.hourly_rate ? `€${selectedStaff.hourly_rate}` : '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Summary Boxes */}
          <div className="grid grid-cols-5 gap-3 mb-6">
            <div className="bg-green-100 p-3 rounded text-center">
              <div className="text-xl font-bold text-green-700">{totalWorked.toFixed(1)}</div>
              <div className="text-xs text-green-600">Gewerkt</div>
            </div>
            <div className="bg-red-100 p-3 rounded text-center">
              <div className="text-xl font-bold text-red-700">{totalSick.toFixed(1)}</div>
              <div className="text-xs text-red-600">Ziekte</div>
            </div>
            <div className="bg-blue-100 p-3 rounded text-center">
              <div className="text-xl font-bold text-blue-700">{totalVacation.toFixed(1)}</div>
              <div className="text-xs text-blue-600">Vakantie</div>
            </div>
            <div className="bg-orange-100 p-3 rounded text-center">
              <div className="text-xl font-bold text-orange-700">{totalOther.toFixed(1)}</div>
              <div className="text-xs text-orange-600">Overig</div>
            </div>
            <div className="bg-gray-200 p-3 rounded text-center">
              <div className="text-xl font-bold text-gray-800">{totalHours.toFixed(1)}</div>
              <div className="text-xs text-gray-600">TOTAAL</div>
            </div>
          </div>

          {/* Detail Table */}
          <h3 className="font-bold text-lg mb-3 border-b pb-2">📋 Gedetailleerd overzicht</h3>
          <table className="w-full text-xs border-collapse mb-6">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="border border-gray-600 p-2 text-left">Datum</th>
                <th className="border border-gray-600 p-2 text-left">Dag</th>
                <th className="border border-gray-600 p-2 text-left">Type</th>
                <th className="border border-gray-600 p-2 text-center">In</th>
                <th className="border border-gray-600 p-2 text-center">Uit</th>
                <th className="border border-gray-600 p-2 text-center">Pauze</th>
                <th className="border border-gray-600 p-2 text-center">Uren</th>
                <th className="border border-gray-600 p-2 text-center">✓</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => {
                const date = new Date(e.date)
                const dayName = date.toLocaleDateString('nl-BE', { weekday: 'short' })
                const absenceType = ABSENCE_TYPES.find(t => t.id === e.absence_type)
                return (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-300 p-1">{date.toLocaleDateString('nl-BE')}</td>
                    <td className="border border-gray-300 p-1">{dayName}</td>
                    <td className="border border-gray-300 p-1">{absenceType?.label}</td>
                    <td className="border border-gray-300 p-1 text-center font-mono">{e.clock_in || '-'}</td>
                    <td className="border border-gray-300 p-1 text-center font-mono">{e.clock_out || '-'}</td>
                    <td className="border border-gray-300 p-1 text-center">{e.break_minutes || 0}m</td>
                    <td className="border border-gray-300 p-1 text-center font-bold">{(e.worked_hours || e.absence_hours || 0).toFixed(1)}</td>
                    <td className="border border-gray-300 p-1 text-center">{e.is_approved ? '✓' : ''}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-200 font-bold">
                <td colSpan={6} className="border border-gray-400 p-2 text-right">TOTAAL:</td>
                <td className="border border-gray-400 p-2 text-center">{totalHours.toFixed(1)}</td>
                <td className="border border-gray-400 p-2"></td>
              </tr>
            </tfoot>
          </table>

          {/* Breakdown */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <h4 className="font-bold mb-2 text-sm">📊 Uitsplitsing per type</h4>
              <table className="w-full text-xs border-collapse">
                <tbody>
                  {ABSENCE_TYPES.map(type => {
                    const hours = entries
                      .filter(e => e.absence_type === type.id)
                      .reduce((sum, e) => sum + (e.worked_hours || e.absence_hours || 0), 0)
                    if (hours === 0) return null
                    return (
                      <tr key={type.id}>
                        <td className="border p-1">{type.icon} {type.label}</td>
                        <td className="border p-1 text-right font-mono">{hours.toFixed(1)} uur</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            
            {selectedStaff?.hours_per_week && (
              <div>
                <h4 className="font-bold mb-2 text-sm">📈 Contractvergelijking</h4>
                <table className="w-full text-xs border-collapse">
                  <tbody>
                    <tr>
                      <td className="border p-1">Contract uren/maand</td>
                      <td className="border p-1 text-right font-mono">{(selectedStaff.hours_per_week * 4.33).toFixed(1)} uur</td>
                    </tr>
                    <tr>
                      <td className="border p-1">Gewerkte uren</td>
                      <td className="border p-1 text-right font-mono">{totalWorked.toFixed(1)} uur</td>
                    </tr>
                    <tr className="font-bold">
                      <td className="border p-1">Verschil</td>
                      <td className={`border p-1 text-right font-mono ${totalWorked - (selectedStaff.hours_per_week * 4.33) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {(totalWorked - (selectedStaff.hours_per_week * 4.33)).toFixed(1)} uur
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Signature Section */}
          <div className="mt-8 pt-4 border-t">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-sm text-gray-600 mb-10">Handtekening medewerker:</p>
                <div className="border-b border-gray-400 mb-1"></div>
                <p className="text-xs text-gray-500">{selectedStaff?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-10">Handtekening werkgever:</p>
                <div className="border-b border-gray-400 mb-1"></div>
                <p className="text-xs text-gray-500">Naam + datum</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t text-center text-xs text-gray-500">
            <p>Dit document is gegenereerd door Vysion Horeca op {new Date().toLocaleDateString('nl-BE')} om {new Date().toLocaleTimeString('nl-BE')}</p>
            <p className="text-orange-500 font-medium">www.vysionhoreca.com</p>
          </div>
        </div>
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-xl">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">
                📧 Versturen naar loonkantoor
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
                <div className="font-medium mb-1">📎 Bijlage:</div>
                <div>uren_{selectedStaff?.name.replace(/\s/g, '_')}_{selectedYear}-{String(selectedMonth).padStart(2, '0')}.csv</div>
              </div>
            </div>
            
            <div className="p-6 border-t flex gap-3 justify-end">
              <button
                onClick={() => setShowEmailModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                Annuleren
              </button>
              <button
                onClick={sendToPayroll}
                disabled={sendingEmail || !emailForm.to}
                className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition disabled:opacity-50 flex items-center gap-2"
              >
                {sendingEmail ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Versturen...
                  </>
                ) : (
                  <>
                    📧 Versturen
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
