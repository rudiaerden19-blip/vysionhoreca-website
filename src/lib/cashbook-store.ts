import type { SupabaseClient } from '@supabase/supabase-js'
import {
  cashbookBadge,
  cashbookWriteBlock,
  cashDifferenceCents,
  eurosToCents,
  expectedCashCents,
  isCashbookMovementType,
  orderBelongsToCashbookDay,
  summarizeCashbookOrders,
  vatLinesFromAggregate,
  type CashbookMovementType,
  type CashbookVatLine,
} from '@/lib/cashbook-calc'
import { orderCountsTowardRevenueAndZReport } from '@/lib/admin-api-order-helpers'
import { aggregateZReportVatFromOrderRows } from '@/lib/order-vat'
import {
  businessDayForOrder,
  fetchOpeningHoursForTenant,
  getTenantBusinessDayBounds,
  type TenantHourRow,
} from '@/lib/tenant-business-day'
import { fetchZReportVatContextFromSupabase } from '@/lib/z-report-vat-context'

const ORDER_SELECT =
  'id,order_number,status,payment_status,payment_method,payment_split_cash,payment_split_card,order_type,total,subtotal,tax,discount_amount,created_at'
const ORDER_SELECT_WITH_ITEMS =
  'id,order_number,status,payment_status,payment_method,payment_split_cash,payment_split_card,order_type,total,subtotal,tax,discount_amount,created_at,items'

export type CashbookMovementRow = {
  id: string
  book_date: string
  movement_type: CashbookMovementType
  amount_cents: number
  description: string
  reason: string | null
  staff_name: string | null
  reference: string | null
  created_by: string
  created_at: string
}

export type CashbookDayView = {
  storageReady: boolean
  date: string
  status: 'none' | 'open' | 'closed'
  openingCents: number
  payments: ReturnType<typeof summarizeCashbookOrders>['payments']
  cancelledCount: number
  cancelledCents: number
  vat: CashbookVatLine[]
  taxCents: number
  exclCents: number
  movements: CashbookMovementRow[]
  adjustments: Array<Record<string, unknown>>
  audits: Array<Record<string, unknown>>
  expectedCents: number
  countedCents: number | null
  differenceCents: number | null
  closeNote: string | null
  openedAt: string | null
  openedBy: string | null
  closedAt: string | null
  closedBy: string | null
  businessName: string
  btwNumber: string
  address: string
}

function missingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  return /42P01|PGRST205|does not exist|schema cache/i.test(`${error.code || ''} ${error.message || ''}`)
}

async function fetchOrders(
  client: SupabaseClient,
  tenantSlug: string,
  startUTC: string,
  endUTC: string,
  includeItems = false,
): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = []
  let from = 0
  for (let page = 0; page < 50; page++) {
    const { data, error } = await client
      .from('orders')
      .select(includeItems ? ORDER_SELECT_WITH_ITEMS : ORDER_SELECT)
      .eq('tenant_slug', tenantSlug)
      .gte('created_at', startUTC)
      .lte('created_at', endUTC)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + 999)
    if (error) break
    const chunk = (data || []) as unknown as Record<string, unknown>[]
    all.push(...chunk)
    if (chunk.length < 1000) break
    from += 1000
  }
  return all
}

function movementTotals(movements: CashbookMovementRow[]) {
  return movements.map((m) => ({ type: m.movement_type, amountCents: m.amount_cents }))
}

