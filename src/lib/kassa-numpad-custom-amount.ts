/** Numpadbedrag — komma of punt; eenvoudige expressie na «=»-stijl ook. */
export function parseKassaNumpadAmount(raw: string): number | null {
  const s = raw.trim()
  if (!s) return null
  let toParse = s
  if (/[+\-×]/.test(s)) {
    try {
      const expr = s.replace(/×/g, '*').replace(/,/g, '.')
      // eslint-disable-next-line no-new-func
      const result = Function('"use strict"; return (' + expr + ')')()
      if (typeof result === 'number' && Number.isFinite(result)) toParse = String(result)
      else return null
    } catch {
      return null
    }
  } else {
    toParse = s.replace(',', '.')
  }
  const n = parseFloat(toParse)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

/** Opmerkingenveld + toevoegen: geldig bedrag ≥ 0 (inclusief €0). */
export function kassaNumpadShowsCustomLinePanel(raw: string): boolean {
  if (!raw.trim()) return false
  return parseKassaNumpadAmount(raw) !== null
}

/** Mand: bedrag > 0 of minstens één opmerking (€0 + tekst is toegestaan). */
export function kassaNumpadCustomLineCanAdd(amount: number | null, note?: string | null): boolean {
  if (amount === null || amount < 0) return false
  const hasNote = (note ?? '').trim().length > 0
  return amount > 0 || hasNote
}
