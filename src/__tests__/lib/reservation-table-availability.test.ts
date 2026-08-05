import {
  findReservationBlockingTableSlot,
  reservationOccupiedEndMinutes,
} from '@/lib/reservation-table-availability'

describe('reservation-table-availability', () => {
  const base = {
    reservation_date: '2026-08-05',
    duration_minutes: 90,
    table_number: '1',
    status: 'CHECKED_IN',
    guest_name: 'Rudi',
  }

  it('geen conflict als nieuw slot na einde bestaande reservatie', () => {
    const reservations = [{ ...base, id: 'a', reservation_time: '15:00' }]
    const conflict = findReservationBlockingTableSlot(reservations, {
      tableNumber: '1',
      date: '2026-08-05',
      slotStartHm: '19:00',
      slotDurationMinutes: 90,
      defaultDurationMinutes: 90,
      now: new Date('2026-08-05T18:30:00'),
    })
    expect(conflict).toBeNull()
  })

  it('conflict als nieuw slot overlapt met geplande reservatie', () => {
    const reservations = [{ ...base, id: 'a', reservation_time: '18:00', status: 'CONFIRMED' }]
    const conflict = findReservationBlockingTableSlot(reservations, {
      tableNumber: '1',
      date: '2026-08-05',
      slotStartHm: '19:00',
      slotDurationMinutes: 90,
      defaultDurationMinutes: 90,
    })
    expect(conflict?.id).toBe('a')
  })

  it('CHECKED_IN vandaag verlengt bezetting tot nu als geplande duur voorbij is', () => {
    const end = reservationOccupiedEndMinutes(
      { ...base, reservation_time: '15:00' },
      { defaultDurationMinutes: 90, now: new Date('2026-08-05T18:30:00') },
    )
    expect(end).toBe(18 * 60 + 30)
    const conflict = findReservationBlockingTableSlot(
      [{ ...base, id: 'a', reservation_time: '15:00' }],
      {
        tableNumber: '1',
        date: '2026-08-05',
        slotStartHm: '18:00',
        slotDurationMinutes: 90,
        defaultDurationMinutes: 90,
        now: new Date('2026-08-05T18:30:00'),
      },
    )
    expect(conflict?.id).toBe('a')
  })

  it('COMPLETED blokkeert niet', () => {
    const reservations = [{ ...base, id: 'a', reservation_time: '18:00', status: 'COMPLETED' }]
    const conflict = findReservationBlockingTableSlot(reservations, {
      tableNumber: '1',
      date: '2026-08-05',
      slotStartHm: '19:00',
      slotDurationMinutes: 90,
    })
    expect(conflict).toBeNull()
  })
})