export async function loadCashbookDay(
  client: SupabaseClient,
  tenantSlug: string,
  bookDate: string,
): Promise<CashbookDayView> {
  const hours = (await fetchOpeningHoursForTenant(client, tenantSlug)) as TenantHourRow[]
  const bounds = getTenantBusinessDayBounds(bookDate, hours)
  const [orders, vatCtx, settingsRes, dayRes, moveRes, adjRes, auditRes] = await Promise.all([
    fetchOrders(client, tenantSlug, bounds.startUTC, bounds.endUTC, true),
    fetchZReportVatContextFromSupabase(client, tenantSlug),
    client
      .from('tenant_settings')
      .select('business_name, btw_number, btw_percentage, address, postal_code, city')
      .eq('tenant_slug', tenantSlug)
      .maybeSingle(),
    client.from('cashbook_days').select('*').eq('tenant_slug', tenantSlug).eq('book_date', bookDate).maybeSingle(),
    client
      .from('cashbook_movements')
      .select('*')
      .eq('tenant_slug', tenantSlug)
      .eq('book_date', bookDate)
      .order('created_at', { ascending: true }),
    client
      .from('cashbook_adjustments')
      .select('*')
      .eq('tenant_slug', tenantSlug)
      .eq('book_date', bookDate)
      .order('created_at', { ascending: true }),
    client
      .from('cashbook_audit_log')
      .select('id, actor, action, record_type, record_id, old_value, new_value, reason, created_at, book_date')
      .eq('tenant_slug', tenantSlug)
      .eq('book_date', bookDate)
      .order('created_at', { ascending: true }),
  ])

  const storageReady = !missingTable(dayRes.error) && !missingTable(moveRes.error)
  const summary = summarizeCashbookOrders(orders as never, hours, bookDate)
  const counting = (orders as Array<Record<string, unknown>>).filter((row) => {
    if (!orderBelongsToCashbookDay(String(row.created_at || ''), bookDate, hours)) return false
    return orderCountsTowardRevenueAndZReport(row as never)
  })
  const defaultBtw = Number((settingsRes.data as { btw_percentage?: number } | null)?.btw_percentage) || 6
  const vatAgg = aggregateZReportVatFromOrderRows(
    counting.map((row) => ({
      total: row.total,
      items: row.items,
      order_type: row.order_type as string,
    })),
    defaultBtw,
    vatCtx,
  )
  const day = storageReady ? (dayRes.data as Record<string, unknown> | null) : null
  const movements = storageReady ? ((moveRes.data || []) as CashbookMovementRow[]) : []
  const closed = day?.status === 'closed'
  const openingCents = day ? Number(day.opening_cash_cents) || 0 : 0
  const liveExpected = expectedCashCents({
    openingCents,
    cashSalesCents: summary.payments.cashCents,
    movements: movementTotals(movements),
  })
  const settings = settingsRes.data as {
    business_name?: string
    btw_number?: string
    address?: string
    postal_code?: string
    city?: string
  } | null
  const address = [settings?.address, settings?.postal_code, settings?.city].filter(Boolean).join(', ')

  return {
    storageReady,
    date: bookDate,
    status: day ? (day.status === 'closed' ? 'closed' : 'open') : 'none',
    openingCents,
    payments: summary.payments,
    cancelledCount: summary.cancelledCount,
    cancelledCents: summary.cancelledCents,
    vat: vatLinesFromAggregate(vatAgg),
    taxCents: eurosToCents(vatAgg.totalTax),
    exclCents: eurosToCents(vatAgg.subtotalExcl),
    movements,
    adjustments: storageReady ? ((adjRes.data || []) as Array<Record<string, unknown>>) : [],
    audits: storageReady && !missingTable(auditRes.error) ? ((auditRes.data || []) as Array<Record<string, unknown>>) : [],
    expectedCents: closed ? Number(day?.expected_close_cents) || liveExpected : liveExpected,
    countedCents: closed ? Number(day?.counted_close_cents) : null,
    differenceCents: closed ? Number(day?.difference_cents) : null,
    closeNote: (day?.close_note as string) || null,
    openedAt: (day?.opened_at as string) || null,
    openedBy: (day?.opened_by as string) || null,
    closedAt: (day?.closed_at as string) || null,
    closedBy: (day?.closed_by as string) || null,
    businessName: settings?.business_name || tenantSlug,
    btwNumber: settings?.btw_number || '',
    address,
  }
}

async function audit(
  client: SupabaseClient,
  tenantSlug: string,
  actor: string,
  action: string,
  recordType: string,
  recordId: string | null,
  oldValue: unknown,
  newValue: unknown,
  reason?: string | null,
  bookDate?: string | null,
) {
  const row = {
    tenant_slug: tenantSlug,
    actor,
    action,
    record_type: recordType,
    record_id: recordId,
    old_value: oldValue ?? null,
    new_value: newValue ?? null,
    reason: reason || null,
    book_date: bookDate || null,
  }
  const inserted = await client.from('cashbook_audit_log').insert(row)
  if (inserted.error && /book_date|42703|schema cache/i.test(`${inserted.error.code || ''} ${inserted.error.message || ''}`)) {
    const { book_date: _ignored, ...withoutDate } = row
    await client.from('cashbook_audit_log').insert(withoutDate)
  }
}

