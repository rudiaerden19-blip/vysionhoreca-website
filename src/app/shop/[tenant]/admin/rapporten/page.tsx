'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getTenantSettings } from '@/lib/admin-api'
import PinGate from '@/components/PinGate'

// ─── Types ───────────────────────────────────────────────────────────────────
interface Order {
  id: string
  order_number: number
  status: string
  payment_status: string
  payment_method: string
  order_type: string
  total: number
  subtotal: number
  tax: number
  discount_amount: number
  created_at: string
  customer_name: string | null
  customer_email: string | null
  items: { name: string; quantity: number; price: number; image_url?: string }[]
}

interface ZReport {
  id: string
  report_date: string
  order_count: number
  total: number
  cash_payments: number
  card_payments: number
  online_payments: number
  tax_low: number
  tax_mid: number
  tax_high: number
  generated_at: string
  business_name?: string
  is_closed?: boolean
}

interface TenantInfo {
  business_name?: string
  address?: string
  postal_code?: string
  city?: string
  phone?: string
  btw_number?: string
  btw_percentage?: number
  website?: string
}

type Tab = 'overzicht' | 'xrapport' | 'zrapport' | 'boekhouding' | 'facturen'
type PaymentPeriod = 'month' | 'year'
type ExportPeriod = 'day' | 'week' | 'month' | 'year'

// ─── Helpers ─────────────────────────────────────────────────────────────────
const KASSA_TYPES = ['DINE_IN', 'TAKEAWAY', 'DELIVERY']
const NL_MONTHS = ['Januari','Februari','Maart','April','Mei','Juni','Juli','Augustus','September','Oktober','November','December']
const NL_DAYS = ['zo','ma','di','wo','do','vr','za']

function startOfDay(d: Date) { const r = new Date(d); r.setHours(0,0,0,0); return r }
function startOfWeek(d: Date) { const r = new Date(d); const day = r.getDay()||7; r.setDate(r.getDate()-day+1); r.setHours(0,0,0,0); return r }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1) }
function startOfYear(d: Date) { return new Date(d.getFullYear(), 0, 1) }
function subDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate()-n); return r }
function subMonths(d: Date, n: number) { return new Date(d.getFullYear(), d.getMonth()-n, 1) }
function addMonths(d: Date, n: number) { return new Date(d.getFullYear(), d.getMonth()+n, 1) }
function daysInMonth(y: number, m: number) { return new Date(y, m+1, 0).getDate() }
function fmt(n: number) { return `€${n.toFixed(2)}` }
function fmtDate(s: string) { const d = new Date(s); return `${d.getDate()} ${NL_MONTHS[d.getMonth()]}` }
/** Korte datum voor periode-onderregels (nl-BE → “2 apr.”) */
function fmtDayShort(d: Date) {
  return d.toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' }).replace(/\s+$/, '')
}

/** JSONB kan als object of als string binnenkomen — anders crasht .forEach op populaire producten. */
function parseOrderItems(raw: unknown): Order['items'] {
  if (Array.isArray(raw)) return raw as Order['items']
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw)
      return Array.isArray(p) ? (p as Order['items']) : []
    } catch {
      return []
    }
  }
  return []
}

