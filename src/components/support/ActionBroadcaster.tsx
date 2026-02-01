'use client'

import { useEffect, useCallback } from 'react'
import { useSupportSessionSafe } from './SupportSessionProvider'

/**
 * Vangt clicks en input van de support persoon en broadcast ze.
 * Alleen actief als isSupport = true.
 */
export function ActionBroadcaster() {
  const session = useSupportSessionSafe()

  // Genereer een unieke CSS selector voor een element
  const getSelector = useCallback((element: Element): string => {
    try {
      // Probeer ID eerst
      if (element.id) {
        return `#${CSS.escape(element.id)}`
      }

      // Probeer data-testid
      const testId = element.getAttribute('data-testid')
      if (testId) {
        return `[data-testid="${testId}"]`
      }

      // Probeer name attribuut voor form elements
      const name = element.getAttribute('name')
      if (name) {
        return `[name="${name}"]`
      }

      // Simpele fallback: gebruik alleen tag + eerste class
      const tag = element.tagName.toLowerCase()
      if (element.className && typeof element.className === 'string') {
        const firstClass = element.className.split(' ').find(c => 
          c && c.length > 2 && !c.includes(':') && !c.includes('[') && /^[a-zA-Z]/.test(c)
        )
        if (firstClass) {
          const selector = `${tag}.${CSS.escape(firstClass)}`
          // Verify selector is valid
          try {
            document.querySelector(selector)
            return selector
          } catch {
            // Invalid selector, continue
          }
        }
      }

      // Laatste fallback: alleen tag naam
      return tag
    } catch (e) {
      console.warn('Failed to generate selector:', e)
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