export async function saveOpening(
  client: SupabaseClient,
  tenantSlug: string,
  bookDate: string,
  openingCents: number,
  actor: string,
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const existing = await client
    .from('cashbook_days')
    .select('id, status, opening_cash_cents')
    .eq('tenant_slug', tenantSlug)
    .eq('book_date', bookDate)
    .maybeSingle()
  if (missingTable(existing.error)) {
    return { ok: false, error: 'De kasboek-tabellen staan nog niet in de database.', status: 503 }
  }
  const openingBlock = cashbookWriteBlock(existing.data?.status === 'closed' ? 'closed' : existing.data ? 'open' : 'none', 'opening')
  if (openingBlock) return { ok: false, error: openingBlock, status: 409 }
  const now = new Date().toISOString()
  if (!existing.data) {
    const inserted = await client
      .from('cashbook_days')
      .insert({
        tenant_slug: tenantSlug,
        book_date: bookDate,
        status: 'open',
        opening_cash_cents: openingCents,
        opened_at: now,
        opened_by: actor,
      })
      .select('id')
      .single()
    if (inserted.error || !inserted.data) {
      return { ok: false, error: 'Beginsaldo opslaan mislukt.', status: 500 }
    }
    await audit(client, tenantSlug, actor, 'day_opened', 'cashbook_days', inserted.data.id, null, {
      openingCents,
    }, null, bookDate)
    return { ok: true }
  }
  const updated = await client
    .from('cashbook_days')
    .update({ opening_cash_cents: openingCents, updated_at: now })
    .eq('id', existing.data.id)
    .eq('tenant_slug', tenantSlug)
    .eq('status', 'open')
  if (updated.error) return { ok: false, error: 'Beginsaldo opslaan mislukt.', status: 500 }
  await audit(
    client,
    tenantSlug,
    actor,
    'opening_set',
    'cashbook_days',
    existing.data.id,
    { openingCents: existing.data.opening_cash_cents },
    { openingCents },
    null,
    bookDate,
  )
  return { ok: true }
}

export async function addMovement(
  client: SupabaseClient,
  tenantSlug: string,
  bookDate: string,
  input: {
    type: string
    amountCents: number
    description: string
    reason: string
    staffName: string
    reference: string
  },
  actor: string,
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  if (!isCashbookMovementType(input.type)) {
    return { ok: false, error: 'Onbekend type kasbeweging.', status: 400 }
  }
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    return { ok: false, error: 'Bedrag moet groter zijn dan 0.', status: 400 }
  }
  if (!input.description.trim()) {
    return { ok: false, error: 'Omschrijving is verplicht.', status: 400 }
  }
  const day = await client
    .from('cashbook_days')
    .select('id, status')
    .eq('tenant_slug', tenantSlug)
    .eq('book_date', bookDate)
    .maybeSingle()
  if (missingTable(day.error)) {
    return { ok: false, error: 'De kasboek-tabellen staan nog niet in de database.', status: 503 }
  }
  const movementBlock = cashbookWriteBlock(day.data?.status === 'closed' ? 'closed' : day.data ? 'open' : 'none', 'movement')
  if (movementBlock) return { ok: false, error: movementBlock, status: 409 }
  const inserted = await client
    .from('cashbook_movements')
    .insert({
      tenant_slug: tenantSlug,
      book_date: bookDate,
      movement_type: input.type,
      amount_cents: input.amountCents,
      description: input.description.trim(),
      reason: input.reason.trim() || null,
      staff_name: input.staffName.trim() || null,
      reference: input.reference.trim() || null,
      created_by: actor,
    })
    .select('id')
    .single()
  if (inserted.error || !inserted.data) {
    return { ok: false, error: 'Kasbeweging opslaan mislukt.', status: 500 }
  }
  await audit(client, tenantSlug, actor, 'movement_added', 'cashbook_movements', inserted.data.id, null, {
    type: input.type,
    amountCents: input.amountCents,
    description: input.description.trim(),
  }, null, bookDate)
  return { ok: true }
}

