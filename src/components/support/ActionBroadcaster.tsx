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
    // Probeer ID eerst
    if (element.id) {
      return `#${element.id}`
    }

    // Probeer data-testid
    const testId = element.getAttribute('data-testid')
    if (testId) {
      return `[data-testid="${testId}"]`
    }

    // Bouw een pad van parent naar element
    const path: string[] = []
    let current: Element | null = element

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase()

      // Voeg classes toe voor specificiteit
      if (current.className && typeof current.className === 'string') {
        const classes = current.className.split(' ').filter(c => 
          c && !c.includes('hover') && !c.includes('focus') && !c.includes('active')
        ).slice(0, 2)
        if (classes.length) {
          selector += '.' + classes.join('.')
        }
      }

      // Voeg nth-child toe voor uniekheid
      const parent = current.parentElement
      if (parent) {
        const siblings = Array.from(parent.children).filter(
          c => c.tagName === current!.tagName
        )
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1
          selector += `:nth-of-type(${index})`
        }
      }

      path.unshift(selector)
      current = current.parentElement
    }

    return path.join(' > ')
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
