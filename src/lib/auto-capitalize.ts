/**
 * Auto-capitalize: Eerste letter + na punt automatisch hoofdletter
 * 
 * Gebruik: onInput={(e) => autoCapitalize(e)}
 */

export function autoCapitalize(event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>) {
  const input = event.currentTarget
  const value = input.value
  
  if (!value) return
  
  // Eerste letter altijd hoofdletter
  let newValue = value.charAt(0).toUpperCase() + value.slice(1)
  
  // Na een punt + spatie: volgende letter hoofdletter
  newValue = newValue.replace(/\. ([a-z])/g, (match, letter) => {
    return '. ' + letter.toUpperCase()
  })
  
  // Alleen updaten als er iets veranderd is
  if (newValue !== value) {
    const cursorPos = input.selectionStart || 0
    input.value = newValue
    // Cursor positie behouden
    input.setSelectionRange(cursorPos, cursorPos)
  }
}

/**
 * Capitalize een string (voor server-side of display)
 */
export function capitalizeText(text: string): string {
  if (!text) return ''
  
  // Eerste letter hoofdletter
  let result = text.charAt(0).toUpperCase() + text.slice(1)
  
  // Na punt + spatie: hoofdletter
  result = result.replace(/\. ([a-z])/g, (match, letter) => {
    return '. ' + letter.toUpperCase()
  })
  
  return result
}
