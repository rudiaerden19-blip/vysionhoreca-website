'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSupportSessionSafe } from './SupportSessionProvider'

/**
 * Controls voor de support persoon om een sessie te starten/stoppen.
 * Toont alleen als er GEEN actieve sessie is, of als je de support bent.
 */
export function SupportControls() {
  const session = useSupportSessionSafe()
  const [isExpanded, setIsExpanded] = useState(false)
  const [supportName, setSupportName] = useState('Rudi')

  if (!session) return null

  // Als er een actieve sessie is en ik ben de support
  if (session.activeSession && session.isSupport) {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed top-20 right-4 z-[9999]"
      >
        <div className="bg-red-600 text-white rounded-2xl shadow-2xl p-4 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
            </span>
            <span className="font-bold">Support Actief</span>
          </div>
          
          <button
            onClick={() => session.endSession()}
            className="bg-white text-red-600 px-4 py-2 rounded-xl font-bold hover:bg-red-100 transition-colors"
          >
            ⏹ Stop Sessie
          </button>
        </div>
      </motion.div>
    )
  }

  // Als er een actieve sessie is maar ik ben NIET de support, toon niks
  if (session.activeSession && !session.isSupport) {
    return null
  }

  // Geen actieve sessie - toon start knop
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="fixed top-20 right-4 z-[9999]"
    >
      <AnimatePresence>
        {isExpanded ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl p-4 mb-2 border-2 border-blue-200"
          >
            <div className="text-sm font-medium text-gray-700 mb-2">Je naam:</div>
            <input
              type="text"
              value={supportName}
              onChange={(e) => setSupportName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg mb-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Support naam"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setIsExpanded(false)}
                className="flex-1 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Annuleer
              </button>
              <button
                onClick={() => {
                  session.startSession(supportName || 'Support')
                  setIsExpanded(false)
                }}
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
              >
                Start
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center text-2xl transition-colors"
        title="Start Support Sessie"
      >
        🎧
      </button>
    </motion.div>
  )
}
