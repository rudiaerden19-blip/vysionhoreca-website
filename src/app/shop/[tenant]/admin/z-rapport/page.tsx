'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { adminDb } from '@/lib/admin-db-client'
import { authFetch } from '@/lib/auth-headers'
import {
  distributeOrderPaymentForZRaport,
  fetchAllTenantOrdersInCreatedAtRange,
  getTenantSettings,
  getZRapportDateBounds,
  orderCountsTowardRevenueAndZReport,
  type Order,
} from '@/lib/admin-api'
import {
  aggregateZReportArticleLines,
  type ZReportArticleLine,
} from '@/lib/z-report-aggregate-articles'
import {
  aggregateZReportVatFromOrderRows,
  CATEGORY_VAT_PERCENT_OPTIONS,
  type CategoryVatPercent,
  type ZReportVatOrderSlice,
} from '@/lib/order-vat'
import { fetchZReportVatContextForTenant } from '@/lib/z-report-vat-context'
import {
  buildZReportVatRows,
  formatZReportEuro,
  type ZReportAmounts,
} from '@/lib/z-report-document'
import { ZReportDocumentBody } from '@/components/ZReportDocumentBody'
import {
  addMonthsToYearMonth,
  buildZReportMonthDayRows,
  formatYearMonthLabel,
  getLastDayOfMonthYmd,
  monthBoundsUtc,
  parseZReportMonthSentLog,
  sumZReportMonthAmounts,
  type ZReportMonthDayRow,
} from '@/lib/z-report-month'
import { useLanguage } from '@/i18n'
import PinGate from '@/components/PinGate'

