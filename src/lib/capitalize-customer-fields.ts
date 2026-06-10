/** Voornaam, achternaam, straat, gemeente — elk woord met hoofdletter. */
export function capitalizeCustomerWords(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return ''
  return trimmed
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const lower = word.toLocaleLowerCase('nl-BE')
      return lower.charAt(0).toLocaleUpperCase('nl-BE') + lower.slice(1)
    })
    .join(' ')
}

export function normalizeCustomerBtwNumber(raw: string): string {
  return raw.replace(/\s+/g, '').toUpperCase()
}
