'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useSupportSessionSafe } from './SupportSessionProvider'

/**
 * Banner die toont wanneer support meekijkt.
 * Volledig passief - raakt geen bestaande functionaliteit aan.
 */
export function SupportBanner() {
  const session = useSupportSessionSafe()

  // Als geen provider of geen actieve sessie, toon niks
  if (!session?.activeSession || session.isSupport) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 shadow-lg"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
          {/* Pulserende indicator */}
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
          
          <span className="font-medium">
            🎧 <strong>{session.activeSession.support_user_name}</strong> kijkt live mee om je te helpen
          </span>

          {/* Connection status */}
          <span className={`text-xs px-2 py-1 rounded-full ${
            session.isConnected ? 'bg-green-500/30' : 'bg-yellow-500/30'
          }`}>
            {session.isConnected ? '● Verbonden' : '○ Verbinden...'}
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