// SHA-256 hash voor integriteitsverificatie (GKS compliance)
async function generateReportHash(data: {
  tenant: string
  date: string
  orderCount: number
  total: number
  orderIds: string[]
}): Promise<string> {
  const hashInput = JSON.stringify({
    tenant: data.tenant,
    date: data.date,
    orderCount: data.orderCount,
    total: Math.round(data.total * 100),
    orderIds: data.orderIds.sort(),
    version: 'v1'
  })
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(hashInput)
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

interface DailyStats {
  date: string
  orderCount: number
  subtotal: number
  taxByRate: Record<CategoryVatPercent, number>
  baseByRate: Record<CategoryVatPercent, number>
  taxLow: number
  taxMid: number
  taxHigh: number
  total: number
  cashPayments: number
  onlinePayments: number
  cardPayments: number
  orderIds: string[]
}

function emptyVatRecord(): Record<CategoryVatPercent, number> {
  return { 6: 0, 9: 0, 12: 0, 21: 0 }
}

function statsToAmounts(stats: DailyStats): ZReportAmounts {
  return {
    orderCount: stats.orderCount,
    subtotalExcl: stats.subtotal,
    totalIncl: stats.total,
    taxByRate: stats.taxByRate,
    baseByRate: stats.baseByRate,
    cashPayments: stats.cashPayments,
    cardPayments: stats.cardPayments,
    onlinePayments: stats.onlinePayments,
  }
}

interface SavedReport {
  id: string
  report_date: string
  order_count: number
  total: number
  generated_at: string
  order_ids?: string[]
  report_hash?: string
  is_closed?: boolean
  closed_at?: string
  manual_cash?: number | null
  manual_card?: number | null
  manual_online?: number | null
  manual_total?: number | null
  kassa_saved_at?: string | null
}

export default function ZRapportPage({ params }: { params: { tenant: string } }) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [closing, setClosing] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [showKassaModal, setShowKassaModal] = useState(false)
  const [kassaForm, setKassaForm] = useState({ cash: '', card: '', online: ''})
  const [savingKassa, setSavingKassa] = useState(false)
  const [showMoveDayModal, setShowMoveDayModal] = useState(false)
  const [moveTargetDate, setMoveTargetDate] = useState('')
  const [movingSalesDay, setMovingSalesDay] = useState(false)
  const [archivePeriod, setArchivePeriod] = useState<'dag' |  'week' |  'maand' |  'jaar'>('dag')

  const getLocalDateString = (date: Date = new Date()) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const [selectedDate, setSelectedDate] = useState(getLocalDateString())
  const [stats, setStats] = useState<DailyStats | null>(null)
  const [businessInfo, setBusinessInfo] = useState<any>(null)
  const [btwPercentage, setBtwPercentage] = useState(6)
  const [savedReports, setSavedReports] = useState<SavedReport[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailAddress, setEmailAddress] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [monthAccountantEmail, setMonthAccountantEmail] = useState('')
  const [sendingMonthEmail, setSendingMonthEmail] = useState(false)
  const [selectedMonthForEmail, setSelectedMonthForEmail] = useState(() =>
    getLocalDateString().slice(0, 7),
  )
  const [reportViewMode, setReportViewMode] = useState<'day' | 'month'>('day')
  const [monthLoading, setMonthLoading] = useState(false)
  const [monthDayRows, setMonthDayRows] = useState<ZReportMonthDayRow[]>([])
  const [monthAmounts, setMonthAmounts] = useState<ZReportAmounts | null>(null)
  const [currentSavedReport, setCurrentSavedReport] = useState<SavedReport | null>(null)
  const [articleLines, setArticleLines] = useState<ZReportArticleLine[]>([])

  useEffect(() => {
    if (reportViewMode === 'day') {
      loadData()
    }
    loadSavedReports()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.tenant, selectedDate, reportViewMode])

  useEffect(() => {
    if (reportViewMode === 'month') {
      loadMonthReportData(selectedMonthForEmail)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.tenant, selectedMonthForEmail, reportViewMode, savedReports])

  // Houd huidige opgeslagen rapport bij voor is_closed check
  useEffect(() => {
    const found = savedReports.find(r => r.report_date === selectedDate) || null
    setCurrentSavedReport(found)
  }, [savedReports, selectedDate])

  const loadData = async () => {
    setLoading(true)

    const settings = await getTenantSettings(params.tenant)
    const settingsBtw = Number(settings?.btw_percentage) || 6
    if (settings) {
      setBusinessInfo(settings)
      setBtwPercentage(settingsBtw)
      setMonthAccountantEmail(settings.accountant_email || '')
    }

    // KRITIEK: Fiscale daggrens = 00:00 tot 12:00 de VOLGENDE dag (GKS compliant)
    const { startUTC, endUTC } = getZRapportDateBounds(selectedDate)

    const ordersRaw = await fetchAllTenantOrdersInCreatedAtRange(
      params.tenant,
      startUTC,
      endUTC,
      '*'
    )

    const orders = ordersRaw.filter((o) =>
      orderCountsTowardRevenueAndZReport(
        o as Pick<Order, 'order_type' |  'status' |  'payment_status'>
      )
    ) as unknown as Order[]

    const vatContext = await fetchZReportVatContextForTenant(params.tenant)
    setArticleLines(aggregateZReportArticleLines(orders, settingsBtw, vatContext))

    if (orders.length) {
      let total = 0
      let cashPayments = 0
      let onlinePayments = 0
      let cardPayments = 0
      const orderIds: string[] = []

      orders.forEach((order) => {
        if (order.id) orderIds.push(order.id)
        const orderTotal = Number(order.total) || 0
        total += orderTotal
        const d = distributeOrderPaymentForZRaport(order)
        cashPayments += d.cash
        cardPayments += d.card
        onlinePayments += d.online
      })

      total = Math.round(total * 100) / 100

    const vatSlice: ZReportVatOrderSlice[] = orders.map((o) => ({
      total: o.total,
      items: (o as { items?: unknown }).items,
      order_type: (o as { order_type?: unknown }).order_type,
    }))
    const vatAgg = aggregateZReportVatFromOrderRows(vatSlice, settingsBtw, vatContext)

      setStats({
        date: selectedDate,
        orderCount: orders.length,
        subtotal: vatAgg.subtotalExcl,
        taxByRate: vatAgg.taxByRate,
        baseByRate: vatAgg.baseByRate,
        taxLow: vatAgg.tax_low,
        taxMid: vatAgg.tax_mid,
        taxHigh: vatAgg.tax_high,
        total,
        cashPayments,
        onlinePayments,
        cardPayments,
        orderIds,
      })
    } else {
      setStats({
        date: selectedDate,
        orderCount: 0,
        subtotal: 0,
        taxByRate: emptyVatRecord(),
        baseByRate: emptyVatRecord(),
        taxLow: 0,
        taxMid: 0,
        taxHigh: 0,
        total: 0,
        cashPayments: 0,
        onlinePayments: 0,
        cardPayments: 0,
        orderIds: [],
      })
    }

    setLoading(false)
  }

  const buildManualByDateForMonth = (yearMonth: string) => {
    const manualByDate: Record<
      string,
      { cash?: number; card?: number; online?: number; total?: number }
    > = {}
    savedReports
      .filter((r) => r.report_date.startsWith(yearMonth) && (r.manual_total || 0) > 0)
      .forEach((r) => {
        manualByDate[r.report_date] = {
          cash: r.manual_cash ?? undefined,
          card: r.manual_card ?? undefined,
          online: r.manual_online ?? undefined,
          total: r.manual_total ?? undefined,
        }
      })
    return manualByDate
  }

  const loadMonthReportData = async (yearMonth: string) => {
    setMonthLoading(true)
    try {
      const today = getLocalDateString()
      const monthEnd = getLastDayOfMonthYmd(yearMonth)
      const capYmd = today < monthEnd ? today : monthEnd
      const { startUTC, endUTC } = monthBoundsUtc(yearMonth, capYmd)

      const ordersRaw = await fetchAllTenantOrdersInCreatedAtRange(
        params.tenant,
        startUTC,
        endUTC,
        '*',
      )
      const vatContext = await fetchZReportVatContextForTenant(params.tenant)
      const days = buildZReportMonthDayRows(
        ordersRaw as unknown as Order[],
        yearMonth,
        capYmd,
        btwPercentage,
        vatContext,
        buildManualByDateForMonth(yearMonth),
      )
      setMonthDayRows(days)
      setMonthAmounts(days.length ? sumZReportMonthAmounts(days) : null)
    } finally {
      setMonthLoading(false)
    }
  }

  const loadSavedReports = async () => {
    // Server-side gelezen via /api/admin/db/read (anon-key heeft geen
    // SELECT-rechten meer op z_reports na Phase 2-lockdown).
    const result = await adminDb.select<SavedReport[]>('z_reports', {
      tenantSlug: params.tenant,
      select:
        'id, report_date, order_count, total, generated_at, order_ids, report_hash, is_closed, closed_at, manual_cash, manual_card, manual_online, manual_total, kassa_saved_at',
      order: { column: 'report_date', ascending: false },
      limit: 400,
    })
    if (result.ok && Array.isArray(result.data)) setSavedReports(result.data)
  }

  const refreshData = () => {
    loadData()
    loadSavedReports()
  }

  const moveSalesDay = async () => {
    if (!moveTargetDate || isDayClosed || reportViewMode !== 'day') return
    if (
      !window.confirm(
        t('zReport.moveSalesDayConfirm')
          .replace('{{from}}', formatShortDate(selectedDate))
          .replace('{{to}}', formatShortDate(moveTargetDate)),
      )
    ) {
      return
    }

    setMovingSalesDay(true)
    try {
      const r = await authFetch('/api/admin/z-report/move-sales-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantSlug: params.tenant,
          fromDate: selectedDate,
          toDate: moveTargetDate,
        }),
      })
      const data = (await r.json()) as { error?: string; movedCount?: number }
      if (!r.ok) {
        throw new Error(data.error || t('zReport.moveSalesDayError'))
      }
      const target = moveTargetDate
      setShowMoveDayModal(false)
      setMoveTargetDate('')
      setSelectedDate(target)
      setArchivePeriod('dag')
      setReportViewMode('day')
      await loadData()
      await loadSavedReports()
      alert(
        t('zReport.moveSalesDaySuccess')
          .replace('{{count}}', String(data.movedCount ?? 0))
          .replace('{{to}}', formatShortDate(target)),
      )
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('zReport.moveSalesDayError')
      alert(message)
    } finally {
      setMovingSalesDay(false)
    }
  }

  // Opslaan (kan meerdere keren, tot dag is afgesloten)
  const syncReport = async () => {
    if (!stats || stats.orderCount === 0) return
    if (currentSavedReport?.is_closed) return // Geblokkeerd voor gesloten dag

    setSyncing(true)

    const reportHash = await generateReportHash({
      tenant: params.tenant,
      date: selectedDate,
      orderCount: stats.orderCount,
      total: stats.total,
      orderIds: stats.orderIds,
    })

    const r = await adminDb.upsert(
      'z_reports',
      {
        tenant_slug: params.tenant,
        report_date: selectedDate,
        order_count: stats.orderCount,
        subtotal: stats.subtotal,
        tax_low: stats.taxLow,
        tax_mid: stats.taxMid,
        tax_high: stats.taxHigh,
        total: stats.total,
        cash_payments: stats.cashPayments,
        card_payments: stats.cardPayments,
        online_payments: stats.onlinePayments,
        btw_percentage: btwPercentage,
        business_name: businessInfo?.business_name,
        business_address: businessInfo?.address,
        btw_number: businessInfo?.btw_number,
        order_ids: stats.orderIds,
        report_hash: reportHash,
        generated_at: new Date().toISOString(),
      },
      { tenantSlug: params.tenant, onConflict: 'tenant_slug,report_date'}
    )

    if (r.ok) {
      await loadSavedReports()
    } else {
      alert('Fout bij opslaan: '+ (r.error || ''))
    }

    setSyncing(false)
  }

  // DAG AFSLUITEN — onomkeerbaar, GKS compliant
  const closeDay = async () => {
    if (!stats) return
    setClosing(true)

    // Eerst opslaan met huidige data
    const reportHash = await generateReportHash({
      tenant: params.tenant,
      date: selectedDate,
      orderCount: stats.orderCount,
      total: stats.total,
      orderIds: stats.orderIds,
    })

    const closedAt = new Date().toISOString()

    const r = await adminDb.upsert(
      'z_reports',
      {
        tenant_slug: params.tenant,
        report_date: selectedDate,
        order_count: stats.orderCount,
        subtotal: stats.subtotal,
        tax_low: stats.taxLow,
        tax_mid: stats.taxMid,
        tax_high: stats.taxHigh,
        total: stats.total,
        cash_payments: stats.cashPayments,
        card_payments: stats.cardPayments,
        online_payments: stats.onlinePayments,
        btw_percentage: btwPercentage,
        business_name: businessInfo?.business_name,
        business_address: businessInfo?.address,
        btw_number: businessInfo?.btw_number,
        order_ids: stats.orderIds,
        report_hash: reportHash,
        generated_at: closedAt,
        is_closed: true,   // KRITIEK: Dag definitief afgesloten
        closed_at: closedAt,
      },
      { tenantSlug: params.tenant, onConflict: 'tenant_slug,report_date'}
    )

    if (r.ok) {
      await loadSavedReports()
      setShowCloseConfirm(false)
    } else {
      alert('Fout bij afsluiten: '+ (r.error || ''))
    }

    setClosing(false)
  }

  // Sla handmatige kassa invoer op
  const saveKassaEntry = async () => {
    if (currentSavedReport?.is_closed) {
      alert(t('zReport.kassaEntryClosedBlocked'))
      return
    }

    setSavingKassa(true)
    const cash = parseFloat(kassaForm.cash) || 0
    const card = parseFloat(kassaForm.card) || 0
    const online = parseFloat(kassaForm.online) || 0
    const total = cash + card + online

    const ordersTotal = stats?.total ?? 0
    if (ordersTotal > 0 && total > 0) {
      const tolerance = Math.max(0.05, ordersTotal * 0.02)
      if (Math.abs(total - ordersTotal) <= tolerance) {
        if (!window.confirm(t('zReport.kassaDuplicateConfirm'))) {
          setSavingKassa(false)
          return
        }
      }
    }

    const r = await adminDb.upsert(
      'z_reports',
      {
        tenant_slug: params.tenant,
        report_date: selectedDate,
        // Online orders data (bewaar bestaande waarden via upsert)
        order_count: stats?.orderCount || 0,
        subtotal: stats?.subtotal || 0,
        tax_low: stats?.taxLow || 0,
        tax_mid: stats?.taxMid || 0,
        tax_high: stats?.taxHigh || 0,
        total: stats?.total || 0,
        cash_payments: stats?.cashPayments || 0,
        card_payments: stats?.cardPayments || 0,
        online_payments: stats?.onlinePayments || 0,
        btw_percentage: btwPercentage,
        business_name: businessInfo?.business_name,
        business_address: businessInfo?.address,
        btw_number: businessInfo?.btw_number,
        order_ids: stats?.orderIds || [],
        generated_at: new Date().toISOString(),
        // Handmatige kassa invoer
        manual_cash: cash || null,
        manual_card: card || null,
        manual_online: online || null,
        manual_total: total || null,
        kassa_saved_at: new Date().toISOString(),
      },
      { tenantSlug: params.tenant, onConflict: 'tenant_slug,report_date'}
    )

    if (r.ok) {
      await loadSavedReports()
      setShowKassaModal(false)
      setKassaForm({ cash: '', card: '', online: ''})
    } else {
      alert('Fout bij opslaan: '+ (r.error || ''))
    }
    setSavingKassa(false)
  }

  // Genereer kassa rapport HTML voor afdrukken
  const printKassaReport = (report: SavedReport) => {
    const html = `
      <!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Kassa Rapport ${formatShortDate(report.report_date)}</title>
      <style>
        body { font-family: 'Courier New', monospace; max-width: 400px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 15px; margin-bottom: 15px; }
        .row { display: flex; justify-content: space-between; font-size: 14px; margin: 6px 0; }
        .total-row { font-weight: bold; font-size: 16px; border-top: 2px solid #000; padding-top: 10px; margin-top: 10px; }
        .section-title { font-weight: bold; margin: 12px 0 6px; border-bottom: 1px solid #ccc; }
        .footer { text-align: center; font-size: 10px; color: #666; border-top: 2px dashed #000; margin-top: 20px; padding-top: 15px; }
      </style></head><body>
      <div class="header">
        <h1>${businessInfo?.business_name || ''}</h1>
        <p>${businessInfo?.address || ''}</p>
        ${businessInfo?.btw_number ? `<p>BTW: ${businessInfo.btw_number}</p>`: ''}
        <p><strong>KASSA RAPPORT</strong></p>
        <p>${formatDate(report.report_date)}</p>
        ${report.is_closed ? '<p> AFGESLOTEN</p>': ''}
      </div>
      ${(report.manual_cash != null || report.manual_card != null || report.manual_online != null) ? `
      <div class="section-title">HANDMATIGE KASSA INVOER</div>
      ${report.manual_cash != null ? `<div class="row"><span>Contant:</span><span>€${(report.manual_cash || 0).toFixed(2)}</span></div>`: ''}
      ${report.manual_card != null ? `<div class="row"><span>Kaart:</span><span>€${(report.manual_card || 0).toFixed(2)}</span></div>`: ''}
      ${report.manual_online != null ? `<div class="row"><span>Online:</span><span>€${(report.manual_online || 0).toFixed(2)}</span></div>`: ''}
      <div class="row total-row"><span>TOTAAL KASSA:</span><span>€${(report.manual_total || 0).toFixed(2)}</span></div>
      `: ''}
      ${report.order_count > 0 ? `
      <div class="section-title">ONLINE BESTELLINGEN</div>
      <div class="row"><span>Aantal:</span><span>${report.order_count}</span></div>
      <div class="row total-row"><span>TOTAAL ONLINE:</span><span>€${(report.total || 0).toFixed(2)}</span></div>
      `: ''}
      <div class="row total-row" style="font-size:18px;margin-top:16px;"><span>GRAND TOTAL:</span><span>€${((report.manual_total || 0) + (report.total || 0)).toFixed(2)}</span></div>
      <div class="footer">
        <p>Gegenereerd: ${new Date().toLocaleString('nl-BE')}</p>
        <p>Vysion kassa's - ordervysion.com</p>
      </div></body></html>`
    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 250) }
  }

  // Archief aggregatie per periode
  const getAggregatedReports = () => {
    const liveStatsForRow = (reportDate: string) =>
      reportViewMode === 'day' && reportDate === selectedDate && stats != null && !loading

    if (archivePeriod === 'dag') return savedReports.map(r => {
      const live = liveStatsForRow(r.report_date)
      const onlineTotal = live ? stats!.total : (r.total || 0)
      const count = live ? stats!.orderCount : (r.order_count || 0)
      const kassaTotal = r.manual_total || 0
      return {
        label: formatShortDate(r.report_date),
        total: onlineTotal + kassaTotal,
        onlineTotal,
        kassaTotal,
        count,
        isClosed: r.is_closed,
        reportDate: r.report_date,
        report: r,
      }
    })

    const groups: Record<string, { label: string; total: number; onlineTotal: number; kassaTotal: number; count: number; reports: SavedReport[] }> = {}

    savedReports.forEach(r => {
      const d = new Date(r.report_date)
      let key = ''
      let label = ''
      if (archivePeriod === 'week') {
        const startOfYear = new Date(d.getFullYear(), 0, 1)
        const week = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7)
        key = `${d.getFullYear()}-W${week}`
        label = `Week ${week} ${d.getFullYear()}`
      } else if (archivePeriod === 'maand') {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        label = d.toLocaleDateString('nl-BE', { month: 'long', year: 'numeric'})
      } else if (archivePeriod === 'jaar') {
        key = `${d.getFullYear()}`
        label = `${d.getFullYear()}`
      }
      if (!groups[key]) groups[key] = { label, total: 0, onlineTotal: 0, kassaTotal: 0, count: 0, reports: [] }
      groups[key].total += (r.total || 0) + (r.manual_total || 0)
      groups[key].onlineTotal += r.total || 0
      groups[key].kassaTotal += r.manual_total || 0
      groups[key].count += r.order_count || 0
      groups[key].reports.push(r)
    })

    return Object.entries(groups).map(([key, g]) => ({
      label: g.label,
      total: g.total,
      onlineTotal: g.onlineTotal,
      kassaTotal: g.kassaTotal,
      count: g.count,
      isClosed: undefined as boolean | undefined,
      reportDate: key,
      report: null as SavedReport | null,
    }))
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('nl-BE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const formatShortDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('nl-BE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => `€${amount.toFixed(2)}`

  const printZRapport = () => window.print()

  const generateReportHTML = () => {
    if (!stats) return ''
    const esc = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    const amounts = statsToAmounts(stats)
    const vatRows = buildZReportVatRows(amounts)
    const totalTax = vatRows.reduce((s, r) => s + r.tax, 0)

    const vatTableRows = vatRows
      .map(
        (r) =>
          `<tr><td style="padding:6px 0;border-top:1px solid #ddd;">${r.rate}%</td><td style="padding:6px 0;border-top:1px solid #ddd;text-align:right;">${formatZReportEuro(r.baseExcl)}</td><td style="padding:6px 0;border-top:1px solid #ddd;text-align:right;">${formatZReportEuro(r.tax)}</td></tr>`,
      )
      .join('')

    const articlesBlock =
      articleLines.length === 0
        ? ''
        : `
        <div class="section">
          <div class="section-title">${esc(t('zReport.soldArticlesTitle'))}</div>
          ${articleLines
            .map(
              (l) => `
          <div class="row"><span>${esc(l.label)}</span><span>${l.qty} ${esc(t('zReport.soldArticlesPiecesShort'))} · ${l.vatRate}% · ${formatCurrency(l.total)}</span></div>`,
            )
            .join('')}
        </div>`

    const paymentRows = [
      stats.onlinePayments > 0
        ? `<div class="row"><span>${esc(t('zReport.onlinePaid'))}:</span><span>${formatCurrency(stats.onlinePayments)}</span></div>`
        : '',
      stats.cardPayments > 0
        ? `<div class="row"><span>${esc(t('zReport.cardPaid'))}:</span><span>${formatCurrency(stats.cardPayments)}</span></div>`
        : '',
      stats.cashPayments > 0
        ? `<div class="row"><span>${esc(t('zReport.cashPaid'))}:</span><span>${formatCurrency(stats.cashPayments)}</span></div>`
        : '',
    ].join('')

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Z-Rapport ${formatShortDate(selectedDate)}</title>
        <style>
          body { font-family: 'Courier New', monospace; max-width: 420px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 15px; margin-bottom: 15px; }
          .header h1 { margin: 0; font-size: 18px; }
          .header p { margin: 5px 0; font-size: 12px; color: #666; }
          .section { margin: 15px 0; }
          .section-title { font-weight: bold; border-bottom: 1px solid #ccc; margin-bottom: 10px; text-transform: uppercase; font-size: 12px; }
          .row { display: flex; justify-content: space-between; font-size: 14px; margin: 5px 0; }
          .total-row { font-weight: bold; font-size: 16px; border-top: 2px solid #000; padding-top: 10px; margin-top: 10px; }
          table { width: 100%; font-size: 13px; border-collapse: collapse; }
          th { text-align: left; font-size: 11px; color: #555; padding-bottom: 4px; }
          th:not(:first-child) { text-align: right; }
          .footer { text-align: center; font-size: 10px; color: #666; border-top: 2px dashed #000; margin-top: 20px; padding-top: 15px; }
          .closed-badge { background: #16a34a; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${businessInfo?.business_name || 'Z-Rapport'}</h1>
          <p>${businessInfo?.address || ''}</p>
          ${businessInfo?.btw_number ? `<p>BTW: ${businessInfo.btw_number}</p>`: ''}
          <p style="margin-top: 10px; font-weight: bold;">Z-RAPPORT</p>
          <p style="font-size:11px;">${esc(t('zReport.onlineSales'))}</p>
          <p>${formatDate(selectedDate)}</p>
          ${currentSavedReport?.is_closed ? `<p><span class="closed-badge"> AFGESLOTEN</span></p>`: ''}
        </div>
        <div class="section">
          <div class="section-title">OMZET</div>
          <div class="row"><span>${esc(t('zReport.orderCount'))}:</span><span>${stats.orderCount}</span></div>
          <div class="section-title" style="margin-top:12px;">${esc(t('zReport.vatTableTitle'))}</div>
          <table>
            <thead><tr><th>${esc(t('zReport.vatRateCol'))}</th><th style="text-align:right">${esc(t('zReport.vatBaseCol'))}</th><th style="text-align:right">${esc(t('zReport.vatTaxCol'))}</th></tr></thead>
            <tbody>
              ${vatTableRows}
              <tr style="font-weight:bold;border-top:2px solid #000;">
                <td style="padding-top:8px;">${esc(t('zReport.vatTotalRow'))}</td>
                <td style="padding-top:8px;text-align:right;">${formatCurrency(stats.subtotal)}</td>
                <td style="padding-top:8px;text-align:right;">${formatCurrency(Math.round(totalTax * 100) / 100)}</td>
              </tr>
            </tbody>
          </table>
          <div class="row total-row"><span>${esc(t('zReport.total'))}:</span><span>${formatCurrency(stats.total)}</span></div>
        </div>
        <div class="section">
          <div class="section-title">${esc(t('zReport.paymentMethods'))}</div>
          ${paymentRows}
        </div>${articlesBlock}
        <div class="footer">
          <p>Dagperiode: ${formatShortDate(selectedDate)} 00:00 t/m +1dag 12:00</p>
          <p>Gegenereerd: ${new Date().toLocaleString('nl-BE')}</p>
          ${currentSavedReport?.closed_at ? `<p>Afgesloten: ${new Date(currentSavedReport.closed_at).toLocaleString('nl-BE')}</p>`: ''}
          <p>Hash: ${currentSavedReport?.report_hash?.substring(0, 16) || 'n.v.t.'}...</p>
          <p>Vysion kassa's - ordervysion.com</p>
        </div>
      </body>
      </html>
    `
  }

  const downloadPDF = () => {
    const html = generateReportHTML()
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => printWindow.print(), 250)
    }
  }

  const sendEmailReport = async () => {
    const email = emailAddress.trim()
    if (!email || !stats) return

    setSendingEmail(true)
    try {
      const payload = {
        tenantSlug: params.tenant,
        to: email,
        subject: `Z-Rapport ${formatShortDate(selectedDate)} - ${businessInfo?.business_name || params.tenant}`,
        businessName: businessInfo?.business_name || params.tenant,
        businessAddress: businessInfo?.address || '',
        btwNumber: businessInfo?.btw_number || '',
        date: selectedDate,
        formattedDate: formatDate(selectedDate),
        orderCount: stats.orderCount,
        subtotal: stats.subtotal,
        taxLow: stats.taxLow,
        taxMid: stats.taxMid,
        taxHigh: stats.taxHigh,
        tax6: stats.taxByRate[6],
        tax9: stats.taxByRate[9],
        tax12: stats.taxByRate[12],
        tax21: stats.taxByRate[21],
        base6: stats.baseByRate[6],
        base9: stats.baseByRate[9],
        base12: stats.baseByRate[12],
        base21: stats.baseByRate[21],
        total: stats.total,
        cashPayments: stats.cashPayments,
        cardPayments: stats.cardPayments,
        onlinePayments: stats.onlinePayments,
        articleLines,
        soldArticlesSectionTitle: t('zReport.soldArticlesTitle'),
        soldArticlesPiecesShort: t('zReport.soldArticlesPiecesShort'),
        labels: {
          revenue: 'OMZET',
          orderCount: t('zReport.orderCount'),
          subtotal: t('zReport.subtotal'),
          vatTableTitle: t('zReport.vatTableTitle'),
          vatRateCol: t('zReport.vatRateCol'),
          vatBaseCol: t('zReport.vatBaseCol'),
          vatTaxCol: t('zReport.vatTaxCol'),
          vatTotalRow: t('zReport.vatTotalRow'),
          total: t('zReport.total'),
          payments: t('zReport.paymentMethods'),
          cash: t('zReport.cashPaid'),
          card: t('zReport.cardPaid'),
          online: t('zReport.onlinePaid'),
          footerAuto: 'Dit is een automatisch gegenereerd Z-Rapport',
          footerGenerated: `${t('zReport.generatedOn')}:`,
          footerPowered: "Vysion kassa's - ordervysion.com",
        },
      }

      const res = await authFetch('/api/send-z-report', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        alert(`${t('zReport.emailSentSuccess')} ${email}`)
        setShowEmailModal(false)
        setEmailAddress('')
      } else {
        const error = await res.json()
        alert(`${t('zReport.emailSendError')} ${error.message || error.error || ''}`)
      }
    } catch {
      alert(t('zReport.emailSendRetry'))
    }
    setSendingEmail(false)
  }

  const sendMonthToAccountant = async () => {
    const email = monthAccountantEmail.trim()
    if (!email) {
      alert(t('zReport.monthAccountantEmailPlaceholder'))
      return
    }

    setSendingMonthEmail(true)
    try {
      const yearMonth = selectedMonthForEmail
      const today = getLocalDateString()
      const monthEnd = getLastDayOfMonthYmd(yearMonth)
      const capYmd = today < monthEnd ? today : monthEnd

      const { startUTC, endUTC } = monthBoundsUtc(yearMonth, capYmd)
      const ordersRaw = await fetchAllTenantOrdersInCreatedAtRange(
        params.tenant,
        startUTC,
        endUTC,
        '*',
      )

      const vatContext = await fetchZReportVatContextForTenant(params.tenant)

      const days = buildZReportMonthDayRows(
        ordersRaw as unknown as Order[],
        yearMonth,
        capYmd,
        btwPercentage,
        vatContext,
        buildManualByDateForMonth(yearMonth),
      )

      if (days.length === 0) {
        alert(t('zReport.monthSendEmpty'))
        setSendingMonthEmail(false)
        return
      }

      const amounts = sumZReportMonthAmounts(days)
      const monthLabel = formatYearMonthLabel(yearMonth)

      const payload = {
        to: email,
        tenantSlug: params.tenant,
        yearMonth,
        subject: `Z-Rapport ${monthLabel} - ${businessInfo?.business_name || params.tenant}`,
        businessName: businessInfo?.business_name || params.tenant,
        businessAddress: businessInfo?.address || '',
        btwNumber: businessInfo?.btw_number || '',
        monthLabel,
        days,
        amounts,
        saveAccountantEmail: true,
        labels: {
          monthTitle: t('zReport.monthSendTitle'),
          monthSummary: t('zReport.monthSummary'),
          dailyOverview: t('zReport.dailyOverview'),
          dateCol: t('zReport.dateCol'),
          orderCount: t('zReport.orderCount'),
          vatTableTitle: t('zReport.vatTableTitle'),
          vatRateCol: t('zReport.vatRateCol'),
          vatBaseCol: t('zReport.vatBaseCol'),
          vatTaxCol: t('zReport.vatTaxCol'),
          vatTotalRow: t('zReport.vatTotalRow'),
          total: t('zReport.total'),
          payments: t('zReport.paymentMethods'),
          cash: t('zReport.cashPaid'),
          card: t('zReport.cardPaid'),
          online: t('zReport.onlinePaid'),
          dayTotalCol: t('zReport.dayTotalCol'),
          fiscalNote: t('zReport.fiscalPeriodNote'),
          footerAuto: t('zReport.monthFooterAuto'),
          footerGenerated: t('zReport.generatedOn'),
          footerPowered: "Vysion kassa's - ordervysion.com",
        },
      }

      const res = await authFetch('/api/send-z-report-month', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        alert(t('zReport.monthSendSuccess'))
        const settings = await getTenantSettings(params.tenant)
        if (settings) {
          setBusinessInfo(settings)
          setMonthAccountantEmail(settings.accountant_email || email)
        }
      } else {
        const err = await res.json().catch(() => ({}))
        alert(`${t('zReport.monthSendError')} ${err.message || err.error || ''}`)
      }
    } catch {
      alert(t('zReport.monthSendError'))
    }
    setSendingMonthEmail(false)
  }

  const goToPreviousDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number)
    const date = new Date(y, m - 1, d - 1)
    setReportViewMode('day')
    setArchivePeriod('dag')
    setSelectedDate(getLocalDateString(date))
  }

  const goToNextDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number)
    const date = new Date(y, m - 1, d + 1)
    const today = getLocalDateString()
    const newDate = getLocalDateString(date)
    if (newDate <= today) {
      setReportViewMode('day')
      setSelectedDate(newDate)
    }
  }

  const goToPreviousMonth = () => {
    setReportViewMode('month')
    setArchivePeriod('maand')
    setSelectedMonthForEmail((prev) => addMonthsToYearMonth(prev, -1))
  }

  const goToNextMonth = () => {
    const todayYm = getLocalDateString().slice(0, 7)
    const next = addMonthsToYearMonth(selectedMonthForEmail, 1)
    if (next <= todayYm) {
      setReportViewMode('month')
      setArchivePeriod('maand')
      setSelectedMonthForEmail(next)
    }
  }

  const selectMonthForView = (yearMonth: string) => {
    setSelectedMonthForEmail(yearMonth)
    setReportViewMode('month')
    setArchivePeriod('maand')
  }

  const zReportDocumentLabels = {
    orderCount: t('zReport.orderCount'),
    subtotal: t('zReport.subtotal'),
    vatTableTitle: t('zReport.vatTableTitle'),
    vatRateCol: t('zReport.vatRateCol'),
    vatBaseCol: t('zReport.vatBaseCol'),
    vatTaxCol: t('zReport.vatTaxCol'),
    vatTotalRow: t('zReport.vatTotalRow'),
    total: t('zReport.total'),
    paymentMethods: t('zReport.paymentMethods'),
    onlinePaid: t('zReport.onlinePaid'),
    cardPaid: t('zReport.cardPaid'),
    cashPaid: t('zReport.cashPaid'),
    soldArticlesTitle: t('zReport.soldArticlesTitle'),
    soldArticlesEmpty: t('zReport.soldArticlesEmpty'),
    soldArticlesPiecesShort: t('zReport.soldArticlesPiecesShort'),
    soldArticlesVatShort: t('zReport.soldArticlesVatShort'),
    soldArticlesAmountShort: t('zReport.soldArticlesAmountShort'),
    generatedOn: t('zReport.generatedOn'),
  }

  const monthVatRates = CATEGORY_VAT_PERCENT_OPTIONS.filter((rate) =>
    monthDayRows.some((d) => (d.taxByRate[rate] || 0) > 0 || (d.baseByRate[rate] || 0) > 0),
  )

  const isDayClosed = currentSavedReport?.is_closed === true
  const hasExistingManualEntry =
    !!currentSavedReport &&
    (currentSavedReport.manual_total != null ||
      currentSavedReport.manual_cash != null ||
      currentSavedReport.manual_card != null ||
      currentSavedReport.manual_online != null)
  const kassaFormHasValues =
    !!kassaForm.cash.trim() || !!kassaForm.card.trim() || !!kassaForm.online.trim()

  const selectedYearMonth = selectedMonthForEmail
  const monthSentLog = parseZReportMonthSentLog(businessInfo?.z_report_month_sent)
  const monthSentEntry = monthSentLog[selectedYearMonth]
  const selectedMonthLabel = formatYearMonthLabel(selectedYearMonth)

  if (loading && reportViewMode === 'day') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-gray-500">{t('adminPages.common.loading')}</p>
        </div>
      </div>
    )
  }

  return (
      <PinGate tenant={params.tenant}>
      <div className="max-w-4xl mx-auto">
      {/* Maandmail boekhouder */}
      <div className="mb-6 p-5 bg-indigo-50 border border-indigo-200 rounded-2xl print:hidden">
        <h2 className="text-lg font-bold text-indigo-900 mb-1">{t('zReport.monthSendTitle')}</h2>
        <p className="text-sm text-indigo-800 mb-4">{t('zReport.monthSendIntro')}</p>
        <div className="mb-3">
          <label className="block text-sm font-medium text-indigo-900 mb-2">
            {t('zReport.monthSelectLabel')}
          </label>
          <input
            type="month"
            value={selectedMonthForEmail}
            max={getLocalDateString().slice(0, 7)}
            onChange={(e) => {
              if (e.target.value) selectMonthForView(e.target.value)
            }}
            className="w-full sm:w-auto px-4 py-3 border border-indigo-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-medium"
          />
          <p className="text-xs text-indigo-700 mt-2">{t('zReport.monthSelectHint')}</p>
        </div>
        <p className="text-sm text-indigo-900 mb-4">
          <strong>{selectedMonthLabel}</strong>
        </p>
        <div className="mb-3">
          <label className="block text-sm font-medium text-indigo-900 mb-2">
            {t('zReport.monthAccountantEmail')}
          </label>
          <input
            type="email"
            value={monthAccountantEmail}
            onChange={(e) => setMonthAccountantEmail(e.target.value)}
            placeholder={t('zReport.monthAccountantEmailPlaceholder')}
            className="w-full px-4 py-3 border border-indigo-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        {monthSentEntry ? (
          <p className="text-sm text-green-700 mb-3">
            {t('zReport.monthSentAt')
              .replace('{date}', new Date(monthSentEntry.sentAt).toLocaleString('nl-BE'))
              .replace('{email}', monthSentEntry.to)}
          </p>
        ) : (
          <p className="text-sm text-amber-700 mb-3 font-medium">
            {t('zReport.monthNotSentReminder')}
          </p>
        )}
        <button
          onClick={sendMonthToAccountant}
          disabled={sendingMonthEmail || !monthAccountantEmail.trim()}
          className="w-full sm:w-auto px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {sendingMonthEmail ? (
            <>
              <span className="animate-spin" />
              {t('zReport.monthSending')}
            </>
          ) : (
            t('zReport.monthSendButton')
          )}
        </button>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900"> {t('zReport.title')}</h1>
          <p className="text-gray-500 text-sm">{t('zReport.subtitle')} · Fiscale dag: 00:00 t/m +1dag 12:00u</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`px-4 py-2 rounded-xl font-medium flex items-center gap-2 ${
              showHistory ? 'bg-blue-100 text-blue-600': 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
             {t('zReport.history')}
          </button>
          <button onClick={printZRapport} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-medium flex items-center gap-2">
             {t('zReport.print')}
          </button>
          <button
            onClick={downloadPDF}
            disabled={!stats || stats.orderCount === 0}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-medium flex items-center gap-2 disabled:opacity-50"
          >
             PDF
          </button>
          <button
            onClick={() => {
              setEmailAddress(businessInfo?.email || '')
              setShowEmailModal(true)
            }}
            disabled={!stats || stats.orderCount === 0}
            className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-600 rounded-xl font-medium flex items-center gap-2 disabled:opacity-50"
          >
             E-mail
          </button>
          <button
            onClick={refreshData}
            disabled={loading}
            className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-xl font-medium flex items-center gap-2"
          >
             {t('zReport.refresh')}
          </button>
          {reportViewMode === 'day' && !isDayClosed && stats && stats.orderCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setMoveTargetDate('')
                setShowMoveDayModal(true)
              }}
              className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-xl font-medium flex items-center gap-2"
            >
              {t('zReport.moveSalesDayButton')}
            </button>
          )}
          {/* KASSA INVOER */}
          <button
            onClick={() => { setKassaForm({ cash: '', card: '', online: ''}); setShowKassaModal(true) }}
            disabled={isDayClosed}
            title={isDayClosed ? t('zReport.kassaButtonTitleClosed') : undefined}
            className={`px-4 py-2 rounded-xl font-medium flex items-center gap-2 ${
              isDayClosed
                ? 'bg-orange-300 text-white cursor-not-allowed opacity-60'
                : 'bg-orange-500 hover:bg-orange-600 text-white'
            }`}
          >
             {t('zReport.kassaEntryButton')}
          </button>
          {/* OPSLAAN — geblokkeerd als dag afgesloten */}
          <button
            onClick={syncReport}
            disabled={syncing || !stats || stats.orderCount === 0 || isDayClosed}
            title={isDayClosed ? 'Dag is afgesloten — kan niet meer gewijzigd worden': 'Rapport opslaan in archief'}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium flex items-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {syncing ? '' : ''} {t('zReport.sync')}
          </button>
          {/* AFSLUITEN — altijd zichtbaar naast opslaan */}
          {isDayClosed ? (
            <button
              disabled
              className="px-4 py-2 bg-gray-200 text-gray-500 rounded-xl font-medium flex items-center gap-2 cursor-not-allowed"
            >
               Afgesloten
            </button>
          ) : (
            <button
              onClick={() => setShowCloseConfirm(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium flex items-center gap-2"
            >
               Afsluiten
            </button>
          )}
        </div>
      </div>

      {/* Gesloten dag banner */}
      {isDayClosed && reportViewMode === 'day' && (
        <div className="mb-6 p-4 bg-green-50 border-2 border-green-300 rounded-2xl flex items-center gap-3 print:hidden">
          <span className="text-2xl"></span>
          <div>
            <p className="font-bold text-green-800">Dag definitief afgesloten</p>
            <p className="text-green-700 text-sm">
              Afgesloten op {currentSavedReport?.closed_at ? new Date(currentSavedReport.closed_at).toLocaleString('nl-BE') : '—'} · Fiscale registratie immutabel (GKS compliant)
            </p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Report */}
        <div className="lg:col-span-2">
          {/* Datum- of maandkiezer */}
          <div className="flex items-center justify-center gap-4 mb-6 print:hidden">
            {reportViewMode === 'month' ? (
              <>
                <button onClick={goToPreviousMonth} className="p-3 bg-gray-100 hover:bg-gray-200 rounded-xl">←</button>
                <div className="px-4 py-3 border border-gray-200 rounded-xl text-center font-medium min-w-[200px] capitalize">
                  {selectedMonthLabel}
                </div>
                <button
                  onClick={goToNextMonth}
                  disabled={selectedMonthForEmail >= getLocalDateString().slice(0, 7)}
                  className="p-3 bg-gray-100 hover:bg-gray-200 rounded-xl disabled:opacity-50"
                >→</button>
              </>
            ) : (
              <>
                <button onClick={goToPreviousDay} className="p-3 bg-gray-100 hover:bg-gray-200 rounded-xl">←</button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setReportViewMode('day')
                    setArchivePeriod('dag')
                    setSelectedDate(e.target.value)
                  }}
                  max={getLocalDateString()}
                  className="px-4 py-3 border border-gray-200 rounded-xl text-center font-medium"
                />
                <button
                  onClick={goToNextDay}
                  disabled={selectedDate === getLocalDateString()}
                  className="p-3 bg-gray-100 hover:bg-gray-200 rounded-xl disabled:opacity-50"
                >→</button>
              </>
            )}
          </div>

          {/* Z-Rapport */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg overflow-hidden print:shadow-none"
          >
            <div className="bg-gray-900 text-white p-6 text-center">
              <h2 className="text-xl font-bold mb-1">{businessInfo?.business_name || 'Zaak'}</h2>
              <p className="text-gray-400 text-sm">{businessInfo?.address}</p>
              {businessInfo?.btw_number && (
                <p className="text-gray-400 text-sm">{t('zReport.vatNumber')}: {businessInfo.btw_number}</p>
              )}
            </div>

            <div className="border-b-2 border-dashed border-gray-300 p-6 text-center">
              <h3 className="text-2xl font-bold text-gray-900">
                {reportViewMode === 'month' ? t('zReport.monthReportTitle') : t('zReport.reportTitle')}
              </h3>
              <p className="text-sm font-medium text-gray-600 mt-1">{t('zReport.onlineSales')}</p>
              <p className="text-gray-500 mt-2 capitalize">
                {reportViewMode === 'month' ? selectedMonthLabel : formatDate(selectedDate)}
              </p>
              <p className="text-xs text-gray-400 mt-1">{t('zReport.fiscalPeriodNote')}</p>
              <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
                <span className="inline-block px-3 py-1 bg-blue-100 text-blue-600 text-sm rounded-full">
                   {t('zReport.autoUpdated')}
                </span>
                {reportViewMode === 'month' && (
                  <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 text-sm rounded-full font-medium">
                    {t('zReport.monthSummary')}
                  </span>
                )}
                {reportViewMode === 'day' && isDayClosed && (
                  <span className="inline-block px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full font-medium">
                     AFGESLOTEN
                  </span>
                )}
              </div>
            </div>

            {reportViewMode === 'month' ? (
              monthLoading ? (
                <div className="p-12 text-center">
                  <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-gray-500">{t('adminPages.common.loading')}</p>
                </div>
              ) : monthAmounts && monthDayRows.length > 0 ? (
                <>
                  <ZReportDocumentBody
                    amounts={monthAmounts}
                    articleLines={[]}
                    showSoldArticles={false}
                    generatedAt={new Date().toLocaleString('nl-BE')}
                    labels={zReportDocumentLabels}
                  />
                  <div className="px-6 pb-6">
                    <h4 className="font-semibold text-gray-900 mb-3 uppercase tracking-wide text-sm">
                      {t('zReport.dailyOverview')}
                    </h4>
                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-left text-gray-600">
                            <th className="px-3 py-2 font-medium">{t('zReport.dateCol')}</th>
                            <th className="px-3 py-2 font-medium text-center">{t('zReport.orderCount')}</th>
                            {monthVatRates.map((rate) => (
                              <th key={rate} className="px-3 py-2 font-medium text-right">
                                {rate}% {t('zReport.vatTaxCol')}
                              </th>
                            ))}
                            <th className="px-3 py-2 font-medium text-right">{t('zReport.dayTotalCol')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthDayRows.map((day) => (
                            <tr
                              key={day.date}
                              className="border-t border-gray-100 cursor-pointer hover:bg-blue-50"
                              onClick={() => {
                                setReportViewMode('day')
                                setArchivePeriod('dag')
                                setSelectedDate(day.date)
                              }}
                            >
                              <td className="px-3 py-2">{formatShortDate(day.date)}</td>
                              <td className="px-3 py-2 text-center tabular-nums">{day.orderCount}</td>
                              {monthVatRates.map((rate) => (
                                <td key={rate} className="px-3 py-2 text-right tabular-nums">
                                  {formatZReportEuro(day.taxByRate[rate] || 0)}
                                </td>
                              ))}
                              <td className="px-3 py-2 text-right tabular-nums font-medium">
                                {formatZReportEuro(day.totalIncl)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">{t('zReport.monthDayDrillHint')}</p>
                  </div>
                </>
              ) : (
                <div className="p-12 text-center">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{t('zReport.monthNoOrders')}</h3>
                  <p className="text-gray-500">{t('zReport.monthSendEmpty')}</p>
                </div>
              )
            ) : stats && stats.orderCount > 0 ? (
              <ZReportDocumentBody
                amounts={statsToAmounts(stats)}
                articleLines={articleLines}
                generatedAt={new Date().toLocaleString('nl-BE')}
                labels={zReportDocumentLabels}
              />
            ) : (
              <div className="p-12 text-center">
                <span className="text-6xl mb-4 block"></span>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{t('zReport.noOrders')}</h3>
                <p className="text-gray-500">{t('zReport.noOrdersDesc')}</p>
              </div>
            )}

          </motion.div>

          {/* Instructies */}
          {reportViewMode === 'day' && (
          <div className="mt-6 p-6 bg-blue-50 border border-blue-200 rounded-2xl print:hidden">
            <h3 className="font-semibold text-blue-900 mb-3"> {t('zReport.howToUse')}</h3>
            <ol className="text-blue-800 space-y-2 text-sm">
              <li>1. {t('zReport.step1')}</li>
              <li>2. {t('zReport.step2')}</li>
              <li>3. {t('zReport.step3')} <strong>{stats ? formatCurrency(stats.total) : '€0.00'}</strong></li>
              <li>4. {t('zReport.step4')} ({btwPercentage}%)</li>
              <li>5. Klik op <strong>"Dag afsluiten"</strong> na je shift om de fiscale dag te vergrendelen</li>
            </ol>
            <p className="text-blue-600 text-xs mt-4">
               Fiscale dag = 00:00u tot 12:00u de volgende dag · {t('zReport.retention')}
            </p>
          </div>
          )}
        </div>

        {/* Sidebar — Archief */}
        <div className={`lg:block ${showHistory ? 'block': 'hidden'} print:hidden`}>
          <div className="bg-white rounded-2xl shadow-sm p-4 sticky top-6">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
               {t('zReport.savedReports')}
            </h3>

            {/* Periodefilter */}
            <div className="grid grid-cols-4 gap-1 mb-4">
              {(['dag', 'week', 'maand', 'jaar'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => {
                    setArchivePeriod(p)
                    if (p === 'maand') {
                      setReportViewMode('month')
                    } else if (p === 'dag') {
                      setReportViewMode('day')
                    }
                  }}
                  className={`py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                    archivePeriod === p ? 'bg-gray-900 text-white': 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>

            {savedReports.length === 0 ? (
              <p className="text-gray-500 text-sm">{t('zReport.noSavedReports')}</p>
            ) : (
              <div className="space-y-2 max-h-[460px] overflow-y-auto">
                {getAggregatedReports().map((item, idx) => {
                  const isSelectedArchiveItem =
                    (archivePeriod === 'dag' && item.reportDate === selectedDate) ||
                    (archivePeriod === 'maand' && item.reportDate === selectedMonthForEmail)

                  return (
                  <div
                    key={item.reportDate + idx}
                    className={`p-3 rounded-xl transition-colors ${
                      isSelectedArchiveItem
                        ? 'bg-blue-100 border-2 border-blue-500'
                        : 'bg-gray-50'
                    }`}
                  >
                    <div
                      className="cursor-pointer"
                      onClick={() => {
                        if (archivePeriod === 'dag' && item.reportDate) {
                          setReportViewMode('day')
                          setSelectedDate(item.reportDate)
                        }
                        if (archivePeriod === 'maand' && item.reportDate) {
                          selectMonthForView(item.reportDate)
                        }
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm flex items-center gap-1">
                          {item.label}
                          {item.isClosed && <span className="text-green-600 text-xs"></span>}
                        </span>
                        <span className="text-green-600 font-bold text-sm">{formatCurrency(item.total)}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1 space-y-0.5">
                        {item.onlineTotal > 0 && (
                          <div>
                            {t('zReport.archiveBreakdownOrders')}: {formatCurrency(item.onlineTotal)}
                          </div>
                        )}
                        {item.kassaTotal > 0 && (
                          <div>
                            {t('zReport.archiveBreakdownManual')}: {formatCurrency(item.kassaTotal)}
                          </div>
                        )}
                        <div>{item.count} bestellingen</div>
                      </div>
                    </div>
                    {/* Rapport afdrukken knop — alleen op dag niveau */}
                    {archivePeriod === 'dag' && item.report && (
                      <button
                        onClick={() => printKassaReport(item.report!)}
                        className="mt-2 w-full py-1 text-xs bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg font-medium"
                      >
                         Rapport afdrukken
                      </button>
                    )}
                  </div>
                  )
                })}
              </div>
            )}

            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                Totaal: {savedReports.length} dagen ·
                Afgesloten: {savedReports.filter(r => r.is_closed).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Print stijlen */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .lg\\:col-span-2, .lg\\:col-span-2 * { visibility: visible; }
          .lg\\:col-span-2 { position: absolute; left: 0; top: 0; width: 80mm; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>

      {/* DAG AFSLUITEN bevestigingsmodal */}
      <AnimatePresence>
        {showCloseConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full p-6"
            >
              <div className="text-center mb-6">
                <span className="text-5xl"></span>
                <h2 className="text-xl font-bold text-gray-900 mt-3">Dag afsluiten na shift</h2>
                <p className="text-gray-500 text-sm mt-2">
                  Je sluit de fiscale dag van <strong>{formatDate(selectedDate)}</strong> definitief af.
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Bestellingen:</span>
                  <span className="font-bold">{stats?.orderCount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Totaal omzet:</span>
                  <span className="font-bold text-green-600">{formatCurrency(stats?.total || 0)}</span>
                </div>
              </div>

              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs mb-6">
                 <strong>Onomkeerbaar!</strong> Na afsluiten kan dit rapport niet meer gewijzigd worden. Dit is vereist door de Belgische GKS-wetgeving (witte kassa).
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCloseConfirm(false)}
                  disabled={closing}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium"
                >
                  Annuleren
                </button>
                <button
                  onClick={closeDay}
                  disabled={closing}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                >
                  {closing ? (
                    <><span className="animate-spin"></span> Afsluiten...</>
                  ) : (
                    <> Bevestigen &amp; Afsluiten</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KASSA INVOER MODAL */}
      <AnimatePresence>
        {showKassaModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 p-4"
            onClick={() => setShowKassaModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full p-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl"></span>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{t('zReport.kassaModalTitle')}</h2>
                  <p className="text-gray-500 text-sm">{formatDate(selectedDate)}</p>
                </div>
              </div>

              <p className="text-gray-600 text-sm mb-4 leading-relaxed">{t('zReport.kassaModalIntro')}</p>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                     {t('zReport.kassaModalCash')}
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">€</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={kassaForm.cash}
                      onChange={e => setKassaForm(p => ({ ...p, cash: e.target.value }))}
                      placeholder=""
                      className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-lg"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                     {t('zReport.kassaModalCard')}
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">€</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={kassaForm.card}
                      onChange={e => setKassaForm(p => ({ ...p, card: e.target.value }))}
                      placeholder=""
                      className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-lg"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                     {t('zReport.kassaModalOnlineExtra')}
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">€</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={kassaForm.online}
                      onChange={e => setKassaForm(p => ({ ...p, online: e.target.value }))}
                      placeholder=""
                      className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-lg"
                    />
                  </div>
                </div>

                {/* Totaal preview */}
                {(kassaForm.cash || kassaForm.card || kassaForm.online) && (
                  <div className="bg-orange-50 rounded-xl p-4 flex justify-between items-center">
                    <span className="font-medium text-gray-700">{t('zReport.kassaModalTotalPreview')}:</span>
                    <span className="text-xl font-bold text-orange-600">
                      {formatCurrency((parseFloat(kassaForm.cash) || 0) + (parseFloat(kassaForm.card) || 0) + (parseFloat(kassaForm.online) || 0))}
                    </span>
                  </div>
                )}
              </div>

              {hasExistingManualEntry && (
                <p className="text-xs text-gray-500 mb-4">{t('zReport.kassaModalClearHint')}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowKassaModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium"
                >
                  {t('zReport.kassaModalCancel')}
                </button>
                <button
                  onClick={saveKassaEntry}
                  disabled={
                    savingKassa ||
                    (!kassaFormHasValues && !hasExistingManualEntry)
                  }
                  className="flex-1 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold disabled:bg-gray-300 flex items-center justify-center gap-2"
                >
                  {savingKassa ? (
                    <>
                      <span className="animate-spin"></span> {t('zReport.kassaModalSaving')}
                    </>
                  ) : (
                    <> {t('zReport.kassaModalSave')}</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Email Modal */}
      <AnimatePresence>
        {showEmailModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowEmailModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold mb-2">{t('zReport.emailSendTitle')}</h2>
              <p className="text-gray-500 text-sm mb-6">
                {t('zReport.emailSendIntro').replace('{{date}}', formatShortDate(selectedDate))}
              </p>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('zReport.emailTenantLabel')}
                  </label>
                  <input
                    type="email"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    placeholder="email@voorbeeld.be"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-400 mt-1">{t('zReport.emailDailyOnlyHint')}</p>
                </div>
              </div>
              {stats && (
                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                  <div className="flex justify-between text-sm"><span className="text-gray-600">Datum:</span><span className="font-medium">{formatShortDate(selectedDate)}</span></div>
                  <div className="flex justify-between text-sm mt-1"><span className="text-gray-600">Transacties:</span><span className="font-medium">{stats.orderCount}</span></div>
                  <div className="flex justify-between text-sm mt-1"><span className="text-gray-600">Totaal:</span><span className="font-bold text-green-600">{formatCurrency(stats.total)}</span></div>
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setShowEmailModal(false)} className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium">
                  {t('zReport.emailCancel')}
                </button>
                <button
                  onClick={sendEmailReport}
                  disabled={!emailAddress.trim() || sendingEmail}
                  className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium disabled:bg-gray-300 flex items-center justify-center gap-2"
                >
                  {sendingEmail ? <><span className="animate-spin"></span> {t('zReport.emailSending')}</> : <> {t('zReport.emailSend')}</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMoveDayModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
            onClick={() => !movingSalesDay && setShowMoveDayModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-gray-900 mb-2">{t('zReport.moveSalesDayTitle')}</h3>
              <p className="text-gray-600 text-sm mb-4">
                {t('zReport.moveSalesDayIntro')
                  .replace('{{from}}', formatShortDate(selectedDate))
                  .replace('{{to}}', moveTargetDate ? formatShortDate(moveTargetDate) : '…')}
              </p>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('zReport.moveSalesDayTargetLabel')}
              </label>
              <input
                type="date"
                value={moveTargetDate}
                onChange={(e) => setMoveTargetDate(e.target.value)}
                max={getLocalDateString()}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl mb-4"
              />
              {stats && (
                <div className="bg-gray-50 rounded-xl p-4 mb-4 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>{t('zReport.orders')}</span>
                    <span className="font-medium">{stats.orderCount}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span>{t('zReport.total')}</span>
                    <span className="font-bold text-green-600">{formatCurrency(stats.total)}</span>
                  </div>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowMoveDayModal(false)}
                  disabled={movingSalesDay}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium disabled:opacity-50"
                >
                  {t('zReport.kassaModalCancel')}
                </button>
                <button
                  type="button"
                  onClick={moveSalesDay}
                  disabled={!moveTargetDate || movingSalesDay || moveTargetDate === selectedDate}
                  className="flex-1 px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-medium disabled:bg-gray-300"
                >
                  {movingSalesDay ? t('zReport.moveSalesDayWorking') : t('zReport.moveSalesDaySubmit')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
      </PinGate>
  )
}