export async function closeCashbookDay(
  client: SupabaseClient,
  tenantSlug: string,
  bookDate: string,
  countedCents: number,
  note: string,
  actor: string,
): Promise<{ ok: true; differenceCents: number } | { ok: false; error: string; status: number }> {
  const view = await loadCashbookDay(client, tenantSlug, bookDate)
  if (!view.storageReady) {
    return { ok: false, error: 'De kasboek-tabellen staan nog niet in de database.', status: 503 }
  }
  const closeBlock = cashbookWriteBlock(view.status, 'close')
  if (closeBlock) return { ok: false, error: closeBlock, status: 409 }
  if (!Number.isInteger(countedCents) || countedCents < 0) {
    return { ok: false, error: 'Geteld bedrag is ongeldig.', status: 400 }
  }
  const difference = cashDifferenceCents(countedCents, view.expectedCents)
  if (difference !== 0 && !note.trim()) {
    return { ok: false, error: 'Bij een kasverschil is een reden verplicht.', status: 400 }
  }
  const snapshot = {
    grossCents: view.payments.grossCents,
    cashCents: view.payments.cashCents,
    cardCents: view.payments.cardCents,
    onlineCents: view.payments.onlineCents,
    exclCents: view.exclCents,
    taxCents: view.taxCents,
    discountCents: view.payments.discountCents,
    refundCents: view.payments.refundCents,
    vat: view.vat,
    openingCents: view.openingCents,
    expectedCents: view.expectedCents,
  }
  const now = new Date().toISOString()
  const updated = await client
    .from('cashbook_days')
    .update({
      status: 'closed',
      closed_at: now,
      closed_by: actor,
      expected_close_cents: view.expectedCents,
      counted_close_cents: countedCents,
      difference_cents: difference,
      close_note: note.trim() || null,
      snapshot,
      updated_at: now,
    })
    .eq('tenant_slug', tenantSlug)
    .eq('book_date', bookDate)
    .eq('status', 'open')
    .select('id')
    .maybeSingle()
  if (updated.error || !updated.data) {
    return { ok: false, error: 'Afsluiten mislukt.', status: 500 }
  }
  await audit(client, tenantSlug, actor, 'day_closed', 'cashbook_days', updated.data.id, null, {
    expectedCents: view.expectedCents,
    countedCents,
    differenceCents: difference,
  }, note.trim() || null, bookDate)
  return { ok: true, differenceCents: difference }
}

export async function addAdjustment(
  client: SupabaseClient,
  tenantSlug: string,
  bookDate: string,
  input: { fieldName: string; correctedCents: number; reason: string; movementId?: string },
  actor: string,
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  if (!input.reason.trim()) return { ok: false, error: 'Een reden is verplicht.', status: 400 }
  const day = await client
    .from('cashbook_days')
    .select('id, status, counted_close_cents, expected_close_cents, opening_cash_cents')
    .eq('tenant_slug', tenantSlug)
    .eq('book_date', bookDate)
    .maybeSingle()
  if (missingTable(day.error)) {
    return { ok: false, error: 'De kasboek-tabellen staan nog niet in de database.', status: 503 }
  }
  const adjustBlock = cashbookWriteBlock(day.data?.status === 'closed' ? 'closed' : 'open', 'adjustment')
  if (!day.data || adjustBlock) {
    return { ok: false, error: adjustBlock || 'Een correctie is alleen mogelijk na afsluiting.', status: 409 }
  }
  const dayRow = day.data as { opening_cash_cents?: number; counted_close_cents?: number }
  let field = input.fieldName === 'opening' ? 'opening_cash_cents' : 'counted_close_cents'
  let original = Number(input.fieldName === 'opening' ? dayRow.opening_cash_cents : dayRow.counted_close_cents) || 0
  if (input.movementId) {
    const movement = await client
      .from('cashbook_movements')
      .select('id, amount_cents')
      .eq('id', input.movementId)
      .eq('tenant_slug', tenantSlug)
      .eq('book_date', bookDate)
      .maybeSingle()
    if (!movement.data) return { ok: false, error: 'Kasbeweging niet gevonden.', status: 404 }
    original = Number(movement.data.amount_cents) || 0
    field = `movement:${input.movementId}`
  }
  const corrected = Math.round(input.correctedCents)
  const inserted = await client
    .from('cashbook_adjustments')
    .insert({
      tenant_slug: tenantSlug,
      book_date: bookDate,
      field_name: field,
      original_cents: original,
      corrected_cents: corrected,
      difference_cents: corrected - original,
      reason: input.reason.trim(),
      created_by: actor,
    })
    .select('id')
    .single()
  if (inserted.error || !inserted.data) {
    return { ok: false, error: 'Correctie opslaan mislukt.', status: 500 }
  }
  await audit(
    client,
    tenantSlug,
    actor,
    'adjustment_added',
    'cashbook_adjustments',
    inserted.data.id,
    { cents: original },
    { cents: corrected },
    input.reason.trim(),
    bookDate,
  )
  return { ok: true }
}

