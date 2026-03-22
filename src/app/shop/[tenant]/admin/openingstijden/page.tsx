'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  getOpeningHours, saveOpeningHours, OpeningHour,
  getExceptionalClosings, saveExceptionalClosing, deleteExceptionalClosing, ExceptionalClosing,
} from '@/lib/admin-api'
import { useLanguage } from '@/i18n'
import PinGate from '@/components/PinGate'

// ── Belgische feestdagen ──────────────────────────────────────────

function easterDate(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function fmt(d: Date): string {
  return d.toISOString().split('T')[0]
}

function getBelgianHolidays(year: number): { key: string; label: string; date: string }[] {
  const easter = easterDate(year)
  return [
    { key: 'nieuwjaar',       label: '🎆 Nieuwjaar',              date: `${year}-01-01` },
    { key: 'paasmaandag',     label: '🐣 Paasmaandag',            date: fmt(addDays(easter, 1)) },
    { key: 'dag_arbeid',      label: '🔨 Dag van de Arbeid',      date: `${year}-05-01` },
    { key: 'hemelvaart',      label: '✝️ Hemelvaartsdag',          date: fmt(addDays(easter, 39)) },
    { key: 'pinkstermaandag', label: '🕊️ Pinkstermaandag',         date: fmt(addDays(easter, 50)) },
    { key: 'nationale_dag',   label: '🇧🇪 Nationale Feestdag',     date: `${year}-07-21` },
    { key: 'olv_hemelvaart',  label: '🌸 OLV Hemelvaart',         date: `${year}-08-15` },
    { key: 'allerheiligen',   label: '🕯️ Allerheiligen',           date: `${year}-11-01` },
    { key: 'wapenstilstand',  label: '🎖️ Wapenstilstand',          date: `${year}-11-11` },
    { key: 'kerstmis',        label: '🎄 Kerstmis',               date: `${year}-12-25` },
  ]
}

export default function OpeningstijdenPage({ params }: { params: { tenant: string } }) {
  const { t } = useLanguage()
  
  const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const

  const defaultHours: OpeningHour[] = dayKeys.map((_, index) => ({
    tenant_slug: '',
    day_of_week: index,
    is_open: index !== 6,
    open_time: '11:00',
    close_time: '21:00',
    last_order_time: null,
    has_shift2: false,
    open_time_2: null,
    close_time_2: null,
  }))

  const [schedule, setSchedule] = useState<OpeningHour[]>(
    defaultHours.map(h => ({ ...h, tenant_slug: params.tenant }))
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Exceptional closings state
  const [closings, setClosings] = useState<ExceptionalClosing[]>([])
  const [singleDate, setSingleDate] = useState('')
  const [singleReason, setSingleReason] = useState('')
  const [savingSingle, setSavingSingle] = useState(false)
  const [newDateFrom, setNewDateFrom] = useState('')
  const [newDateTo, setNewDateTo] = useState('')
  const [newReason, setNewReason] = useState('')
  const [savingClosing, setSavingClosing] = useState(false)
  const [closingError, setClosingError] = useState('')
  const currentYear = new Date().getFullYear()
  const [holidayYear, setHolidayYear] = useState(currentYear)
  const holidays = getBelgianHolidays(holidayYear)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const [data, exceptionals] = await Promise.all([
        getOpeningHours(params.tenant),
        getExceptionalClosings(params.tenant),
      ])
      if (data && data.length > 0) {
        const merged = defaultHours.map(defaultHour => {
          const loaded = data.find(d => d.day_of_week === defaultHour.day_of_week)
          if (loaded) {
            if (loaded.has_break && loaded.break_start && loaded.break_end && !loaded.has_shift2) {
              return {
                ...loaded,
                close_time: loaded.break_start,
                has_shift2: true,
                open_time_2: loaded.break_end,
                close_time_2: loaded.close_time,
                has_break: false,
                break_start: null,
                break_end: null,
              }
            }
            return { ...defaultHour, ...loaded }
          }
          return { ...defaultHour, tenant_slug: params.tenant }
        })
        setSchedule(merged)
      }
      setClosings(exceptionals)
      setLoading(false)
    }
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.tenant])

  const isDateClosed = (date: string) => closings.some(c => c.date === date)

  const toggleHoliday = async (holiday: { key: string; label: string; date: string }) => {
    if (isDateClosed(holiday.date)) {
      await deleteExceptionalClosing(params.tenant, holiday.date)
      setClosings(prev => prev.filter(c => c.date !== holiday.date))
    } else {
      const saved = await saveExceptionalClosing({
        tenant_slug: params.tenant,
        date: holiday.date,
        reason: holiday.label.replace(/^.{2}\s*/, ''), // strip emoji
        is_holiday: true,
        holiday_key: holiday.key,
      })
      if (saved) setClosings(prev => [...prev, saved])
    }
  }

  const addSingleClosing = async () => {
    if (!singleDate) return
    setClosingError('')
    setSavingSingle(true)
    try {
      const saved = await saveExceptionalClosing({
        tenant_slug: params.tenant,
        date: singleDate,
        date_end: null,
        reason: singleReason || 'Gesloten',
        is_holiday: false,
      })
      if (saved) {
        setClosings(prev => [...prev, saved].sort((a, b) => a.date.localeCompare(b.date)))
        setSingleDate('')
        setSingleReason('')
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Onbekende fout'
      setClosingError(`Opslaan mislukt: ${msg}`)
    }
    setSavingSingle(false)
  }

  const addCustomClosing = async () => {
    if (!newDateFrom || !newDateTo) return
    setClosingError('')
    setSavingClosing(true)
    try {
      const saved = await saveExceptionalClosing({
        tenant_slug: params.tenant,
        date: newDateFrom,
        date_end: newDateTo,
        reason: newReason || 'Gesloten',
        is_holiday: false,
      })
      if (saved) {
        setClosings(prev => [...prev, saved].sort((a, b) => a.date.localeCompare(b.date)))
        setNewDateFrom('')
        setNewDateTo('')
        setNewReason('')
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Onbekende fout'
      setClosingError(`Opslaan mislukt: ${msg}`)
    }
    setSavingClosing(false)
  }

  const removeClosing = async (date: string) => {
    await deleteExceptionalClosing(params.tenant, date)
    setClosings(prev => prev.filter(c => c.date !== date))
  }

  const formatDateRange = (c: ExceptionalClosing) => {
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }
    const from = new Date(c.date).toLocaleDateString('nl-BE', opts)
    if (!c.date_end || c.date_end === c.date) return from
    const to = new Date(c.date_end).toLocaleDateString('nl-BE', opts)
    return `${from} → ${to}`
  }

  const updateDay = (dayIndex: number, field: keyof OpeningHour, value: string | boolean | null) => {
    setSchedule(prev => prev.map((day, i) => 
      i === dayIndex ? { ...day, [field]: value } : day
    ))
    setSaved(false)
    setError('')
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    
    const success = await saveOpeningHours(schedule)
    
    if (success) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } else {
      setError(t('adminPages.common.saveFailed'))
    }
    setSaving(false)
  }

  const copyToAllDays = (sourceIndex: number) => {
    const source = schedule[sourceIndex]
    setSchedule(prev => prev.map((day, i) => 
      i === sourceIndex ? day : { 
        ...day, 
        is_open: source.is_open,
        open_time: source.open_time, 
        close_time: source.close_time,
        has_shift2: source.has_shift2,
        open_time_2: source.open_time_2,
        close_time_2: source.close_time_2,
      }
    ))
    setSaved(false)
  }

  const formatHoursPreview = (day: OpeningHour) => {
    if (!day.is_open) return t('adminPages.openingstijden.closed')
    if (day.has_shift2 && day.open_time_2 && day.close_time_2) {
      return `${day.open_time} - ${day.close_time} & ${day.open_time_2} - ${day.close_time_2}`
    }
    return `${day.open_time} - ${day.close_time}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-gray-500">{t('adminPages.common.loading')}</p>
        </div>
      </div>
    )
  }

  return (
      <PinGate tenant={params.tenant}>
      <div className="max-w-4xl mx-auto pb-24">
      {/* Floating Save Button - Fixed Bottom Right */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleSave}
        disabled={saving}
        className={`fixed bottom-6 right-6 z-50 px-6 py-4 rounded-2xl font-medium shadow-2xl flex items-center gap-2 ${
          saved 
            ? 'bg-green-500 text-white' 
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {saving ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
            />
            <span>{t('adminPages.common.saving')}</span>
          </>
        ) : saved ? (
          <>
            <span>✓</span>
            <span>{t('adminPages.common.saved')}</span>
          </>
        ) : (
          <>
            <span>💾</span>
            <span>{t('adminPages.common.save')}</span>
          </>
        )}
      </motion.button>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('adminPages.openingstijden.title')}</h1>
          <p className="text-gray-500">{t('adminPages.openingstijden.subtitle')}</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
          {error}
        </div>
      )}

      {/* Schedule */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-sm overflow-hidden"
      >
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <span>🕐</span> {t('adminPages.openingstijden.title')}
          </h2>
        </div>

        <div className="divide-y">
          {schedule.map((daySchedule, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`p-6 ${!daySchedule.is_open ? 'bg-gray-50' : ''}`}
            >
              <div className="flex items-center justify-between gap-4 flex-wrap">
                {/* Day Name & Toggle */}
                <div className="flex items-center gap-4 min-w-[140px]">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={daySchedule.is_open}
                      onChange={(e) => updateDay(index, 'is_open', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                  <span className={`font-medium ${daySchedule.is_open ? 'text-gray-900' : 'text-gray-400'}`}>
                    {t(`adminPages.openingstijden.days.${dayKeys[index]}`)}
                  </span>
                </div>

                {/* Time Inputs */}
                {daySchedule.is_open ? (
                  <div className="flex items-center gap-4 flex-1 flex-wrap">
                    {/* Shift 1 */}
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={daySchedule.open_time}
                        onChange={(e) => updateDay(index, 'open_time', e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="text-gray-400">-</span>
                      <input
                        type="time"
                        value={daySchedule.close_time}
                        onChange={(e) => updateDay(index, 'close_time', e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* Shift 2 Toggle */}
                    <button
                      onClick={() => {
                        updateDay(index, 'has_shift2', !daySchedule.has_shift2)
                        if (!daySchedule.has_shift2) {
                          updateDay(index, 'open_time_2', '17:00')
                          updateDay(index, 'close_time_2', '21:00')
                        }
                      }}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        daySchedule.has_shift2 
                          ? 'bg-blue-100 text-blue-600' 
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {daySchedule.has_shift2 ? `🕐 ${t('adminPages.openingstijden.shift2')}` : `+ ${t('adminPages.openingstijden.addShift')}`}
                    </button>

                    {/* Copy Button */}
                    <button
                      onClick={() => copyToAllDays(index)}
                      className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                    >
                      📋
                    </button>
                  </div>
                ) : (
                  <div className="flex-1">
                    <span className="text-gray-400 text-sm">{t('adminPages.openingstijden.closed')}</span>
                  </div>
                )}
              </div>

              {/* Shift 2 Times */}
              {daySchedule.is_open && daySchedule.has_shift2 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 ml-[156px] flex items-center gap-2"
                >
                  <span className="text-sm text-gray-500">{t('adminPages.openingstijden.shift2')}:</span>
                  <input
                    type="time"
                    value={daySchedule.open_time_2 || '17:00'}
                    onChange={(e) => updateDay(index, 'open_time_2', e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <span className="text-gray-400">-</span>
                  <input
                    type="time"
                    value={daySchedule.close_time_2 || '21:00'}
                    onChange={(e) => updateDay(index, 'close_time_2', e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </motion.div>
              )}

              {/* Laatste Besteltijd */}
              {daySchedule.is_open && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 ml-[156px] flex items-center gap-2"
                >
                  <span className="text-sm text-gray-500">🛒 {t('adminPages.openingstijden.customerCanOrderUntil')}:</span>
                  <select
                    value={daySchedule.last_order_time || ''}
                    onChange={(e) => updateDay(index, 'last_order_time', e.target.value || null)}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="">{t('adminPages.openingstijden.untilClosing')}</option>
                    <option value="15min">{t('adminPages.openingstijden.min15BeforeClose')}</option>
                    <option value="30min">{t('adminPages.openingstijden.min30BeforeClose')}</option>
                    <option value="45min">{t('adminPages.openingstijden.min45BeforeClose')}</option>
                    <option value="60min">{t('adminPages.openingstijden.hour1BeforeClose')}</option>
                    <option value="custom">{t('adminPages.openingstijden.customTime')}</option>
                  </select>
                  {daySchedule.last_order_time && !['15min', '30min', '45min', '60min', ''].includes(daySchedule.last_order_time) && (
                    <input
                      type="time"
                      value={daySchedule.last_order_time}
                      onChange={(e) => updateDay(index, 'last_order_time', e.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  )}
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Preview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-6 bg-gradient-to-r from-blue-700 to-blue-900 rounded-2xl p-6 text-white"
      >
        <h3 className="font-semibold text-lg mb-4">Preview</h3>
        <div className="bg-white/10 rounded-xl p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            {schedule.map((day, index) => (
              <div key={index} className="flex justify-between">
                <span>{t(`adminPages.openingstijden.days.${dayKeys[index]}`)}</span>
                <span>{formatHoursPreview(day)}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Belgische Feestdagen ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-6 bg-white rounded-2xl shadow-sm overflow-hidden"
      >
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              🇧🇪 Belgische feestdagen
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">Selecteer feestdagen waarop u gesloten bent</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setHolidayYear(y => y - 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold"
            >‹</button>
            <span className="font-semibold text-gray-800 w-12 text-center">{holidayYear}</span>
            <button
              onClick={() => setHolidayYear(y => y + 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold"
            >›</button>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {holidays.map(holiday => {
              const closed = isDateClosed(holiday.date)
              return (
                <button
                  key={holiday.key}
                  onClick={() => toggleHoliday(holiday)}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left ${
                    closed
                      ? 'border-red-400 bg-red-50 text-red-700'
                      : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <span className="font-medium text-sm">{holiday.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      {new Date(holiday.date).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      closed ? 'bg-red-200 text-red-700' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {closed ? 'Gesloten' : 'Open'}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </motion.div>

      {/* ── Uitzonderlijke sluitingsdagen ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-6 bg-white rounded-2xl shadow-sm overflow-hidden"
      >
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            📅 Uitzonderlijke sluitingsdagen
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Voeg specifieke datums toe waarop u uitzonderlijk gesloten bent</p>
        </div>

        {/* Rij 1: 1 dag gesloten */}
        <div className="p-5 border-b bg-gray-50">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">1 dag gesloten</p>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Datum</label>
              <input
                type="date"
                value={singleDate}
                onChange={e => setSingleDate(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">Reden (optioneel)</label>
              <input
                type="text"
                value={singleReason}
                onChange={e => setSingleReason(e.target.value)}
                placeholder="bv. Persoonlijk, onderhoud..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            <button
              onClick={addSingleClosing}
              disabled={!singleDate || savingSingle}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {savingSingle ? '⏳ Opslaan...' : '+ Opslaan'}
            </button>
          </div>
        </div>

        {/* Rij 2: Periode gesloten */}
        <div className="p-5 border-b bg-gray-50">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Periode gesloten (vakantie, verbouwing...)</p>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Van</label>
              <input
                type="date"
                value={newDateFrom}
                onChange={e => {
                  setNewDateFrom(e.target.value)
                  if (newDateTo && newDateTo < e.target.value) setNewDateTo('')
                }}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tot en met</label>
              <input
                type="date"
                value={newDateTo}
                onChange={e => setNewDateTo(e.target.value)}
                min={newDateFrom || ''}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">Reden (optioneel)</label>
              <input
                type="text"
                value={newReason}
                onChange={e => setNewReason(e.target.value)}
                placeholder="bv. Vakantie, verbouwing..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            <button
              onClick={addCustomClosing}
              disabled={!newDateFrom || !newDateTo || savingClosing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {savingClosing ? '⏳ Opslaan...' : '+ Opslaan'}
            </button>
          </div>
        </div>

        {/* Foutmelding */}
        {closingError && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {closingError}
          </div>
        )}

        {/* Lijst */}
        <div className="p-6">
          {closings.filter(c => !c.is_holiday).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Nog geen uitzonderlijke sluitingsdagen</p>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {closings
                  .filter(c => !c.is_holiday)
                  .map(closing => (
                    <motion.div
                      key={closing.date}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="flex items-center justify-between px-4 py-3 bg-orange-50 border border-orange-200 rounded-xl"
                    >
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-sm font-semibold text-orange-700">
                          📅 {formatDateRange(closing)}
                        </span>
                        {closing.reason && closing.reason !== 'Gesloten' && (
                          <span className="text-xs text-orange-500 bg-orange-100 px-2 py-0.5 rounded-full">
                            {closing.reason}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => removeClosing(closing.date)}
                        className="text-gray-400 hover:text-red-500 transition-colors text-lg leading-none ml-2"
                      >
                        ×
                      </button>
                    </motion.div>
                  ))}
              </AnimatePresence>
            </div>
          )}

          {/* Overzicht gesloten feestdagen */}
          {closings.filter(c => c.is_holiday).length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs font-medium text-gray-500 mb-2">Gesloten op feestdagen:</p>
              <div className="flex flex-wrap gap-2">
                {closings
                  .filter(c => c.is_holiday)
                  .map(c => (
                    <span key={c.date} className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full flex items-center gap-1">
                      {new Date(c.date).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })} — {c.reason}
                      <button onClick={() => removeClosing(c.date)} className="ml-1 hover:text-red-800">×</button>
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
      </PinGate>
  )
}
