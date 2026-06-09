'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/i18n'
import { getTenantSettings, type TenantSettings } from '@/lib/admin-api'
import {
  buildHamburgerModules,
  filterHamburgerModulesForAccess,
} from '@/lib/admin-hamburger-modules'
import { useTenantModuleFlagsContext } from '@/lib/tenant-module-flags-context'
import { createKassaPosRegisterUiTheme } from '@/lib/kassa-pos-register-ui-theme'
import {
  KASSA_POS_CART_ROW,
  KASSA_POS_CHECKOUT_BTN,
  KASSA_POS_FIELD,
  KASSA_POS_MENU_PLATE_SHELL_BG_CLASS,
  KASSA_POS_MENU_RECESS_TRAY_CLASS,
  KASSA_POS_MENU_TILE_BUTTON_BASE,
  KASSA_POS_MENU_TILE_LABEL_CLASS,
  KASSA_POS_RULE_BLACK,
  KASSA_POS_BTN_SHAPE,
  KASSA_SIDEBAR_FOOTER_BTN_LABEL,
  KASSA_SIDEBAR_FOOTER_LEFT_COL,
  kassaPosButtonClass,
  kassaPosCartQtyButtonClass,
  kassaPosQuickMenuPanelButtonClass,
  kassaPosRaisedStripClass,
} from '@/lib/kassa-pos-surface'
import {
  applyRetailGoodsReceipt,
  applyRetailStockScanIncrement,
  completeRetailCashSale,
  createRetailSkuFromScan,
  fetchRetailPosSkus,
  updateRetailSkuPrice,
  parseRetailScanPayload,
  resolveRetailSkuForGoodsReceipt,
  resolveRetailSkuLookup,
  retailSkuInStock,
  type RetailCartLine,
  type RetailPosSku,
} from '@/lib/retail-kassa-pos'
import { patchSkuInList } from '@/lib/retail-pos-catalog'

type RetailKassaMode = 'sales' | 'stockCount' | 'goodsReceipt'

type StockActivityLine = {
  key: string
  sku: RetailPosSku
  delta: number
  mode: RetailKassaMode
}
import { LocaleFlagEmoji } from '@/components/LocaleFlagEmoji'
import { AccountMenuSessionBlock } from '@/components/AccountMenuSessionBlock'
import { LogoutSoftwareConfirmModal } from '@/components/LogoutSoftwareConfirmModal'
import { buildShopInternalReturnPath } from '@/lib/auth-headers'
import {
  attemptCloseThenOrNavigate,
  applyOwnerOnlyLogoutCleanup,
  broadcastTenantOwnerLogout,
  setTerminalLogout,
} from '@/lib/session-broadcast'
import { appendKassaCloseTipToAbsoluteLoginUrl } from '@/lib/shop-login-kassa-tip'
import { openCashDrawer } from '@/lib/vysion-print-agent-client'
import { playClick } from '@/lib/sounds'

const KASSA_HEADER_QUICK_LINK_LABEL = 'text-[11px] leading-snug sm:text-xs'

const RETAIL_QUICK_MENU_ACTIONS = [
  {
    key: 'stock',
    labelKey: 'adminHamburger.items.sm_voorraad_beheer',
    hrefSuffix: '/voorraad',
    submenuId: 'sm_voorraad_beheer',
  },
  {
    key: 'products',
    labelKey: 'adminHamburger.items.sm_kassa_producten',
    hrefSuffix: '/producten',
    submenuId: 'sm_kassa_producten',
  },
  {
    key: 'sales',
    labelKey: 'kassaApp.quickMenuSales',
    hrefSuffix: '/verkoop',
    submenuId: 'sm_rpt_verkoop',
  },
] as const