export type CashbookRangeRow = {
  date: string
  status: string
  grossCents: number
  cashCents: number
  cardCents: number
  onlineCents: number
  outCents: number
  openingCents: number
  expectedCents: number | null
  countedCents: number | null
  differenceCents: number | null
  adjustmentCount: number
  staffNames: string[]
  exclCents: number
  taxCents: number
  discountCents: number
  refundCents: number
  vat: CashbookVatLine[]
}

export async function loadCashbookRange(
  client: SupabaseClient,
  tenantSlug: string,
  fromDate: string,
  toDate: string,
  options?: { withVat?: boolean },
): Promise<CashbookRangeRow[]> {
  const withVat = options?.withVat === true
  const hours = (await fetchOpeningHoursForTenant(client, tenantSlug)) as TenantHourRow[]
  const start = getTenantBusinessDayBounds(fromDate, hours).startUTC
  const end = getTenantBusinessDayBounds(toDate, hours).endUTC
  const [orders, vatCtx, settingsRes, dayRes, moveRes, adjRes] = await Promise.all([
    fetchOrders(client, tenantSlug, start, end, withVat),
    withVat ? fetchZReportVatContextFromSupabase(client, tenantSlug) : Promise.resolve(null),
    withVat
      ? client.from('tenant_settings').select('btw_percentage').eq('tenant_slug', tenantSlug).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    client
      .from('cashbook_days')
      .select('book_date, status, opening_cash_cents, expected_close_cents, counted_close_cents, difference_cents')
      .eq('tenant_slug', tenantSlug)
      .gte('book_date', fromDate)
      .lte('book_date', toDate),
    client
      .from('cashbook_movements')
      .select('book_date, movement_type, amount_cents, staff_name')
      .eq('tenant_slug', tenantSlug)
      .gte('book_date', fromDate)
      .lte('book_date', toDate),
    client
      .from('cashbook_adjustments')
      .select('book_date')
      .eq('tenant_slug', tenantSlug)
      .gte('book_date', fromDate)
      .lte('book_date', toDate),
  ])
  const defaultBtw = Number((settingsRes.data as { btw_percentage?: number } | null)?.btw_percentage) || 6
  const days = new Map<string, Record<string, unknown>>()
  if (!missingTable(dayRes.error)) {
    for (const row of dayRes.data || []) days.set(String((row as { book_date: string }).book_date), row as Record<string, unknown>)
  }
  const movesByDay = new Map<string, Array<CashbookMovementRow & { staff_name?: string | null }>>()
  if (!missingTable(moveRes.error)) {
    for (const row of (moveRes.data || []) as Array<CashbookMovementRow & { staff_name?: string | null }>) {
      const list = movesByDay.get(row.book_date) || []
      list.push(row)
      movesByDay.set(row.book_date, list)
    }
  }
  const adjustmentsByDay = new Map<string, number>()
  if (!missingTable(adjRes.error)) {
    for (const row of (adjRes.data || []) as Array<{ book_date: string }>) {
      adjustmentsByDay.set(row.book_date, (adjustmentsByDay.get(row.book_date) || 0) + 1)
    }
  }
  const ordersByDay = new Map<string, Record<string, unknown>[]>()
  for (const row of orders) {
    const bookDay = businessDayForOrder(String(row.created_at || ''), hours)
    if (!bookDay || bookDay < fromDate || bookDay > toDate) continue
    const list = ordersByDay.get(bookDay) || []
    list.push(row)
    ordersByDay.set(bookDay, list)
  }
  const dates: string[] = []
  const cursor = new Date(`${fromDate}T12:00:00Z`)
  const endDay = new Date(`${toDate}T12:00:00Z`)
  while (cursor.getTime() <= endDay.getTime() && dates.length < 370) {
    dates.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return dates.map((date) => {
    const dayOrders = ordersByDay.get(date) || []
    const summary = summarizeCashbookOrders(dayOrders as never, hours, date)
    const day = days.get(date)
    const movements = movesByDay.get(date) || []
    const outCents = movements.reduce((sum, m) => {
      const effect = m.movement_type === 'cash_out' || m.movement_type === 'petty_expense' || m.movement_type === 'take_out' || m.movement_type === 'bank_deposit' || m.movement_type === 'correction_out' || m.movement_type === 'other_out'
        ? m.amount_cents
        : 0
      return sum + effect
    }, 0)
    const counting = withVat
      ? dayOrders.filter((row) => orderCountsTowardRevenueAndZReport(row as never))
      : []
    const vatAgg = withVat
      ? aggregateZReportVatFromOrderRows(
          counting.map((row) => ({ total: row.total, items: row.items, order_type: row.order_type as string })),
          defaultBtw,
          vatCtx,
        )
      : null
    const vat = vatLinesFromAggregate(vatAgg)
    const closed = day?.status === 'closed'
    const openingCents = day ? Number(day.opening_cash_cents) || 0 : 0
    const staffNames = Array.from(new Set(movements.map((m) => (m.staff_name || '').trim()).filter(Boolean)))
    const expected = closed
      ? Number(day?.expected_close_cents)
      : day
        ? expectedCashCents({
            openingCents,
            cashSalesCents: summary.payments.cashCents,
            movements: movements.map((m) => ({ type: m.movement_type, amountCents: m.amount_cents })),
          })
        : null
    return {
      date,
      status: day ? String(day.status) : 'none',
      grossCents: summary.payments.grossCents,
      cashCents: summary.payments.cashCents,
      cardCents: summary.payments.cardCents,
      onlineCents: summary.payments.onlineCents,
      outCents,
      openingCents,
      expectedCents: expected,
      countedCents: closed ? Number(day?.counted_close_cents) : null,
      differenceCents: closed ? Number(day?.difference_cents) : null,
      adjustmentCount: adjustmentsByDay.get(date) || 0,
      staffNames,
      exclCents: vatAgg ? eurosToCents(vatAgg.subtotalExcl) : 0,
      taxCents: vatAgg ? eurosToCents(vatAgg.totalTax) : 0,
      discountCents: summary.payments.discountCents,
      refundCents: summary.payments.refundCents,
      vat,
    }
  })
}

export async function loadPendingCloseDays(
  client: SupabaseClient,
  tenantSlug: string,
  today: string,
): Promise<{ count: number; dates: string[] }> {
  const yesterday = shiftBookDate(today, -1)
  const from = `${today.slice(0, 7)}-01`
  if (yesterday < from) return { count: 0, dates: [] }
  const rows = await loadCashbookRange(client, tenantSlug, from, yesterday)
  const dates = rows
    .filter((row) => cashbookBadge({
      status: row.status,
      differenceCents: row.differenceCents,
      adjustmentCount: row.adjustmentCount,
      grossCents: row.grossCents,
      isPast: true,
    }) === 'attention')
    .map((row) => row.date)
  return { count: dates.length, dates }
}

function shiftBookDate(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return dt.toISOString().slice(0, 10)
}

export async function logCashbookEvent(
  client: SupabaseClient,
  tenantSlug: string,
  actor: string,
  bookDate: string,
  action: 'report_printed' | 'report_exported' | 'report_emailed',
  detail: Record<string, unknown>,
) {
  await audit(client, tenantSlug, actor, action, 'cashbook_days', null, null, detail, null, bookDate)
}

export function formatEuroFromCents(cents: number): string {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  const euros = Math.floor(abs / 100)
  const rem = String(abs % 100).padStart(2, '0')
  return `${sign}€${euros},${rem}`
}