function getPeriodStart(period: ExportPeriod): Date {
  const now = new Date()
  if (period === 'day') return startOfDay(now)
  if (period === 'week') return startOfWeek(now)
  if (period === 'month') return startOfMonth(now)
  return startOfYear(now)
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function RapportenPage({ params }: { params: { tenant: string } }) {
  const tenant = params.tenant
  const [tab, setTab] = useState<Tab>('overzicht')
  const [orders, setOrders] = useState<Order[]>([])
  const [zReports, setZReports] = useState<ZReport[]>([])
  const [loading, setLoading] = useState(true)
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null)

  // X/Z rapport state
  const [openingCash, setOpeningCash] = useState(0)
  const [closingCash, setClosingCash] = useState(0)
  const [lastZDate, setLastZDate] = useState<string | null>(null)
  const [showZConfirm, setShowZConfirm] = useState(false)
  const [zGenerating, setZGenerating] = useState(false)

  // Overzicht state
  const [exportPeriod, setExportPeriod] = useState<ExportPeriod>('month')
  const [paymentPeriod, setPaymentPeriod] = useState<PaymentPeriod>('month')
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  // Boekhouding state
  const [selectedZReports, setSelectedZReports] = useState<string[]>([])

  // ── Load data ──
  useEffect(() => {
    const cash = localStorage.getItem(`rapportages_cash_${tenant}`)
    const lastZ = localStorage.getItem(`rapportages_lastZ_${tenant}`)
    if (cash) setOpeningCash(parseFloat(cash)||0)
    if (lastZ) setLastZDate(lastZ)
  }, [tenant])

  const loadData = useCallback(async () => {
    setLoading(true)
    const [{ data: ordersData, error: ordersError }, { data: zData }, info] = await Promise.all([
      supabase.from('orders')
        .select('id,order_number,status,payment_status,payment_method,order_type,total,subtotal,tax,discount_amount,created_at,customer_name,customer_email,items')
        .eq('tenant_slug', tenant)
        .order('created_at', { ascending: false })
        .limit(3000),
      supabase.from('z_reports').select('*').eq('tenant_slug', tenant).order('report_date', { ascending: false }),
      getTenantSettings(tenant),
    ])
    if (ordersError) console.error('Rapporten orders error:', ordersError)
    setOrders((ordersData||[]).map(o => ({
      ...o,
      items: parseOrderItems(o.items),
      discount_amount: Number(o.discount_amount) || 0,
      tax: Number(o.tax) || 0,
      subtotal: Number(o.subtotal) || 0,
      total: Number(o.total) || 0,
    })))
    setZReports(zData||[])
    setTenantInfo(info as TenantInfo)
    setLoading(false)
  }, [tenant])

  useEffect(() => { loadData() }, [loadData])

  // ── Order classification ──
  // Kassa: status=completed (altijd betaald op de kassa)
  // Online: payment_status=paid OR status in completed/delivered
  // Uitgesloten: geannuleerd/afgewezen
  const isValidOrder = (o: Order) =>
    !['cancelled','rejected'].includes(o.status) && (
      o.payment_status === 'paid' ||
      ['completed','delivered'].includes(o.status)
    )
  const isKassaOrder = (o: Order) => KASSA_TYPES.includes(o.order_type)
  const isOnlineOrder = (o: Order) => !KASSA_TYPES.includes(o.order_type)

  const validOrders = useMemo(() => orders.filter(isValidOrder), [orders])
  const kassaOrders = useMemo(() => validOrders.filter(isKassaOrder), [validOrders])
  const onlineOrders = useMemo(() => validOrders.filter(isOnlineOrder), [validOrders])

  // ── Revenue helpers ──
  const revenueInPeriod = (list: Order[], from: Date) =>
    list.filter(o => new Date(o.created_at) >= from).reduce((s,o)=>s+o.total,0)
  const ordersInPeriod = (list: Order[], from: Date) =>
    list.filter(o => new Date(o.created_at) >= from)

  const now = new Date()
  const todayStart = startOfDay(now)
  const weekStart = startOfWeek(now)
  const monthStart = startOfMonth(now)

  // Omzet vandaag/week/maand (kassa + online)
  const todayRevenue = revenueInPeriod(validOrders, todayStart)
  const weekRevenue = revenueInPeriod(validOrders, weekStart)
  const monthRevenue = revenueInPeriod(validOrders, monthStart)
  const todayOrders = ordersInPeriod(validOrders, todayStart)
  const avgOrder = todayOrders.length > 0 ? todayRevenue / todayOrders.length : 0
  /** Week start (maandag) kan vóór de 1e van deze maand vallen → weekomzet > maandomzet is dan logisch. */
  const weekStartsBeforeThisMonth = weekStart.getTime() < monthStart.getTime()

  // ── Last 7 days chart ──
  const last7Days = useMemo(() => {
    return Array.from({length:7},(_,i) => {
      const d = subDays(new Date(), 6-i)
      const dayStart = startOfDay(d)
      const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate()+1)
      const rev = validOrders.filter(o => { const t=new Date(o.created_at); return t>=dayStart && t<dayEnd }).reduce((s,o)=>s+o.total,0)
      const cnt = validOrders.filter(o => { const t=new Date(o.created_at); return t>=dayStart && t<dayEnd }).length
      return { label: NL_DAYS[d.getDay()], revenue: rev, orders: cnt }
    })
  }, [validOrders])
  const maxRevenue = Math.max(...last7Days.map(d=>d.revenue), 1)

  // ── Betaalmethodes vandaag (case-insensitief: kassa=uppercase, online=lowercase) ──
  const paymentToday = useMemo(() => {
    const td = ordersInPeriod(validOrders, todayStart)
    const pm = (o: Order) => (o.payment_method || '').toUpperCase()
    return {
      CASH: td.filter(o=>pm(o)==='CASH'||pm(o)==='CONTANT').reduce((s,o)=>s+o.total,0),
      CARD: td.filter(o=>pm(o)==='CARD'||pm(o)==='PIN'||pm(o)==='KAART').reduce((s,o)=>s+o.total,0),
      IDEAL: td.filter(o=>pm(o)==='IDEAL').reduce((s,o)=>s+o.total,0),
      BANCONTACT: td.filter(o=>pm(o)==='BANCONTACT').reduce((s,o)=>s+o.total,0),
      ONLINE: td.filter(o=>pm(o)==='ONLINE').reduce((s,o)=>s+o.total,0),
    }
  }, [validOrders, todayStart])

  // ── Besteltypen vandaag ──
  const orderTypesToday = useMemo(() => {
    const td = ordersInPeriod(validOrders, todayStart)
    return {
      DINE_IN: td.filter(o=>o.order_type==='DINE_IN').reduce((s,o)=>s+o.total,0),
      TAKEAWAY: td.filter(o=>['TAKEAWAY','pickup'].includes(o.order_type)).reduce((s,o)=>s+o.total,0),
      DELIVERY: td.filter(o=>['DELIVERY','delivery'].includes(o.order_type)).reduce((s,o)=>s+o.total,0),
    }
  }, [validOrders, todayStart])

  // ── Klanten ──
  const klanten = useMemo(() => ({
    today: ordersInPeriod(validOrders, todayStart).length,
    week: ordersInPeriod(validOrders, weekStart).length,
    month: ordersInPeriod(validOrders, monthStart).length,
  }), [validOrders, todayStart, weekStart, monthStart])

  // ── Online bestellingen ──
  const online = useMemo(() => ({
    todayCount: ordersInPeriod(onlineOrders, todayStart).length,
    todayRev: revenueInPeriod(onlineOrders, todayStart),
    weekCount: ordersInPeriod(onlineOrders, weekStart).length,
    weekRev: revenueInPeriod(onlineOrders, weekStart),
    monthCount: ordersInPeriod(onlineOrders, monthStart).length,
    monthRev: revenueInPeriod(onlineOrders, monthStart),
  }), [onlineOrders, todayStart, weekStart, monthStart])

  // ── Populaire producten ──
  const popularDineIn = useMemo(() => {
    const map: Record<string,{name:string;count:number;revenue:number;image?:string}> = {}
    ordersInPeriod(kassaOrders, todayStart).filter(o=>o.order_type==='DINE_IN').forEach(o => {
      ;(o.items||[]).forEach(item => {
        if (!map[item.name]) map[item.name] = { name:item.name, count:0, revenue:0, image:item.image_url }
        map[item.name].count += item.quantity
        map[item.name].revenue += item.price * item.quantity
      })
    })
    return Object.values(map).sort((a,b)=>b.count-a.count).slice(0,5)
  }, [kassaOrders, todayStart])

  const popularOnline = useMemo(() => {
    const map: Record<string,{name:string;count:number;revenue:number}> = {}
    ordersInPeriod(onlineOrders, todayStart).forEach(o => {
      ;(o.items||[]).forEach(item => {
        if (!map[item.name]) map[item.name] = { name:item.name, count:0, revenue:0 }
        map[item.name].count += item.quantity
        map[item.name].revenue += (item.price||0) * item.quantity
      })
    })
    return Object.values(map).sort((a,b)=>b.count-a.count).slice(0,5)
  }, [onlineOrders, todayStart])

  // ── Betalingen tabel ──
  const paymentsData = useMemo(() => {
    if (paymentPeriod === 'month') {
      const y = selectedMonth.getFullYear(), m = selectedMonth.getMonth()
      const days = daysInMonth(y, m)
      return Array.from({length:days},(_,i)=>{
        const day = new Date(y, m, days-i)
        const dayStart = startOfDay(day)
        const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate()+1)
        const dayOrders = validOrders.filter(o => { const t=new Date(o.created_at); return t>=dayStart && t<dayEnd })
        const isCash = (o: Order) => (o.payment_method||'').toUpperCase() === 'CASH' || (o.payment_method||'').toUpperCase() === 'CONTANT'
        const cash = dayOrders.filter(isCash).reduce((s,o)=>s+o.total,0)
        const card = dayOrders.filter(o=>!isCash(o)).reduce((s,o)=>s+o.total,0)
        return { label:`${days-i} ${NL_MONTHS[m]}`, receipts:dayOrders.length, cash, card, total:cash+card }
      })
    } else {
      return Array.from({length:12},(_,i)=>{
        const mIdx = 11-i
        const mStart = new Date(selectedYear, mIdx, 1)
        const mEnd = new Date(selectedYear, mIdx+1, 1)
        const mOrders = validOrders.filter(o => { const t=new Date(o.created_at); return t>=mStart && t<mEnd })
        const isCash = (o: Order) => (o.payment_method||'').toUpperCase() === 'CASH' || (o.payment_method||'').toUpperCase() === 'CONTANT'
        const cash = mOrders.filter(isCash).reduce((s,o)=>s+o.total,0)
        const card = mOrders.filter(o=>!isCash(o)).reduce((s,o)=>s+o.total,0)
        return { label:`${NL_MONTHS[mIdx]} ${selectedYear}`, receipts:mOrders.length, cash, card, total:cash+card }
      })
    }
  }, [validOrders, paymentPeriod, selectedMonth, selectedYear])

  const periodTotals = useMemo(() => paymentsData.reduce((a,r)=>({
    receipts: a.receipts+r.receipts, cash:a.cash+r.cash, card:a.card+r.card, total:a.total+r.total
  }), {receipts:0,cash:0,card:0,total:0}), [paymentsData])

  // ── X-rapport data (sinds laatste Z) ──
  const xOrders = useMemo(() => {
    const from = lastZDate ? new Date(lastZDate) : startOfDay(new Date())
    return validOrders.filter(o => new Date(o.created_at) >= from)
  }, [validOrders, lastZDate])

  const xData = useMemo(() => {
    const total = xOrders.reduce((s,o)=>s+o.total,0)
    const isCashOrder = (o: Order) => (o.payment_method||'').toUpperCase() === 'CASH' || (o.payment_method||'').toUpperCase() === 'CONTANT'
    const cash = xOrders.filter(isCashOrder).reduce((s,o)=>s+o.total,0)
    const card = xOrders.filter(o=>!isCashOrder(o)).reduce((s,o)=>s+o.total,0)
    const tax = xOrders.reduce((s,o)=>s+o.tax,0)
    const discounts = xOrders.reduce((s,o)=>s+(o.discount_amount||0),0)
    return { count:xOrders.length, total, cash, card, tax, discounts, expectedCash: openingCash+cash }
  }, [xOrders, openingCash])

  // ── Z-rapport genereren ──
  const generateZReport = async () => {
    setZGenerating(true)
    const now = new Date()
    const dateStr = now.toISOString().split('T')[0]
    const vatRate = tenantInfo?.btw_percentage ?? 6

    await supabase.from('z_reports').upsert({
      tenant_slug: tenant,
      report_date: dateStr,
      order_count: xData.count,
      subtotal: xData.total - xData.tax,
      tax_low: vatRate <= 6 ? xData.tax : 0,
      tax_mid: vatRate > 6 && vatRate <= 12 ? xData.tax : 0,
      tax_high: vatRate > 12 ? xData.tax : 0,
      total: xData.total,
      cash_payments: xData.cash,
      card_payments: xData.card,
      online_payments: 0,
      btw_percentage: vatRate,
      generated_at: now.toISOString(),
      business_name: tenantInfo?.business_name || tenant,
    }, { onConflict: 'tenant_slug,report_date' })

    const newLastZ = now.toISOString()
    setLastZDate(newLastZ)
    localStorage.setItem(`rapportages_lastZ_${tenant}`, newLastZ)
    localStorage.setItem(`rapportages_cash_${tenant}`, '0')
    setOpeningCash(0)
    setClosingCash(0)
    setShowZConfirm(false)
    setZGenerating(false)
    await loadData()
  }

  // ── CSV Export ──
  const exportCSV = () => {
    const from = getPeriodStart(exportPeriod)
    const exp = validOrders.filter(o => new Date(o.created_at) >= from)
    const headers = ['Datum','Tijd','Bon#','Type','Betaling','Subtotaal','BTW','Totaal']
    const rows = exp.map(o => [
      new Date(o.created_at).toLocaleDateString('nl-NL'),
      new Date(o.created_at).toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'}),
      String(o.order_number), o.order_type, o.payment_method||'',
      o.subtotal.toFixed(2).replace('.',','),
      o.tax.toFixed(2).replace('.',','),
      o.total.toFixed(2).replace('.',','),
    ])
    const totalRow = ['TOTAAL','',`${exp.length} bestellingen`,'','',
      exp.reduce((s,o)=>s+o.subtotal,0).toFixed(2).replace('.',','),
      exp.reduce((s,o)=>s+o.tax,0).toFixed(2).replace('.',','),
      exp.reduce((s,o)=>s+o.total,0).toFixed(2).replace('.',','),
    ]
    const csv = [`"${tenantInfo?.business_name||tenant}"`,`"Periode: ${exportPeriod}"`, '',
      headers.map(h=>`"${h}"`).join(';'),
      ...rows.map(r=>r.map(c=>`"${c}"`).join(';')),
      '', totalRow.map(c=>`"${c}"`).join(';'),
    ].join('\n')
    const blob = new Blob(['\ufeff'+csv], {type:'text/csv;charset=utf-8;'})
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `omzet-${exportPeriod}-${tenant}.csv`; a.click()
  }

  // ── PDF Export ──
  const exportPDF = () => {
    const from = getPeriodStart(exportPeriod)
    const exp = validOrders.filter(o => new Date(o.created_at) >= from)
    const totalRev = exp.reduce((s,o)=>s+o.total,0)
    const totalTax = exp.reduce((s,o)=>s+o.tax,0)
    const isCash = (o: Order) => (o.payment_method||'').toUpperCase() === 'CASH' || (o.payment_method||'').toUpperCase() === 'CONTANT'
    const cash = exp.filter(isCash).reduce((s,o)=>s+o.total,0)
    const card = exp.filter(o=>!isCash(o)).reduce((s,o)=>s+o.total,0)
    const vatRate = tenantInfo?.btw_percentage ?? 6
    const html = `<!DOCTYPE html><html><head><title>Rapport</title>
    <style>body{font-family:Arial,sans-serif;padding:40px;max-width:800px;margin:0 auto}
    h1{color:#1e293b;border-bottom:2px solid #1e293b;padding-bottom:10px}
    h2{color:#374151;margin-top:30px}.info{color:#6b7280;margin-bottom:20px}
    table{width:100%;border-collapse:collapse;margin:20px 0}
    th,td{padding:10px;text-align:left;border-bottom:1px solid #e5e7eb}
    th{background:#f9fafb;font-weight:bold}.amt{text-align:right;font-family:monospace}
    .summary{background:#1e293b;color:white;padding:20px;border-radius:12px;margin:20px 0;display:grid;grid-template-columns:1fr 1fr;gap:15px}
    .sitem{background:rgba(255,255,255,0.1);padding:12px;border-radius:8px}
    .slabel{font-size:11px;opacity:0.7}.sval{font-size:22px;font-weight:bold}
    .footer{color:#9ca3af;font-size:11px;margin-top:40px}
    @media print{.noprint{display:none}}</style></head><body>
    <h1>📊 Omzet Rapport</h1>
    <div class="info"><strong>${tenantInfo?.business_name||tenant}</strong><br>
    ${tenantInfo?.address?tenantInfo.address+'<br>':''}${tenantInfo?.postal_code||''} ${tenantInfo?.city||''}<br>
    ${tenantInfo?.btw_number?'BTW: '+tenantInfo.btw_number+'<br>':''}Periode: <strong>${exportPeriod}</strong></div>
    <div class="summary">
    <div class="sitem"><div class="slabel">Totale Omzet</div><div class="sval">€${totalRev.toFixed(2)}</div></div>
    <div class="sitem"><div class="slabel">Bestellingen</div><div class="sval">${exp.length}</div></div>
    <div class="sitem"><div class="slabel">💵 Contant</div><div class="sval">€${cash.toFixed(2)}</div></div>
    <div class="sitem"><div class="slabel">💳 PIN/Kaart</div><div class="sval">€${card.toFixed(2)}</div></div></div>
    <h2>BTW Overzicht</h2><table>
    <tr><th>Omschrijving</th><th class="amt">Bedrag</th></tr>
    <tr><td>Omzet excl. BTW</td><td class="amt">€${(totalRev-totalTax).toFixed(2)}</td></tr>
    <tr><td>BTW ${vatRate}%</td><td class="amt">€${totalTax.toFixed(2)}</td></tr>
    <tr><td><strong>Totaal incl. BTW</strong></td><td class="amt"><strong>€${totalRev.toFixed(2)}</strong></td></tr></table>
    <div class="footer">Gegenereerd op ${new Date().toLocaleString('nl-NL')} — Vysion Horeca POS</div>
    <button class="noprint" onclick="window.print()" style="margin-top:20px;padding:10px 20px;background:#1e293b;color:white;border:none;border-radius:8px;cursor:pointer">🖨️ Afdrukken / PDF opslaan</button>
    </body></html>`
    const w = window.open('','_blank','width=900,height=700')
    if (w) { w.document.write(html); w.document.close() }
  }

  // ── Boekhouding export ──
  const exportBoekhoudCSV = () => {
    const selected = zReports.filter(r => selectedZReports.includes(r.id))
    const headers = ['Datum','Bestellingen','Contant','PIN/Kaart','Online','BTW Laag','BTW Midden','BTW Hoog','Totaal']
    const rows = selected.map(r => [
      r.report_date, String(r.order_count),
      r.cash_payments.toFixed(2).replace('.',','),
      r.card_payments.toFixed(2).replace('.',','),
      r.online_payments.toFixed(2).replace('.',','),
      r.tax_low.toFixed(2).replace('.',','),
      r.tax_mid.toFixed(2).replace('.',','),
      r.tax_high.toFixed(2).replace('.',','),
      r.total.toFixed(2).replace('.',','),
    ])
    const csv = [`"${tenantInfo?.business_name||tenant}"`, '"SCARDa-compatibele Z-Rapport Export"', '',
      headers.map(h=>`"${h}"`).join(';'),
      ...rows.map(r=>r.map(c=>`"${c}"`).join(';')),
    ].join('\n')
    const blob = new Blob(['\ufeff'+csv], {type:'text/csv;charset=utf-8;'})
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `z-rapporten-${tenant}.csv`; a.click()
  }

  const exportBoekhoudPDF = () => {
    const selected = zReports.filter(r => selectedZReports.includes(r.id))
    const totalRev = selected.reduce((s,r)=>s+r.total,0)
    const html = `<!DOCTYPE html><html><head><title>Z-Rapporten Export</title>
    <style>body{font-family:Arial,sans-serif;padding:40px}table{width:100%;border-collapse:collapse}
    th,td{padding:8px;border:1px solid #ddd}th{background:#f5f5f5}.footer{color:#999;font-size:11px;margin-top:20px}
    @media print{button{display:none}}</style></head><body>
    <h1>📊 Z-Rapporten Export</h1>
    <p><strong>${tenantInfo?.business_name||tenant}</strong> — ${selected.length} rapporten — Totaal: €${totalRev.toFixed(2)}</p>
    <table><tr><th>Datum</th><th>Bonnen</th><th>Contant</th><th>PIN/Kaart</th><th>Totaal</th></tr>
    ${selected.map(r=>`<tr><td>${r.report_date}</td><td>${r.order_count}</td><td>€${r.cash_payments.toFixed(2)}</td><td>€${r.card_payments.toFixed(2)}</td><td><strong>€${r.total.toFixed(2)}</strong></td></tr>`).join('')}
    </table><div class="footer">Gegenereerd op ${new Date().toLocaleString('nl-NL')}</div>
    <button onclick="window.print()" style="margin-top:20px;padding:10px 20px;background:#10b981;color:white;border:none;border-radius:8px;cursor:pointer">🖨️ Afdrukken</button>
    </body></html>`
    const w = window.open('','_blank','width=900,height=700')
    if (w) { w.document.write(html); w.document.close() }
  }

  const exportBoekhoudJSON = () => {
    const selected = zReports.filter(r => selectedZReports.includes(r.id))
    const data = JSON.stringify({ business: tenantInfo?.business_name||tenant, exported_at: new Date().toISOString(), z_reports: selected }, null, 2)
    const blob = new Blob([data], {type:'application/json'})
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `z-rapporten-${tenant}.json`; a.click()
  }

  const toggleZReport = (id: string) => setSelectedZReports(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id])
  const toggleAllZReports = () => setSelectedZReports(prev => prev.length === zReports.length ? [] : zReports.map(r=>r.id))

  // ── X-rapport printen ──
  const printXReport = () => {
    const vatRate = tenantInfo?.btw_percentage ?? 6
    const html = `<!DOCTYPE html><html><head><title>X-Rapport</title>
    <style>body{font-family:'Courier New',monospace;font-size:13px;max-width:400px;margin:0 auto;padding:20px}
    h1{font-size:18px;text-align:center;border-bottom:2px solid #000;padding-bottom:8px}
    .row{display:flex;justify-content:space-between;padding:4px 0}
    .divider{border-top:1px dashed #000;margin:8px 0}
    .total{font-size:16px;font-weight:bold}
    @media print{button{display:none}}</style></head><body>
    <h1>📋 X-RAPPORT</h1>
    <div class="row"><span>${tenantInfo?.business_name||tenant}</span></div>
    <div class="row"><span>Datum: ${new Date().toLocaleString('nl-NL')}</span></div>
    ${lastZDate?`<div class="row"><span>Sinds Z: ${new Date(lastZDate).toLocaleString('nl-NL')}</span></div>`:'<div class="row"><span>Nog geen Z-rapport</span></div>'}
    <div class="divider"></div>
    <div class="row"><span>Transacties</span><span>${xData.count}</span></div>
    <div class="row"><span>💵 Contant</span><span>${fmt(xData.cash)}</span></div>
    <div class="row"><span>💳 PIN/Kaart</span><span>${fmt(xData.card)}</span></div>
    <div class="divider"></div>
    <div class="row"><span>Excl. BTW</span><span>${fmt(xData.total-xData.tax)}</span></div>
    <div class="row"><span>BTW ${vatRate}%</span><span>${fmt(xData.tax)}</span></div>
    <div class="divider"></div>
    <div class="row total"><span>TOTAAL</span><span>${fmt(xData.total)}</span></div>
    <div class="divider"></div>
    <div class="row"><span>Begin Kas</span><span>${fmt(openingCash)}</span></div>
    <div class="row total"><span>Verwachte Kas</span><span>${fmt(xData.expectedCash)}</span></div>
    <br><button onclick="window.print()">🖨️ Afdrukken</button>
    </body></html>`
    const w = window.open('','_blank','width=500,height=600')
    if (w) { w.document.write(html); w.document.close() }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  const tabs: { id: Tab; label: string; icon: string; activeColor: string }[] = [
    { id:'overzicht',   label:'Overzicht',   icon:'📊', activeColor:'bg-[#1e293b] text-white' },
    { id:'xrapport',    label:'X-Rapport',   icon:'📋', activeColor:'bg-blue-500 text-white' },
    { id:'zrapport',    label:'Z-Rapport',   icon:'📕', activeColor:'bg-red-500 text-white' },
    { id:'boekhouding', label:'Boekhouding', icon:'📁', activeColor:'bg-emerald-500 text-white' },
    { id:'facturen',    label:'Facturen',    icon:'📄', activeColor:'bg-purple-500 text-white' },
  ]

  return (
      <PinGate tenant={tenant}>
      <div className="max-w-6xl mx-auto">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Rapportages</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {tabs.map(t => (
            <button key={t.id} onClick={()=>setTab(t.id)}
              className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${tab===t.id ? t.activeColor : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center"><div className="w-10 h-10 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3"/><p className="text-gray-500">Laden...</p></div>
        </div>
      ) : (
        <>
        {/* ══════════════════════════════════════════════════════════════════════
            TAB: OVERZICHT
        ══════════════════════════════════════════════════════════════════════ */}
        {tab === 'overzicht' && (
          <div className="space-y-6">
            {/* Export row */}
            <div className="flex items-center gap-2">
              <select value={exportPeriod} onChange={e=>setExportPeriod(e.target.value as ExportPeriod)}
                className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-sm focus:outline-none">
                <option value="day">Vandaag</option>
                <option value="week">Deze Week</option>
                <option value="month">Deze Maand</option>
                <option value="year">Dit Jaar</option>
              </select>
              <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition-colors">
                📊 CSV
              </button>
              <button onClick={exportPDF} className="flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-xl text-sm font-medium transition-colors">
                📄 PDF
              </button>
            </div>

            {/* 4 Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { title:'Omzet Vandaag', value:fmt(todayRevenue), sub:`${todayOrders.length} bestellingen`, icon:'€', color:'#10b981' },
                {
                  title:'Omzet Week',
                  value:fmt(weekRevenue),
                  sub:`Kalenderweek ma–zo · van ${fmtDayShort(weekStart)}`,
                  icon:'📈',
                  color:'#3b82f6',
                },
                {
                  title:'Omzet Maand',
                  value:fmt(monthRevenue),
                  sub:`Vanaf ${fmtDayShort(monthStart)}`,
                  icon:'📅',
                  color:'#8b5cf6',
                },
                { title:'Gem. Bestelling', value:fmt(avgOrder), icon:'🛒', color:'#f59e0b' },
              ].map(c => (
                <div key={c.title} className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-4" style={{backgroundColor:c.color+'20',color:c.color}}>{c.icon}</div>
                  <p className="text-3xl font-bold text-gray-900 mb-1">{c.value}</p>
                  <p className="text-gray-500 text-sm">{c.title}</p>
                  {c.sub && <p className="text-gray-400 text-xs mt-1 leading-snug">{c.sub}</p>}
                </div>
              ))}
            </div>

            {weekStartsBeforeThisMonth && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 leading-relaxed">
                <span className="font-medium">Waarom kan weekomzet hoger zijn dan maandomzet?</span>{' '}
                De week tellen we vanaf maandag ({fmtDayShort(weekStart)}), de maand pas vanaf de 1e ({fmtDayShort(monthStart)}).
                Dagen in de vorige maand zitten dus wel in de week, niet in deze maand. De totalen kloppen; de periodes zijn verschillend.
              </p>
            )}

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 7-dagen bar chart */}
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <span className="text-gray-500">📊</span>
                  <h2 className="text-base font-semibold text-gray-800">Omzet afgelopen 7 dagen</h2>
                </div>
                <div className="flex items-end gap-3 h-48">
                  {last7Days.map((day, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs font-medium text-[#3b82f6] mb-1">{day.revenue>0?fmt(day.revenue):''}</span>
                      <div className="w-full flex flex-col justify-end" style={{height:'140px'}}>
                        <div className="w-full rounded-t-lg bg-[#3C4D6B]" style={{height:`${(day.revenue/maxRevenue)*140}px`,minHeight:day.revenue>0?'8px':'2px',opacity:day.revenue>0?1:0.2}}/>
                      </div>
                      <span className="text-xs text-gray-400 mt-1">{day.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Betaalmethodes */}
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <span className="text-gray-500">💳</span>
                  <h2 className="text-base font-semibold text-gray-800">Betaalmethodes Vandaag</h2>
                </div>
                <div className="space-y-4">
                  {[
                    { key:'CASH',       label:'Contant',    color:'#10b981', icon:'💵' },
                    { key:'CARD',       label:'PIN/Kaart',  color:'#3b82f6', icon:'💳' },
                    { key:'IDEAL',      label:'iDEAL',      color:'#ec4899', icon:'📱' },
                    { key:'BANCONTACT', label:'Bancontact', color:'#f59e0b', icon:'🏦' },
                    { key:'ONLINE',     label:'Online bet.', color:'#8b5cf6', icon:'🌐' },
                  ].map(m => {
                    const amount = paymentToday[m.key as keyof typeof paymentToday]||0
                    const pct = todayRevenue > 0 ? (amount/todayRevenue)*100 : 0
                    return (
                      <div key={m.key}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2 text-sm text-gray-700"><span>{m.icon}</span><span>{m.label}</span></div>
                          <span className="text-sm font-bold text-gray-900">{fmt(amount)}</span>
                        </div>
                        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{width:`${pct}%`,backgroundColor:m.color}}/>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Besteltypen */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <h2 className="text-base font-semibold text-gray-800 mb-5">Besteltypen Vandaag</h2>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { key:'DINE_IN',  label:'Ter plaatse', color:'#6366f1' },
                  { key:'TAKEAWAY', label:'Afhalen',      color:'#10b981' },
                  { key:'DELIVERY', label:'Bezorgen',     color:'#f59e0b' },
                ].map(t => (
                  <div key={t.key} className="p-5 rounded-2xl text-center" style={{backgroundColor:t.color+'18'}}>
                    <p className="text-3xl font-bold mb-1" style={{color:t.color}}>{fmt(orderTypesToday[t.key as keyof typeof orderTypesToday]||0)}</p>
                    <p className="text-sm text-gray-500">{t.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Klanten + Online */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Aantal klanten */}
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 mb-5">
                  <span className="text-gray-400">👥</span>
                  <h2 className="text-base font-semibold text-gray-800">Aantal Klanten</h2>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { val:klanten.today,  label:'Vandaag',      color:'text-[#6366f1]' },
                    { val:klanten.week,   label:'Deze Week',    color:'text-[#3b82f6]' },
                    { val:klanten.month,  label:'Deze Maand',   color:'text-purple-500' },
                  ].map(k => (
                    <div key={k.label} className="text-center p-4 rounded-xl bg-gray-50">
                      <p className={`text-3xl font-bold ${k.color}`}>{k.val}</p>
                      <p className="text-xs text-gray-400 mt-1">{k.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Online bestellingen */}
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 mb-5">
                  <span className="text-blue-400">🌐</span>
                  <h2 className="text-base font-semibold text-gray-800">Online Bestellingen</h2>
                </div>
                <div className="space-y-3">
                  {[
                    { label:'Vandaag',    count:online.todayCount,  rev:online.todayRev,  color:'text-blue-400' },
                    { label:'Deze Week',  count:online.weekCount,   rev:online.weekRev,   color:'text-[#3b82f6]' },
                    { label:'Deze Maand', count:online.monthCount,  rev:online.monthRev,  color:'text-purple-500' },
                  ].map(o => (
                    <div key={o.label} className="flex items-center justify-between p-4 rounded-xl bg-gray-50">
                      <div>
                        <p className="text-xs text-gray-400">{o.label}</p>
                        <p className={`text-xl font-bold ${o.color}`}>{o.count} klanten</p>
                      </div>
                      <p className="text-lg font-bold text-gray-700">{fmt(o.rev)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Populaire producten */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Ter plaatse */}
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 mb-5">
                  <span>🍴</span>
                  <h2 className="text-base font-semibold text-gray-800">Populair Ter Plaatse (Vandaag)</h2>
                </div>
                {popularDineIn.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">Geen ter plaatse bestellingen vandaag</p>
                ) : (
                  <div className="space-y-3">
                    {popularDineIn.map((item, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${i===0?'bg-yellow-100 text-yellow-600':i===1?'bg-gray-200 text-gray-500':i===2?'bg-amber-100 text-amber-600':'bg-gray-100 text-gray-400'}`}>
                          {i===0?'⭐':i+1}
                        </div>
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                          {item.image ? <img src={item.image} alt={item.name} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg">🍽️</div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate text-gray-800">{item.name}</p>
                          <p className="text-xs text-gray-400">{item.count}x verkocht</p>
                        </div>
                        <p className="font-bold text-sm text-[#3b82f6]">{fmt(item.revenue)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Online */}
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 mb-5">
                  <span className="text-blue-400">🌐</span>
                  <h2 className="text-base font-semibold text-gray-800">Populair Online (Vandaag)</h2>
                </div>
                {popularOnline.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">Geen online bestellingen vandaag</p>
                ) : (
                  <div className="space-y-3">
                    {popularOnline.map((item, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${i===0?'bg-yellow-100 text-yellow-600':i===1?'bg-gray-200 text-gray-500':i===2?'bg-amber-100 text-amber-600':'bg-gray-100 text-gray-400'}`}>
                          {i===0?'⭐':i+1}
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-400 text-lg">🌐</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate text-gray-800">{item.name}</p>
                          <p className="text-xs text-gray-400">{item.count}x besteld</p>
                        </div>
                        <p className="font-bold text-sm text-[#3b82f6]">{fmt(item.revenue)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Betalingen tabel */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Tabel header */}
              <div className="p-5 border-b border-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">🧾</span>
                    <h2 className="text-base font-semibold text-gray-800">Betalingen</h2>
                    <span className="text-sm text-gray-400">{periodTotals.receipts} bonnen</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Maand / Jaar toggle */}
                    <div className="flex bg-gray-100 rounded-xl p-1">
                      {(['month','year'] as PaymentPeriod[]).map(p => (
                        <button key={p} onClick={()=>setPaymentPeriod(p)}
                          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${paymentPeriod===p?'bg-[#1e293b] text-white':'text-gray-500 hover:text-gray-700'}`}>
                          {p==='month'?'Maand':'Jaar'}
                        </button>
                      ))}
                    </div>
                    {/* Navigatie */}
                    <div className="flex items-center gap-1">
                      <button onClick={()=>paymentPeriod==='month'?setSelectedMonth(subMonths(selectedMonth,1)):setSelectedYear(y=>y-1)}
                        className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-gray-600">‹</button>
                      <span className="min-w-[130px] text-center text-sm font-medium text-gray-700">
                        {paymentPeriod==='month'?`${NL_MONTHS[selectedMonth.getMonth()]} ${selectedMonth.getFullYear()}`:selectedYear}
                      </span>
                      <button onClick={()=>paymentPeriod==='month'?setSelectedMonth(addMonths(selectedMonth,1)):setSelectedYear(y=>y+1)}
                        className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-gray-600">›</button>
                    </div>
                  </div>
                </div>
              </div>
              {/* Tabel */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase">Datum</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase text-center">bonnen</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase text-right">Contant</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase text-right">PIN/Kaart</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase text-right">Totaal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentsData.map((row, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-gray-700 capitalize">{row.label}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 text-center">{row.receipts}</td>
                        <td className="px-6 py-4 text-sm text-right">{row.cash>0?<span className="text-gray-800">{fmt(row.cash)}</span>:<span className="text-gray-300">{fmt(0)}</span>}</td>
                        <td className="px-6 py-4 text-sm text-right">{row.card>0?<span className="text-gray-800">{fmt(row.card)}</span>:<span className="text-gray-300">{fmt(0)}</span>}</td>
                        <td className="px-6 py-4 text-sm text-right font-bold text-gray-900">{fmt(row.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 font-bold border-t border-gray-200">
                      <td className="px-6 py-4 text-sm text-gray-700">Totaal</td>
                      <td className="px-6 py-4 text-sm text-center text-gray-700">{periodTotals.receipts}</td>
                      <td className="px-6 py-4 text-sm text-right text-emerald-600">{fmt(periodTotals.cash)}</td>
                      <td className="px-6 py-4 text-sm text-right text-blue-600">{fmt(periodTotals.card)}</td>
                      <td className="px-6 py-4 text-sm text-right text-[#1e293b]">{fmt(periodTotals.total)}</td>
                    </tr>
                  </tfoot>
                </table>
                {paymentsData.every(r=>r.receipts===0) && (
                  <div className="p-8 text-center text-gray-400 text-sm">Geen betalingen in deze periode</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB: X-RAPPORT
        ══════════════════════════════════════════════════════════════════════ */}
        {tab === 'xrapport' && (
          <div className="space-y-5">
            {/* Header */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-4xl">📋</span>
                <div>
                  <h2 className="text-xl font-bold text-blue-700">X-Rapport</h2>
                  <p className="text-blue-500 text-sm">Tussentijds overzicht (geen afsluiting)</p>
                </div>
              </div>
              <p className="text-sm text-blue-400">
                Sinds laatste Z-rapport: {lastZDate ? new Date(lastZDate).toLocaleString('nl-NL') : 'Nog geen Z-rapport'}
              </p>
            </div>

            {/* Begin Kas */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-emerald-500">💵</span>
                <h3 className="font-semibold text-gray-800">Begin Kas</h3>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-2xl font-bold text-gray-900">{fmt(openingCash)}</span>
                <input type="number" value={openingCash||''} onChange={e=>{const v=parseFloat(e.target.value)||0;setOpeningCash(v);localStorage.setItem(`rapportages_cash_${tenant}`,String(v))}}
                  placeholder="0.00" step="0.01" min={0}
                  className="px-3 py-2 rounded-xl bg-gray-100 border border-gray-200 w-36 text-sm focus:outline-none focus:border-blue-300"/>
              </div>
            </div>

            {/* 4 stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label:'Transacties',   value:String(xData.count),    color:'text-gray-900' },
                { label:'Totaal Omzet',  value:fmt(xData.total),       color:'text-emerald-500' },
                { label:'Contant',       value:fmt(xData.cash),        color:'text-gray-900' },
                { label:'PIN/Kaart',     value:fmt(xData.card),        color:'text-gray-900' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                  <p className="text-sm text-gray-400 mb-2">{s.label}</p>
                  <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Verwachte Kas */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-emerald-700 mb-1">Verwachte Kas</h3>
                <p className="text-sm text-emerald-500">Begin kas + contante verkopen</p>
              </div>
              <p className="text-4xl font-bold text-emerald-600">{fmt(xData.expectedCash)}</p>
            </div>

            {/* BTW + Kortingen */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <p className="text-sm text-gray-400 mb-2">BTW Totaal</p>
                <p className="text-2xl font-bold text-gray-900">{fmt(xData.tax)}</p>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <p className="text-sm text-gray-400 mb-2">Kortingen</p>
                <p className="text-2xl font-bold text-orange-500">{fmt(xData.discounts)}</p>
              </div>
            </div>

            {/* Print knop */}
            <button onClick={printXReport} className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-colors text-lg">
              🖨️ X-Rapport Printen
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB: Z-RAPPORT
        ══════════════════════════════════════════════════════════════════════ */}
        {tab === 'zrapport' && (
          <div className="space-y-5">
            {/* Header */}
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-4xl">📕</span>
                <div>
                  <h2 className="text-xl font-bold text-red-600">Z-Rapport</h2>
                  <p className="text-red-400 text-sm">Dagafsluiting - Tellers worden gereset</p>
                </div>
              </div>
              <p className="text-sm text-red-400">⚠️ Let op: Na het genereren van een Z-rapport worden de tellers gereset!</p>
            </div>

            {/* Huidige periode samenvatting */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-4">Huidige Periode Samenvatting</h3>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                {[
                  { label:'Transacties:', value:String(xData.count), color:'text-gray-900' },
                  { label:'Totaal Omzet:', value:fmt(xData.total), color:'text-emerald-500' },
                  { label:'Contant:', value:fmt(xData.cash), color:'text-gray-900' },
                  { label:'PIN/Kaart:', value:fmt(xData.card), color:'text-gray-900' },
                  { label:'Begin Kas:', value:fmt(openingCash), color:'text-gray-900' },
                  { label:'Verwachte Kas:', value:fmt(xData.expectedCash), color:'text-emerald-500' },
                ].map(r => (
                  <div key={r.label} className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">{r.label}</span>
                    <span className={`font-bold ${r.color}`}>{r.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Getelde kas */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-red-400">💵</span>
                <h3 className="font-semibold text-gray-800">Getelde Kas (Eind)</h3>
              </div>
              <input type="number" value={closingCash||''} onChange={e=>setClosingCash(parseFloat(e.target.value)||0)}
                placeholder="Vul het getelde bedrag in..."
                className="w-full px-4 py-4 rounded-xl bg-gray-50 border border-gray-200 text-xl focus:outline-none focus:border-red-300"
                step="0.01"/>
              {closingCash > 0 && (
                <div className={`mt-4 p-4 rounded-xl ${Math.abs(closingCash-xData.expectedCash)<1?'bg-emerald-50 border border-emerald-200':'bg-red-50 border border-red-200'}`}>
                  <p className="font-bold text-sm">Verschil: {fmt(closingCash-xData.expectedCash)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {Math.abs(closingCash-xData.expectedCash)<1?'✅ Kas klopt!':closingCash>xData.expectedCash?'⬆️ Kas is te hoog':'⬇️ Kas tekort'}
                  </p>
                </div>
              )}
            </div>

            {/* Z-rapport genereren */}
            {!showZConfirm ? (
              <button onClick={()=>setShowZConfirm(true)}
                className="w-full py-4 bg-red-400 hover:bg-red-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-colors text-lg">
                🧾 Z-Rapport Genereren & Dag Afsluiten
              </button>
            ) : (
              <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-6">
                <p className="font-bold text-red-600 mb-2">⚠️ Weet je het zeker?</p>
                <p className="text-sm text-gray-500 mb-4">Na het genereren worden alle tellers gereset. Dit kan niet ongedaan worden gemaakt.</p>
                <div className="flex gap-3">
                  <button onClick={()=>setShowZConfirm(false)} className="flex-1 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 font-semibold text-gray-600 transition-colors">Annuleer</button>
                  <button onClick={generateZReport} disabled={zGenerating} className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold transition-colors disabled:opacity-50">
                    {zGenerating ? 'Bezig...' : '✓ Bevestigen'}
                  </button>
                </div>
              </div>
            )}

            {/* Geschiedenis */}
            {zReports.length > 0 && (
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4">📚 Vorige Z-Rapporten</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {zReports.map(r => (
                    <div key={r.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-bold text-sm text-gray-800">{new Date(r.generated_at).toLocaleString('nl-NL')}</p>
                        <p className="text-xs text-gray-400">{r.order_count} transacties</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-500">{fmt(r.total)}</p>
                        <p className="text-xs text-gray-400">💵 {fmt(r.cash_payments)} | 💳 {fmt(r.card_payments)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB: BOEKHOUDING
        ══════════════════════════════════════════════════════════════════════ */}
        {tab === 'boekhouding' && (
          <div className="space-y-5">
            {/* Header */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-4xl">📁</span>
                <div>
                  <h2 className="text-xl font-bold text-emerald-700">Bockhoud Export</h2>
                  <p className="text-emerald-500 text-sm">SCARDa-compatibele export voor je boekhouder</p>
                </div>
              </div>
              <p className="text-sm text-emerald-400">Exporteer afgesloten Z-rapporten naar CSV, PDF of JSON formaat. Alleen definitieve dagafsluitingen kunnen geëxporteerd worden.</p>
            </div>

            {/* Z-rapporten selecteren */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-500">🧾</span>
                  <h3 className="font-semibold text-gray-800">Selecteer Z-Rapporten</h3>
                </div>
                <button onClick={toggleAllZReports} className="text-sm text-blue-500 hover:underline">
                  {selectedZReports.length === zReports.length ? 'Deselecteer alles' : 'Selecteer alles'}
                </button>
              </div>
              {zReports.length === 0 ? (
                <div className="p-12 text-center">
                  <span className="text-5xl block mb-4">📭</span>
                  <p className="text-gray-500 font-medium">Nog geen afgesloten Z-rapporten beschikbaar.</p>
                  <p className="text-gray-400 text-sm mt-1">Sluit eerst een dag af via het Z-Rapport tabblad.</p>
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  {zReports.map(r => (
                    <div key={r.id} onClick={()=>toggleZReport(r.id)}
                      className={`p-4 border-b border-gray-50 cursor-pointer transition-colors hover:bg-gray-50 ${selectedZReports.includes(r.id)?'bg-emerald-50':''}`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${selectedZReports.includes(r.id)?'bg-emerald-500 border-emerald-500':'border-gray-300'}`}>
                          {selectedZReports.includes(r.id) && <span className="text-white text-xs">✓</span>}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-sm text-gray-800">{r.report_date}</p>
                          <p className="text-xs text-gray-400">Afgesloten: {new Date(r.generated_at).toLocaleString('nl-NL')}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-emerald-500">{fmt(r.total)}</p>
                          <p className="text-xs text-gray-400">{r.order_count} transacties</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Samenvatting selectie */}
            {selectedZReports.length > 0 && (
              <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4">Samenvatting selectie</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div><p className="text-2xl font-bold text-emerald-500">{selectedZReports.length}</p><p className="text-xs text-gray-400">Dagen</p></div>
                  <div><p className="text-2xl font-bold text-blue-500">{fmt(zReports.filter(r=>selectedZReports.includes(r.id)).reduce((s,r)=>s+r.total,0))}</p><p className="text-xs text-gray-400">Totale omzet</p></div>
                  <div><p className="text-2xl font-bold text-purple-500">{fmt(zReports.filter(r=>selectedZReports.includes(r.id)).reduce((s,r)=>s+r.tax_low+r.tax_mid+r.tax_high,0))}</p><p className="text-xs text-gray-400">Totale BTW</p></div>
                </div>
              </div>
            )}

            {/* Export knoppen */}
            <div className="grid grid-cols-3 gap-4">
              <button onClick={()=>selectedZReports.length>0&&exportBoekhoudCSV()} disabled={selectedZReports.length===0}
                className="flex items-center justify-center gap-2 py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 text-white font-bold rounded-2xl transition-colors text-sm">
                📊 Export CSV
              </button>
              <button onClick={()=>selectedZReports.length>0&&exportBoekhoudPDF()} disabled={selectedZReports.length===0}
                className="flex items-center justify-center gap-2 py-4 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white font-bold rounded-2xl transition-colors text-sm">
                📄 Export PDF
              </button>
              <button onClick={()=>selectedZReports.length>0&&exportBoekhoudJSON()} disabled={selectedZReports.length===0}
                className="flex items-center justify-center gap-2 py-4 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-bold rounded-2xl transition-colors text-sm">
                ⬇️ Export JSON
              </button>
            </div>

            {/* Info */}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
              <p className="font-semibold text-blue-700 mb-3">ℹ️ Over SCARDa Export</p>
              <ul className="space-y-1.5 text-sm text-blue-600">
                <li>• CSV formaat is geschikt voor import in boekhoudpakketten</li>
                <li>• Kolommen: datum, omzet, cash, kaart, online, BTW per tarief, tickets</li>
                <li>• Alleen afgesloten Z-rapporten zijn exporteerbaar</li>
                <li>• Elke export wordt gelogd in de audit trail</li>
              </ul>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB: FACTUREN
        ══════════════════════════════════════════════════════════════════════ */}
        {tab === 'facturen' && (
          <div className="space-y-5">
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-6">
              <div className="flex items-center gap-3">
                <span className="text-4xl">📄</span>
                <div>
                  <h2 className="text-xl font-bold text-purple-700">Facturen Overzicht</h2>
                  <p className="text-purple-400 text-sm">Per maand archief</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-12 border border-gray-200 shadow-sm text-center">
              <span className="text-5xl block mb-4">📄</span>
              <p className="text-gray-500 font-medium">Facturen module</p>
              <p className="text-gray-400 text-sm mt-2">Facturen worden beheerd via het facturatie systeem</p>
            </div>
          </div>
        )}
        </>
      )}

      <div className="mt-12 pb-8 text-center">
        <p className="text-xs text-gray-300">Vysion Horeca @ 2026</p>
      </div>
    </div>
      </PinGate>
  )
}