export function RetailKassaPosClient({ tenant }: { tenant: string }) {
  const baseUrl = `/shop/${tenant}/admin`
  const { t, locale, setLocale, locales, localeNames } = useLanguage()
  const ui = useMemo(() => createKassaPosRegisterUiTheme(true), [])

  const {
    moduleAccess,
    enabledModulesJson,
    featureLabelPrinting,
    loading: moduleFlagsLoading,
  } = useTenantModuleFlagsContext()

  const filteredHamburgerModules = useMemo(() => {
    const all = buildHamburgerModules(baseUrl, tenant)
    if (moduleFlagsLoading) return []
    return filterHamburgerModulesForAccess(
      all,
      moduleAccess,
      featureLabelPrinting,
      enabledModulesJson,
    )
  }, [baseUrl, tenant, moduleFlagsLoading, moduleAccess, featureLabelPrinting, enabledModulesJson])

  const quickMenuAllowedSubmenuIds = useMemo(
    () => new Set(filteredHamburgerModules.flatMap((m) => m.items.map((i) => i.id))),
    [filteredHamburgerModules],
  )

  const scanRef = useRef<HTMLInputElement>(null)
  const articleSearchActiveRef = useRef(false)
  const barcodeCaptureRef = useRef<HTMLInputElement>(null)
  const scanBarRef = useRef<HTMLDivElement>(null)
  const langRef = useRef<HTMLDivElement>(null)

  const [tenantInfo, setTenantInfo] = useState<TenantSettings | null>(null)
  const [skus, setSkus] = useState<RetailPosSku[]>([])
  const [loading, setLoading] = useState(true)
  const [scanValue, setScanValue] = useState('')
  const [cart, setCart] = useState<RetailCartLine[]>([])
  const [paying, setPaying] = useState(false)
  const [lastOrder, setLastOrder] = useState<number | null>(null)
  const [hamburgerOpen, setHamburgerOpen] = useState(false)
  const [hamburgerSubOpen, setHamburgerSubOpen] = useState<string | null>(null)
  const [quickMenuPanelOpen, setQuickMenuPanelOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [logoutSoftwareConfirmOpen, setLogoutSoftwareConfirmOpen] = useState(false)
  const [showPayModal, setShowPayModal] = useState(false)
  const [mode, setMode] = useState<RetailKassaMode>('sales')
  const [stockActivity, setStockActivity] = useState<StockActivityLine[]>([])
  const [stockBusy, setStockBusy] = useState(false)
  /** Schermtoetsenbord alleen na expliciete tik op «Artikel zoeken». */
  const [articleSearchActive, setArticleSearchActive] = useState(false)
  const [priceFixSku, setPriceFixSku] = useState<RetailPosSku | null>(null)
  const [priceFixValue, setPriceFixValue] = useState('')
  const [priceFixSaving, setPriceFixSaving] = useState(false)
  const priceFixInputRef = useRef<HTMLInputElement>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    const list = await fetchRetailPosSkus(tenant)
    setSkus(list)
    setLoading(false)
  }, [tenant])

  useEffect(() => {
    void reload()
    void getTenantSettings(tenant).then(setTenantInfo)
  }, [reload, tenant])

  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    html.classList.add('kassa-dark-appearance', 'vysion-kassa-root')
    body.classList.add('vysion-kassa-root')
    return () => {
      html.classList.remove('kassa-dark-appearance', 'vysion-kassa-root')
      body.classList.remove('vysion-kassa-root')
    }
  }, [])

  const focusBarcodeCapture = useCallback(() => {
    barcodeCaptureRef.current?.focus({ preventScroll: true })
  }, [])

  const applyArticleSearchDomInactive = useCallback((el: HTMLInputElement) => {
    articleSearchActiveRef.current = false
    el.readOnly = true
    el.setAttribute('inputmode', 'none')
    el.setAttribute('data-kassa-no-web-keyboard', 'true')
  }, [])

  const applyArticleSearchDomActive = useCallback((el: HTMLInputElement) => {
    articleSearchActiveRef.current = true
    el.readOnly = false
    el.setAttribute('inputmode', 'search')
    el.removeAttribute('data-kassa-no-web-keyboard')
  }, [])

  const closeArticleSearchKeyboard = useCallback(() => {
    setArticleSearchActive(false)
    const el = scanRef.current
    if (el) applyArticleSearchDomInactive(el)
    el?.blur()
    focusBarcodeCapture()
  }, [applyArticleSearchDomInactive, focusBarcodeCapture])

  const openArticleSearchKeyboard = useCallback(() => {
    setArticleSearchActive(true)
    requestAnimationFrame(() => {
      const el = scanRef.current
      if (!el) return
      applyArticleSearchDomActive(el)
      el.focus({ preventScroll: true })
    })
  }, [applyArticleSearchDomActive])

  useLayoutEffect(() => {
    setArticleSearchActive(false)
    const active = document.activeElement
    if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
      active.blur()
    }
    const el = scanRef.current
    if (el) applyArticleSearchDomInactive(el)
    el?.blur()
    focusBarcodeCapture()
  }, [applyArticleSearchDomInactive, focusBarcodeCapture])

  useEffect(() => {
    return () => {
      scanRef.current?.blur()
    }
  }, [])

  useEffect(() => {
    if (!langOpen) return
    const onDoc = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [langOpen])

  const total = useMemo(
    () => cart.reduce((s, l) => s + l.sku.price * l.quantity, 0),
    [cart],
  )

  const businessTitle =
    tenantInfo?.business_name ||
    tenant.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

  const kassaDarkHeaderBtnShell =
    'inline-flex shrink-0 touch-manipulation items-center justify-center whitespace-nowrap font-semibold transition-colors min-h-[2.35rem] px-3 py-2 sm:min-h-[2.6rem] sm:px-3.5 sm:py-2.5'

  const headerUtilityBtnClass = (selected: boolean) =>
    `${kassaDarkHeaderBtnShell} gap-0.5 sm:gap-1 ${kassaPosButtonClass(selected)}`

  const kassaSidebarActionLabelClass = `text-center ${KASSA_SIDEBAR_FOOTER_BTN_LABEL}`

  const modeHintKey =
    mode === 'sales'
      ? 'retailKassaPage.scanOnlyHint'
      : mode === 'stockCount'
        ? 'retailKassaPage.modeStockCountHint'
        : 'retailKassaPage.modeGoodsReceiptHint'

  const barHasLines = mode === 'sales' ? cart.length > 0 : stockActivity.length > 0

  function switchMode(next: RetailKassaMode) {
    if (next === mode) return
    playClick()
    setMode(next)
    setStockActivity([])
    closeArticleSearchKeyboard()
  }

  function pushStockActivity(sku: RetailPosSku, delta: number, activityMode: RetailKassaMode) {
    const key = `${sku.lineKey}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setStockActivity((prev) => [...prev, { key, sku, delta, mode: activityMode }])
    requestAnimationFrame(() => {
      const el = scanBarRef.current
      if (el) el.scrollLeft = el.scrollWidth
    })
  }

  function replaceSkuInCatalog(next: RetailPosSku) {
    setSkus((prev) => patchSkuInList(prev, next))
  }

  /** Onbekende EAN: opzoeken, artikel aanmaken, daarna normale scan. */
  async function importSkuFromBarcode(code: string): Promise<RetailPosSku | null> {
    const trimmed = code.trim()
    if (!trimmed) return null

    let lookup: { ok?: boolean; name?: string; price?: number | null } = {}
    try {
      const r = await fetch(`/api/retail/ean-lookup?ean=${encodeURIComponent(trimmed)}`)
      lookup = (await r.json()) as typeof lookup
    } catch {
      lookup = {}
    }

    const digits = trimmed.replace(/\D/g, '')
    const name =
      lookup.name?.trim() || (digits.length >= 8 ? `EAN ${digits}` : trimmed)
    const price =
      lookup.price != null && Number.isFinite(Number(lookup.price))
        ? Math.round(Number(lookup.price) * 100) / 100
        : 0

    const res = await createRetailSkuFromScan(tenant, { barcode: trimmed, name, price })
    if (!res.ok) return null

    const list = await fetchRetailPosSkus(tenant)
    setSkus(list)
    return resolveRetailSkuLookup(list, trimmed) ?? res.sku ?? null
  }

  async function resolveOrImportSku(code: string): Promise<RetailPosSku | null> {
    const hit = resolveRetailSkuLookup(skus, code)
    if (hit) return hit
    return importSkuFromBarcode(code)
  }

  async function processBarcode(code: string) {
    const trimmed = code.trim()
    if (!trimmed || stockBusy) return

    if (mode === 'sales') {
      setStockBusy(true)
      try {
        const hit = await resolveOrImportSku(trimmed)
        if (hit) addToCart(hit, 1)
        else alert(t('retailKassaPage.autoScanImportError'))
      } finally {
        setStockBusy(false)
        setScanValue('')
        if (barcodeCaptureRef.current) barcodeCaptureRef.current.value = ''
        focusBarcodeCapture()
      }
      return
    }

    const payload = parseRetailScanPayload(trimmed)
    let hit =
      mode === 'goodsReceipt'
        ? resolveRetailSkuForGoodsReceipt(skus, payload)
        : resolveRetailSkuLookup(skus, payload.lookupCode)
    if (!hit) {
      hit = await importSkuFromBarcode(payload.lookupCode || trimmed)
    }
    if (!hit) {
      alert(t('retailKassaPage.barcodeNotFound'))
      return
    }

    setStockBusy(true)
    try {
      if (mode === 'stockCount') {
        const res = await applyRetailStockScanIncrement(tenant, hit)
        if (!res.ok || !res.sku) {
          alert(t('retailKassaPage.stockUpdateError'))
          return
        }
        replaceSkuInCatalog(res.sku)
        pushStockActivity(res.sku, 1, 'stockCount')
      } else {
        const res = await applyRetailGoodsReceipt(tenant, hit, payload)
        if (!res.ok || !res.sku) {
          alert(t('retailKassaPage.stockUpdateError'))
          return
        }
        replaceSkuInCatalog(res.sku)
        pushStockActivity(res.sku, payload.quantity, 'goodsReceipt')
      }
    } finally {
      setStockBusy(false)
      setScanValue('')
      if (barcodeCaptureRef.current) barcodeCaptureRef.current.value = ''
      focusBarcodeCapture()
    }
  }

  async function savePriceFix() {
    if (!priceFixSku || priceFixSaving) return
    const price = Number.parseFloat(priceFixValue.replace(',', '.'))
    if (!Number.isFinite(price) || price < 0) {
      alert(t('retailKassaPage.unknownScanPriceRequired'))
      return
    }
    setPriceFixSaving(true)
    try {
      const res = await updateRetailSkuPrice(tenant, priceFixSku, price)
      if (!res.ok || !res.sku) {
        alert(t('retailKassaPage.priceFixError'))
        return
      }
      replaceSkuInCatalog(res.sku)
      setCart((prev) =>
        prev.map((l) => (l.sku.lineKey === res.sku!.lineKey ? { ...l, sku: res.sku! } : l)),
      )
      setPriceFixSku(null)
      setPriceFixValue('')
      focusBarcodeCapture()
    } finally {
      setPriceFixSaving(false)
    }
  }

  function addToCart(sku: RetailPosSku, qty = 1) {
    if (!retailSkuInStock(sku, qty)) {
      alert(t('retailKassaPage.outOfStock'))
      return
    }
    setCart((prev) => {
      const i = prev.findIndex((l) => l.sku.lineKey === sku.lineKey)
      if (i < 0) return [...prev, { sku, quantity: qty }]
      const next = [...prev]
      const merged = next[i].quantity + qty
      if (!retailSkuInStock(sku, merged)) {
        alert(t('retailKassaPage.outOfStock'))
        return prev
      }
      next[i] = { ...next[i], quantity: merged }
      return next
    })
    setScanValue('')
    if (barcodeCaptureRef.current) barcodeCaptureRef.current.value = ''
    focusBarcodeCapture()
    requestAnimationFrame(() => {
      const el = scanBarRef.current
      if (el) el.scrollLeft = el.scrollWidth
    })
    if (sku.price <= 0) {
      setPriceFixSku(sku)
      setPriceFixValue('')
      requestAnimationFrame(() => priceFixInputRef.current?.focus())
    }
  }

  function updateQty(lineKey: string, qty: number) {
    if (qty < 1) {
      setCart((prev) => prev.filter((l) => l.sku.lineKey !== lineKey))
      return
    }
    setCart((prev) => {
      const i = prev.findIndex((l) => l.sku.lineKey === lineKey)
      if (i < 0) return prev
      const sku = prev[i].sku
      if (!retailSkuInStock(sku, qty)) {
        alert(t('retailKassaPage.outOfStock'))
        return prev
      }
      const next = [...prev]
      next[i] = { ...next[i], quantity: qty }
      return next
    })
  }

  function clearCart() {
    if (cart.length === 0) return
    playClick()
    setCart([])
    focusBarcodeCapture()
  }

  function onScanSubmit(e: React.FormEvent) {
    e.preventDefault()
    void processBarcode(scanValue)
    if (mode === 'sales') {
      setScanValue('')
      focusBarcodeCapture()
    }
  }

  function onBarcodeWedgeKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const v = e.currentTarget.value
    e.currentTarget.value = ''
    void processBarcode(v)
  }

  function clearStockActivity() {
    if (stockActivity.length === 0) return
    playClick()
    setStockActivity([])
    focusBarcodeCapture()
  }

  async function payCash() {
    if (cart.length === 0 || paying) return
    setPaying(true)
    const res = await completeRetailCashSale(tenant, cart)
    setPaying(false)
    setShowPayModal(false)
    if (!res.ok) {
      alert(t('retailKassaPage.payError'))
      return
    }
    setLastOrder(res.orderNumber ?? null)
    setCart([])
    await reload()
    focusBarcodeCapture()
  }

  const performLogout = () => {
    applyOwnerOnlyLogoutCleanup(tenant)
    setTerminalLogout({ kind: 'staff', tenantSlug: tenant })
    broadcastTenantOwnerLogout({ scope: 'owner', tenantSlug: tenant, landing: 'tenant-login' })
    const origin = window.location.origin
    const next = buildShopInternalReturnPath(tenant, window.location.pathname, window.location.search)
    const loginUrl = `${origin}/login?next=${encodeURIComponent(next)}`
    attemptCloseThenOrNavigate(() => {
      window.location.replace(appendKassaCloseTipToAbsoluteLoginUrl(loginUrl))
    })
  }

  return (
    <div
      className="flex min-h-0 flex-col overflow-hidden h-[100svh] max-h-[100svh] supports-[height:100dvh]:h-[100dvh] supports-[height:100dvh]:max-h-[100dvh]"
      data-testid="retail-kassa-app"
    >
      <LogoutSoftwareConfirmModal
        open={logoutSoftwareConfirmOpen}
        onCancel={() => setLogoutSoftwareConfirmOpen(false)}
        onConfirm={() => {
          setLogoutSoftwareConfirmOpen(false)
          performLogout()
        }}
      />

      {priceFixSku ? (
        <div className="fixed inset-0 z-[135] flex items-center justify-center bg-black/70 p-4">
          <div
            className={`w-full max-w-sm space-y-3 p-5 ${KASSA_POS_BTN_SHAPE} ${KASSA_POS_MENU_PLATE_SHELL_BG_CLASS} border ${KASSA_POS_RULE_BLACK}`}
          >
            <p className="text-lg font-bold text-white">{t('retailKassaPage.priceFixTitle')}</p>
            <p className="text-sm text-white/80">{priceFixSku.name}</p>
            <p className="text-xs text-white/60">{t('retailKassaPage.priceFixHint')}</p>
            <input
              ref={priceFixInputRef}
              type="text"
              inputMode="decimal"
              value={priceFixValue}
              onChange={(e) => setPriceFixValue(e.target.value)}
              className={`w-full px-3 py-2.5 text-sm tabular-nums ${KASSA_POS_FIELD}`}
              placeholder="0,00"
            />
            <button
              type="button"
              disabled={priceFixSaving}
              onClick={() => void savePriceFix()}
              className={`w-full py-3 font-bold ${kassaPosButtonClass(true)}`}
            >
              {priceFixSaving ? t('retailKassaPage.paying') : t('retailKassaPage.priceFixSave')}
            </button>
          </div>
        </div>
      ) : null}

      {showPayModal && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 p-4">
          <div
            className={`w-full max-w-sm space-y-4 p-5 ${KASSA_POS_BTN_SHAPE} ${KASSA_POS_MENU_PLATE_SHELL_BG_CLASS} border ${KASSA_POS_RULE_BLACK}`}
          >
            <p className="text-center text-lg font-bold text-white">{t('kassaApp.checkout')}</p>
            <p className="text-center text-2xl font-bold tabular-nums text-red-500">€{total.toFixed(2)}</p>
            <button
              type="button"
              disabled={paying}
              onClick={() => void payCash()}
              className={`w-full py-3 ${KASSA_POS_CHECKOUT_BTN}`}
            >
              {paying ? t('retailKassaPage.paying') : t('retailKassaPage.payCash')}
            </button>
            <button
              type="button"
              onClick={() => setShowPayModal(false)}
              className={`w-full py-2.5 ${kassaPosButtonClass(false)}`}
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      <div className={`flex min-h-0 flex-1 flex-col overflow-hidden ${ui.shellBg}`}>
        <div
          className={`relative z-30 flex min-h-[56px] w-full min-w-0 shrink-0 items-center gap-1.5 px-2 py-2 sm:gap-2 sm:px-3 pb-3 ${KASSA_POS_MENU_PLATE_SHELL_BG_CLASS}`}
        >
          {(hamburgerOpen || quickMenuPanelOpen) && (
            <div
              className="fixed inset-0 z-10"
              onClick={() => {
                setHamburgerOpen(false)
                setHamburgerSubOpen(null)
                setQuickMenuPanelOpen(false)
              }}
            />
          )}

          <div className="relative z-20 flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setHamburgerOpen(!hamburgerOpen)
                setHamburgerSubOpen(null)
              }}
              className={`flex items-center gap-1.5 px-2 py-1.5 transition-colors sm:gap-2 sm:px-3 ${kassaPosButtonClass(true)}`}
              title={t('kassaApp.hamburgerMenu')}
              aria-expanded={hamburgerOpen}
            >
              <svg className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span className="font-bold text-[11px] leading-tight sm:text-xs">{t('kassaApp.hamburgerMenu')}</span>
            </button>
            {hamburgerOpen && (() => {
              const modules = filteredHamburgerModules
              const activeMod = modules.find((m) => m.rowKey === hamburgerSubOpen)
              return (
                <div className="absolute top-full left-0 mt-1 flex z-30">
                  <div className={`${ui.flyMenuPanel} overflow-y-auto`} style={{ width: 240, maxHeight: '85vh' }}>
                    <div
                      className={`sticky top-0 rounded-t-2xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white ${KASSA_POS_MENU_PLATE_SHELL_BG_CLASS}`}
                    >
                      {t('adminLayout.menu')}
                    </div>
                    <Link
                      href={baseUrl}
                      prefetch={false}
                      onClick={() => {
                        setHamburgerOpen(false)
                        setHamburgerSubOpen(null)
                      }}
                      className={`flex items-center border-b ${ui.flyMenuDivider} px-4 py-3 text-sm font-semibold ${ui.flyMenuText} transition-colors ${ui.flyMenuRowHover}`}
                    >
                      <span>{t('adminLayout.overview')}</span>
                    </Link>
                    {modules.map((mod) => (
                      <div key={mod.rowKey} className={`border-b ${ui.flyMenuDivider} last:border-0`}>
                        <button
                          type="button"
                          onClick={() =>
                            setHamburgerSubOpen(hamburgerSubOpen === mod.rowKey ? null : mod.rowKey)
                          }
                          className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${hamburgerSubOpen === mod.rowKey ? ui.flyMenuRowActive : ui.flyMenuRowHover}`}
                        >
                          <span className={`font-semibold text-sm ${ui.flyMenuTextMuted}`}>
                            {mod.labelKey ? t(mod.labelKey) : mod.label}
                          </span>
                          <svg className={`w-4 h-4 ${ui.flyMenuChevron}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                  {activeMod && (
                    <div className={`ml-2 overflow-y-auto self-start ${ui.flyMenuPanel}`} style={{ width: 220, maxHeight: '85vh' }}>
                      <div
                        className={`sticky top-0 rounded-t-2xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white ${KASSA_POS_MENU_PLATE_SHELL_BG_CLASS}`}
                      >
                        {activeMod.labelKey ? t(activeMod.labelKey) : activeMod.label}
                      </div>
                      {activeMod.items.map((item) => (
                        <Link
                          key={item.id}
                          href={item.href}
                          prefetch={item.href === baseUrl ? false : undefined}
                          onClick={() => {
                            setHamburgerOpen(false)
                            setHamburgerSubOpen(null)
                          }}
                          className={`flex items-center px-4 py-3 ${ui.flyMenuRowHover} border-b ${ui.flyMenuDivider} text-sm ${ui.flyMenuTextMuted} transition-colors`}
                        >
                          <span>{item.labelKey ? t(item.labelKey) : item.label}</span>
                        </Link>
                      ))}
                      {activeMod.rowKey === 'account' && (
                        <AccountMenuSessionBlock
                          tenantSlug={tenant}
                          onClose={() => {
                            setHamburgerOpen(false)
                            setHamburgerSubOpen(null)
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>
              )
            })()}
          </div>

          <div className="flex min-w-0 flex-1 items-center justify-center px-2">
            <span className="truncate text-center text-sm font-bold tracking-tight text-white sm:text-base md:text-lg">
              {businessTitle}
            </span>
          </div>

          <div ref={langRef} className="relative z-[40] shrink-0">
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={langOpen}
              aria-label={`${t('nav.language')}: ${localeNames[locale]}`}
              onClick={() => setLangOpen((o) => !o)}
              className={headerUtilityBtnClass(langOpen)}
            >
              <LocaleFlagEmoji locale={locale} variant="inline" className="text-sm text-white sm:text-[15px]" />
              <svg
                className={`size-4 shrink-0 transition-transform ${langOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {langOpen && (
              <div className={ui.langPanel}>
                {locales.map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => {
                      setLocale(lang)
                      setLangOpen(false)
                    }}
                    className={`flex w-full items-center gap-2 px-4 py-2.5 text-sm transition-colors ${ui.langRowHover} ${locale === lang ? ui.langRowActive : ui.langRowInactive}`}
                  >
                    <LocaleFlagEmoji locale={lang} />
                    <span>{localeNames[lang]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setLogoutSoftwareConfirmOpen(true)}
            title={t('kassaApp.logout')}
            className={`relative z-20 ${headerUtilityBtnClass(true)}`}
          >
            <span className={KASSA_HEADER_QUICK_LINK_LABEL}>{t('kassaApp.logout')}</span>
          </button>
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden w-full">
          <div className={`relative flex min-h-0 flex-1 flex-col overflow-hidden ${KASSA_POS_MENU_PLATE_SHELL_BG_CLASS}`}>
            <div className="shrink-0 flex gap-2 px-3 pt-2 sm:px-4">
              <button
                type="button"
                data-testid="retail-mode-sales"
                aria-pressed={mode === 'sales'}
                onClick={() => switchMode('sales')}
                className={`min-h-[2.75rem] flex-1 px-2 ${kassaPosButtonClass(mode === 'sales')}`}
              >
                <span className={`block text-center ${kassaSidebarActionLabelClass}`}>
                  {t('retailKassaPage.modeSales')}
                </span>
              </button>
              <button
                type="button"
                data-testid="retail-mode-stock-count"
                aria-pressed={mode === 'stockCount'}
                onClick={() => switchMode('stockCount')}
                className={`min-h-[2.75rem] flex-1 px-2 ${kassaPosButtonClass(mode === 'stockCount')}`}
              >
                <span className={`block text-center ${kassaSidebarActionLabelClass}`}>
                  {t('retailKassaPage.modeStockCount')}
                </span>
              </button>
              <button
                type="button"
                data-testid="retail-mode-goods-receipt"
                aria-pressed={mode === 'goodsReceipt'}
                onClick={() => switchMode('goodsReceipt')}
                className={`min-h-[2.75rem] flex-1 px-2 ${kassaPosButtonClass(mode === 'goodsReceipt')}`}
              >
                <span className={`block text-center text-[11px] sm:text-sm font-medium leading-tight`}>
                  {t('retailKassaPage.modeGoodsReceipt')}
                </span>
              </button>
            </div>
            <input
              ref={barcodeCaptureRef}
              type="text"
              tabIndex={-1}
              autoComplete="off"
              data-kassa-no-web-keyboard
              aria-hidden
              onKeyDown={onBarcodeWedgeKeyDown}
              className="pointer-events-none fixed left-0 top-0 h-px w-px opacity-0 overflow-hidden"
            />
            <form
              onSubmit={onScanSubmit}
              className="shrink-0 flex gap-2 px-3 pt-2 pb-1.5 sm:px-4"
            >
              <input
                ref={scanRef}
                type="text"
                inputMode={articleSearchActive ? 'search' : 'none'}
                autoComplete="off"
                readOnly={!articleSearchActive}
                data-retail-article-search
                {...(articleSearchActive ? {} : { 'data-kassa-no-web-keyboard': true })}
                placeholder={t('retailKassaPage.scanPlaceholder')}
                value={scanValue}
                onChange={(e) => setScanValue(e.target.value)}
                onPointerDown={() => {
                  if (!articleSearchActive) openArticleSearchKeyboard()
                }}
                onFocus={(e) => {
                  if (!articleSearchActiveRef.current) {
                    applyArticleSearchDomInactive(e.currentTarget)
                    e.currentTarget.blur()
                    focusBarcodeCapture()
                  }
                }}
                onBlur={() => {
                  window.setTimeout(() => {
                    const active = document.activeElement
                    if (active === scanRef.current) return
                    if (active instanceof HTMLElement && active.closest('[data-web-touch-keyboard-panel]')) return
                    if (!articleSearchActiveRef.current) return
                    closeArticleSearchKeyboard()
                  }, 120)
                }}
                className={`flex-1 rounded-full px-5 py-2.5 text-base text-[#f0f0f0] placeholder:text-white/45 focus:outline-none ${KASSA_POS_FIELD}`}
              />
              <button type="submit" className={`shrink-0 px-5 py-2.5 font-bold ${kassaPosButtonClass(true)}`}>
                {t('retailKassaPage.add')}
              </button>
            </form>

            <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 pt-0.5 sm:px-4">
              <div
                className={`flex min-h-0 flex-1 flex-col overflow-hidden justify-center ${KASSA_POS_MENU_RECESS_TRAY_CLASS} ${KASSA_POS_BTN_SHAPE} gks-menu-vignette`}
              >
                {loading && !barHasLines ? (
                  <p className={`px-4 text-center text-sm ${ui.menuEmptyMuted}`}>{t('retailKassaPage.loading')}</p>
                ) : !barHasLines ? (
                  <p className={`px-6 text-center text-base font-medium sm:text-lg ${ui.menuEmptyMuted}`}>
                    {t(modeHintKey)}
                  </p>
                ) : (
                  <div
                    ref={scanBarRef}
                    data-testid="retail-kassa-scan-bar"
                    className="flex w-full min-h-[9.5rem] max-h-[42vh] flex-row items-stretch gap-3 overflow-x-auto overflow-y-hidden overscroll-x-contain px-4 py-5 touch-manipulation [scrollbar-gutter:stable]"
                  >
                    {mode === 'sales'
                      ? cart.map((l) => {
                          const p = l.sku
                          return (
                            <div
                              key={p.lineKey}
                              className={`${KASSA_POS_MENU_TILE_BUTTON_BASE} shrink-0 w-[11.5rem] sm:w-[12.5rem] min-h-[8.5rem] pointer-events-none`}
                            >
                              <div className="shrink-0 w-full border-b border-[#45454a]/80 bg-[linear-gradient(180deg,#343438_0%,#2a2a2e_100%)] px-2 py-2 sm:px-3">
                                <p className={`${KASSA_POS_MENU_TILE_LABEL_CLASS} line-clamp-2 text-left`}>{p.name}</p>
                                {l.quantity > 1 ? (
                                  <p className="mt-0.5 text-left text-[11px] font-bold text-[#5a9fd4]">× {l.quantity}</p>
                                ) : null}
                              </div>
                              <div className="flex-1 p-2 sm:p-2.5 text-[10px] sm:text-[11px] text-[#d8d8dc] grid grid-cols-2 gap-x-2 gap-y-1 content-start">
                                <span>
                                  {t('retailKassaPage.price')}: €{p.price.toFixed(2)}
                                </span>
                                <span>
                                  {t('retailKassaPage.article')}: {p.article_number || p.barcode || '—'}
                                </span>
                                <span>
                                  {t('retailKassaPage.size')}: {p.size_label || '—'}
                                </span>
                                <span>
                                  {t('retailKassaPage.color')}: {p.color_label || '—'}
                                </span>
                                <span className="col-span-2">
                                  {t('retailKassaPage.stock')}:{' '}
                                  {p.track_stock ? p.stock_quantity : t('retailKassaPage.stockNotTracked')}
                                </span>
                              </div>
                            </div>
                          )
                        })
                      : stockActivity.map((row) => {
                          const p = row.sku
                          return (
                            <div
                              key={row.key}
                              className={`${KASSA_POS_MENU_TILE_BUTTON_BASE} shrink-0 w-[11.5rem] sm:w-[12.5rem] min-h-[8.5rem] pointer-events-none`}
                            >
                              <div className="shrink-0 w-full border-b border-[#45454a]/80 bg-[linear-gradient(180deg,#343438_0%,#2a2a2e_100%)] px-2 py-2 sm:px-3">
                                <p className={`${KASSA_POS_MENU_TILE_LABEL_CLASS} line-clamp-2 text-left`}>{p.name}</p>
                                <p className="mt-0.5 text-left text-[11px] font-bold text-emerald-300/90">
                                  {row.mode === 'goodsReceipt'
                                    ? t('retailKassaPage.stockAdded').replace('{n}', String(row.delta))
                                    : t('retailKassaPage.stockPlusOne')}
                                </p>
                              </div>
                              <div className="flex-1 p-2 sm:p-2.5 text-[10px] sm:text-[11px] text-[#d8d8dc] grid grid-cols-2 gap-x-2 gap-y-1 content-start">
                                <span>
                                  {t('retailKassaPage.article')}: {p.article_number || p.barcode || '—'}
                                </span>
                                <span>
                                  {t('retailKassaPage.size')}: {p.size_label || '—'}
                                </span>
                                <span>
                                  {t('retailKassaPage.color')}: {p.color_label || '—'}
                                </span>
                                <span className="col-span-2">
                                  {t('retailKassaPage.stockNow')}: {p.stock_quantity}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                  </div>
                )}
              </div>
            </div>

            {quickMenuPanelOpen ? (
              <div
                className="pointer-events-auto absolute inset-x-0 bottom-0 z-[60] px-3 pb-3 pt-6"
                style={{
                  background: 'linear-gradient(to top, rgba(12,12,12,0.97) 72%, transparent)',
                }}
              >
                <div className="grid w-full grid-cols-4 gap-2 sm:grid-cols-8">
                  {RETAIL_QUICK_MENU_ACTIONS.map((action) => {
                    const enabled = quickMenuAllowedSubmenuIds.has(action.submenuId)
                    const label = t(action.labelKey)
                    if (!enabled) {
                      return (
                        <button
                          key={action.key}
                          type="button"
                          disabled
                          className={kassaPosQuickMenuPanelButtonClass()}
                        >
                          {label}
                        </button>
                      )
                    }
                    return (
                      <Link
                        key={action.key}
                        href={`${baseUrl}${action.hrefSuffix}`}
                        prefetch={false}
                        className={kassaPosQuickMenuPanelButtonClass()}
                        onClick={() => {
                          playClick()
                          setQuickMenuPanelOpen(false)
                        }}
                      >
                        {label}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </div>

          <div
            className={`w-80 sm:w-96 lg:w-[380px] flex min-h-0 min-w-0 flex-shrink-0 flex-col overflow-hidden border-l ${KASSA_POS_RULE_BLACK} ${KASSA_POS_MENU_PLATE_SHELL_BG_CLASS}`}
          >
            <div className="min-h-0 flex-1 flex flex-col px-2.5 pt-3 pb-2 sm:px-3">
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-y-contain py-0.5">
                {mode !== 'sales' ? (
                  stockActivity.length === 0 ? (
                    <p className="px-2 py-8 text-center text-sm text-white/50">{t(modeHintKey)}</p>
                  ) : (
                    stockActivity
                      .slice()
                      .reverse()
                      .map((row) => (
                        <div key={row.key} className={KASSA_POS_CART_ROW}>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-[#f2f2f2]">{row.sku.name}</p>
                            <p className="text-xs text-white/70">
                              {row.mode === 'goodsReceipt'
                                ? t('retailKassaPage.stockAdded').replace('{n}', String(row.delta))
                                : t('retailKassaPage.stockPlusOne')}{' '}
                              · {t('retailKassaPage.stockNow')}: {row.sku.stock_quantity}
                            </p>
                          </div>
                        </div>
                      ))
                  )
                ) : cart.length === 0 ? (
                  <p className="px-2 py-8 text-center text-sm text-white/50">{t('retailKassaPage.cartEmpty')}</p>
                ) : (
                  cart.map((l) => (
                    <div key={l.sku.lineKey} className={KASSA_POS_CART_ROW}>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#f2f2f2]">{l.sku.name}</p>
                        <p className="text-xs tabular-nums text-white/70">
                          €{l.sku.price.toFixed(2)} × {l.quantity}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => updateQty(l.sku.lineKey, l.quantity - 1)}
                          className={kassaPosCartQtyButtonClass(true)}
                          aria-label={t('kassaApp.ariaDecreaseQty')}
                        >
                          {l.quantity === 1 ? '🗑' : '−'}
                        </button>
                        <span className="w-6 text-center text-sm font-bold text-[#f0f0f0]">{l.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQty(l.sku.lineKey, l.quantity + 1)}
                          className={kassaPosCartQtyButtonClass(true)}
                          aria-label={t('kassaApp.ariaIncreaseQty')}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {lastOrder != null && (
                <p className="shrink-0 text-center text-xs text-emerald-300/90 py-1">
                  {t('retailKassaPage.lastOrder').replace('{n}', String(lastOrder))}
                </p>
              )}
            </div>

            <div
              className={`sticky bottom-0 z-10 shrink-0 border-t ${KASSA_POS_RULE_BLACK} ${KASSA_POS_MENU_PLATE_SHELL_BG_CLASS} px-3 py-2.5 space-y-2.5`}
            >
              <div className="flex w-full touch-manipulation select-none gap-3">
                <button
                  type="button"
                  aria-pressed={quickMenuPanelOpen}
                  onClick={() => {
                    playClick()
                    setQuickMenuPanelOpen((v) => !v)
                  }}
                  className={`flex items-center justify-center px-3 ${KASSA_SIDEBAR_FOOTER_LEFT_COL} ${kassaPosButtonClass(quickMenuPanelOpen)}`}
                  title={t('kassaApp.quickMenu')}
                >
                  <span className={`leading-tight ${kassaSidebarActionLabelClass}`}>{t('kassaApp.quickMenu')}</span>
                </button>
                <div
                  role="status"
                  aria-live="polite"
                  className={`flex min-w-0 flex-1 items-center justify-between gap-2 px-2.5 ${kassaPosRaisedStripClass()}`}
                >
                  <span className={`shrink-0 text-base font-bold tracking-[0.04em] sm:text-lg ${ui.numpadMeta}`}>
                    {mode === 'sales' ? t('kassaApp.cartTotal') : t('retailKassaPage.stockScans')}
                  </span>
                  <span
                    className={`min-w-0 truncate text-right font-bold tabular-nums tracking-tight text-2xl sm:text-[1.65rem] ${
                      mode === 'sales' ? 'text-red-500' : 'text-emerald-300'
                    }`}
                  >
                    {mode === 'sales'
                      ? `€${total.toFixed(2)}`
                      : String(stockActivity.reduce((s, r) => s + r.delta, 0))}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 touch-manipulation select-none gap-3">
                {mode === 'sales' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => void openCashDrawer()}
                      className={`flex items-center justify-center px-1 min-h-[2.5rem] ${kassaPosButtonClass(false)}`}
                      title={t('kassaApp.drawerOpen')}
                    >
                      <span className={kassaSidebarActionLabelClass}>{t('kassaApp.drawerOpen')}</span>
                    </button>
                    <button
                      type="button"
                      disabled
                      className={`flex items-center justify-center px-1 min-h-[2.5rem] ${kassaPosButtonClass(false)}`}
                      title={t('kassaApp.cartBonTitle')}
                    >
                      <span className={kassaSidebarActionLabelClass}>{t('kassaApp.cartBon')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={clearCart}
                      disabled={cart.length === 0}
                      className={`flex items-center justify-center px-1 min-h-[2.5rem] ${kassaPosButtonClass(false)}`}
                      title={t('kassaApp.remove')}
                    >
                      <span className={kassaSidebarActionLabelClass}>{t('kassaApp.remove')}</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={clearStockActivity}
                    disabled={stockActivity.length === 0}
                    className={`col-span-3 flex items-center justify-center px-1 min-h-[2.5rem] ${kassaPosButtonClass(false)}`}
                    title={t('kassaApp.remove')}
                  >
                    <span className={kassaSidebarActionLabelClass}>{t('retailKassaPage.clearStockLog')}</span>
                  </button>
                )}
              </div>
              <div className="flex touch-manipulation select-none gap-2.5">
                <button
                  type="button"
                  onClick={() => openArticleSearchKeyboard()}
                  className={`flex items-center justify-center px-3 min-h-[3.5rem] py-3 ${KASSA_SIDEBAR_FOOTER_LEFT_COL} ${kassaPosButtonClass(false)}`}
                  title={t('retailKassaPage.scanPlaceholder')}
                >
                  <span className={kassaSidebarActionLabelClass}>{t('kassaApp.numpadToggle')}</span>
                </button>
                {mode === 'sales' ? (
                  <button
                    type="button"
                    data-testid="retail-kassa-checkout"
                    onClick={() => {
                      if (cart.length === 0) return
                      playClick()
                      setShowPayModal(true)
                    }}
                    disabled={cart.length === 0}
                    className={`flex min-w-0 flex-1 items-center justify-center min-h-[3.5rem] py-3 text-lg ${KASSA_POS_CHECKOUT_BTN}`}
                  >
                    {t('kassaApp.checkout')}
                  </button>
                ) : (
                  <div
                    className={`flex min-w-0 flex-1 items-center justify-center min-h-[3.5rem] py-3 text-sm font-semibold text-white/80 ${kassaPosRaisedStripClass()}`}
                  >
                    {stockBusy ? t('retailKassaPage.paying') : t('retailKassaPage.stockAutoSave')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
