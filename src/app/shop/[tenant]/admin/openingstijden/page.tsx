'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

interface DaySchedule {
  open: boolean
  openTime: string
  closeTime: string
  breakEnabled: boolean
  breakStart: string
  breakEnd: string
}

const defaultSchedule: Record<string, DaySchedule> = {
  maandag: { open: true, openTime: '11:00', closeTime: '21:00', breakEnabled: false, breakStart: '15:00', breakEnd: '17:00' },
  dinsdag: { open: true, openTime: '11:00', closeTime: '21:00', breakEnabled: false, breakStart: '15:00', breakEnd: '17:00' },
  woensdag: { open: false, openTime: '11:00', closeTime: '21:00', breakEnabled: false, breakStart: '15:00', breakEnd: '17:00' },
  donderdag: { open: true, openTime: '11:00', closeTime: '21:00', breakEnabled: false, breakStart: '15:00', breakEnd: '17:00' },
  vrijdag: { open: true, openTime: '11:00', closeTime: '22:00', breakEnabled: false, breakStart: '15:00', breakEnd: '17:00' },
  zaterdag: { open: true, openTime: '11:00', closeTime: '22:00', breakEnabled: false, breakStart: '15:00', breakEnd: '17:00' },
  zondag: { open: true, openTime: '12:00', closeTime: '21:00', breakEnabled: false, breakStart: '15:00', breakEnd: '17:00' },
}

const dayNames: Record<string, string> = {
  maandag: 'Maandag',
  dinsdag: 'Dinsdag',
  woensdag: 'Woensdag',
  donderdag: 'Donderdag',
  vrijdag: 'Vrijdag',
  zaterdag: 'Zaterdag',
  zondag: 'Zondag',
}

export default function OpeningstijdenPage({ params }: { params: { tenant: string } }) {
  const [schedule, setSchedule] = useState(defaultSchedule)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const updateDay = (day: string, field: keyof DaySchedule, value: string | boolean) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const copyToAllDays = (sourceDay: string) => {
    const source = schedule[sourceDay]
    const newSchedule = { ...schedule }
    Object.keys(newSchedule).forEach(day => {
      if (day !== sourceDay) {
        newSchedule[day] = { ...source }
      }
    })
    setSchedule(newSchedule)
    setSaved(false)
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Openingstijden</h1>
          <p className="text-gray-500">Stel in wanneer je zaak open is</p>
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
              <span>Opslaan...</span>
            </>
          ) : saved ? (
            <>
              <span>✓</span>
              <span>Opgeslagen!</span>
            </>
          ) : (
            <>
              <span>💾</span>
              <span>Opslaan</span>
            </>
          )}
        </motion.button>
      </div>

      {/* Schedule */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-sm overflow-hidden"
      >
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <span>🕐</span> Weekschema
          </h2>
        </div>

        <div className="divide-y">
          {Object.entries(schedule).map(([day, daySchedule], index) => (
            <motion.div
              key={day}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`p-6 ${!daySchedule.open ? 'bg-gray-50' : ''}`}
            >
              <div className="flex items-center justify-between gap-4">
                {/* Day Name & Toggle */}
                <div className="flex items-center gap-4 min-w-[140px]">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={daySchedule.open}
                      onChange={(e) => updateDay(day, 'open', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                  </label>
                  <span className={`font-medium ${daySchedule.open ? 'text-gray-900' : 'text-gray-400'}`}>
                    {dayNames[day]}
                  </span>
                </div>

                {/* Time Inputs */}
                {daySchedule.open ? (
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={daySchedule.openTime}
                        onChange={(e) => updateDay(day, 'openTime', e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                      <span className="text-gray-400">tot</span>
                      <input
                        type="time"
                        value={daySchedule.closeTime}
                        onChange={(e) => updateDay(day, 'closeTime', e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>

                    {/* Break Toggle */}
                    <button
                      onClick={() => updateDay(day, 'breakEnabled', !daySchedule.breakEnabled)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        daySchedule.breakEnabled 
                          ? 'bg-orange-100 text-orange-600' 
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {daySchedule.breakEnabled ? '☕ Pauze aan' : '+ Pauze'}
                    </button>

                    {/* Copy Button */}
                    <button
                      onClick={() => copyToAllDays(day)}
                      className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                      title="Kopieer naar alle dagen"
                    >
                      📋 Kopieer
                    </button>
                  </div>
                ) : (
                  <div className="flex-1">
                    <span className="text-gray-400 text-sm">Gesloten</span>
                  </div>
                )}
              </div>

              {/* Break Times */}
              {daySchedule.open && daySchedule.breakEnabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 ml-[156px] flex items-center gap-2"
                >
                  <span className="text-sm text-gray-500">Pauze:</span>
                  <input
                    type="time"
                    value={daySchedule.breakStart}
                    onChange={(e) => updateDay(day, 'breakStart', e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                  />
                  <span className="text-gray-400">tot</span>
                  <input
                    type="time"
                    value={daySchedule.breakEnd}
                    onChange={(e) => updateDay(day, 'breakEnd', e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                  />
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Special Days */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-6 bg-white rounded-2xl p-6 shadow-sm"
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span>📅</span> Speciale dagen
        </h2>
        <p className="text-gray-500 text-sm mb-4">
          Voeg uitzonderingen toe voor feestdagen of vakanties
        </p>
        <button className="px-4 py-2 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-orange-500 hover:text-orange-500 transition-colors w-full">
          + Uitzondering toevoegen
        </button>
      </motion.div>

      {/* Preview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-6 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-6 text-white"
      >
        <h3 className="font-semibold text-lg mb-4">Preview op website</h3>
        <div className="bg-white/10 rounded-xl p-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(schedule).map(([day, daySchedule]) => (
              <div key={day} className="flex justify-between">
                <span className="capitalize">{day}</span>
                <span>
                  {daySchedule.open 
                    ? `${daySchedule.openTime} - ${daySchedule.closeTime}`
                    : 'Gesloten'
                  }
                </span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
