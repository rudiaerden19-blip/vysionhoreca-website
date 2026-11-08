import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { summarizeJetonOverview } from '../src/lib/kassa-jeton-overview.ts'
import { normalizeKassaJetonDenominations, kassaJetonBreakdownFromCents, kassaJetonTotalCents } from '../src/lib/kassa-jeton-math.ts'
import { orderReportDateForShift } from '../src/lib/tenant-business-day.ts'
import { orderCountsTowardRevenueAndZReport } from '../src/lib/admin-api-order-helpers.ts'
import { belgiumLocalToUtcIso, addDaysToBelgiumYMD } from '../src/lib/belgium-date-bounds.ts'

const env = readFileSync('.env.local', 'utf8')
const get = (k) => {
  const line = env.split('\n').find((l) => l.startsWith(`${k}=`))
  if (!line) return undefined
  let v = line.slice(k.length + 1).trim()
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
  return v
}
const c = createClient(get('NEXT_PUBLIC_SUPABASE_URL'), get('SUPABASE_SERVICE_ROLE_KEY'))
const tenant = 'thelagoon'

function mapShifts(zRows) {
  return zRows
    .filter((row) => row.report_date)
    .map((row) => ({
      reportDate: String(row.report_date),
      closedAt:
        row.is_closed === false
          ? null
          : row.closed_at
            ? String(row.closed_at)
            : row.is_closed === true
              ? belgiumLocalToUtcIso(addDaysToBelgiumYMD(String(row.report_date), 1), '00:00')
              : null,
    }))
}

async function auditDay(ymd) {
  const denoms = normalizeKassaJetonDenominations(300, 50)
  const [hoursRes, zRes, manual] = await Promise.all([
    c.from('opening_hours').select('*').eq('tenant_slug', tenant),
    c.from('z_reports').select('report_date,is_closed,closed_at,total,subtotal').eq('tenant_slug', tenant).gte('report_date', addDaysToBelgiumYMD(ymd, -1)).lte('report_date', addDaysToBelgiumYMD(ymd, 1)),
    c.from('kassa_jeton_day_sales').select('*').eq('tenant_slug', tenant).eq('report_date', ymd).maybeSingle(),
    c
      .from('orders')
      .select('id,order_number,status,payment_status,payment_method,order_type,total,created_at,items,payment_split_cash,payment_split_card')
      .eq('tenant_slug', tenant)
      .gte('created_at', belgiumLocalToUtcIso(addDaysToBelgiumYMD(ymd, -1), '00:00'))
      .lte('created_at', belgiumLocalToUtcIso(addDaysToBelgiumYMD(ymd, 2), '00:00')),
  ])

  const hours = hoursRes.data || []
  const shifts = mapShifts(zRes.data || [])
  const ordersRaw = (await c
    .from('orders')
    .select('id,order_number,status,payment_status,payment_method,order_type,total,created_at,items,payment_split_cash,payment_split_card')
    .eq('tenant_slug', tenant)
    .gte('created_at', belgiumLocalToUtcIso(addDaysToBelgiumYMD(ymd, -1), '00:00'))
    .lte('created_at', belgiumLocalToUtcIso(addDaysToBelgiumYMD(ymd, 2), '00:00'))).data || []

  const orders = ordersRaw.map((o) => ({
    status: o.status,
    payment_status: o.payment_status,
    payment_method: o.payment_method,
    order_type: o.order_type,
    total: Number(o.total) || 0,
    payment_split_cash: o.payment_split_cash,
    payment_split_card: o.payment_split_card,
    created_at: String(o.created_at || ''),
    items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items,
  }))

  let jetonSum = 0
  let jetonN = 0
  let noBreak = 0
  for (const o of orders) {
    if (String(o.payment_method).toUpperCase() !== 'JETON') continue
    if (!orderCountsTowardRevenueAndZReport(o)) continue
    const rd = orderReportDateForShift(o.created_at, hours, shifts)
    if (rd !== ymd) continue
    jetonN++
    jetonSum += o.total
    if (!kassaJetonBreakdownFromCents(Math.round(o.total * 100), denoms)) noBreak++
  }

  const ov = summarizeJetonOverview(orders, ymd, ymd, denoms, hours, shifts)
  const day = ov.days.find((d) => d.date === ymd)
  const cash = Number(manual.data?.cash_euro) || 0
  const pin = Number(manual.data?.pin_euro) || 0
  const piecesEuro = day
    ? (day.receivedBlack * denoms.blackCents + day.receivedWhite * denoms.whiteCents) / 100
    : 0
  const z = (zRes.data || []).find((r) => r.report_date === ymd)

  return {
    ymd,
    jetonPaidOrders: jetonN,
    jetonEuroDirect: Math.round(jetonSum * 100) / 100,
    overviewReceivedEuro: day?.receivedEuro ?? 0,
    overviewPieces: day
      ? { black: day.receivedBlack, white: day.receivedWhite, stuks: day.receivedPieces }
      : null,
    stuksNaarEuro: Math.round(piecesEuro * 100) / 100,
    verschilEuroVsStuks: day ? Math.round((day.receivedEuro - piecesEuro) * 100) / 100 : 0,
    ordersZonderStuksBreakdown: noBreak,
    manual: { cash, pin, jetons_sold: Number(manual.data?.jetons_sold) || 0 },
    somKolomEuro: Math.round(((day?.receivedEuro ?? 0) + cash + pin) * 100) / 100,
    kassaWaarde: Math.round((cash + pin - (day?.receivedEuro ?? 0)) * 100) / 100,
    zTotal: z ? Number(z.total) : null,
    zClosed: z?.is_closed ?? null,
  }
}

const today = '2026-10-31'
const yesterday = addDaysToBelgiumYMD(today, -1)
console.log(JSON.stringify({ yesterday: await auditDay(yesterday), today: await auditDay(today) }, null, 2))
