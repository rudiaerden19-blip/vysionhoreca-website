'use client'

import { useEffect } from 'react'

/**
 * Global Auto-Capitalize Component
 * 
 * Voegt automatisch hoofdletters toe aan:
 * - Eerste letter van elk tekstveld
 * - Eerste letter na een punt (. )
 * 
 * NIET voor: email, password, url velden
 */
export function GlobalAutoCapitalize() {
  useEffect(() => {
    function handleInput(event: Event) {
      const target = event.target as HTMLInputElement | HTMLTextAreaElement
      
      // Skip als het geen input/textarea is
      if (!target || (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA')) {
        return
      }
      
      // Skip bepaalde input types
      const inputType = target.getAttribute('type')?.toLowerCase()
      if (inputType === 'email' || inputType === 'password' || inputType === 'url' || inputType === 'number' || inputType === 'checkbox' || inputType === 'radio' || inputType === 'range' || inputType === 'color' || inputType === 'file' || inputType === 'hidden') {
        return
      }
      
      // Skip als autocapitalize="off" is gezet
      if (target.getAttribute('autocapitalize') === 'off' || target.getAttribute('data-no-capitalize') === 'true') {
        return
      }
      
      const value = target.value
      if (!value) return
      
      // Eerste letter altijd hoofdletter
      let newValue = value.charAt(0).toUpperCase() + value.slice(1)
      
      // Na een punt + spatie: volgende letter hoofdletter
      newValue = newValue.replace(/\. ([a-z])/g, (match, letter) => {
        return '. ' + letter.toUpperCase()
      })
      
      // Alleen updaten als er iets veranderd is
      if (newValue !== value) {
        const cursorPos = target.selectionStart || 0
        target.value = newValue
        // Cursor positie behouden
        target.setSelectionRange(cursorPos, cursorPos)
        
        // Trigger change event voor React state updates
        const event = new Event('input', { bubbles: true })
        target.dispatchEvent(event)
      }
    }
    
    // Voeg global listener toe
    document.addEventListener('input', handleInput, true)
    
    return () => {
      document.removeEventListener('input', handleInput, true)
    }
  }, [])
  
  return null // Rendert niets, alleen side-effect
}
