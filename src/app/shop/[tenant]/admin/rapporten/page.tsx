'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getTenantSettings } from '@/lib/admin-api'
import Link from 'next/link'

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
  created_at: string
  items: { name: string; quantity: number; price: number }[]
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

type Tab = 'overzicht' | 'xrapport' | 'export'
type Period = 'today' | 'week' | 'month' | 'year'

function startOf(period: Period): Date {
  const now = new Date()
  if (period === 'today') { now.setHours(0, 0, 0, 0); return now }
  if (period === 'week') {
    const d = new Date(now)
    const day = d.getDay() || 7
    d.setDate(d.getDate() - day + 1)
    d.setHours(0, 0, 0, 0)
    return d
  }
  if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1)
  return new Date(now.getFullYear(), 0, 1)
}

function fmt(n: number) { return `€${n.toFixed(2)}` }
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: '2-digit' })
}
function fmtDateTime(s: string) {
  return new Date(s).toLocaleString('nl-NL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function RapportenPage({ params }: { params: { tenant: string } }) {
  const tenant = params.tenant
  const [tab, setTab] = useState<Tab>('overzicht')
  const [period, setPeriod] = useState<Period>('today')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null)
  const [openingCash, setOpeningCash] = useState<number>(0)
  const [lastZDate, setLastZDate] = useState<string | null>(null)
  const [exportPeriod, setExportPeriod] = useState<Period>('month')

  // Laad opening cash + last Z date uit localStorage
  useEffect(() => {
    const cash = localStorage.getItem(`rapportages_cash_${tenant}`)
    const z = localStorage.getItem(`rapportages_lastZ_${tenant}`)
    if (cash) setOpeningCash(parseFloat(cash) || 0)
    if (z) setLastZDate(z)
  }, [tenant])

  const saveOpeningCash = (v: number) => {
    setOpeningCash(v)
    localStorage.setItem(`rapportages_cash_${tenant}`, String(v))
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    const [{ data: ordersData }, info] = await Promise.all([
      supabase
        .from('orders')
        .select('id, order_number, status, payment_status, payment_method, order_type, total, subtotal, tax, created_at, items')
        .eq('tenant_slug', tenant)
        .neq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(2000),
      getTenantSettings(tenant),
    ])
    setOrders((ordersData || []) as Order[])
    setTenantInfo(info as TenantInfo)
    setLoading(false)
  }, [tenant])

  useEffect(() => { loadData() }, [loadData])

  // Filter geldige orders voor een periode
  const filterOrders = useCallback((from: Date, till: Date = new Date()) => {
    return orders.filter(o => {
      const d = new Date(o.created_at)
      if (d < from || d > till) return false
      return o.payment_status === 'paid' || o.status === 'completed' || o.status === 'delivered'
    })
  }, [orders])

  // Omzet stats voor gekozen periode
  const periodOrders = useMemo(() => filterOrders(startOf(period)), [filterOrders, period])

  const stats = useMemo(() => {
    const total = periodOrders.reduce((s, o) => s + o.total, 0)
    const subtotal = periodOrders.reduce((s, o) => s + o.subtotal, 0)
    const tax = periodOrders.reduce((s, o) => s + o.tax, 0)
    const cash = periodOrders.filter(o => o.payment_method === 'CASH').reduce((s, o) => s + o.total, 0)
    const card = periodOrders.filter(o => o.payment_method === 'CARD').reduce((s, o) => s + o.total, 0)
    const ideal = periodOrders.filter(o => o.payment_method === 'IDEAL').reduce((s, o) => s + o.total, 0)
    const bancontact = periodOrders.filter(o => o.payment_method === 'BANCONTACT').reduce((s, o) => s + o.total, 0)
    const online = periodOrders.filter(o => !['CASH','CARD','IDEAL','BANCONTACT'].includes(o.payment_method)).reduce((s, o) => s + o.total, 0)
    const dineIn = periodOrders.filter(o => o.order_type === 'DINE_IN').length
    const takeaway = periodOrders.filter(o => o.order_type === 'TAKEAWAY').length
    const delivery = periodOrders.filter(o => o.order_type === 'DELIVERY').length
    const avg = periodOrders.length > 0 ? total / periodOrders.length : 0

    // Top producten
    const productMap: Record<string, { qty: number; revenue: number }> = {}
    periodOrders.forEach(o => {
      (o.items || []).forEach((item: { name: string; quantity: number; price: number }) => {
        if (!productMap[item.name]) productMap[item.name] = { qty: 0, revenue: 0 }
        productMap[item.name].qty += item.quantity
        productMap[item.name].revenue += item.price * item.quantity
      })
    })
    const topProducts = Object.entries(productMap)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10)

    return { total, subtotal, tax, cash, card, ideal, bancontact, online, avg, count: periodOrders.length, dineIn, takeaway, delivery, topProducts }
  }, [periodOrders])

  // X-Rapport: bestellingen sinds laatste Z-afsluiting
  const xOrders = useMemo(() => {
    const from = lastZDate ? new Date(lastZDate) : startOf('today')
    return filterOrders(from)
  }, [filterOrders, lastZDate])

  const xStats = useMemo(() => {
    const total = xOrders.reduce((s, o) => s + o.total, 0)
    const cash = xOrders.filter(o => o.payment_method === 'CASH').reduce((s, o) => s + o.total, 0)
    const card = xOrders.filter(o => o.payment_method !== 'CASH').reduce((s, o) => s + o.total, 0)
    const tax = xOrders.reduce((s, o) => s + o.tax, 0)
    const vatRate = tenantInfo?.btw_percentage ?? 6
    return { total, cash, card, tax, count: xOrders.length, vatRate, expectedCash: openingCash + cash }
  }, [xOrders, openingCash, tenantInfo])

  // CSV Export
  const exportCSV = () => {
    const exp = filterOrders(startOf(exportPeriod))
    const headers = ['Datum', 'Tijd', 'Bon#', 'Type', 'Betaling', 'Subtotaal', 'BTW', 'Totaal']
    const rows = exp.map(o => [
      fmtDate(o.created_at),
      new Date(o.created_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
      String(o.order_number),
      o.order_type,
      o.payment_method,
      o.subtotal.toFixed(2).replace('.', ','),
      o.tax.toFixed(2).replace('.', ','),
      o.total.toFixed(2).replace('.', ','),
    ])
    const totalRow = ['TOTAAL', '', `${exp.length} bestellingen`, '', '',
      exp.reduce((s, o) => s + o.subtotal, 0).toFixed(2).replace('.', ','),
      exp.reduce((s, o) => s + o.tax, 0).toFixed(2).replace('.', ','),
      exp.reduce((s, o) => s + o.total, 0).toFixed(2).replace('.', ','),
    ]
    const csv = [
      `"${tenantInfo?.business_name || tenant}"`,
      `"Periode: ${exportPeriod}"`,
      '',
      headers.map(h => `"${h}"`).join(';'),
      ...rows.map(r => r.map(c => `"${c}"`).join(';')),
      '',
      totalRow.map(c => `"${c}"`).join(';'),
    ].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `omzet-${exportPeriod}-${tenant}.csv`
    a.click()
  }

  // PDF Export (print venster)
  const exportPDF = () => {
    const exp = filterOrders(startOf(exportPeriod))
    const totalRev = exp.reduce((s, o) => s + o.total, 0)
    const totalTax = exp.reduce((s, o) => s + o.tax, 0)
    const cash = exp.filter(o => o.payment_method === 'CASH').reduce((s, o) => s + o.total, 0)
    const card = exp.filter(o => o.payment_method !== 'CASH').reduce((s, o) => s + o.total, 0)
    const vatRate = tenantInfo?.btw_percentage ?? 6

    const html = `<!DOCTYPE html><html><head><title>Rapport</title>
    <style>
      body{font-family:Arial,sans-serif;padding:40px;max-width:800px;margin:0 auto}
      h1{color:#1e293b;border-bottom:2px solid #1e293b;padding-bottom:10px}
      h2{color:#374151;margin-top:30px}
      .info{color:#6b7280;margin-bottom:20px}
      table{width:100%;border-collapse:collapse;margin:20px 0}
      th,td{padding:10px;text-align:left;border-bottom:1px solid #e5e7eb}
      th{background:#f9fafb;font-weight:bold}
      .amt{text-align:right;font-family:monospace}
      .summary{background:#1e293b;color:white;padding:20px;border-radius:12px;margin:20px 0;display:grid;grid-template-columns:1fr 1fr;gap:15px}
      .sitem{background:rgba(255,255,255,0.1);padding:12px;border-radius:8px}
      .slabel{font-size:11px;opacity:0.7}
      .sval{font-size:22px;font-weight:bold}
      .footer{color:#9ca3af;font-size:11px;margin-top:40px}
      @media print{.noprint{display:none}}
    </style></head><body>
    <h1>📊 Omzet Rapport</h1>
    <div class="info">
      <strong>${tenantInfo?.business_name || tenant}</strong><br>
      ${tenantInfo?.address ? tenantInfo.address + '<br>' : ''}
      ${tenantInfo?.postal_code || ''} ${tenantInfo?.city || ''}<br>
      ${tenantInfo?.btw_number ? 'BTW: ' + tenantInfo.btw_number + '<br>' : ''}
      Periode: <strong>${exportPeriod}</strong>
    </div>
    <div class="summary">
      <div class="sitem"><div class="slabel">Totale Omzet</div><div class="sval">€${totalRev.toFixed(2)}</div></div>
      <div class="sitem"><div class="slabel">Bestellingen</div><div class="sval">${exp.length}</div></div>
      <div class="sitem"><div class="slabel">💵 Contant</div><div class="sval">€${cash.toFixed(2)}</div></div>
      <div class="sitem"><div class="slabel">💳 PIN/Kaart</div><div class="sval">€${card.toFixed(2)}</div></div>
    </div>
    <h2>BTW Overzicht</h2>
    <table>
      <tr><th>Omschrijving</th><th class="amt">Bedrag</th></tr>
      <tr><td>Omzet excl. BTW</td><td class="amt">€${(totalRev - totalTax).toFixed(2)}</td></tr>
      <tr><td>BTW ${vatRate}%</td><td class="amt">€${totalTax.toFixed(2)}</td></tr>
      <tr><td><strong>Omzet incl. BTW</strong></td><td class="amt"><strong>€${totalRev.toFixed(2)}</strong></td></tr>
    </table>
    <h2>Bestellingen (${exp.length})</h2>
    <table>
      <tr><th>Datum</th><th>Bon#</th><th>Type</th><th>Betaling</th><th class="amt">Totaal</th></tr>
      ${exp.map(o => `<tr><td>${fmtDateTime(o.created_at)}</td><td>#${o.order_number}</td><td>${o.order_type}</td><td>${o.payment_method}</td><td class="amt">€${o.total.toFixed(2)}</td></tr>`).join('')}
      <tr><td colspan="4"><strong>TOTAAL</strong></td><td class="amt"><strong>€${totalRev.toFixed(2)}</strong></td></tr>
    </table>
    <div class="footer">Gegenereerd op ${new Date().toLocaleString('nl-NL')} — Vysion Horeca POS</div>
    <button class="noprint" onclick="window.print()" style="margin-top:20px;padding:10px 20px;background:#1e293b;color:white;border:none;border-radius:8px;cursor:pointer;font-size:14px">🖨️ Afdrukken / PDF opslaan</button>
    </body></html>`

    const w = window.open('', '_blank', 'width=900,height=700')
    if (w) { w.document.write(html); w.document.close() }
  }

  const periodLabel: Record<Period, string> = { today: 'Vandaag', week: 'Deze week', month: 'Deze maand', year: 'Dit jaar' }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📊 Rapportages</h1>
          <p className="text-sm text-gray-500 mt-0.5">Omzet, X-Rapport en exports</p>
        </div>
        <button onClick={loadData} className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
          🔄 Vernieuwen
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl mb-6">
        {([
          { id: 'overzicht', label: '📈 Overzicht' },
          { id: 'xrapport', label: '🖨️ X-Rapport' },
          { id: 'export', label: '📁 Export' },
        ] as { id: Tab; label: string }[]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${tab === t.id ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-400">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">Laden...</p>
          </div>
        </div>
      ) : (
        <>
          {/* ── TAB: OVERZICHT ── */}
          {tab === 'overzicht' && (
            <div className="space-y-6">
              {/* Periode selector */}
              <div className="flex gap-2">
                {(['today','week','month','year'] as Period[]).map(p => (
                  <button key={p} onClick={() => setPeriod(p)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${period === p ? 'bg-[#1e293b] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    {periodLabel[p]}
                  </button>
                ))}
              </div>

              {/* Omzet cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Omzet', value: fmt(stats.total), icon: '💰', color: 'bg-emerald-50 border-emerald-200' },
                  { label: 'Bestellingen', value: String(stats.count), icon: '🧾', color: 'bg-blue-50 border-blue-200' },
                  { label: 'Gem. order', value: fmt(stats.avg), icon: '📊', color: 'bg-purple-50 border-purple-200' },
                  { label: 'BTW', value: fmt(stats.tax), icon: '🏛️', color: 'bg-gray-50 border-gray-200' },
                ].map(c => (
                  <div key={c.label} className={`rounded-2xl border p-4 ${c.color}`}>
                    <div className="text-2xl mb-1">{c.icon}</div>
                    <div className="text-2xl font-bold text-gray-900">{c.value}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{c.label}</div>
                  </div>
                ))}
              </div>

              {/* Betaalmethodes */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5">
                <h3 className="font-bold text-gray-800 mb-4">💳 Betaalmethodes</h3>
                <div className="space-y-3">
                  {[
                    { label: '💵 Contant', value: stats.cash },
                    { label: '💳 PIN / Kaart', value: stats.card },
                    { label: '📱 iDEAL', value: stats.ideal },
                    { label: '🏦 Bancontact', value: stats.bancontact },
                    { label: '🌐 Online', value: stats.online },
                  ].filter(m => m.value > 0).map(m => (
                    <div key={m.label} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 w-36">{m.label}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <div className="h-full bg-[#1e293b] rounded-full" style={{ width: `${stats.total > 0 ? (m.value / stats.total) * 100 : 0}%` }} />
                      </div>
                      <span className="text-sm font-bold text-gray-900 w-20 text-right">{fmt(m.value)}</span>
                    </div>
                  ))}
                  {stats.total === 0 && <p className="text-gray-400 text-sm">Geen betalingen in deze periode</p>}
                </div>
              </div>

              {/* Besteltypen */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: '🍽️ Hier opeten', value: stats.dineIn },
                  { label: '📦 Afhalen', value: stats.takeaway },
                  { label: '🚗 Levering', value: stats.delivery },
                ].map(t => (
                  <div key={t.label} className="bg-white border border-gray-200 rounded-2xl p-4 text-center">
                    <div className="text-xl font-bold text-gray-900">{t.value}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{t.label}</div>
                  </div>
                ))}
              </div>

              {/* Top producten */}
              {stats.topProducts.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-2xl p-5">
                  <h3 className="font-bold text-gray-800 mb-4">🏆 Top Producten</h3>
                  <div className="space-y-2">
                    {stats.topProducts.map((p, i) => (
                      <div key={p.name} className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-[#1e293b] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                        <span className="flex-1 text-sm text-gray-700 truncate">{p.name}</span>
                        <span className="text-sm text-gray-500">{p.qty}x</span>
                        <span className="text-sm font-bold text-gray-900 w-20 text-right">{fmt(p.revenue)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Link naar Z-rapport */}
              <Link
                href={`/shop/${tenant}/admin/z-rapport`}
                className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-2xl p-4 hover:bg-amber-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🧾</span>
                  <div>
                    <p className="font-semibold text-amber-800">Z-Rapport</p>
                    <p className="text-xs text-amber-600">Dagafsluiting — GKS compliant</p>
                  </div>
                </div>
                <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </Link>
            </div>
          )}

          {/* ── TAB: X-RAPPORT ── */}
          {tab === 'xrapport' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                <p className="font-semibold text-blue-800">ℹ️ X-Rapport — huidig dagrapport</p>
                <p className="text-xs text-blue-600 mt-1">
                  Toont alle bestellingen {lastZDate ? `sinds de laatste Z-afsluiting (${fmtDateTime(lastZDate)})` : 'van vandaag'}.
                  Dit sluit de dag NIET af.
                </p>
              </div>

              {/* Openingskas */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5">
                <h3 className="font-bold text-gray-800 mb-3">💰 Openingskas</h3>
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 text-sm">€</span>
                  <input
                    type="number"
                    value={openingCash || ''}
                    onChange={e => saveOpeningCash(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    min={0}
                    step="0.01"
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-xl font-bold focus:border-blue-400 focus:outline-none"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2">Vul het bedrag in de kassalade in bij het begin van de dag</p>
              </div>

              {/* X-rapport stats */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Totale omzet', value: fmt(xStats.total), icon: '💰', color: 'bg-emerald-50 border-emerald-200' },
                  { label: 'Bestellingen', value: String(xStats.count), icon: '🧾', color: 'bg-blue-50 border-blue-200' },
                  { label: '💵 Contant', value: fmt(xStats.cash), icon: '', color: 'bg-gray-50 border-gray-200' },
                  { label: '💳 PIN/Kaart/Online', value: fmt(xStats.card), icon: '', color: 'bg-gray-50 border-gray-200' },
                  { label: 'BTW', value: fmt(xStats.tax), icon: '🏛️', color: 'bg-gray-50 border-gray-200' },
                  { label: 'Verwacht in lade', value: fmt(xStats.expectedCash), icon: '🏦', color: 'bg-purple-50 border-purple-200' },
                ].map(c => (
                  <div key={c.label} className={`rounded-2xl border p-4 ${c.color}`}>
                    {c.icon && <div className="text-2xl mb-1">{c.icon}</div>}
                    <div className="text-2xl font-bold text-gray-900">{c.value}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{c.label}</div>
                  </div>
                ))}
              </div>

              {/* BTW detail */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5">
                <h3 className="font-bold text-gray-800 mb-4">🏛️ BTW Overzicht</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Omzet excl. BTW</span>
                    <span className="font-bold">{fmt(xStats.total - xStats.tax)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">BTW {xStats.vatRate}%</span>
                    <span className="font-bold">{fmt(xStats.tax)}</span>
                  </div>
                  <div className="flex justify-between py-2 text-base">
                    <span className="font-bold text-gray-900">Totaal incl. BTW</span>
                    <span className="font-bold text-emerald-600">{fmt(xStats.total)}</span>
                  </div>
                </div>
              </div>

              {/* Afdrukken */}
              <button
                onClick={() => {
                  const html = `<!DOCTYPE html><html><head><title>X-Rapport</title>
                  <style>body{font-family:'Courier New',monospace;font-size:13px;max-width:400px;margin:0 auto;padding:20px}
                  h1{font-size:18px;text-align:center;border-bottom:2px solid #000;padding-bottom:8px}
                  .row{display:flex;justify-content:space-between;padding:4px 0}
                  .divider{border-top:1px dashed #000;margin:8px 0}
                  .total{font-size:16px;font-weight:bold}
                  @media print{button{display:none}}</style></head><body>
                  <h1>📊 X-RAPPORT</h1>
                  <div class="row"><span>${tenantInfo?.business_name || tenant}</span></div>
                  <div class="row"><span>Datum: ${new Date().toLocaleString('nl-NL')}</span></div>
                  ${lastZDate ? `<div class="row"><span>Sinds Z: ${fmtDateTime(lastZDate)}</span></div>` : ''}
                  <div class="divider"></div>
                  <div class="row"><span>Bestellingen</span><span>${xStats.count}</span></div>
                  <div class="row"><span>💵 Contant</span><span>${fmt(xStats.cash)}</span></div>
                  <div class="row"><span>💳 PIN/Kaart</span><span>${fmt(xStats.card)}</span></div>
                  <div class="divider"></div>
                  <div class="row"><span>Excl. BTW</span><span>${fmt(xStats.total - xStats.tax)}</span></div>
                  <div class="row"><span>BTW ${xStats.vatRate}%</span><span>${fmt(xStats.tax)}</span></div>
                  <div class="divider"></div>
                  <div class="row total"><span>TOTAAL</span><span>${fmt(xStats.total)}</span></div>
                  <div class="divider"></div>
                  <div class="row"><span>Openingskas</span><span>${fmt(openingCash)}</span></div>
                  <div class="row"><span>+ Contant verkoop</span><span>${fmt(xStats.cash)}</span></div>
                  <div class="row total"><span>Verwacht in lade</span><span>${fmt(xStats.expectedCash)}</span></div>
                  <br><button onclick="window.print()">🖨️ Afdrukken</button>
                  </body></html>`
                  const w = window.open('', '_blank', 'width=500,height=600')
                  if (w) { w.document.write(html); w.document.close() }
                }}
                className="w-full py-3 rounded-xl bg-[#1e293b] hover:bg-[#0f172a] text-white font-bold transition-colors flex items-center justify-center gap-2"
              >
                🖨️ X-Rapport Afdrukken
              </button>

              {/* Link naar Z-rapport */}
              <Link
                href={`/shop/${tenant}/admin/z-rapport`}
                className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-2xl p-4 hover:bg-amber-100 transition-colors"
              >
                <div>
                  <p className="font-semibold text-amber-800">🧾 Naar Z-Rapport</p>
                  <p className="text-xs text-amber-600">Dag afsluiten & GKS dagafsluiting</p>
                </div>
                <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </Link>
            </div>
          )}

          {/* ── TAB: EXPORT ── */}
          {tab === 'export' && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-2xl p-5">
                <h3 className="font-bold text-gray-800 mb-4">📅 Kies periode</h3>
                <div className="flex gap-2 flex-wrap">
                  {(['today','week','month','year'] as Period[]).map(p => (
                    <button key={p} onClick={() => setExportPeriod(p)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${exportPeriod === p ? 'bg-[#1e293b] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {periodLabel[p]}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  {filterOrders(startOf(exportPeriod)).length} bestellingen — {fmt(filterOrders(startOf(exportPeriod)).reduce((s, o) => s + o.total, 0))} totaal
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={exportCSV}
                  className="flex flex-col items-center justify-center gap-3 py-8 bg-emerald-50 border-2 border-emerald-200 rounded-2xl hover:bg-emerald-100 transition-colors"
                >
                  <span className="text-4xl">📊</span>
                  <div className="text-center">
                    <p className="font-bold text-emerald-800">CSV Export</p>
                    <p className="text-xs text-emerald-600 mt-1">Excel / boekhouder</p>
                  </div>
                </button>

                <button
                  onClick={exportPDF}
                  className="flex flex-col items-center justify-center gap-3 py-8 bg-blue-50 border-2 border-blue-200 rounded-2xl hover:bg-blue-100 transition-colors"
                >
                  <span className="text-4xl">📄</span>
                  <div className="text-center">
                    <p className="font-bold text-blue-800">PDF Rapport</p>
                    <p className="text-xs text-blue-600 mt-1">Afdrukken of opslaan</p>
                  </div>
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-sm text-blue-700">
                <p className="font-semibold mb-1">💡 Info</p>
                <ul className="space-y-1 text-xs text-blue-600">
                  <li>• CSV is geschikt voor Excel en boekhoudprogramma's</li>
                  <li>• PDF kan je afdrukken of opslaan via de browser</li>
                  <li>• Voor GKS-conforme Z-rapporten: ga naar het Z-Rapport</li>
                </ul>
              </div>

              <Link
                href={`/shop/${tenant}/admin/z-rapport`}
                className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-2xl p-4 hover:bg-amber-100 transition-colors"
              >
                <div>
                  <p className="font-semibold text-amber-800">🧾 Z-Rapport archief</p>
                  <p className="text-xs text-amber-600">Bekijk alle afgesloten dagen — GKS compliant</p>
                </div>
                <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  )
}
