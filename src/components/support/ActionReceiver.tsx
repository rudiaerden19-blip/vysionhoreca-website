'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSupportSessionSafe, SupportAction } from './SupportSessionProvider'

interface ClickHighlight {
  id: string
  x: number
  y: number
  label: string
}

/**
 * Ontvangt acties van support en voert ze uit + toont visuele feedback.
 * Alleen actief als er een sessie is en NIET de support persoon.
 */
export function ActionReceiver() {
  const session = useSupportSessionSafe()
  const [highlights, setHighlights] = useState<ClickHighlight[]>([])
  const [lastProcessedTimestamp, setLastProcessedTimestamp] = useState(0)

  // Verwerk binnenkomende acties
  useEffect(() => {
    if (!session?.lastAction || session.isSupport) return
    
    const action = session.lastAction

    // Voorkom dubbele verwerking
    if (action.timestamp <= lastProcessedTimestamp) return
    setLastProcessedTimestamp(action.timestamp)

    // Vind het element
    const element = action.selector === 'window' 
      ? null 
      : document.querySelector(action.selector)

    switch (action.type) {
      case 'click':
        if (element) {
          // Scroll element into view
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          
          // Highlight toevoegen
          const rect = element.getBoundingClientRect()
          const highlight: ClickHighlight = {
            id: `${action.timestamp}`,
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
            label: action.supportName
          }
          setHighlights(prev => [...prev, highlight])
          
          // Simuleer de click na korte delay (zodat highlight zichtbaar is)
          setTimeout(() => {
            (element as HTMLElement).click()
          }, 300)

          // Verwijder highlight na 2 seconden
          setTimeout(() => {
            setHighlights(prev => prev.filter(h => h.id !== highlight.id))
          }, 2000)
        }
        break

      case 'input':
        if (element && 'value' in element) {
          (element as HTMLInputElement).value = action.value || ''
          // Trigger input event zodat React state update
          element.dispatchEvent(new Event('input', { bubbles: true }))
          element.dispatchEvent(new Event('change', { bubbles: true }))
          
          // Highlight het veld
          highlightElement(element as HTMLElement, action.supportName)
        }
        break

      case 'focus':
        if (element) {
          (element as HTMLElement).focus()
          highlightElement(element as HTMLElement, action.supportName)
        }
        break

      case 'scroll':
        if (action.scrollTop !== undefined) {
          window.scrollTo({ top: action.scrollTop, behavior: 'smooth' })
        }
        break
    }
  }, [session?.lastAction, session?.isSupport, lastProcessedTimestamp])

  // Helper om element te highlighten zonder click effect
  const highlightElement = (element: HTMLElement, label: string) => {
    const rect = element.getBoundingClientRect()
    const highlight: ClickHighlight = {
      id: `${Date.now()}`,
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      label
    }
    setHighlights(prev => [...prev, highlight])
    setTimeout(() => {
      setHighlights(prev => prev.filter(h => h.id !== highlight.id))
    }, 1500)
  }

  // Als geen sessie of support persoon, render niks
  if (!session?.activeSession || session.isSupport) {
    return null
  }

  return (
    <>
      {/* Click highlights */}
      <AnimatePresence>
        {highlights.map(highlight => (
          <motion.div
            key={highlight.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed pointer-events-none z-[9998]"
            style={{
              left: highlight.x,
              top: highlight.y,
              transform: 'translate(-50%, -50%)'
            }}
          >
            {/* Outer ring */}
            <motion.div
              animate={{ scale: [1, 1.5, 1] }}
              transition={{ duration: 0.5, repeat: 2 }}
              className="absolute inset-0 w-16 h-16 -ml-8 -mt-8 rounded-full border-4 border-blue-500 opacity-50"
            />
            
            {/* Inner dot */}
            <div className="w-6 h-6 -ml-3 -mt-3 bg-blue-600 rounded-full shadow-lg flex items-center justify-center">
              <span className="text-white text-xs">👆</span>
            </div>
            
            {/* Label */}
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="absolute top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-blue-600 text-white text-xs px-2 py-1 rounded-full shadow-lg"
            >
              {highlight.label}
            </motion.div>
          </motion.div>
        ))}
      </AnimatePresence>
    </>
  )
}
