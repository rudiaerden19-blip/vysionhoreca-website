/** Statussen waarvoor de eigenaar een «nieuwe online reservering»-melding krijgt (kassa + admin). */
export function reservationStatusNeedsOwnerAlert(status: string | null | undefined): boolean {
  const s = (status || '').toUpperCase()
  return s === 'PENDING' || s === 'WAITLIST' || s === 'CONFIRMED'
}

export function normalizeReservationStatus(status: string | null | undefined): string {
  return (status || '').toUpperCase()
}
