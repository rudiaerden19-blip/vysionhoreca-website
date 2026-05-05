'use client'

import { useEffect, useRef, useState } from 'react'
import { Search, Send, Star } from 'lucide-react'
import type { GuestProfile } from './kassa-reservations-model'

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

export function ContactsView({
  guestProfiles,
  searchQuery,
  setSearchQuery,
  onPromoMailClick,
  onBulkPromoMailClick,
  promoSelectionReset = 0,
  rk,
}: {
  guestProfiles: GuestProfile[]
  searchQuery: string
  setSearchQuery: (q: string) => void
  onPromoMailClick: (guest: GuestProfile) => void
  onBulkPromoMailClick: (guests: GuestProfile[]) => void
  promoSelectionReset?: number
  rk: (key: string, rep?: Record<string, string>) => string
}) {
  const [guestSort, setGuestSort] = useState<'lastVisit' | 'name' | 'visits'>('lastVisit')
  const [guestSortDir, setGuestSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const [noShowRed, setNoShowRed] = useState<Set<string>>(new Set())
  const [selectedGuestIds, setSelectedGuestIds] = useState<Set<string>>(new Set())
  const headerSelectRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setSelectedGuestIds(new Set())
  }, [promoSelectionReset])

  const changeSort = (col: typeof guestSort) => {
    if (guestSort === col) setGuestSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setGuestSort(col)
      setGuestSortDir('desc')
    }
    setPage(0)
  }

  const filtered = guestProfiles
    .filter((g) => {
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      return (
        g.name.toLowerCase().includes(q) || g.phone?.includes(q) || g.email?.toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      let cmp = 0
      if (guestSort === 'visits') cmp = a.totalVisits - b.totalVisits
      else if (guestSort === 'name') cmp = a.name.localeCompare(b.name)
      else cmp = (a.lastVisit || '').localeCompare(b.lastVisit || '')
      return guestSortDir === 'desc' ? -cmp : cmp
    })

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated = filtered.slice(page * pageSize, page * pageSize + pageSize)
  const from = filtered.length === 0 ? 0 : page * pageSize + 1
  const to = Math.min(page * pageSize + pageSize, filtered.length)

  const pageIds = paginated.map((g) => g.id)
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedGuestIds.has(id))
  const somePageSelected = pageIds.some((id) => selectedGuestIds.has(id))
  const selectedWithEmail = filtered.filter((g) => selectedGuestIds.has(g.id) && g.email?.trim())
  const selectedTotal = selectedGuestIds.size

  useEffect(() => {
    const el = headerSelectRef.current
    if (el) el.indeterminate = somePageSelected && !allPageSelected
  }, [somePageSelected, allPageSelected])

  const toggleSelectPage = () => {
    setSelectedGuestIds((prev) => {
      const next = new Set(prev)
      if (allPageSelected) pageIds.forEach((id) => next.delete(id))
      else pageIds.forEach((id) => next.add(id))
      return next
    })
  }

  const toggleSelectRow = (id: string) => {
    setSelectedGuestIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const GRID_COLS = '44px minmax(100px,1.6fr) minmax(100px,1.2fr) minmax(140px,2fr) minmax(88px,1fr) 72px 88px'

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setPage(0)
          }}
          placeholder="Zoek op naam, email of telefoon..."
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-[#075985]"
        />
      </div>

      <p className="text-sm text-gray-400">{filtered.length} contacten</p>

      {selectedTotal > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#bcc8dc] bg-[#f2f5fa] px-4 py-3 text-sm">
          <span className="font-semibold text-gray-800">
            {selectedTotal} geselecteerd
            {selectedWithEmail.length !== selectedTotal && (
              <span className="font-normal text-gray-500"> ({selectedWithEmail.length} met e-mail)</span>
            )}
          </span>
          <button
            type="button"
            disabled={selectedWithEmail.length === 0}
            onClick={() => onBulkPromoMailClick(selectedWithEmail)}
            className="flex min-h-[44px] items-center gap-2 rounded-xl bg-[#58CCFF] px-4 py-2 font-bold text-[#063042] shadow-sm transition-colors hover:bg-[#43bef7] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={16} />
            Promotie e-mail{selectedWithEmail.length > 0 ? ` (${selectedWithEmail.length})` : ''}
          </button>
          <button
            type="button"
            onClick={() => setSelectedGuestIds(new Set())}
            className="min-h-[44px] rounded-lg px-3 text-sm font-medium text-gray-600 underline decoration-gray-300 hover:text-gray-900"
          >
            Selectie wissen
          </button>
        </div>
      )}

      {paginated.length === 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white py-16 text-center text-gray-400">
          {searchQuery ? rk('guestsSearchNoResults') : rk('guestsEmpty')}
        </div>
      )}

      {paginated.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div
            className="grid items-center px-4 py-3 text-xs font-bold uppercase tracking-wider text-white"
            style={{
              gridTemplateColumns: GRID_COLS,
              columnGap: '12px',
              backgroundColor: '#075985',
            }}
          >
            <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
              <input
                ref={headerSelectRef}
                type="checkbox"
                checked={allPageSelected}
                onChange={toggleSelectPage}
                className="h-5 w-5 cursor-pointer rounded border-white/50 text-[#075985] focus:ring-2 focus:ring-white/80"
                title="Selecteer alle contacten op deze pagina"
                aria-label="Selecteer alle contacten op deze pagina"
              />
            </div>
            <div
              onClick={() => changeSort('name')}
              className="flex cursor-pointer select-none items-center gap-1 hover:opacity-80"
            >
              Naam {guestSort === 'name' && <span>{guestSortDir === 'desc' ? '↓' : '↑'}</span>}
            </div>
            <div>Telefoon</div>
            <div>E-mail</div>
            <div
              onClick={() => changeSort('lastVisit')}
              className="hidden cursor-pointer select-none items-center gap-1 hover:opacity-80 md:flex"
            >
              Laatste bezoek {guestSort === 'lastVisit' && <span>{guestSortDir === 'desc' ? '↓' : '↑'}</span>}
            </div>
            <div
              onClick={() => changeSort('visits')}
              className="flex cursor-pointer select-none items-center gap-1 hover:opacity-80"
            >
              Bezoeken {guestSort === 'visits' && <span>{guestSortDir === 'desc' ? '↓' : '↑'}</span>}
            </div>
            <div>No-show</div>
          </div>

          <div className="divide-y divide-gray-100">
            {paginated.map((guest: GuestProfile) => {
              const isRed = noShowRed.has(guest.id)
              const lastVisitFmt = guest.lastVisit
                ? new Date(guest.lastVisit + 'T12:00').toLocaleDateString('nl-BE', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : '—'
              return (
                <div
                  key={guest.id}
                  className="grid items-center px-4 py-3 transition-colors hover:bg-gray-50"
                  style={{ gridTemplateColumns: GRID_COLS, columnGap: '12px' }}
                >
                  <div className="flex justify-center">
                    <input
                      type="checkbox"
                      checked={selectedGuestIds.has(guest.id)}
                      onChange={() => toggleSelectRow(guest.id)}
                      className="h-5 w-5 cursor-pointer rounded border-gray-300 text-[#075985] focus:ring-[#075985]"
                      aria-label={`Selecteer ${guest.name}`}
                    />
                  </div>
                  <div className="flex min-w-0 items-center gap-1.5 pr-2 font-semibold text-gray-900">
                    {guest.isVip && (
                      <Star size={12} className="flex-shrink-0 fill-amber-400 text-amber-400" />
                    )}
                    <span className="truncate">{guest.name}</span>
                  </div>
                  <div className="pr-2 text-sm text-gray-600">
                    {guest.phone ? (
                      <a href={`tel:${guest.phone}`} className="hover:text-[#075985] hover:underline">
                        {guest.phone}
                      </a>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </div>
                  <div className="flex min-w-0 items-center gap-1.5 pr-1">
                    {guest.email ? (
                      <>
                        <a
                          href={`mailto:${guest.email}`}
                          className="min-w-0 truncate text-sm text-[#075985] hover:underline"
                          title={guest.email}
                        >
                          {guest.email}
                        </a>
                        <button
                          type="button"
                          onClick={() => onPromoMailClick(guest)}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#58CCFF] text-[#063042] shadow-sm transition-colors hover:bg-[#43bef7] active:bg-[#34ade7]"
                          title="Promotie-e-mail versturen"
                          aria-label={`Promotie-e-mail naar ${guest.name}`}
                        >
                          <Send size={16} className="shrink-0" strokeWidth={2.25} />
                        </button>
                      </>
                    ) : (
                      <span className="text-sm text-gray-300">—</span>
                    )}
                  </div>
                  <div className="hidden pr-2 text-sm text-gray-500 md:block">{lastVisitFmt}</div>
                  <div className="pr-2 text-right font-bold text-gray-800">{guest.totalVisits}</div>
                  <button
                    type="button"
                    onClick={() =>
                      setNoShowRed((prev) => {
                        const s = new Set(prev)
                        s.has(guest.id) ? s.delete(guest.id) : s.add(guest.id)
                        return s
                      })
                    }
                    className={`w-fit rounded-full px-3 py-1 text-xs font-semibold transition-colors ${isRed ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                  >
                    No-show
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500">
        <span>
          {from}–{to} van {filtered.length}
        </span>
        <div className="flex items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value))
              setPage(0)
            }}
            className="cursor-pointer rounded-lg border border-gray-200 bg-gray-100 px-2 py-1 text-sm outline-none"
          >
            {PAGE_SIZE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s} per pagina
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="flex h-8 w-8 items-center justify-center rounded-lg font-bold hover:bg-gray-100 disabled:opacity-30"
          >
            ‹
          </button>
          <span className="font-medium">
            {page + 1} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="flex h-8 w-8 items-center justify-center rounded-lg font-bold hover:bg-gray-100 disabled:opacity-30"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  )
}
