'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getOpeningHours, saveOpeningHours, OpeningHour } from '@/lib/admin-api'
import { useLanguage } from '@/i18n'

export default function OpeningstijdenPage({ params }: { params: { tenant: string } }) {
  const { t } = useLanguage()
  
  const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const

  const defaultHours: OpeningHour[] = dayKeys.map((_, index) => ({
    tenant_slug: '',
    day_of_week: index,
    is_open: index !== 6,
    open_time: '11:00',
    close_time: '21:00',
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

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const data = await getOpeningHours(params.tenant)
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
      setLoading(false)
    }
    loadData()
  }, [params.tenant])

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
            className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-gray-500">{t('adminPages.common.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('adminPages.openingstijden.title')}</h1>
          <p className="text-gray-500">{t('adminPages.openingstijden.subtitle')}</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          disabled={saving}
          className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
            saved 
              ? 'bg-green-500 text-white' 
              : 'bg-orange-500 hover:bg-orange-600 text-white'
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
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
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
                        className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                      <span className="text-gray-400">-</span>
                      <input
                        type="time"
                        value={daySchedule.close_time}
                        onChange={(e) => updateDay(index, 'close_time', e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
                          ? 'bg-orange-100 text-orange-600' 
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
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                  />
                  <span className="text-gray-400">-</span>
                  <input
                    type="time"
                    value={daySchedule.close_time_2 || '21:00'}
                    onChange={(e) => updateDay(index, 'close_time_2', e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                  />
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
        className="mt-6 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-6 text-white"
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
    </div>
  )
}
