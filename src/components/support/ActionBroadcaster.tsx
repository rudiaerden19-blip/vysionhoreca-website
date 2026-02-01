'use client'

import { useEffect, useCallback } from 'react'
import { useSupportSessionSafe } from './SupportSessionProvider'

/**
 * Vangt clicks en input van de support persoon en broadcast ze.
 * Alleen actief als isSupport = true.
 */
export function ActionBroadcaster() {
  const session = useSupportSessionSafe()

  // Genereer een simpele selector voor een element
  const getSelector = useCallback((element: Element): string => {
    try {
      // Alleen ID gebruiken als het simpel is
      if (element.id && /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(element.id)) {
        return `#${element.id}`
      }

      // Data-testid
      const testId = element.getAttribute('data-testid')
      if (testId) {
        return `[data-testid="${testId}"]`
      }

      // Name attribuut
      const name = element.getAttribute('name')
      if (name && /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) {
        return `[name="${name}"]`
      }

      // Gewoon de tag
      return element.tagName.toLowerCase()
    } catch {
      return 'body'
    }
  }, [])

  // Click handler
  useEffect(() => {
    if (!session?.isSupport || !session.activeSession) return

    const handleClick = (e: MouseEvent) => {
      const target = e.target as Element
      if (!target) return

      const selector = getSelector(target)
      
      session.broadcastAction({
        type: 'click',
        selector
      })
    }

    // Input handler
    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement
      if (!target || !('value' in target)) return

      const selector = getSelector(target)
      
      session.broadcastAction({
        type: 'input',
        selector,
        value: target.value
      })
    }

    // Focus handler
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as Element
      if (!target) return

      const selector = getSelector(target)
      
      session.broadcastAction({
        type: 'focus',
        selector
      })
    }

    // Scroll handler (throttled)
    let scrollTimeout: NodeJS.Timeout
    const handleScroll = () => {
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        session.broadcastAction({
          type: 'scroll',
          selector: 'window',
          scrollTop: window.scrollY
        })
      }, 100)
    }

    // Add listeners
    document.addEventListener('click', handleClick, true)
    document.addEventListener('input', handleInput, true)
    document.addEventListener('focus', handleFocus, true)
    window.addEventListener('scroll', handleScroll, true)

    return () => {
      document.removeEventListener('click', handleClick, true)
      document.removeEventListener('input', handleInput, true)
      document.removeEventListener('focus', handleFocus, true)
      window.removeEventListener('scroll', handleScroll, true)
      clearTimeout(scrollTimeout)
    }
  }, [session, getSelector])

  // Deze component rendert niks - alleen event listeners
  return null
}
