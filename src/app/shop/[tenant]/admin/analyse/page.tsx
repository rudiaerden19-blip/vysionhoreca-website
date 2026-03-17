'use client'

import { useLanguage } from '@/i18n'

import { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import {
  getDailySales,
  saveDailySales,
  deleteDailySales,
  getFixedCosts,
  saveFixedCost,
  deleteFixedCost,
  getVariableCosts,
  saveVariableCost,
  deleteVariableCost,
  getBusinessTargets,
  saveBusinessTargets,
  calculateMonthlyReport,
  FIXED_COST_CATEGORIES,
  VARIABLE_COST_CATEGORIES,
  DailySales,
  FixedCost,
  VariableCost,
  BusinessTargets,
  MonthlyReport,
  FixedCostCategory,
  VariableCostCategory,
} from '@/lib/admin-api'

type TabType = 'overview' | 'kassa' | 'fixed' | 'variable' | 'year' | 'settings'

// Month names are now loaded from translations

const SECTOR_BENCHMARKS = {
  profitMargin: { average: 22, good: 28, excellent: 35 },
  personnelPercent: { average: 28, max: 30 },
  ingredientPercent: { average: 32, max: 35 },
  rentPercent: { average: 8, max: 10 },
  energyPercent: { average: 6, max: 8 },
}

const getHealthStatus = (t: (key: string) => string) => ({
  EXCELLENT: { label: t('analysePage.health.excellent'), desc: t('analysePage.health.excellentDesc'), icon: '🌟', color: '#22c55e', bgColor: 'bg-green-50', borderColor: 'border-green-500' },
  GOOD: { label: t('analysePage.health.good'), desc: t('analysePage.health.goodDesc'), icon: '✅', color: '#3b82f6', bgColor: 'bg-blue-50', borderColor: 'border-blue-500' },
  WARNING: { label: t('analysePage.health.warning'), desc: t('analysePage.health.warningDesc'), icon: '⚠️', color: '#f59e0b', bgColor: 'bg-blue-50', borderColor: 'border-blue-500' },
  CRITICAL: { label: t('analysePage.health.critical'), desc: t('analysePage.health.criticalDesc'), icon: '🚨', color: '#ef4444', bgColor: 'bg-red-50', borderColor: 'border-red-500' },
})

// Icon mapping for categories
const FIXED_ICONS: Record<string, string> = {
  RENT: '🏠', PERSONNEL: '👥', ELECTRICITY: '⚡', GAS: '🔥', WATER: '💧',
  INSURANCE: '🛡️', LEASING: '📋', LOAN: '🏦', SUBSCRIPTIONS: '📱', OTHER: '📦'
}
const VARIABLE_ICONS: Record<string, string> = {
  INGREDIENTS: '🥔', PACKAGING: '📦', CLEANING: '🧹', MAINTENANCE: '🔧', MARKETING: '📢', OTHER: '📋'
}

export default function AnalysePage({ params }: { params: { tenant: string } }) {
  const { t, locale } = useLanguage()
  
  // Month names per language
  const monthNamesMap: Record<string, string[]> = {
    nl: ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'],
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    de: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
    fr: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
    es: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
    it: ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'],
    ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
    ja: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
    zh: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
  }
  const MONTH_NAMES = monthNamesMap[locale] || monthNamesMap.nl
  const HEALTH_STATUS = useMemo(() => getHealthStatus(t), [t])
  
  // Category translation helpers
  const getFixedCatLabel = (id: string) => t(`analysePage.fixedCategories.${id}`) || id
  const getVariableCatLabel = (id: string) => t(`analysePage.variableCategories.${id}`) || id
  
  // Translated categories for dropdowns
  const translatedFixedCategories = useMemo(() => 
    FIXED_COST_CATEGORIES.map(cat => ({
      ...cat,
      label: getFixedCatLabel(cat.id),
      icon: FIXED_ICONS[cat.id] || '📦'
    // eslint-disable-next-line react-hooks/exhaustive-deps
    })), [t])
  
  const translatedVariableCategories = useMemo(() =>
    VARIABLE_COST_CATEGORIES.map(cat => ({
      ...cat,
      label: getVariableCatLabel(cat.id),
      icon: VARIABLE_ICONS[cat.id] || '📋'
    // eslint-disable-next-line react-hooks/exhaustive-deps
    })), [t])
  
  // Translate recommendations
  const translateRecommendations = (recs: string[]) => {
    return recs.map(rec => {
      // Parse and translate each recommendation
      if (rec.includes('Geen omzet')) return `📊 ${t('analysePage.recommendations.noRevenue')}`
      if (rec.includes('UITSTEKEND')) {
        const match = rec.match(/([\d.]+)%/)
        return `✅ ${t('analysePage.recommendations.excellent').replace('{margin}', match?.[1] || '0')}`
      }
      if (rec.includes('KRITIEK')) {
        const matches = rec.match(/([\d.]+)%/g)
        return `🚨 ${t('analysePage.recommendations.critical').replace('{margin}', matches?.[0]?.replace('%','') || '0').replace('{min}', matches?.[1]?.replace('%','') || '0')}`
      }
      if (rec.includes('PERSONEEL TE DUUR')) {
        const matches = rec.match(/([\d.]+)%/g)
        return `👥 ${t('analysePage.recommendations.personnelTooHigh').replace('{percent}', matches?.[0]?.replace('%','') || '0').replace('{max}', matches?.[1]?.replace('%','') || '0')}`
      }
      if (rec.includes('op personeel')) {
        const match = rec.match(/€([\d.]+)/)
        return `→ ${t('analysePage.recommendations.saveOnPersonnel').replace('{amount}', match?.[1] || '0')}`
      }
      if (rec.includes('INGREDIËNTEN TE DUUR')) {
        const matches = rec.match(/([\d.]+)%/g)
        return `🥔 ${t('analysePage.recommendations.ingredientsTooHigh').replace('{percent}', matches?.[0]?.replace('%','') || '0').replace('{max}', matches?.[1]?.replace('%','') || '0')}`
      }
      if (rec.includes('op ingrediënten')) {
        const match = rec.match(/€([\d.]+)/)
        return `→ ${t('analysePage.recommendations.saveOnIngredients').replace('{amount}', match?.[1] || '0')}`
      }
      if (rec.includes('HUUR TE DUUR')) {
        const match = rec.match(/([\d.]+)%/)
        return `🏠 ${t('analysePage.recommendations.rentTooHigh').replace('{percent}', match?.[1] || '0')}`
      }
      if (rec.includes('ENERGIE TE DUUR')) {
        const match = rec.match(/([\d.]+)%/)
        return `⚡ ${t('analysePage.recommendations.energyTooHigh').replace('{percent}', match?.[1] || '0')}`
      }
      if (rec.includes('GEMIDDELDE BON TE LAAG')) {
        const matches = rec.match(/€([\d.]+)/g)
        return `🧾 ${t('analysePage.recommendations.ticketTooLow').replace('{current}', matches?.[0]?.replace('€','') || '0').replace('{target}', matches?.[1]?.replace('€','') || '0')}`
      }
      if (rec.includes('Tip:')) {
        return `→ ${t('analysePage.recommendations.ticketTip')}`
      }
      if (rec.includes('Break-even bereikt')) {
        const match = rec.match(/€([\d.]+)/)
        return `📍 ${t('analysePage.recommendations.breakEvenReached').replace('{amount}', match?.[1] || '0')}`
      }
      if (rec.includes('Nog €')) {
        const match = rec.match(/€([\d.]+)/)
        return `📍 ${t('analysePage.recommendations.breakEvenNeeded').replace('{amount}', match?.[1] || '0')}`
      }
      return rec
    })
  }
  
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Data state
  const [dailySales, setDailySales] = useState<DailySales[]>([])
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([])
  const [variableCosts, setVariableCosts] = useState<VariableCost[]>([])
  const [businessTargets, setBusinessTargets] = useState<BusinessTargets | null>(null)
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReport | null>(null)

  // Modals
  const [showKassaModal, setShowKassaModal] = useState(false)
  const [showFixedModal, setShowFixedModal] = useState(false)
  const [showVariableModal, setShowVariableModal] = useState(false)
  const [editingKassa, setEditingKassa] = useState<DailySales | null>(null)
  const [editingFixed, setEditingFixed] = useState<FixedCost | null>(null)
  const [editingVariable, setEditingVariable] = useState<VariableCost | null>(null)

  // Form states
  const [kassaForm, setKassaForm] = useState({
    date: new Date().toISOString().split('T')[0],
    cash_revenue: 0,
    card_revenue: 0,
    order_count: 0,
    notes: '',
  })

  const [fixedForm, setFixedForm] = useState({
    category: 'OTHER' as FixedCostCategory,
    name: '',
    amount: 0,
    notes: '',
    is_active: true,
    pdf_url: '' as string,
  })

  const [variableForm, setVariableForm] = useState({
    category: 'INGREDIENTS' as VariableCostCategory,
    description: '',
    supplier: '',
    invoice_number: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    notes: '',
    pdf_url: '' as string,
  })

  const [targetsForm, setTargetsForm] = useState({
    target_profit_margin: 0,
    minimum_profit_margin: 0,
    max_personnel_percent: 0,
    max_ingredient_percent: 0,
    target_average_ticket: 0,
  })

  // Load data
  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.tenant, selectedYear, selectedMonth])

  async function loadData() {
    setLoading(true)
    try {
      const [sales, fixed, variable, targets, report] = await Promise.all([
        getDailySales(params.tenant, selectedYear, selectedMonth),
        getFixedCosts(params.tenant),
        getVariableCosts(params.tenant, selectedYear, selectedMonth),
        getBusinessTargets(params.tenant),
        calculateMonthlyReport(params.tenant, selectedYear, selectedMonth),
      ])

      setDailySales(sales)
      setFixedCosts(fixed)
      setVariableCosts(variable)
      setBusinessTargets(targets)
      setMonthlyReport(report)
      setTargetsForm({
        target_profit_margin: targets.target_profit_margin,
        minimum_profit_margin: targets.minimum_profit_margin,
        max_personnel_percent: targets.max_personnel_percent,
        max_ingredient_percent: targets.max_ingredient_percent,
        target_average_ticket: targets.target_average_ticket,
      })
    } catch (error) {
      console.error('Error loading data:', error)
    }
    setLoading(false)
  }

  // Navigation
  const goToPrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12)
      setSelectedYear(y => y - 1)
    } else {
      setSelectedMonth(m => m - 1)
    }
  }

  const goToNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1)
      setSelectedYear(y => y + 1)
    } else {
      setSelectedMonth(m => m + 1)
    }
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-BE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount)
  }

  // Year report calculation
  const yearReport = useMemo(() => {
    if (!monthlyReport) return null
    // For now just show current month - year calculation needs separate API call
    return {
      totalRevenue: monthlyReport.totalRevenue * 12, // Estimate
      totalCosts: monthlyReport.totalCosts * 12,
      netProfit: monthlyReport.netProfit * 12,
      profitMargin: monthlyReport.profitMargin,
    }
  }, [monthlyReport])

  // Kassa handlers
  const openKassaModal = (sale?: DailySales) => {
    if (sale) {
      setEditingKassa(sale)
      setKassaForm({
        date: sale.date,
        cash_revenue: sale.cash_revenue,
        card_revenue: sale.card_revenue,
        order_count: sale.order_count,
        notes: sale.notes || '',
      })
    } else {
      setEditingKassa(null)
      setKassaForm({
        date: new Date().toISOString().split('T')[0],
        cash_revenue: 0,
        card_revenue: 0,
        order_count: 0,
        notes: '',
      })
    }
    setShowKassaModal(true)
  }

  const saveKassa = async () => {
    setSaving(true)
    const success = await saveDailySales({
      id: editingKassa?.id,
      tenant_slug: params.tenant,
      ...kassaForm,
      total_revenue: kassaForm.cash_revenue + kassaForm.card_revenue,
    })
    if (success) {
      setShowKassaModal(false)
      loadData()
    }
    setSaving(false)
  }

  const handleDeleteKassa = async (id: string) => {
    if (confirm(t('analysePage.kassa.confirmDelete'))) {
      await deleteDailySales(id)
      loadData()
    }
  }

  // Fixed cost handlers
  const openFixedModal = (cost?: FixedCost) => {
    if (cost) {
      setEditingFixed(cost)
      setFixedForm({
        category: cost.category,
        name: cost.name,
        amount: cost.amount,
        notes: cost.notes || '',
        is_active: cost.is_active,
      })
    } else {
      setEditingFixed(null)
      setFixedForm({
        category: 'OTHER',
        name: '',
        amount: 0,
        notes: '',
        is_active: true,
      })
    }
    setShowFixedModal(true)
  }

  const saveFixed = async () => {
    if (!fixedForm.name.trim() || fixedForm.amount <= 0) {
      alert(t('analysePage.common.fillNameAndAmount'))
      return
    }
    setSaving(true)
    const result = await saveFixedCost({
      id: editingFixed?.id,
      tenant_slug: params.tenant,
      ...fixedForm,
    })
    if (result) {
      setShowFixedModal(false)
      loadData()
    }
    setSaving(false)
  }

  const handleDeleteFixed = async (id: string) => {
    if (confirm(t('analysePage.fixed.confirmDelete'))) {
      await deleteFixedCost(id)
      loadData()
    }
  }

  // Variable cost handlers
  const openVariableModal = (cost?: VariableCost) => {
    if (cost) {
      setEditingVariable(cost)
      setVariableForm({
        category: cost.category,
        description: cost.description,
        supplier: cost.supplier || '',
        invoice_number: cost.invoice_number || '',
        amount: cost.amount,
        date: cost.date,
        notes: cost.notes || '',
        pdf_url: (cost as VariableCost & { pdf_url?: string }).pdf_url || '',
      })
    } else {
      setEditingVariable(null)
      setVariableForm({
        category: 'INGREDIENTS',
        description: '',
        supplier: '',
        invoice_number: '',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        notes: '',
        pdf_url: '',
      })
    }
    setShowVariableModal(true)
  }

  const saveVariable = async () => {
    if (!variableForm.description.trim() || variableForm.amount <= 0) {
      alert(t('analysePage.common.fillDescAndAmount'))
      return
    }
    setSaving(true)
    const result = await saveVariableCost({
      id: editingVariable?.id,
      tenant_slug: params.tenant,
      ...variableForm,
    })
    if (result) {
      setShowVariableModal(false)
      loadData()
    }
    setSaving(false)
  }

  const handleDeleteVariable = async (id: string) => {
    if (confirm(t('analysePage.variable.confirmDelete'))) {
      await deleteVariableCost(id)
      loadData()
    }
  }

  // PDF upload state
  const [isParsingPdf, setIsParsingPdf] = useState(false)
  const [isParsingPdfFixed, setIsParsingPdfFixed] = useState(false)
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const pdfInputFixedRef = useRef<HTMLInputElement>(null)

  // Upload PDF naar Supabase Storage — per tenant gescheiden
  const uploadPdfToStorage = async (file: File): Promise<string> => {
    const timestamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    // Pad: invoices/{tenant_slug}/{timestamp}_{bestandsnaam}
    const path = `${params.tenant}/${timestamp}_${safeName}`
    const { error } = await supabase.storage
      .from('invoices')
      .upload(path, file, { contentType: 'application/pdf', upsert: false })
    if (error) {
      console.error('PDF storage upload fout:', error)
      return ''
    }
    const { data: urlData } = supabase.storage.from('invoices').getPublicUrl(path)
    return urlData?.publicUrl || ''
  }

  const handlePdfUpload = async (file: File) => {
    if (file.type !== 'application/pdf') return
    setIsParsingPdf(true)
    try {
      // Parallel: tekst analyseren + opslaan in storage
      const [analysisRes, pdfUrl] = await Promise.all([
        fetch('/api/analyze-invoice-pdf', {
          method: 'POST',
          body: (() => { const f = new FormData(); f.append('file', file); f.append('tenant_slug', params.tenant); return f })(),
        }),
        uploadPdfToStorage(file),
      ])
      const data = await analysisRes.json()
      if (!analysisRes.ok || !data.success) { alert(data.error || 'PDF kon niet worden ingelezen'); return }
      setVariableForm(f => ({
        ...f,
        category:       data.variableCategory || f.category,
        supplier:       data.supplier         || f.supplier,
        invoice_number: data.invoiceNumber    || f.invoice_number,
        amount:         data.amount > 0       ? data.amount : f.amount,
        date:           data.invoiceDate      || f.date,
        description:    data.supplier
          ? `Factuur ${data.supplier}`.substring(0, 80)
          : data.description || f.description,
        pdf_url:        pdfUrl || f.pdf_url,
      }))
    } catch { alert('Fout bij uploaden PDF') }
    finally { setIsParsingPdf(false) }
  }

  const handlePdfUploadFixed = async (file: File) => {
    if (file.type !== 'application/pdf') return
    setIsParsingPdfFixed(true)
    try {
      const [analysisRes, pdfUrl] = await Promise.all([
        fetch('/api/analyze-invoice-pdf', {
          method: 'POST',
          body: (() => { const f = new FormData(); f.append('file', file); f.append('tenant_slug', params.tenant); return f })(),
        }),
        uploadPdfToStorage(file),
      ])
      const data = await analysisRes.json()
      if (!analysisRes.ok || !data.success) { alert(data.error || 'PDF kon niet worden ingelezen'); return }
      setFixedForm(f => ({
        ...f,
        category: data.fixedCategory || f.category,
        name:     data.supplier || data.description || f.name,
        amount:   data.amount > 0 ? data.amount : f.amount,
        pdf_url:  pdfUrl || f.pdf_url,
      }))
    } catch { alert('Fout bij uploaden PDF') }
    finally { setIsParsingPdfFixed(false) }
  }

  // Save targets
  const saveTargets = async () => {
    setSaving(true)
    await saveBusinessTargets({
      tenant_slug: params.tenant,
      ...targetsForm,
    })
    loadData()
    setSaving(false)
    alert(t('analysePage.settings.targetsSaved'))
  }

  if (loading) {
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

  const healthInfo = monthlyReport ? HEALTH_STATUS[monthlyReport.healthStatus] : HEALTH_STATUS.GOOD

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            📊 {t('analysePage.title')}
          </h1>
          <p className="text-gray-500">{t('analysePage.subtitle')}</p>
        </div>
        
        {/* Month Navigator */}
        <div className="flex items-center gap-2 bg-white rounded-xl p-2 shadow-sm">
          <button onClick={goToPrevMonth} className="p-2 hover:bg-gray-100 rounded-lg">
            ◀️
          </button>
          <span className="font-bold text-gray-900 min-w-[140px] text-center">
            {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
          </span>
          <button onClick={goToNextMonth} className="p-2 hover:bg-gray-100 rounded-lg">
            ▶️
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 bg-white rounded-xl p-2 shadow-sm">
        {[
          { id: 'overview', label: `📊 ${t('analysePage.tabs.overview')}` },
          { id: 'kassa', label: `💵 ${t('analysePage.tabs.kassa')}` },
          { id: 'fixed', label: `🏠 ${t('analysePage.tabs.fixed')}` },
          { id: 'variable', label: `🛒 ${t('analysePage.tabs.variable')}` },
          { id: 'year', label: `📅 ${t('analysePage.tabs.year')}` },
          { id: 'settings', label: `⚙️ ${t('analysePage.tabs.settings')}` },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && monthlyReport && (
        <div className="space-y-6">
          {/* Health Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-6 rounded-2xl ${healthInfo.bgColor} border-2 ${healthInfo.borderColor} text-center`}
          >
            <div className="text-6xl mb-2">{healthInfo.icon}</div>
            <h2 className="text-2xl font-bold" style={{ color: healthInfo.color }}>
              {healthInfo.label}
            </h2>
            <p className="text-gray-600 mt-1">
              {healthInfo.desc}
            </p>
          </motion.div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-5 shadow-sm"
            >
              <div className="text-sm text-gray-500 mb-1">💰 {t('analysePage.overview.totalRevenue')}</div>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(monthlyReport.totalRevenue)}</div>
              <div className="text-xs text-gray-400 mt-1">
                {t('analysePage.overview.online')}: {formatCurrency(monthlyReport.onlineRevenue)} | {t('analysePage.overview.kassa')}: {formatCurrency(monthlyReport.kassaRevenue)}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl p-5 shadow-sm"
            >
              <div className="text-sm text-gray-500 mb-1">📉 {t('analysePage.overview.totalCosts')}</div>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(monthlyReport.totalCosts)}</div>
              <div className="text-xs text-gray-400 mt-1">
                {t('analysePage.overview.fixed')}: {formatCurrency(monthlyReport.totalFixedCosts)} | {t('analysePage.overview.variable')}: {formatCurrency(monthlyReport.totalVariableCosts)}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl p-5 shadow-sm"
            >
              <div className="text-sm text-gray-500 mb-1">✨ {t('analysePage.overview.netProfit')}</div>
              <div className={`text-2xl font-bold ${monthlyReport.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(monthlyReport.netProfit)}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {t('analysePage.overview.gross')}: {formatCurrency(monthlyReport.grossProfit)}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl p-5 shadow-sm"
            >
              <div className="text-sm text-gray-500 mb-1">📊 {t('analysePage.overview.profitMargin')}</div>
              <div className={`text-2xl font-bold ${monthlyReport.profitMargin >= 22 ? 'text-green-600' : 'text-blue-600'}`}>
                {monthlyReport.profitMargin.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {t('analysePage.overview.sectorAverage')}: {SECTOR_BENCHMARKS.profitMargin.average}%
              </div>
            </motion.div>
          </div>

          {/* Orders & Average */}
          <div className="grid md:grid-cols-2 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-2xl p-5 shadow-sm"
            >
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                📦 {t('analysePage.overview.orders')}
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-3xl font-bold text-gray-900">{monthlyReport.totalOrders}</div>
                  <div className="text-sm text-gray-500">{t('analysePage.overview.total')}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">{monthlyReport.onlineOrders}</div>
                  <div className="text-sm text-gray-500">{t('analysePage.overview.online')}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">{monthlyReport.kassaOrders}</div>
                  <div className="text-sm text-gray-500">{t('analysePage.overview.kassa')}</div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded-2xl p-5 shadow-sm"
            >
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                🧾 {t('analysePage.overview.averageTicket')}
              </h3>
              <div className="flex items-end gap-4">
                <div>
                  <div className="text-3xl font-bold text-gray-900">{formatCurrency(monthlyReport.averageTicket)}</div>
                  <div className="text-sm text-gray-500">{t('analysePage.overview.perOrder')}</div>
                </div>
                {businessTargets && monthlyReport.averageTicket < businessTargets.target_average_ticket && (
                  <div className="text-sm text-blue-600">
                    {t('analysePage.overview.target')}: {formatCurrency(businessTargets.target_average_ticket)}
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Cost Breakdown */}
          <div className="grid md:grid-cols-2 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white rounded-2xl p-5 shadow-sm"
            >
              <h3 className="font-bold text-gray-900 mb-4">🏠 {t('analysePage.overview.fixedCosts')}</h3>
              <div className="space-y-2">
                {monthlyReport.fixedCostBreakdown.length > 0 ? (
                  monthlyReport.fixedCostBreakdown.map(item => {
                    const cat = translatedFixedCategories.find(c => c.id === item.category)
                    return (
                      <div key={item.category} className="flex justify-between items-center">
                        <span className="text-gray-600">{cat?.icon} {cat?.label}</span>
                        <span className="font-medium text-gray-900">{formatCurrency(item.amount)}</span>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-gray-400">{t('analysePage.overview.noFixedCosts')}</p>
                )}
                <hr className="my-2" />
                <div className="flex justify-between items-center font-bold">
                  <span>{t('analysePage.overview.total')}</span>
                  <span className="text-red-600">{formatCurrency(monthlyReport.totalFixedCosts)}</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-white rounded-2xl p-5 shadow-sm"
            >
              <h3 className="font-bold text-gray-900 mb-4">🛒 {t('analysePage.overview.variableCosts')}</h3>
              <div className="space-y-2">
                {monthlyReport.variableCostBreakdown.length > 0 ? (
                  monthlyReport.variableCostBreakdown.map(item => {
                    const cat = translatedVariableCategories.find(c => c.id === item.category)
                    return (
                      <div key={item.category} className="flex justify-between items-center">
                        <span className="text-gray-600">{cat?.icon} {cat?.label}</span>
                        <span className="font-medium text-gray-900">{formatCurrency(item.amount)}</span>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-gray-400">{t('analysePage.overview.noPurchases')}</p>
                )}
                <hr className="my-2" />
                <div className="flex justify-between items-center font-bold">
                  <span>{t('analysePage.overview.total')}</span>
                  <span className="text-red-600">{formatCurrency(monthlyReport.totalVariableCosts)}</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Recommendations */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-white rounded-2xl p-5 shadow-sm"
          >
            <h3 className="font-bold text-gray-900 mb-4">🔍 {t('analysePage.overview.recommendations')}</h3>
            <div className="space-y-2">
              {translateRecommendations(monthlyReport.recommendations).map((rec, idx) => {
                let bgClass = 'bg-gray-50'
                if (rec.includes('✅')) bgClass = 'bg-green-50 border-l-4 border-green-500'
                else if (rec.includes('🚨')) bgClass = 'bg-red-50 border-l-4 border-red-500'
                else if (rec.includes('👥') || rec.includes('🥔') || rec.includes('🏠') || rec.includes('⚡') || rec.includes('🧾')) bgClass = 'bg-yellow-50 border-l-4 border-yellow-500'
                else if (rec.includes('📍')) bgClass = 'bg-blue-50 border-l-4 border-blue-500'
                else if (rec.includes('→')) bgClass = 'bg-gray-50 pl-6'

                return (
                  <div key={idx} className={`p-3 rounded-lg ${bgClass}`}>
                    {rec}
                  </div>
                )
              })}
            </div>
          </motion.div>
        </div>
      )}

      {/* Kassa Tab */}
      {activeTab === 'kassa' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">💵 {t('analysePage.kassa.title')}</h2>
              <p className="text-gray-500">{t('analysePage.kassa.subtitle')}</p>
            </div>
            <button
              onClick={() => openKassaModal()}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              ➕ {t('analysePage.kassa.newDay')}
            </button>
          </div>

          {/* Calendar-like view */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-600 font-medium">{t('analysePage.kassa.date')}</th>
                  <th className="px-4 py-3 text-right text-gray-600 font-medium">{t('analysePage.kassa.cash')}</th>
                  <th className="px-4 py-3 text-right text-gray-600 font-medium">{t('analysePage.kassa.card')}</th>
                  <th className="px-4 py-3 text-right text-gray-600 font-medium">{t('analysePage.overview.total')}</th>
                  <th className="px-4 py-3 text-right text-gray-600 font-medium">{t('analysePage.kassa.orders')}</th>
                  <th className="px-4 py-3 text-center text-gray-600 font-medium">{t('analysePage.common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dailySales.length > 0 ? (
                  dailySales.map(sale => (
                    <tr key={sale.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {new Date(sale.date).toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(sale.cash_revenue)}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(sale.card_revenue)}</td>
                      <td className="px-4 py-3 text-right font-bold text-green-600">{formatCurrency(sale.total_revenue)}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{sale.order_count}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => openKassaModal(sale)}
                          className="text-blue-500 hover:text-blue-700 mr-2"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteKassa(sale.id!)}
                          className="text-red-500 hover:text-red-700"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                      <div className="text-4xl mb-2">💵</div>
                      <p>{t('analysePage.kassa.noData')}</p>
                      <p className="text-sm">{t('analysePage.kassa.clickNew')}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Monthly Total */}
          {dailySales.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center justify-between">
              <span className="font-bold text-green-800">{t('analysePage.kassa.monthTotal')} {MONTH_NAMES[selectedMonth - 1]}</span>
              <span className="text-2xl font-bold text-green-600">
                {formatCurrency(dailySales.reduce((sum, s) => sum + s.total_revenue, 0))}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Fixed Costs Tab */}
      {activeTab === 'fixed' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">🏠 {t('analysePage.fixed.title')}</h2>
              <p className="text-gray-500">{t('analysePage.fixed.subtitle')}</p>
            </div>
            <button
              onClick={() => openFixedModal()}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              ➕ {t('analysePage.fixed.newCost')}
            </button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fixedCosts.map(cost => {
              const cat = translatedFixedCategories.find(c => c.id === cost.category)
              return (
                <motion.div
                  key={cost.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`bg-white rounded-2xl p-5 shadow-sm border-2 ${
                    cost.is_active ? 'border-green-200' : 'border-gray-200 opacity-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="text-3xl">{cat?.icon}</div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-red-600">{formatCurrency(cost.amount)}</div>
                      <div className="text-xs text-gray-400">{t('analysePage.fixed.perMonth')}</div>
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-900">{cost.name}</h3>
                  <p className="text-sm text-gray-500">{cat?.label}</p>
                  {cost.notes && <p className="text-xs text-gray-400 mt-2">{cost.notes}</p>}
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => openFixedModal(cost)}
                      className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200"
                    >
                      ✏️ {t('analysePage.fixed.edit')}
                    </button>
                    {(cost as FixedCost & { pdf_url?: string }).pdf_url && (
                      <a
                        href={(cost as FixedCost & { pdf_url?: string }).pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200"
                        title="Bekijk factuur PDF"
                      >
                        📄
                      </a>
                    )}
                    <button
                      onClick={() => handleDeleteFixed(cost.id!)}
                      className="px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200"
                    >
                      🗑️
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {fixedCosts.length === 0 && (
            <div className="bg-white rounded-2xl p-12 text-center">
              <div className="text-6xl mb-4">🏠</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{t('analysePage.fixed.noData')}</h3>
              <p className="text-gray-500">{t('analysePage.fixed.noDataDesc')}</p>
            </div>
          )}

          {fixedCosts.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between">
              <span className="font-bold text-red-800">{t('analysePage.fixed.monthTotal')}</span>
              <span className="text-2xl font-bold text-red-600">
                {formatCurrency(fixedCosts.filter(c => c.is_active).reduce((sum, c) => sum + c.amount, 0))}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Variable Costs Tab */}
      {activeTab === 'variable' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">🛒 {t('analysePage.variable.title')}</h2>
              <p className="text-gray-500">{MONTH_NAMES[selectedMonth - 1]} {selectedYear}</p>
            </div>
            <button
              onClick={() => openVariableModal()}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              ➕ {t('analysePage.variable.newPurchase')}
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-600 font-medium">{t('analysePage.variable.date')}</th>
                  <th className="px-4 py-3 text-left text-gray-600 font-medium">{t('analysePage.variable.description')}</th>
                  <th className="px-4 py-3 text-left text-gray-600 font-medium">{t('analysePage.variable.supplier')}</th>
                  <th className="px-4 py-3 text-left text-gray-600 font-medium">{t('analysePage.variable.category')}</th>
                  <th className="px-4 py-3 text-right text-gray-600 font-medium">{t('analysePage.variable.amount')}</th>
                  <th className="px-4 py-3 text-center text-gray-600 font-medium">{t('analysePage.common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {variableCosts.length > 0 ? (
                  variableCosts.map(cost => {
                    const cat = translatedVariableCategories.find(c => c.id === cost.category)
                    return (
                      <tr key={cost.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-600">
                          {new Date(cost.date).toLocaleDateString('nl-BE')}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">{cost.description}</td>
                        <td className="px-4 py-3 text-gray-600">{cost.supplier || '-'}</td>
                        <td className="px-4 py-3 text-gray-600">
                          <span className="inline-flex items-center gap-1">
                            {cat?.icon} {cat?.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-red-600">
                          {formatCurrency(cost.amount)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {(cost as VariableCost & { pdf_url?: string }).pdf_url && (
                            <a
                              href={(cost as VariableCost & { pdf_url?: string }).pdf_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-500 hover:text-green-700 mr-2"
                              title="Bekijk factuur PDF"
                            >
                              📄
                            </a>
                          )}
                          <button
                            onClick={() => openVariableModal(cost)}
                            className="text-blue-500 hover:text-blue-700 mr-2"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteVariable(cost.id!)}
                            className="text-red-500 hover:text-red-700"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                      <div className="text-4xl mb-2">🛒</div>
                      <p>{t('analysePage.variable.noData')}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {variableCosts.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between">
              <span className="font-bold text-red-800">{t('analysePage.variable.monthTotal')} {MONTH_NAMES[selectedMonth - 1]}</span>
              <span className="text-2xl font-bold text-red-600">
                {formatCurrency(variableCosts.reduce((sum, c) => sum + c.amount, 0))}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Year Tab */}
      {activeTab === 'year' && monthlyReport && (
        <div className="space-y-6">
          <div className="flex items-center justify-center gap-4 mb-6">
            <button onClick={() => setSelectedYear(y => y - 1)} className="p-2 hover:bg-gray-100 rounded-lg">
              ◀️
            </button>
            <h2 className="text-2xl font-bold text-gray-900">{selectedYear}</h2>
            <button onClick={() => setSelectedYear(y => y + 1)} className="p-2 hover:bg-gray-100 rounded-lg">
              ▶️
            </button>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="text-sm text-gray-500">💰 {t('analysePage.year.yearRevenue')}</div>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(yearReport?.totalRevenue || 0)}</div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="text-sm text-gray-500">📉 {t('analysePage.year.yearCosts')}</div>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(yearReport?.totalCosts || 0)}</div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="text-sm text-gray-500">✨ {t('analysePage.year.yearProfit')}</div>
              <div className={`text-2xl font-bold ${(yearReport?.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(yearReport?.netProfit || 0)}
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="text-sm text-gray-500">📊 {t('analysePage.year.averageMargin')}</div>
              <div className="text-2xl font-bold text-blue-600">{(yearReport?.profitMargin || 0).toFixed(1)}%</div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <p className="text-blue-800">
              💡 <strong>Tip:</strong> {t('analysePage.year.tip')}
            </p>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">⚙️ {t('analysePage.settings.title')}</h2>
            <p className="text-gray-500">{t('analysePage.settings.subtitle')}</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-6">
            <div>
              <label className="block font-medium text-gray-700 mb-2">🎯 {t('analysePage.settings.targetMargin')}</label>
              <input
                type="number"
                value={targetsForm.target_profit_margin || ''}
                onChange={e => setTargetsForm(f => ({ ...f, target_profit_margin: Number(e.target.value) }))}
                placeholder="25"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-gray-500 mt-1">{t('analysePage.settings.targetMarginHelp')}</p>
            </div>

            <div>
              <label className="block font-medium text-gray-700 mb-2">⚠️ {t('analysePage.settings.minMargin')}</label>
              <input
                type="number"
                value={targetsForm.minimum_profit_margin || ''}
                onChange={e => setTargetsForm(f => ({ ...f, minimum_profit_margin: Number(e.target.value) }))}
                placeholder="15"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-gray-500 mt-1">{t('analysePage.settings.minMarginHelp')}</p>
            </div>

            <div>
              <label className="block font-medium text-gray-700 mb-2">👥 {t('analysePage.settings.maxPersonnel')}</label>
              <input
                type="number"
                value={targetsForm.max_personnel_percent || ''}
                onChange={e => setTargetsForm(f => ({ ...f, max_personnel_percent: Number(e.target.value) }))}
                placeholder="30"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-gray-500 mt-1">{t('analysePage.settings.maxPersonnelHelp')}</p>
            </div>

            <div>
              <label className="block font-medium text-gray-700 mb-2">🥔 {t('analysePage.settings.maxIngredients')}</label>
              <input
                type="number"
                value={targetsForm.max_ingredient_percent || ''}
                onChange={e => setTargetsForm(f => ({ ...f, max_ingredient_percent: Number(e.target.value) }))}
                placeholder="35"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-gray-500 mt-1">{t('analysePage.settings.maxIngredientsHelp')}</p>
            </div>

            <div>
              <label className="block font-medium text-gray-700 mb-2">🧾 {t('analysePage.settings.targetTicket')}</label>
              <input
                type="number"
                value={targetsForm.target_average_ticket || ''}
                onChange={e => setTargetsForm(f => ({ ...f, target_average_ticket: Number(e.target.value) }))}
                placeholder="15"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={saveTargets}
              disabled={saving}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? t('analysePage.common.saving') : `💾 ${t('analysePage.settings.saveTargets')}`}
            </button>
          </div>

          {/* Sector Benchmarks */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
            <h3 className="font-bold text-blue-900 mb-4">🏆 {t('analysePage.settings.benchmarks')}</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-700">{t('analysePage.settings.avgMargin')}:</span>
                <span className="font-bold text-blue-900 ml-2">{SECTOR_BENCHMARKS.profitMargin.average}%</span>
              </div>
              <div>
                <span className="text-blue-700">{t('analysePage.settings.goodPerformers')}:</span>
                <span className="font-bold text-blue-900 ml-2">{SECTOR_BENCHMARKS.profitMargin.good}%+</span>
              </div>
              <div>
                <span className="text-blue-700">{t('analysePage.settings.topPerformers')}:</span>
                <span className="font-bold text-blue-900 ml-2">{SECTOR_BENCHMARKS.profitMargin.excellent}%+</span>
              </div>
              <div>
                <span className="text-blue-700">{t('analysePage.settings.maxPersonnelBenchmark')}:</span>
                <span className="font-bold text-blue-900 ml-2">{SECTOR_BENCHMARKS.personnelPercent.max}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Kassa Modal */}
      <AnimatePresence>
        {showKassaModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowKassaModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-md shadow-xl"
            >
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="text-xl font-bold">{editingKassa ? `✏️ ${t('analysePage.kassa.editDay')}` : `➕ ${t('analysePage.kassa.newDay')}`}</h2>
                <button onClick={() => setShowKassaModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('analysePage.kassa.date')}</label>
                  <input
                    type="date"
                    value={kassaForm.date}
                    onChange={e => setKassaForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">💵 {t('analysePage.kassa.cashRevenue')}</label>
                    <input
                      type="number"
                      step="0.01"
                      value={kassaForm.cash_revenue || ''}
                      onChange={e => setKassaForm(f => ({ ...f, cash_revenue: Number(e.target.value) }))}
                      placeholder="0.00"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">💳 {t('analysePage.kassa.cardRevenue')}</label>
                    <input
                      type="number"
                      step="0.01"
                      value={kassaForm.card_revenue || ''}
                      onChange={e => setKassaForm(f => ({ ...f, card_revenue: Number(e.target.value) }))}
                      placeholder="0.00"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">📦 {t('analysePage.kassa.orderCount')}</label>
                  <input
                    type="number"
                    value={kassaForm.order_count || ''}
                    onChange={e => setKassaForm(f => ({ ...f, order_count: Number(e.target.value) }))}
                    placeholder="0"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">📝 {t('analysePage.kassa.notes')}</label>
                  <textarea
                    value={kassaForm.notes}
                    onChange={e => setKassaForm(f => ({ ...f, notes: e.target.value }))}
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                  />
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">{t('analysePage.overview.total')}:</span>
                    <span className="text-2xl font-bold text-green-600">
                      {formatCurrency(kassaForm.cash_revenue + kassaForm.card_revenue)}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowKassaModal(false)}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl font-medium hover:bg-gray-50"
                  >
                    {t('analysePage.common.cancel')}
                  </button>
                  <button
                    onClick={saveKassa}
                    disabled={saving}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? t('analysePage.common.saving') : `💾 ${t('analysePage.common.save')}`}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fixed Cost Modal */}
      <AnimatePresence>
        {showFixedModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowFixedModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-md shadow-xl"
            >
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="text-xl font-bold">{editingFixed ? `✏️ ${t('analysePage.fixed.editCost')}` : `➕ ${t('analysePage.fixed.newCost')}`}</h2>
                <button onClick={() => setShowFixedModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <div className="p-6 space-y-4">

                {/* PDF Upload — alleen bij nieuwe kost */}
                {!editingFixed && (
                  <div>
                    <input ref={pdfInputFixedRef} type="file" accept="application/pdf" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handlePdfUploadFixed(f); e.target.value = '' }} />
                    <button type="button" onClick={() => pdfInputFixedRef.current?.click()} disabled={isParsingPdfFixed}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-blue-400 text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50 text-sm font-medium">
                      {isParsingPdfFixed ? '⏳ PDF wordt ingelezen...' : '📄 PDF factuur uploaden (automatisch invullen)'}
                    </button>
                    <p className="text-xs text-gray-400 mt-1 text-center">Peppol of gewone PDF — naam en bedrag worden automatisch ingevuld</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('analysePage.fixed.category')}</label>
                  <select
                    value={fixedForm.category}
                    onChange={e => setFixedForm(f => ({ ...f, category: e.target.value as FixedCostCategory }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                  >
                    {translatedFixedCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.icon} {cat.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('analysePage.fixed.name')}</label>
                  <input
                    type="text"
                    value={fixedForm.name}
                    onChange={e => setFixedForm(f => ({ ...f, name: e.target.value }))}
                    placeholder={t('analysePage.fixed.namePlaceholder')}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('analysePage.fixed.amountPerMonth')}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={fixedForm.amount || ''}
                    onChange={e => setFixedForm(f => ({ ...f, amount: Number(e.target.value) }))}
                    placeholder="0.00"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('analysePage.fixed.notes')}</label>
                  <textarea
                    value={fixedForm.notes}
                    onChange={e => setFixedForm(f => ({ ...f, notes: e.target.value }))}
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={fixedForm.is_active}
                    onChange={e => setFixedForm(f => ({ ...f, is_active: e.target.checked }))}
                    className="w-5 h-5 rounded"
                  />
                  <label htmlFor="isActive" className="text-gray-700">{t('analysePage.fixed.active')}</label>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowFixedModal(false)}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl font-medium hover:bg-gray-50"
                  >
                    {t('analysePage.common.cancel')}
                  </button>
                  <button
                    onClick={saveFixed}
                    disabled={saving}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? t('analysePage.common.saving') : `💾 ${t('analysePage.common.save')}`}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Variable Cost Modal */}
      <AnimatePresence>
        {showVariableModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowVariableModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-md shadow-xl"
            >
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="text-xl font-bold">{editingVariable ? `✏️ ${t('analysePage.variable.editPurchase')}` : `➕ ${t('analysePage.variable.newPurchase')}`}</h2>
                <button onClick={() => setShowVariableModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <div className="p-6 space-y-4">

                {/* PDF Upload — alleen bij nieuwe inkoop */}
                {!editingVariable && (
                  <div>
                    <input ref={pdfInputRef} type="file" accept="application/pdf" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handlePdfUpload(f); e.target.value = '' }} />
                    <button type="button" onClick={() => pdfInputRef.current?.click()} disabled={isParsingPdf}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-blue-400 text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50 text-sm font-medium">
                      {isParsingPdf ? '⏳ PDF wordt ingelezen...' : '📄 PDF factuur uploaden (automatisch invullen)'}
                    </button>
                    <p className="text-xs text-gray-400 mt-1 text-center">Peppol of gewone PDF — leverancier, datum en bedrag worden automatisch ingevuld</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('analysePage.variable.category')}</label>
                  <select
                    value={variableForm.category}
                    onChange={e => setVariableForm(f => ({ ...f, category: e.target.value as VariableCostCategory }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                  >
                    {translatedVariableCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.icon} {cat.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('analysePage.variable.description')}</label>
                  <input
                    type="text"
                    value={variableForm.description}
                    onChange={e => setVariableForm(f => ({ ...f, description: e.target.value }))}
                    placeholder={t('analysePage.variable.descriptionPlaceholder')}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('analysePage.variable.supplier')}</label>
                    <input
                      type="text"
                      value={variableForm.supplier}
                      onChange={e => setVariableForm(f => ({ ...f, supplier: e.target.value }))}
                      placeholder={t('analysePage.variable.optional')}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('analysePage.variable.invoiceNumber')}</label>
                    <input
                      type="text"
                      value={variableForm.invoice_number}
                      onChange={e => setVariableForm(f => ({ ...f, invoice_number: e.target.value }))}
                      placeholder={t('analysePage.variable.optional')}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('analysePage.variable.amount')}</label>
                    <input
                      type="number"
                      step="0.01"
                      value={variableForm.amount || ''}
                      onChange={e => setVariableForm(f => ({ ...f, amount: Number(e.target.value) }))}
                      placeholder="0.00"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('analysePage.variable.date')}</label>
                    <input
                      type="date"
                      value={variableForm.date}
                      onChange={e => setVariableForm(f => ({ ...f, date: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('analysePage.variable.notes')}</label>
                  <textarea
                    value={variableForm.notes}
                    onChange={e => setVariableForm(f => ({ ...f, notes: e.target.value }))}
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowVariableModal(false)}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl font-medium hover:bg-gray-50"
                  >
                    {t('analysePage.common.cancel')}
                  </button>
                  <button
                    onClick={saveVariable}
                    disabled={saving}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? t('analysePage.common.saving') : `💾 ${t('analysePage.common.save')}`}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
