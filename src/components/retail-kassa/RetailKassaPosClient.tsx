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
import { createKassaRegisterUiTheme } from '@/lib/kassa-register-ui-theme'
import {
  KASSA_UI_APPEARANCE_TOGGLE_ENABLED,
  useKassaUiDarkSync,
} from '@/lib/kassa-register-ui-dark-preference'
import { kassaProductImageRetryOnError } from '@/lib/kassa-img-retry'
import {
  KASSA_POS_CHECKOUT_BTN,
  KASSA_POS_FIELD,
  KASSA_POS_MENU_PLATE_SHELL_BG_CLASS,
  KASSA_POS_MENU_RECESS_TRAY_CLASS,
  KASSA_POS_RULE_BLACK,
  KASSA_POS_BTN_SHAPE,
  KASSA_SIDEBAR_FOOTER_LEFT_COL,
  kassaPosButtonClass,
  kassaPosCartQtyButtonClass,
  kassaPosQuickMenuPanelButtonClass,
  kassaPosRaisedStripClass,
  KASSA_NUMPAD_PANEL_SLIDE_MOTION,
} from '@/lib/kassa-pos-surface'

const RETAIL_NUMPAD_KEYS = ['7', '8', '9', '+', '4', '5', '6', '-', '1', '2', '3', '×', 'C', '0', '.', '='] as const
import type { KassaPayOption } from '@/components/kassa/KassaPaymentModal'
import { KassaPaymentModal } from '@/components/kassa/KassaPaymentModal'
import { KassaSplitPaymentModal } from '@/components/kassa/KassaSplitPaymentModal'
import { KassaSuccessReceiptModal } from '@/components/kassa/KassaSuccessReceiptModal'
import { KassaAnalogClock } from '@/components/kassa/KassaAnalogClock'
import { KassaStaffClockModal } from '@/components/kassa/KassaStaffClockUi'
import type { KassaLastOrderReceipt, KassaPaymentMethod } from '@/lib/kassa-cart-types'
import {
  buildRetailLastOrderReceipt,
  printRetailKassaReceipt,
  tryBrowserPrintFallback,
  type RetailReceiptI18n,
} from '@/lib/retail-kassa-receipt'
import {
  applyRetailGoodsReceipt,
  applyRetailStockScanIncrement,
  completeRetailSale,
  createRetailSkuFromScan,
  fetchRetailPosSkus,
  importRetailProductsBatch,
  updateRetailSkuPrice,
  parseRetailScanPayload,
  resolveRetailSkuForGoodsReceipt,
  resolveRetailSkuLookup,
  searchRetailSkus,
  retailSkuInStock,
  type RetailCartLine,
  type RetailPosSku,
} from '@/lib/retail-kassa-pos'
import { patchSkuInList } from '@/lib/retail-pos-catalog'
import {
  parseRetailCsvText,
  parseRetailExcelBuffer,
  type RetailImportRow,
} from '@/lib/retail-product-import'

type RetailKassaMode = 'sales' |  'stockCount' |  'goodsReceipt' |  'exchangeCredit'

type StockActivityLine = {
  key: string
  sku: RetailPosSku
  delta: number
  mode: 'stockCount' |  'goodsReceipt'
}
import { LocaleFlagEmoji } from '@/components/LocaleFlagEmoji'
import { AccountMenuSessionBlock } from '@/components/AccountMenuSessionBlock'
import { LogoutSoftwareConfirmModal } from '@/components/LogoutSoftwareConfirmModal'
import { authFetch, buildShopInternalReturnPath } from '@/lib/auth-headers'
import { isRetailLoyaltyCardScan } from '@/lib/retail-loyalty/card-code'
import { isRetailStoreCreditScan } from '@/lib/retail-store-credit/code'
import type { RetailOrderLineForReturn, RetailStoreCreditPos } from '@/lib/retail-store-credit/types'
import {
  printRetailStoreCreditVoucher,
  tryBrowserPrintStoreCreditFallback,
  type StoreCreditVoucherPrintLabels,
} from '@/lib/retail-store-credit/print-voucher'
import type { RetailLoyaltyMemberPos, RetailLoyaltySettings } from '@/lib/retail-loyalty/types'
import {
  computeRetailLoyaltyRedeemEuroDiscount,
  maxRetailLoyaltyRedeemPoints,
} from '@/lib/retail-loyalty/redeem-math'
import {
  attemptCloseThenOrNavigate,
  applyOwnerOnlyLogoutCleanup,
  broadcastTenantOwnerLogout,
  setTerminalLogout,
} from '@/lib/session-broadcast'
import { appendKassaCloseTipToAbsoluteLoginUrl } from '@/lib/shop-login-kassa-tip'
import { isAndroidTabletPrintClient, openCashDrawer } from '@/lib/vysion-print-agent-client'
import { playClick } from '@/lib/sounds'
import {
  KassaSoundActivationScreen,
  useKassaSoundActivationGate,
} from '@/components/kassa/KassaSoundActivationGate'
import { retailCustomerInvoiceFromLoyaltyMember } from '@/lib/retail-kassa/customer-invoice-receipt'
import { useKassaStaffClockPos } from '@/lib/use-kassa-staff-clock-pos'

const KASSA_HEADER_QUICK_LINK_LABEL = 'text-[11px] leading-snug sm:text-xs'

const RETAIL_TRAY_TILE_SIZE_CLASS = 'size-[4cm]'

type RetailGrayTrayTile =
  | { key: string; kind: 'logout'; labelKey: string; submenuIds: string[] }
  | { key: string; kind: 'link'; hrefSuffix: string; labelKey: string; submenuIds: string[] }
  | { key: string; kind: 'loyaltyNoCard'; labelKey: string }
  | { key: string; kind: 'exchangeCredit'; labelKey: string }

const RETAIL_GRAY_TRAY_TILES: RetailGrayTrayTile[] = [
  {
    key: 'logout',
    kind: 'logout',
    labelKey: 'retailKassaPage.trayTileLogout',
    submenuIds: [],
  },
  {
    key: 'addProduct',
    kind: 'link',
    hrefSuffix: '/producten?mode=retail',
    labelKey: 'retailKassaPage.trayTileAddProduct',
    submenuIds: ['sm_kassa_producten', 'sm_retail_kassa_producten'],
  },
  {
    key: 'phoneIntake',
    kind: 'link',
    hrefSuffix: '/producten/intake',
    labelKey: 'retailKassaPage.trayTilePhoneIntake',
    submenuIds: ['sm_retail_product_intake', 'sm_retail_kassa_producten'],
  },
  {
    key: 'salesOverview',
    kind: 'link',
    hrefSuffix: '/verkoop',
    labelKey: 'retailKassaPage.trayTileSalesOverview',
    submenuIds: ['sm_rpt_verkoop'],
  },
  {
    key: 'clock',
    kind: 'link',
    hrefSuffix: '/inklokken',
    labelKey: 'retailKassaPage.trayTileClockInOut',
    submenuIds: ['sm_personeel_inuitklokken'],
  },
  {
    key: 'staff',
    kind: 'link',
    hrefSuffix: '/personeel',
    labelKey: 'retailKassaPage.trayTileStaff',
    submenuIds: ['sm_personeel_team'],
  },
  {
    key: 'loyaltyNoCard',
    kind: 'loyaltyNoCard',
    labelKey: 'retailKassaPage.trayTileLoyaltyNoCard',
  },
  {
    key: 'loyaltyAdmin',
    kind: 'link',
    hrefSuffix: '/retail-loyalty',
    labelKey: 'retailKassaPage.trayTileLoyaltyAdmin',
    submenuIds: ['sm_retail_loyalty'],
  },
  {
    key: 'exchangeCredit',
    kind: 'exchangeCredit',
    labelKey: 'retailKassaPage.trayTileExchangeCredit',
  },
]

export function RetailKassaPosClient({ tenant }: { tenant: string }) {
  const baseUrl = `/shop/${tenant}/admin`
  const { t, locale, setLocale, locales, localeNames } = useLanguage()
  const { dark: appearanceDark, toggle: toggleKassaAppearance } = useKassaUiDarkSync(tenant)
  const ui = useMemo(
    () =>
      appearanceDark
        ? createKassaPosRegisterUiTheme(true)
        : createKassaRegisterUiTheme(false),
    [appearanceDark],
  )

  const { soundActivated, activateSound } = useKassaSoundActivationGate(tenant)

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
  const cartScrollRef = useRef<HTMLDivElement>(null)
  const listScrollTargetRef = useRef<string | null>(null)
  const [listScrollTick, setListScrollTick] = useState(0)
  const langRef = useRef<HTMLDivElement>(null)

  const [tenantInfo, setTenantInfo] = useState<TenantSettings | null>(null)
  const staffClockEnabled = !!tenantInfo?.kassa_staff_clock_enabled
  const staffClockErrorText = useCallback(
    (code: string) => {
      const key = `staffClock.errors.${code}`
      const msg = t(key)
      return msg === key ? t('staffClock.errors.unknown') : msg
    },
    [t],
  )
  const {
    activeKassaStaff,
    clockedInStaff,
    showKassaStaffClockButton,
    blockSaleWithoutStaffIfNeeded,
    openStaffClockModal,
    startStaffSales,
    selectActiveKassaStaff,
    staffClockOpen,
    setStaffClockOpen,
    staffClockList,
    staffClockListLoading,
    staffClockBusy,
    staffClockPinModal,
    setStaffClockPinModal,
    staffClockPinInput,
    setStaffClockPinInput,
    staffClockPinError,
    setStaffClockPinError,
    staffClockPinReqGen,
    setStaffClockBusy,
    submitStaffClockPin,
  } = useKassaStaffClockPos({
    tenant,
    staffClockEnabled,
    staffClockErrorText,
    t,
  })
  const [skus, setSkus] = useState<RetailPosSku[]>([])
  const [loading, setLoading] = useState(true)
  const [scanValue, setScanValue] = useState('')
  const [cart, setCart] = useState<RetailCartLine[]>([])
  const [paying, setPaying] = useState(false)
  const [lastOrderReceipt, setLastOrderReceipt] = useState<KassaLastOrderReceipt | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successReceiptPrintBusy, setSuccessReceiptPrintBusy] = useState(false)
  const [lastSaleCustomerEmail, setLastSaleCustomerEmail] = useState<string | null>(null)
  const [draftBonPrinting, setDraftBonPrinting] = useState(false)
  const [printAgentFallbackHtml, setPrintAgentFallbackHtml] = useState<string | null>(null)
  const [thermalPrintBanner, setThermalPrintBanner] = useState<string | null>(null)
  const [hamburgerOpen, setHamburgerOpen] = useState(false)
  const [hamburgerSubOpen, setHamburgerSubOpen] = useState<string | null>(null)
  const [langOpen, setLangOpen] = useState(false)
  const [logoutSoftwareConfirmOpen, setLogoutSoftwareConfirmOpen] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showSplitModal, setShowSplitModal] = useState(false)
  const [splitCash, setSplitCash] = useState(0)
  const [splitCard, setSplitCard] = useState(0)
  const [mode, setMode] = useState<RetailKassaMode>('sales')
  const [stockActivity, setStockActivity] = useState<StockActivityLine[]>([])
  const [stockBusy, setStockBusy] = useState(false)
  /** Schermtoetsenbord alleen na expliciete tik op «Artikel zoeken». */
  const [articleSearchActive, setArticleSearchActive] = useState(false)
  /** Treffers na «Zoeken» — popup; na keuze in mand + grote lijst. */
  const [articleSearchResults, setArticleSearchResults] = useState<RetailPosSku[]>([])
  const [articleSearchModalOpen, setArticleSearchModalOpen] = useState(false)
  const [priceFixSku, setPriceFixSku] = useState<RetailPosSku | null>(null)
  const [priceFixName, setPriceFixName] = useState('')
  const [priceFixValue, setPriceFixValue] = useState('')
  const [priceFixSaving, setPriceFixSaving] = useState(false)
  const [lastScannedSku, setLastScannedSku] = useState<RetailPosSku | null>(null)
  const [selectedListLineKey, setSelectedListLineKey] = useState<string | null>(null)
  const priceFixNameInputRef = useRef<HTMLInputElement>(null)
  const priceFixInputRef = useRef<HTMLInputElement>(null)
  const skusRef = useRef<RetailPosSku[]>([])
  const stockBusyRef = useRef(false)
  const csvImportInputRef = useRef<HTMLInputElement>(null)
  const excelImportInputRef = useRef<HTMLInputElement>(null)
  const [importPreview, setImportPreview] = useState<RetailImportRow[]>([])
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importBusy, setImportBusy] = useState(false)
  const [importHighlight, setImportHighlight] = useState<'csv' |  'excel'| null>(null)
  const [numpadPanelVisible, setNumpadPanelVisible] = useState(false)
  const [numpadValue, setNumpadValue] = useState('')
  const [addOkFlash, setAddOkFlash] = useState(false)
  const addOkFlashTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(true)
  const [loyaltySettings, setLoyaltySettings] = useState<Pick<
    RetailLoyaltySettings,
    'redeem_enabled' |  'redeem_points_per_euro'
  >>({
    redeem_enabled: true,
    redeem_points_per_euro: 100,
  })
  const [linkedLoyaltyMember, setLinkedLoyaltyMember] = useState<RetailLoyaltyMemberPos | null>(
    null,
  )
  const [loyaltyRedeemPoints, setLoyaltyRedeemPoints] = useState(0)
  const [loyaltyRedeemModalOpen, setLoyaltyRedeemModalOpen] = useState(false)
  const [loyaltyRedeemDraft, setLoyaltyRedeemDraft] = useState('')
  const [linkedStoreCredit, setLinkedStoreCredit] = useState<RetailStoreCreditPos | null>(null)
  const [exchangeOrderNumberDraft, setExchangeOrderNumberDraft] = useState('')
  const [exchangeOrderLines, setExchangeOrderLines] = useState<RetailOrderLineForReturn[] | null>(
    null,
  )
  const [exchangeReturnQty, setExchangeReturnQty] = useState<Record<string, number>>({})
  const [exchangeLookupBusy, setExchangeLookupBusy] = useState(false)
  const [exchangeIssueBusy, setExchangeIssueBusy] = useState(false)

  const reload = useCallback(async (options?: { fresh?: boolean }) => {
    if (skusRef.current.length === 0 || options?.fresh) setLoading(true)
    const list = await fetchRetailPosSkus(tenant, options?.fresh ? { fresh: true } : undefined)
    setSkus(list)
    skusRef.current = list
    setLoading(false)
  }, [tenant])

  useEffect(() => {
    skusRef.current = skus
  }, [skus])

  useEffect(() => {
    return () => {
      for (const id of addOkFlashTimersRef.current) clearTimeout(id)
      addOkFlashTimersRef.current = []
    }
  }, [])

  useEffect(() => {
    void reload()
    void getTenantSettings(tenant).then(setTenantInfo)
    void authFetch(`/api/retail/loyalty/settings?tenant=${encodeURIComponent(tenant)}`)
      .then((r) => r.json())
      .then(
        (j: {
          ok?: boolean
          settings?: Partial<RetailLoyaltySettings>
        }) => {
          if (j.ok && j.settings) {
            setLoyaltyEnabled(!!j.settings.enabled)
            setLoyaltySettings({
              redeem_enabled: j.settings.redeem_enabled !== false,
              redeem_points_per_euro: Number(j.settings.redeem_points_per_euro) || 100,
            })
          }
        },
      )
      .catch(() => {})
  }, [reload, tenant])

  useEffect(() => {
    if (mode === 'sales' && cart.length > 0) setNumpadPanelVisible(false)
  }, [cart.length, mode])

  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    html.classList.add('vysion-kassa-root')
    body.classList.add('vysion-kassa-root')
    if (appearanceDark) html.classList.add('kassa-dark-appearance')
    else html.classList.remove('kassa-dark-appearance')
    return () => {
      html.classList.remove('kassa-dark-appearance', 'vysion-kassa-root')
      body.classList.remove('vysion-kassa-root')
    }
  }, [appearanceDark])

  const focusBarcodeCapture = useCallback(() => {
    if (priceFixNameInputRef.current && document.activeElement === priceFixNameInputRef.current) return
    if (priceFixInputRef.current && document.activeElement === priceFixInputRef.current) return
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

  const releaseScanFocus = useCallback(() => {
    setScanValue('')
    if (barcodeCaptureRef.current) barcodeCaptureRef.current.value = ''
    if (articleSearchActiveRef.current) {
      closeArticleSearchKeyboard()
    } else {
      requestAnimationFrame(() => focusBarcodeCapture())
    }
  }, [closeArticleSearchKeyboard, focusBarcodeCapture])

  const openArticleSearchKeyboard = useCallback(() => {
    const el = scanRef.current
    if (!el) return
    /** Ref vóór focus — anders blur van barcode-capture → releaseScanFocus sluit keyboard. */
    articleSearchActiveRef.current = true
    setArticleSearchActive(true)
    applyArticleSearchDomActive(el)
    el.focus({ preventScroll: true })
  }, [applyArticleSearchDomActive])

  useLayoutEffect(() => {
    if (!soundActivated) return
    setArticleSearchActive(false)
    const active = document.activeElement
    if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
      active.blur()
    }
    const el = scanRef.current
    if (el) applyArticleSearchDomInactive(el)
    el?.blur()
    focusBarcodeCapture()
  }, [applyArticleSearchDomInactive, focusBarcodeCapture, soundActivated])

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

  const cartTotal = useMemo(
    () => cart.reduce((s, l) => s + l.sku.price * l.quantity, 0),
    [cart],
  )

  const loyaltyDiscountEuro = useMemo(() => {
    if (!loyaltyEnabled || !linkedLoyaltyMember || loyaltyRedeemPoints <= 0) return 0
    if (!loyaltySettings.redeem_enabled) return 0
    return computeRetailLoyaltyRedeemEuroDiscount(
      loyaltyRedeemPoints,
      loyaltySettings.redeem_points_per_euro,
    )
  }, [
    cartTotal,
    linkedLoyaltyMember,
    loyaltyEnabled,
    loyaltyRedeemPoints,
    loyaltySettings.redeem_enabled,
    loyaltySettings.redeem_points_per_euro,
  ])

  const storeCreditEuro = useMemo(() => {
    if (!linkedStoreCredit) return 0
    const afterLoyalty = Math.max(0, cartTotal - loyaltyDiscountEuro)
    const cap = Math.min(linkedStoreCredit.amount_remaining, afterLoyalty)
    return Math.round(cap * 100) / 100
  }, [cartTotal, loyaltyDiscountEuro, linkedStoreCredit])

  const payTotal = useMemo(
    () => Math.round(Math.max(0, cartTotal - loyaltyDiscountEuro - storeCreditEuro) * 100) / 100,
    [cartTotal, loyaltyDiscountEuro, storeCreditEuro],
  )

  const exchangeCreditIssueTotal = useMemo(() => {
    if (!exchangeOrderLines) return 0
    let sum = 0
    for (const line of exchangeOrderLines) {
      const q = Math.min(
        line.quantityReturnable,
        Math.max(0, Math.floor(exchangeReturnQty[line.lineKey] ?? 0)),
      )
      sum += line.price * q
    }
    return Math.round(sum * 100) / 100
  }, [exchangeOrderLines, exchangeReturnQty])

  useEffect(() => {
    if (!linkedLoyaltyMember || loyaltyRedeemPoints <= 0) return
    const maxPts = maxRetailLoyaltyRedeemPoints(
      linkedLoyaltyMember.points_balance,
      cartTotal,
      loyaltySettings.redeem_points_per_euro,
    )
    if (loyaltyRedeemPoints > maxPts) setLoyaltyRedeemPoints(maxPts)
  }, [
    cartTotal,
    linkedLoyaltyMember,
    loyaltyRedeemPoints,
    loyaltySettings.redeem_points_per_euro,
  ])

  useEffect(() => {
    if (!linkedLoyaltyMember) setLoyaltyRedeemPoints(0)
  }, [linkedLoyaltyMember])

  const paymentMethodOptions = useMemo<KassaPayOption[]>(
    () => [
      { method: 'CASH', label: t('kassaApp.payCash'), icon: '', color: '#10b981'},
      { method: 'CARD', label: t('kassaApp.payCard'), icon: '', color: '#3b82f6'},
      { method: 'IDEAL', label: t('kassaApp.payIdeal'), icon: '', color: '#ec4899'},
      { method: 'BANCONTACT', label: t('kassaApp.payBancontact'), icon: '', color: '#f59e0b'},
    ],
    [t],
  )

  const receiptLabels = useMemo<RetailReceiptI18n>(
    () => ({
      defaultBusinessName: t('kassaApp.defaultBusinessName'),
      orderTypeTakeaway: t('kassaReceipt.orderTypeTakeaway'),
      receiptNo: t('kassaReceipt.receiptNo'),
      invoiceTitle: t('kassaReceipt.invoiceTitle'),
      invoiceNo: t('kassaReceipt.invoiceNo'),
      customerVatLabel: (vatNumber) =>
        t('kassaReceipt.customerVatLabel').replace('{vatNumber}', vatNumber),
      telPrefix: t('kassaReceipt.telPrefix'),
      subtotal: t('kassaReceipt.subtotal'),
      vatLabel: (rate) => t('kassaReceipt.vat').replace('{rate}', String(rate)),
      total: t('kassaReceipt.total'),
      paidWith: t('kassaReceipt.paidWith'),
      payCash: t('kassaApp.payCash'),
      payCard: t('kassaApp.payCard'),
      payIdeal: t('kassaApp.payIdeal'),
      payBancontact: t('kassaApp.payBancontact'),
      paidSplit: (cash, card) =>
        t('kassaReceipt.paidSplit').replace('{cash}', cash).replace('{card}', card),
      businessVatLabel: (vatNumber) =>
        t('kassaReceipt.businessVatLabel').replace('{vatNumber}', vatNumber),
      thanks: t('kassaReceipt.thanks'),
      draftBanner: t('kassaReceipt.draftBanner'),
      draftNotPaid: t('kassaReceipt.draftNotPaid'),
      draftFooter: t('kassaReceipt.draftFooter'),
      loyaltyPassLabel: (name) => t('retailKassaPage.receiptLoyaltyPass').replace('{name}', name),
      loyaltyEarnedLine: (points) =>
        t('retailKassaPage.receiptLoyaltyEarned').replace('{points}', String(points)),
      loyaltyRedeemedLine: (points) =>
        t('retailKassaPage.receiptLoyaltyRedeemed').replace('{points}', String(points)),
      loyaltyBalanceLine: (points) =>
        t('retailKassaPage.receiptLoyaltyBalance').replace('{points}', String(points)),
      helpedByIntro: t('retailKassaPage.receiptHelpedByIntro'),
      receiptBonNrPrefix: t('retailKassaPage.receiptBonNrPrefix'),
      receiptDocumentTitle: t('retailKassaPage.receiptDocumentTitle'),
      sectionOrderBar: t('retailKassaPage.sectionOrderBar'),
      sectionTotalBar: t('retailKassaPage.sectionTotalBar'),
      sectionVatBar: t('retailKassaPage.sectionVatBar'),
      receivedLabel: t('retailKassaPage.receivedLabel'),
      changeLabel: t('retailKassaPage.changeLabel'),
      payPin: t('retailKassaPage.payPin'),
      paymentMethodLine: (method) =>
        t('retailKassaPage.paymentMethodLine').replace('{method}', method),
      vatSingleLabel: t('retailKassaPage.vatSingleLabel'),
      vatColBtwPct: t('retailKassaPage.vatColBtwPct'),
      vatColBtw: t('retailKassaPage.vatColBtw'),
      vatColExcl: t('retailKassaPage.vatColExcl'),
      vatColIncl: t('retailKassaPage.vatColIncl'),
      thanksFarewell: t('retailKassaPage.thanksFarewell'),
      receiptDiscount: t('retailKassaPage.receiptDiscount'),
    }),
    [t],
  )

  const businessTitle =
    tenantInfo?.business_name ||
    tenant.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

  const headerFileBtnClass = (active: boolean) =>
    `inline-flex shrink-0 items-center gap-1.5 px-2 py-1.5 transition-colors sm:gap-2 sm:px-3 sm:py-1.5 font-bold text-[11px] leading-tight sm:text-xs ${
      appearanceDark
        ? kassaPosButtonClass(active)
        : active
          ? 'rounded-xl bg-[#58CCFF] text-[#063042] hover:bg-[#47c6fe]'
          : 'rounded-xl border border-white/25 bg-transparent text-white hover:bg-white/10'
    }`

  /** Zelfde maat als Menu-knop in de titelbalk. */
  const retailTopNavShellClass =
    'inline-flex shrink-0 touch-manipulation items-center justify-center whitespace-nowrap px-3 py-2 font-bold text-[11px] leading-tight transition-colors sm:px-4 sm:py-2.5 sm:text-xs min-h-[2.35rem] sm:min-h-[2.6rem]'
  const retailTopNavBtnClass = (selected: boolean) =>
    `${retailTopNavShellClass} ${kassaPosButtonClass(selected)}`
  const retailTopNavLinkClass = `${retailTopNavShellClass} ${kassaPosButtonClass(false)}`
  const retailScanRowBtnClass = (selected: boolean) =>
    `${retailTopNavShellClass} ${kassaPosButtonClass(selected)}`
  /** Toevoegen + OK:zelfde breedte (past op langste label). */
  const retailScanRowActionSizeClass =
    'min-w-[7.25rem] w-[7.25rem] max-w-[7.25rem] justify-center sm:min-w-[7.75rem] sm:w-[7.75rem] sm:max-w-[7.75rem]'
  const retailScanRowActionBtnClass = (selected: boolean) =>
    `${retailScanRowBtnClass(selected)} ${retailScanRowActionSizeClass}`

  const kassaDarkHeaderBtnShell =
    'inline-flex shrink-0 touch-manipulation items-center justify-center whitespace-nowrap font-semibold transition-colors min-h-[2.35rem] px-3 py-2 sm:min-h-[2.6rem] sm:px-3.5 sm:py-2.5'

  const headerQuickLinkBtnClass = appearanceDark
    ? `${kassaDarkHeaderBtnShell} ${kassaPosButtonClass(false)}`
    : 'inline-flex shrink-0 touch-manipulation items-center justify-center whitespace-nowrap rounded-lg bg-white/10 px-2 py-1.5 font-bold text-white transition-colors hover:bg-white/20 sm:rounded-xl sm:px-3 sm:py-2'

  const headerUtilityBtnClass = (selected: boolean) =>
    appearanceDark
      ? `${kassaDarkHeaderBtnShell} gap-0.5 sm:gap-1 ${kassaPosButtonClass(selected)}`
      : `inline-flex shrink-0 touch-manipulation items-center gap-0.5 whitespace-nowrap rounded-lg px-1.5 py-1.5 font-medium text-white transition-colors hover:bg-white/20 sm:gap-1 sm:rounded-xl sm:px-2 sm:py-2 ${
          selected ? 'bg-white/20': 'bg-white/10'
        }`

  const kassaSidebarActionLabelClass =
    'text-center text-base font-semibold leading-tight tracking-[0.03em] sm:text-[17px]'
  const retailSidebarFooterActionMinH = 'min-h-[3.35rem] sm:min-h-[3.65rem]'
  const retailSidebarFooterPrimaryMinH = 'min-h-[4.25rem] sm:min-h-[4.5rem]'

  const barHasLines =
    mode === 'sales'
      ? cart.length > 0
      : stockActivity.length > 0

  const selectedPreviewSku = useMemo(() => {
    const skuStillInList = (sku: RetailPosSku) =>
      mode === 'sales'
        ? cart.some((l) => l.sku.lineKey === sku.lineKey)
        : stockActivity.some((r) => r.sku.lineKey === sku.lineKey)

    if (selectedListLineKey) {
      if (mode === 'sales') {
        const line = cart.find((l) => l.sku.lineKey === selectedListLineKey)
        if (line) return line.sku
      } else {
        const row = stockActivity.find((r) => r.key === selectedListLineKey)
        if (row) return row.sku
      }
    }
    if (lastScannedSku && skuStillInList(lastScannedSku)) return lastScannedSku
    return null
  }, [selectedListLineKey, cart, stockActivity, mode, lastScannedSku])

  const scanBarRowGridClass =
    'grid w-full min-w-[42rem] grid-cols-[minmax(5.5rem,1fr)_minmax(6rem,1.6fr)_minmax(2.5rem,0.5fr)_minmax(2.5rem,0.5fr)_minmax(2.75rem,0.55fr)_minmax(3.25rem,0.65fr)_2.75rem] items-center gap-1.5 sm:gap-2'

  /** Scan-/lijstregels: altijd wit vlak, zwarte tekst (ook nieuwe scans). */
  const retailListBarShellClass =
    'rounded-lg border border-black/10 bg-white text-black shadow-[0_1px_3px_rgba(0,0,0,0.12)]'
  const retailListBarSelectedClass =
    'border-2 border-[#3b8fd4] border-b-[5px] border-b-[#1565b8] bg-[#b8ddf7] shadow-[0_0_0_2px_rgba(88,204,255,0.65),0_0_22px_rgba(43,127,201,0.55)] ring-2 ring-[#58CCFF]/70'
  const retailListBarRemoveBtnClass =
    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/20 bg-neutral-100 text-base font-bold leading-none text-black hover:bg-neutral-200'

  function queueListScroll(lineKey: string) {
    listScrollTargetRef.current = lineKey
    setListScrollTick((n) => n + 1)
  }

  useLayoutEffect(() => {
    const target = listScrollTargetRef.current
    if (!target) return
    listScrollTargetRef.current = null
    const scan = scanBarRef.current
    const cart = cartScrollRef.current
    const scanRow = scan?.querySelector(`[data-retail-scan-line="${target}"]`)
    const cartRow = cart?.querySelector(`[data-retail-cart-line="${target}"]`)
    scanRow?.scrollIntoView({ block: 'nearest', inline: 'nearest'})
    cartRow?.scrollIntoView({ block: 'nearest', inline: 'nearest'})
  }, [listScrollTick])

  function removeStockActivityLine(activityKey: string) {
    playClick()
    setStockActivity((prev) => {
      const removed = prev.find((row) => row.key === activityKey)
      const next = prev.filter((row) => row.key !== activityKey)
      if (removed && !next.some((r) => r.sku.lineKey === removed.sku.lineKey)) {
        setLastScannedSku((s) => (s?.lineKey === removed.sku.lineKey ? null : s))
      }
      return next
    })
    setSelectedListLineKey((prev) => (prev === activityKey ? null : prev))
    releaseScanFocus()
  }

  function renderScanBarRow(
    key: string,
    sku: RetailPosSku,
    opts?: {
      quantity?: number
      stockNote?: string
      onRemove?: () => void
      onSelect?: () => void
    },
  ) {
    const barcode = sku.barcode || sku.article_number || '—'
    const stock =
      opts?.stockNote ??
      (sku.track_stock ? String(sku.stock_quantity) : t('retailKassaPage.stockNotTracked'))
    const qty = Math.max(1, opts?.quantity ?? 1)
    const name = qty > 1 ? `${sku.name} × ${qty}`: sku.name
    const lineTotal = sku.price * qty
    const selected = selectedListLineKey === key
    return (
      <div
        key={key}
        role="button"
        tabIndex={0}
        data-retail-scan-line={key}
        aria-pressed={selected}
        onClick={() => (opts?.onSelect ? opts.onSelect() : selectRetailListLine(key, sku))}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (opts?.onSelect) opts.onSelect()
            else selectRetailListLine(key, sku)
          }
        }}
        className={`${scanBarRowGridClass} ${retailListBarShellClass} shrink-0 cursor-pointer touch-manipulation px-3 py-2.5 transition-[background-color,box-shadow,border-color] sm:px-4 sm:py-3 text-[11px] sm:text-sm ${
          selected ? retailListBarSelectedClass : 'hover:bg-neutral-50'
        }`}
        data-retail-line-selected={selected ? 'true': undefined}
      >
        <span className="truncate font-mono tabular-nums text-black/85">{barcode}</span>
        <span className="truncate font-semibold text-black">{name}</span>
        <span className="truncate text-black/75">{sku.size_label || '—'}</span>
        <span className="truncate text-black/75">{sku.color_label || '—'}</span>
        <span className="truncate tabular-nums text-black/75">{stock}</span>
        <span className="truncate tabular-nums font-semibold text-black">€{lineTotal.toFixed(2)}</span>
        {opts?.onRemove ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              opts.onRemove?.()
            }}
            aria-label={t('retailKassaPage.removeLine')}
            className={retailListBarRemoveBtnClass}
          >
            ×
          </button>
        ) : (
          <span aria-hidden className="w-8 shrink-0" />
        )}
      </div>
    )
  }

  function switchMode(next: RetailKassaMode) {
    if (next === mode) return
    playClick()
    setMode(next)
    setStockActivity([])
    setSelectedListLineKey(null)
    setArticleSearchResults([])
    setArticleSearchModalOpen(false)
    closeArticleSearchKeyboard()
    if (next !== 'exchangeCredit') {
      setExchangeOrderLines(null)
      setExchangeReturnQty({})
    }
  }

  function openExchangeCreditMode() {
    switchMode('exchangeCredit')
    setExchangeOrderNumberDraft('')
    setExchangeOrderLines(null)
    setExchangeReturnQty({})
    closeArticleSearchKeyboard()
  }

  function storeCreditErrorText(code: string): string {
    const snakeToKey: Record<string, string> = {
      unknown: 'storeCreditErrorUnknown',
      order_not_found: 'storeCreditErrorOrderNotFound',
      order_not_paid: 'storeCreditErrorOrderNotPaid',
      order_is_credit_note: 'storeCreditErrorOrderIsCreditNote',
      no_items: 'storeCreditErrorNoItems',
      already_fully_returned: 'storeCreditErrorAlreadyFullyReturned',
      invalid_order_number: 'storeCreditErrorInvalidOrderNumber',
      qty_exceeds_returnable: 'storeCreditErrorQtyExceedsReturnable',
      empty_return: 'storeCreditErrorEmptyReturn',
      not_found: 'storeCreditErrorNotFound',
      depleted: 'storeCreditErrorDepleted',
      void: 'storeCreditErrorVoid',
      invalid_code: 'storeCreditErrorInvalidCode',
      insufficient_balance: 'storeCreditErrorInsufficientBalance',
      store_credit_redeem_failed: 'storeCreditErrorRedeemFailed',
    }
    const key = snakeToKey[code] ?? 'storeCreditErrorUnknown'
    return t(`retailKassaPage.${key}`)
  }

  async function loadExchangeOrder() {
    const n = parseInt(exchangeOrderNumberDraft.replace(/\D/g, ''), 10)
    if (!(n > 0)) {
      alert(t('retailKassaPage.exchangeInvalidOrderNumber'))
      return
    }
    setExchangeLookupBusy(true)
    try {
      const res = await authFetch(
        `/api/retail/store-credit/order?tenant=${encodeURIComponent(tenant)}&orderNumber=${n}`,
      )
      const data = (await res.json()) as {
        ok?: boolean
        error?: string
        lines?: RetailOrderLineForReturn[]
      }
      if (!data.ok || !data.lines) {
        alert(storeCreditErrorText(data.error || 'unknown'))
        setExchangeOrderLines(null)
        return
      }
      setExchangeOrderLines(data.lines)
      const qty: Record<string, number> = {}
      for (const line of data.lines) {
        if (line.quantityReturnable > 0) qty[line.lineKey] = 0
      }
      setExchangeReturnQty(qty)
    } finally {
      setExchangeLookupBusy(false)
    }
  }

  async function issueExchangeStoreCredit() {
    if (!exchangeOrderLines || exchangeIssueBusy) return
    const orderNum = parseInt(exchangeOrderNumberDraft.replace(/\D/g, ''), 10)
    if (!(orderNum > 0)) return
    const returnLines = exchangeOrderLines
      .map((line) => ({
        lineKey: line.lineKey,
        quantity: Math.min(
          line.quantityReturnable,
          Math.max(0, Math.floor(exchangeReturnQty[line.lineKey] ?? 0)),
        ),
      }))
      .filter((r) => r.quantity > 0)
    if (returnLines.length === 0) {
      alert(t('retailKassaPage.exchangePickReturnQty'))
      return
    }
    setExchangeIssueBusy(true)
    try {
      const res = await authFetch('/api/retail/store-credit/issue', {
        method: 'POST',
        body: JSON.stringify({
          tenantSlug: tenant,
          sourceOrderNumber: orderNum,
          returnLines,
          kassaStaffId: activeKassaStaff?.id ?? null,
        }),
      })
      const data = (await res.json()) as {
        ok?: boolean
        error?: string
        credit?: RetailStoreCreditPos
        creditNoteOrderNumber?: number
      }
      if (!data.ok || !data.credit) {
        alert(storeCreditErrorText(data.error || 'unknown'))
        return
      }
      const returnedItems = returnLines.flatMap((r) => {
        const line = exchangeOrderLines.find((l) => l.lineKey === r.lineKey)
        if (!line) return []
        return [
          {
            product_id: line.product_id,
            variant_id: line.variant_id,
            name: line.name,
            price: line.price,
            quantity: r.quantity,
          },
        ]
      })
      const printLabels: StoreCreditVoucherPrintLabels = {
        creditNoteTitle: t('retailKassaPage.storeCreditPrintCreditNoteTitle'),
        storeCreditTitle: t('retailKassaPage.storeCreditPrintStoreCreditTitle'),
        sourceReceipt: (n) =>
          t('retailKassaPage.storeCreditPrintSourceReceipt').replace('{n}', String(n)),
        creditNoteNo: (n) =>
          t('retailKassaPage.storeCreditPrintCreditNoteNo').replace('{n}', String(n)),
        amountLine: (euro) =>
          t('retailKassaPage.storeCreditPrintAmountLine').replace('{euro}', euro),
        noCashRefund: t('retailKassaPage.storeCreditPrintNoCashRefund'),
        scanHint: t('retailKassaPage.storeCreditPrintScanHint'),
        thanks: t('retailKassaPage.storeCreditPrintThanks'),
      }
      const printRes = await printRetailStoreCreditVoucher({
        tenantInfo,
        creditCode: data.credit.credit_code,
        amount: data.credit.amount_initial,
        sourceOrderNumber: data.credit.source_order_number,
        creditNoteOrderNumber: data.creditNoteOrderNumber,
        returnedItems,
        labels: printLabels,
        locale,
      })
      if (!printRes.ok && printRes.fallbackHtml) {
        tryBrowserPrintStoreCreditFallback(printRes.fallbackHtml)
      }
      setLinkedStoreCredit(data.credit)
      alert(t('retailKassaPage.exchangeIssueOk'))
      switchMode('sales')
      void reload({ fresh: true })
    } finally {
      setExchangeIssueBusy(false)
    }
  }

  async function linkStoreCreditFromScan(raw: string) {
    const res = await authFetch(
      `/api/retail/store-credit/lookup?tenant=${encodeURIComponent(tenant)}&code=${encodeURIComponent(raw)}`,
    )
    const data = (await res.json()) as { ok?: boolean; error?: string; credit?: RetailStoreCreditPos }
    if (data.ok && data.credit) {
      setLinkedStoreCredit(data.credit)
      flashAddOkButton()
      return true
    }
    alert(storeCreditErrorText(data.error || 'unknown'))
    return false
  }

  function focusRetailListLine(lineKey: string, sku: RetailPosSku) {
    setSelectedListLineKey(lineKey)
    setLastScannedSku(sku)
  }

  function selectRetailListLine(lineKey: string, sku: RetailPosSku) {
    playClick()
    focusRetailListLine(lineKey, sku)
  }

  function renderRetailPlateTiles() {
    const tileClass = `${kassaPosQuickMenuPanelButtonClass()} ${RETAIL_TRAY_TILE_SIZE_CLASS} flex shrink-0 touch-manipulation select-none flex-col items-center justify-center px-2 py-2 text-center text-[13px] font-bold leading-[1.15] sm:text-sm sm:leading-snug`
    return RETAIL_GRAY_TRAY_TILES.map((tile) => {
      const label = t(tile.labelKey)
      if (tile.kind === 'loyaltyNoCard') {
        if (!loyaltyEnabled || mode !== 'sales') return null
        return (
          <button
            key={tile.key}
            type="button"
            onClick={() => {
              playClick()
              setLinkedLoyaltyMember(null)
              setLoyaltyRedeemPoints(0)
              closeArticleSearchKeyboard()
              focusBarcodeCapture()
            }}
            className={tileClass}
          >
            {label}
          </button>
        )
      }
      if (tile.kind === 'exchangeCredit') {
        return (
          <button
            key={tile.key}
            type="button"
            data-testid="retail-tile-exchange-credit"
            onClick={() => {
              playClick()
              openExchangeCreditMode()
            }}
            className={`${tileClass} ${mode === 'exchangeCredit'? 'ring-2 ring-sky-400': ''}`}
          >
            {label}
          </button>
        )
      }
      const enabled =
        tile.kind === 'logout' || tile.submenuIds.some((id) => quickMenuAllowedSubmenuIds.has(id))
      if (tile.kind === 'logout') {
        return (
          <button
            key={tile.key}
            type="button"
            onClick={() => {
              playClick()
              setLogoutSoftwareConfirmOpen(true)
            }}
            className={tileClass}
          >
            {label}
          </button>
        )
      }
      if (!enabled) {
        return (
          <button key={tile.key} type="button" disabled className={tileClass}>
            {label}
          </button>
        )
      }
      if (tile.key === 'clock' && showKassaStaffClockButton) {
        return (
          <button
            key={tile.key}
            type="button"
            onClick={() => {
              closeArticleSearchKeyboard()
              openStaffClockModal()
            }}
            className={tileClass}
          >
            {label}
          </button>
        )
      }
      return (
        <Link
          key={tile.key}
          href={`${baseUrl}${tile.hrefSuffix}`}
          prefetch={false}
          className={tileClass}
          onClick={() => playClick()}
        >
          {label}
        </Link>
      )
    })
  }

  function clearAddOkFlashTimers() {
    for (const id of addOkFlashTimersRef.current) clearTimeout(id)
    addOkFlashTimersRef.current = []
    setAddOkFlash(false)
  }

  /** Drie zichtbare groene flitsen — lang genoeg om te zien na scan/toevoegen. */
  function flashAddOkButton() {
    clearAddOkFlashTimers()
    const onMs = 520
    const offMs = 480
    const flashes = 3
    let delay = 0
    const schedule = (fn: () => void, ms: number) => {
      addOkFlashTimersRef.current.push(setTimeout(fn, ms))
    }
    for (let i = 0; i < flashes; i++) {
      schedule(() => setAddOkFlash(true), delay)
      delay += onMs
      schedule(() => setAddOkFlash(false), delay)
      delay += offMs
    }
  }

  function pushStockActivity(
    sku: RetailPosSku,
    delta: number,
    activityMode: 'stockCount' |  'goodsReceipt',
  ) {
    const key = `${sku.lineKey}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    focusRetailListLine(key, sku)
    setStockActivity((prev) => [...prev, { key, sku, delta, mode: activityMode }])
    queueListScroll(key)
    flashAddOkButton()
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
      lookup.name?.trim() || (digits.length >= 8 ? `EAN ${digits}`: trimmed)
    const price =
      lookup.price != null && Number.isFinite(Number(lookup.price))
        ? Math.round(Number(lookup.price) * 100) / 100
        : 0

    const res = await createRetailSkuFromScan(tenant, { barcode: trimmed, name, price })
    if (!res.ok) return null

    const list = await fetchRetailPosSkus(tenant, { fresh: true })
    setSkus(list)
    skusRef.current = list
    return resolveRetailSkuLookup(list, trimmed) ?? res.sku ?? null
  }

  async function resolveOrImportSku(code: string): Promise<RetailPosSku | null> {
    const catalog = skusRef.current
    const hit = resolveRetailSkuLookup(catalog, code)
    if (hit) return hit

    if (catalog.length === 0) {
      const list = await fetchRetailPosSkus(tenant)
      setSkus(list)
      skusRef.current = list
      const retry = resolveRetailSkuLookup(list, code)
      if (retry) return retry
    }

    return importSkuFromBarcode(code)
  }

  async function linkLoyaltyCardFromScan(raw: string) {
    const res = await authFetch(
      `/api/retail/loyalty/lookup?tenant=${encodeURIComponent(tenant)}&code=${encodeURIComponent(raw)}`,
    )
    const data = (await res.json()) as { ok?: boolean; member?: RetailLoyaltyMemberPos }
    if (data.ok && data.member) {
      setLinkedLoyaltyMember(data.member)
      flashAddOkButton()
      return true
    }
    alert(t('retailLoyalty.cardNotFound'))
    return false
  }

  function openLoyaltyRedeemModal() {
    if (!linkedLoyaltyMember || !loyaltySettings.redeem_enabled) return
    playClick()
    const maxPts = maxRetailLoyaltyRedeemPoints(
      linkedLoyaltyMember.points_balance,
      cartTotal,
      loyaltySettings.redeem_points_per_euro,
    )
    setLoyaltyRedeemDraft(String(loyaltyRedeemPoints > 0 ? loyaltyRedeemPoints : maxPts))
    setLoyaltyRedeemModalOpen(true)
  }

  function applyLoyaltyRedeemModal() {
    const raw = loyaltyRedeemDraft.replace(/\D/g, '')
    const pts = raw ? Math.max(0, parseInt(raw, 10)) : 0
    if (!linkedLoyaltyMember) {
      setLoyaltyRedeemModalOpen(false)
      return
    }
    const maxPts = maxRetailLoyaltyRedeemPoints(
      linkedLoyaltyMember.points_balance,
      cartTotal,
      loyaltySettings.redeem_points_per_euro,
    )
    setLoyaltyRedeemPoints(Math.min(pts, maxPts))
    setLoyaltyRedeemModalOpen(false)
    focusBarcodeCapture()
  }

  function clearLoyaltyRedeem() {
    setLoyaltyRedeemPoints(0)
    setLoyaltyRedeemDraft('')
  }

  async function processBarcode(code: string) {
    const trimmed = code.trim()
    if (!trimmed) return
    if (stockBusyRef.current) return

    if (mode === 'sales' && loyaltyEnabled && isRetailLoyaltyCardScan(trimmed)) {
      stockBusyRef.current = true
      setStockBusy(true)
      try {
        await linkLoyaltyCardFromScan(trimmed)
      } finally {
        stockBusyRef.current = false
        setStockBusy(false)
        releaseScanFocus()
      }
      return
    }

    if (mode === 'sales' && isRetailStoreCreditScan(trimmed)) {
      stockBusyRef.current = true
      setStockBusy(true)
      try {
        await linkStoreCreditFromScan(trimmed)
      } finally {
        stockBusyRef.current = false
        setStockBusy(false)
        releaseScanFocus()
      }
      return
    }

    if (mode === 'sales') {
      if (blockSaleWithoutStaffIfNeeded()) return
      stockBusyRef.current = true
      setStockBusy(true)
      try {
        const hit = await resolveOrImportSku(trimmed)
        if (hit) addToCart(hit, 1)
        else alert(t('retailKassaPage.autoScanImportError'))
      } finally {
        stockBusyRef.current = false
        setStockBusy(false)
        releaseScanFocus()
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
      stockBusyRef.current = false
      setStockBusy(false)
      releaseScanFocus()
    }
  }

  function openPriceFixModal(sku: RetailPosSku) {
    setPriceFixSku(sku)
    setPriceFixValue('')
    setPriceFixName(/^EAN\s+/i.test(sku.name.trim()) ? '' : sku.name.trim())
    requestAnimationFrame(() => priceFixNameInputRef.current?.focus())
  }

  async function savePriceFix() {
    if (!priceFixSku || priceFixSaving) return
    const name = priceFixName.trim()
    if (!name) {
      alert(t('retailKassaPage.unknownScanNameRequired'))
      return
    }
    const price = Number.parseFloat(priceFixValue.replace(',', '.'))
    if (!Number.isFinite(price) || price < 0) {
      alert(t('retailKassaPage.unknownScanPriceRequired'))
      return
    }
    setPriceFixSaving(true)
    try {
      const res = await updateRetailSkuPrice(tenant, priceFixSku, price, name)
      if (!res.ok || !res.sku) {
        alert(t('retailKassaPage.priceFixError'))
        return
      }
      replaceSkuInCatalog(res.sku)
      focusRetailListLine(res.sku.lineKey, res.sku)
      queueListScroll(res.sku.lineKey)
      setCart((prev) =>
        prev.map((l) => (l.sku.lineKey === res.sku!.lineKey ? { ...l, sku: res.sku! } : l)),
      )
      setPriceFixSku(null)
      setPriceFixName('')
      setPriceFixValue('')
      releaseScanFocus()
    } finally {
      setPriceFixSaving(false)
    }
  }

  function cancelPriceFix() {
    if (priceFixSaving) return
    playClick()
    const sku = priceFixSku
    setPriceFixSku(null)
    setPriceFixName('')
    setPriceFixValue('')
    if (sku) {
      setCart((prev) =>
        prev.filter((l) => !(l.sku.lineKey === sku.lineKey && l.sku.price <= 0)),
      )
    }
    releaseScanFocus()
  }

  const handleNumpad = useCallback((key: string) => {
    setNumpadValue((prev) => {
      if (key === 'C') return ''
      if (key === '=') {
        try {
          const expr = prev.replace(/×/g, '*')
          // eslint-disable-next-line no-new-func
          const result = Function('"use strict"; return ('+ expr + ')')()
          return String(result)
        } catch {
          return prev
        }
      }
      if (['+', '-', '×'].includes(key)) {
        if (prev && !['+', '-', '×'].some((op) => prev.endsWith(op))) return prev + key
        return prev
      }
      if (key === '.') {
        const parts = prev.split(/[+\-×]/)
        if (!parts[parts.length - 1]?.includes('.')) return prev + '.'
        return prev
      }
      return prev + key
    })
  }, [])

  function addCustomAmountFromNumpad() {
    const amount = parseFloat(numpadValue)
    if (!(amount > 0)) return
    playClick()
    const key = `custom-${Date.now()}`
    const sku: RetailPosSku = {
      lineKey: key,
      productId: key,
      variantId: null,
      name: t('kassaApp.addAmount').replace('{amount}', amount.toFixed(2)),
      description: '',
      price: Math.round(amount * 100) / 100,
      image_url: '',
      article_number: null,
      barcode: null,
      size_label: null,
      color_label: null,
      track_stock: false,
      stock_quantity: 0,
      low_stock_threshold: 0,
      category_id: null,
    }
    setCart((prev) => {
      queueMicrotask(flashAddOkButton)
      return [...prev, { sku, quantity: 1 }]
    })
    focusRetailListLine(key, sku)
    queueListScroll(key)
    setNumpadValue('')
    setNumpadPanelVisible(false)
    releaseScanFocus()
  }

  function toggleNumpadPanel() {
    playClick()
    if (articleSearchActiveRef.current) closeArticleSearchKeyboard()
    setNumpadPanelVisible((v) => !v)
    focusBarcodeCapture()
  }

  function addToCart(sku: RetailPosSku, qty = 1) {
    if (blockSaleWithoutStaffIfNeeded()) return
    if (!retailSkuInStock(sku, qty)) {
      alert(t('retailKassaPage.outOfStock'))
      return
    }
    setCart((prev) => {
      const i = prev.findIndex((l) => l.sku.lineKey === sku.lineKey)
      if (i < 0) {
        const next = [...prev, { sku, quantity: qty }]
        queueMicrotask(flashAddOkButton)
        return next
      }
      const next = [...prev]
      const merged = next[i].quantity + qty
      if (!retailSkuInStock(sku, merged)) {
        alert(t('retailKassaPage.outOfStock'))
        return prev
      }
      next[i] = { ...next[i], quantity: merged }
      queueMicrotask(flashAddOkButton)
      return next
    })
    focusRetailListLine(sku.lineKey, sku)
    queueListScroll(sku.lineKey)
    if (sku.price <= 0) {
      openPriceFixModal(sku)
    } else {
      releaseScanFocus()
    }
  }

  function updateQty(lineKey: string, qty: number) {
    if (qty < 1) {
      setCart((prev) => prev.filter((l) => l.sku.lineKey !== lineKey))
      setSelectedListLineKey((prev) => (prev === lineKey ? null : prev))
      setLastScannedSku((prev) => (prev?.lineKey === lineKey ? null : prev))
      setPriceFixSku((prev) => (prev?.lineKey === lineKey ? null : prev))
      releaseScanFocus()
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
    setSelectedListLineKey(null)
    setLastScannedSku(null)
    setPriceFixSku(null)
    releaseScanFocus()
  }

  function looksLikeBarcodeOnlyQuery(raw: string): boolean {
    const trimmed = raw.trim()
    if (!trimmed) return false
    const digits = trimmed.replace(/\D/g, '')
    return digits.length >= 8 && digits.length === trimmed.replace(/\s/g, '').length
  }

  function finishArticleSearchUi() {
    setScanValue('')
    closeArticleSearchKeyboard()
    focusBarcodeCapture()
  }

  function closeArticleSearchModal() {
    playClick()
    setArticleSearchModalOpen(false)
    setArticleSearchResults([])
    focusBarcodeCapture()
  }

  function showArticleSearchResults(hits: RetailPosSku[]) {
    setArticleSearchResults(hits)
    setArticleSearchModalOpen(true)
    finishArticleSearchUi()
  }

  function pickArticleFromSearchModal(sku: RetailPosSku) {
    playClick()
    addToCart(sku, 1)
    setArticleSearchResults((prev) => {
      const next = prev.filter((s) => s.lineKey !== sku.lineKey)
      if (next.length === 0) {
        queueMicrotask(() => setArticleSearchModalOpen(false))
      }
      return next
    })
  }

  async function runArticleSearch(query: string) {
    const trimmed = query.trim()
    if (!trimmed) return
    if (mode !== 'sales') {
      void processBarcode(trimmed)
      return
    }
    if (blockSaleWithoutStaffIfNeeded()) return
    if (stockBusyRef.current) return

    stockBusyRef.current = true
    setStockBusy(true)
    try {
      let list = skusRef.current
      if (list.length === 0) {
        list = await fetchRetailPosSkus(tenant)
        setSkus(list)
        skusRef.current = list
      }

      let hits = searchRetailSkus(list, trimmed)
      if (hits.length === 0 && looksLikeBarcodeOnlyQuery(trimmed)) {
        const imported = await resolveOrImportSku(trimmed)
        if (imported) {
          showArticleSearchResults([imported])
          return
        }
      }

      if (hits.length === 0) {
        alert(t('retailKassaPage.barcodeNotFound'))
        return
      }
      playClick()
      showArticleSearchResults(hits)
    } finally {
      stockBusyRef.current = false
      setStockBusy(false)
    }
  }

  function onScanSubmit(e: React.FormEvent) {
    e.preventDefault()
    void runArticleSearch(scanValue)
  }

  function onBarcodeWedgeKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const v = e.currentTarget.value
    e.currentTarget.value = ''
    void processBarcode(v)
  }

  function openImportPreview(rows: RetailImportRow[]) {
    if (rows.length === 0) {
      alert(t('retailKassaPage.importEmpty'))
      return
    }
    setImportPreview(rows)
    setImportModalOpen(true)
  }

  async function onImportFileSelected(file: File | undefined, kind: 'csv' |  'excel') {
    if (!file) {
      setImportHighlight(null)
      return
    }
    playClick()
    setImportHighlight(kind)
    try {
      const rows =
        kind === 'csv'
          ? parseRetailCsvText(await file.text())
          : parseRetailExcelBuffer(await file.arrayBuffer())
      openImportPreview(rows)
    } catch {
      setImportHighlight(null)
      alert(t('retailKassaPage.importFailed'))
    }
  }

  async function confirmProductImport() {
    if (importPreview.length === 0 || importBusy) return
    setImportBusy(true)
    try {
      const res = await importRetailProductsBatch(tenant, importPreview)
      if (!res.ok && res.created === 0) {
        alert(t('retailKassaPage.importFailed'))
        return
      }
      alert(
        t('retailKassaPage.importDone')
          .replace('{created}', String(res.created))
          .replace('{skipped}', String(res.skipped)),
      )
      setImportModalOpen(false)
      setImportPreview([])
      setImportHighlight(null)
      await reload({ fresh: true })
      focusBarcodeCapture()
    } finally {
      setImportBusy(false)
    }
  }

  function clearStockActivity() {
    if (stockActivity.length === 0) return
    playClick()
    setStockActivity([])
    setSelectedListLineKey(null)
    setLastScannedSku(null)
    focusBarcodeCapture()
  }

  async function printRetailReceipt(order: KassaLastOrderReceipt, draft?: boolean): Promise<boolean> {
    const result = await printRetailKassaReceipt({
      tenantInfo,
      order,
      labels: receiptLabels,
      locale,
      draft,
    })
    if (result.ok) {
      setThermalPrintBanner(null)
      setPrintAgentFallbackHtml(null)
      return true
    }
    setThermalPrintBanner(
      `${t('kassaApp.printAgentFailedDebugTitle')}\n\n${result.error}\n\n${t('kassaApp.printAgentFailedDebugFooter')}`,
    )
    setPrintAgentFallbackHtml(result.fallbackHtml)
    return false
  }

  async function printDraftBonFromCart() {
    if (cart.length === 0 || draftBonPrinting) return
    playClick()
    setDraftBonPrinting(true)
    try {
      const draftOrder = buildRetailLastOrderReceipt(
        cart,
        'CARD',
        0,
        tenantInfo?.btw_percentage ?? 21,
      )
      await printRetailReceipt(draftOrder, true)
    } finally {
      setDraftBonPrinting(false)
      focusBarcodeCapture()
    }
  }

  async function completePayment(
    method: KassaPaymentMethod,
    splitAmounts?: { cash: number; card: number },
  ) {
    if (cart.length === 0 || paying) return
    if (blockSaleWithoutStaffIfNeeded()) return
    const linesSnapshot = [...cart]
    const grossTotal = linesSnapshot.reduce((s, l) => s + l.sku.price * l.quantity, 0)
    const discountEuro =
      loyaltyRedeemPoints > 0
        ? computeRetailLoyaltyRedeemEuroDiscount(
            loyaltyRedeemPoints,
            loyaltySettings.redeem_points_per_euro,
          )
        : 0
    const orderTotal = payTotal
    const loyaltyMemberId =
      loyaltyEnabled && linkedLoyaltyMember ? linkedLoyaltyMember.id : undefined
    const loyaltyMemberSnapshot = linkedLoyaltyMember
    const saleCustomerEmail = linkedLoyaltyMember?.email?.trim().toLowerCase() || null
    const redeemPointsForSale =
      loyaltyMemberId && loyaltyRedeemPoints > 0 ? loyaltyRedeemPoints : 0
    setPaying(true)
    const res = await completeRetailSale(tenant, linesSnapshot, method, splitAmounts, {
      loyaltyMemberId,
      loyaltyDiscountEuro: discountEuro,
      loyaltyRedeemPoints: redeemPointsForSale,
      kassaStaffId: activeKassaStaff?.id ?? null,
      storeCreditId: linkedStoreCredit?.id ?? null,
      storeCreditEuro: storeCreditEuro > 0 ? storeCreditEuro : undefined,
    })
    setPaying(false)
    setShowPaymentModal(false)
    setShowSplitModal(false)
    if (!res.ok) {
      alert(t('retailKassaPage.payError'))
      return
    }
    const orderNumber = res.orderNumber ?? 0

    let retailLoyaltyOnReceipt: KassaLastOrderReceipt['retailLoyalty'] | undefined
    if (loyaltyMemberId && loyaltyMemberSnapshot) {
      try {
        const settleRes = await authFetch('/api/retail/loyalty/settle', {
          method: 'POST',
          body: JSON.stringify({
            tenantSlug: tenant,
            memberId: loyaltyMemberId,
            orderTotal,
            orderNumber: orderNumber > 0 ? orderNumber : undefined,
            redeemPoints: redeemPointsForSale > 0 ? redeemPointsForSale : undefined,
          }),
        })
        const settleJson = (await settleRes.json()) as {
          ok?: boolean
          balance?: number
          earned?: number
          redeemed?: number
        }
        if (settleJson.ok && settleJson.balance != null) {
          retailLoyaltyOnReceipt = {
            memberLabel:
              loyaltyMemberSnapshot.display_name?.trim() || loyaltyMemberSnapshot.card_code,
            pointsEarned: settleJson.earned ?? 0,
            pointsRedeemed: settleJson.redeemed ?? 0,
            pointsBalance: settleJson.balance,
          }
        }
      } catch {
        /* bon zonder loyaliteitblok als settle faalt */
      }
    }

    const receipt = buildRetailLastOrderReceipt(
      linesSnapshot,
      method,
      orderNumber,
      tenantInfo?.btw_percentage ?? 21,
      splitAmounts,
      discountEuro > 0 ? discountEuro : undefined,
      activeKassaStaff?.name ?? null,
    )
    if (retailLoyaltyOnReceipt) {
      receipt.retailLoyalty = retailLoyaltyOnReceipt
    } else if (loyaltyMemberSnapshot) {
      const memberLabel =
        loyaltyMemberSnapshot.display_name?.trim() ||
        loyaltyMemberSnapshot.customer_name?.trim() ||
        loyaltyMemberSnapshot.card_code
      receipt.retailLoyalty = {
        memberLabel,
        pointsEarned: 0,
        pointsRedeemed: redeemPointsForSale,
        pointsBalance: loyaltyMemberSnapshot.points_balance,
      }
    }
    const customerInvoice = retailCustomerInvoiceFromLoyaltyMember(loyaltyMemberSnapshot)
    if (customerInvoice) {
      receipt.retailCustomerInvoice = customerInvoice
    }
    setLastOrderReceipt(receipt)
    setLastSaleCustomerEmail(saleCustomerEmail && saleCustomerEmail.includes('@') ? saleCustomerEmail : null)
    setLoyaltyRedeemPoints(0)
    setLinkedLoyaltyMember(null)
    setLinkedStoreCredit(null)
    setCart([])
    setSelectedListLineKey(null)
    setLastScannedSku(null)
    setShowSuccessModal(true)
    focusBarcodeCapture()
    void reload({ fresh: true })
  }

  const performLogout = () => {
    applyOwnerOnlyLogoutCleanup(tenant)
    setTerminalLogout({ kind: 'staff', tenantSlug: tenant })
    broadcastTenantOwnerLogout({ scope: 'owner', tenantSlug: tenant, landing: 'tenant-login'})
    const origin = window.location.origin
    const next = buildShopInternalReturnPath(tenant, window.location.pathname, window.location.search)
    const loginUrl = `${origin}/login?next=${encodeURIComponent(next)}`
    attemptCloseThenOrNavigate(() => {
      window.location.replace(appendKassaCloseTipToAbsoluteLoginUrl(loginUrl))
    })
  }

  if (!soundActivated) {
    return <KassaSoundActivationScreen ui={ui} onActivate={activateSound} />
  }

  return (
    <div
      className="flex min-h-0 flex-col overflow-hidden h-[100svh] max-h-[100svh] supports-[height:100dvh]:h-[100dvh] supports-[height:100dvh]:max-h-[100dvh]"
      data-testid="retail-kassa-app"
      data-vysion-kb-scroll-host
    >
      <LogoutSoftwareConfirmModal
        open={logoutSoftwareConfirmOpen}
        onCancel={() => setLogoutSoftwareConfirmOpen(false)}
        onConfirm={() => {
          setLogoutSoftwareConfirmOpen(false)
          performLogout()
        }}
      />

      {loyaltyRedeemModalOpen && linkedLoyaltyMember ? (
        <div className="fixed inset-0 z-[136] flex items-center justify-center bg-black/70 p-4">
          <div
            className={`w-full max-w-md space-y-4 p-6 sm:max-w-lg ${KASSA_POS_BTN_SHAPE} ${KASSA_POS_MENU_PLATE_SHELL_BG_CLASS} border ${KASSA_POS_RULE_BLACK}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="retail-loyalty-redeem-title"
          >
            <p id="retail-loyalty-redeem-title" className="text-xl font-bold text-white">
              {t('retailKassaPage.loyaltyRedeemModalTitle')}
            </p>
            <p className="text-sm leading-snug text-white/75">
              {t('retailKassaPage.loyaltyRedeemModalHint')
                .replace('{max}', String(
                  maxRetailLoyaltyRedeemPoints(
                    linkedLoyaltyMember.points_balance,
                    cartTotal,
                    loyaltySettings.redeem_points_per_euro,
                  ),
                ))
                .replace(
                  '{euro}',
                  computeRetailLoyaltyRedeemEuroDiscount(
                    maxRetailLoyaltyRedeemPoints(
                      linkedLoyaltyMember.points_balance,
                      cartTotal,
                      loyaltySettings.redeem_points_per_euro,
                    ),
                    loyaltySettings.redeem_points_per_euro,
                  ).toFixed(2),
                )}
            </p>
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-white/90">
                {t('retailKassaPage.loyaltyRedeemPointsLabel')}
              </span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={loyaltyRedeemDraft}
                onChange={(e) => setLoyaltyRedeemDraft(e.target.value.replace(/\D/g, ''))}
                className={`w-full px-4 py-4 text-center font-mono text-xl tabular-nums tracking-wide text-[#f0f0f0] placeholder:text-white/45 focus:outline-none ${KASSA_POS_FIELD}`}
              />
            </label>
            <p className="text-center text-sm text-emerald-300">
              {t('retailKassaPage.loyaltyRedeemPreview')
                .replace(
                  '{euro}',
                  computeRetailLoyaltyRedeemEuroDiscount(
                    Math.min(
                      parseInt(loyaltyRedeemDraft.replace(/\D/g, '') || '0', 10) || 0,
                      maxRetailLoyaltyRedeemPoints(
                        linkedLoyaltyMember.points_balance,
                        cartTotal,
                        loyaltySettings.redeem_points_per_euro,
                      ),
                    ),
                    loyaltySettings.redeem_points_per_euro,
                  ).toFixed(2),
                )}
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setLoyaltyRedeemModalOpen(false)
                  focusBarcodeCapture()
                }}
                className={`flex-1 py-3 font-bold ${kassaPosButtonClass(false)}`}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => applyLoyaltyRedeemModal()}
                className={`flex-1 py-3 font-bold ${kassaPosButtonClass(true)}`}
              >
                {t('retailKassaPage.loyaltyRedeemModalConfirm')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {priceFixSku ? (
        <div className="fixed inset-0 z-[135] flex items-center justify-center bg-black/70 p-4">
          <div
            className={`w-full max-w-md space-y-4 p-6 sm:max-w-lg ${KASSA_POS_BTN_SHAPE} ${KASSA_POS_MENU_PLATE_SHELL_BG_CLASS} border ${KASSA_POS_RULE_BLACK}`}
          >
            <p className="text-xl font-bold text-white">{t('retailKassaPage.priceFixTitle')}</p>
            {priceFixSku.barcode ? (
              <p className="text-sm text-white/70">
                {t('retailKassaPage.unknownScanBarcode')}:{' '}
                <span className="font-mono tabular-nums text-white/90">{priceFixSku.barcode}</span>
              </p>
            ) : null}
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-white/90">{t('retailKassaPage.unknownScanName')}</span>
              <input
                ref={priceFixNameInputRef}
                type="text"
                value={priceFixName}
                onChange={(e) => setPriceFixName(e.target.value)}
                className={`w-full px-4 py-3 text-base text-[#f0f0f0] placeholder:text-white/45 focus:outline-none ${KASSA_POS_FIELD}`}
                placeholder={t('retailKassaPage.unknownScanNamePlaceholder')}
                autoComplete="off"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-white/90">{t('retailKassaPage.unknownScanPrice')}</span>
              <input
                ref={priceFixInputRef}
                type="text"
                inputMode="decimal"
                data-vysion-kb-decimal="1"
                value={priceFixValue}
                onChange={(e) => setPriceFixValue(e.target.value)}
                className={`w-full px-4 py-3 text-base tabular-nums text-[#f0f0f0] placeholder:text-white/45 focus:outline-none ${KASSA_POS_FIELD}`}
                placeholder="0,00"
              />
            </label>
            <div className="flex gap-2.5">
              <button
                type="button"
                disabled={priceFixSaving}
                onClick={cancelPriceFix}
                className={`flex-1 py-3 font-bold ${kassaPosButtonClass(false)}`}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                disabled={priceFixSaving}
                onClick={() => void savePriceFix()}
                className={`flex-1 py-3 font-bold ${kassaPosButtonClass(true)}`}
              >
                {priceFixSaving ? t('retailKassaPage.paying') : t('retailKassaPage.priceFixSave')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <KassaStaffClockModal
        open={staffClockOpen}
        listLoading={staffClockListLoading}
        staffList={staffClockList}
        busy={staffClockBusy}
        pinModal={staffClockPinModal}
        pinInput={staffClockPinInput}
        pinError={staffClockPinError}
        onClose={() => {
          playClick()
          staffClockPinReqGen.current += 1
          setStaffClockBusy(false)
          setStaffClockOpen(false)
          setStaffClockPinModal(null)
          setStaffClockPinInput('')
          setStaffClockPinError(null)
        }}
        onPinInputChange={setStaffClockPinInput}
        onStartClockIn={(s) => {
          playClick()
          setStaffClockPinModal({ staffId: s.id, staffName: s.name, action: 'in'})
          setStaffClockPinInput('')
          setStaffClockPinError(null)
        }}
        onStartClockOut={(s) => {
          playClick()
          setStaffClockPinModal({ staffId: s.id, staffName: s.name, action: 'out'})
          setStaffClockPinInput('')
          setStaffClockPinError(null)
        }}
        onSales={(s) => startStaffSales(s)}
        onPinCancel={() => {
          playClick()
          staffClockPinReqGen.current += 1
          setStaffClockBusy(false)
          setStaffClockPinModal(null)
          setStaffClockPinInput('')
          setStaffClockPinError(null)
        }}
        onPinConfirm={() => void submitStaffClockPin()}
      />

      <KassaPaymentModal
        open={showPaymentModal}
        total={payTotal}
        options={paymentMethodOptions}
        onClose={() => !paying && setShowPaymentModal(false)}
        onPay={(method) => void completePayment(method)}
        onOpenSplit={() => {
          setSplitCash(0)
          setSplitCard(payTotal)
          setShowSplitModal(true)
          setShowPaymentModal(false)
        }}
        appearance={appearanceDark ? 'dark': 'light'}
      />

      <KassaSplitPaymentModal
        open={showSplitModal}
        total={payTotal}
        splitCash={splitCash}
        splitCard={splitCard}
        setSplitCash={setSplitCash}
        setSplitCard={setSplitCard}
        onCloseBack={() => {
          setShowSplitModal(false)
          setShowPaymentModal(true)
        }}
        onConfirm={() => void completePayment('SPLIT', { cash: splitCash, card: splitCard })}
        appearance={appearanceDark ? 'dark': 'light'}
      />

      {lastOrderReceipt ? (
        <KassaSuccessReceiptModal
          open={showSuccessModal}
          order={lastOrderReceipt}
          tenantInfo={tenantInfo}
          locale={locale}
          receiptVariant="retail"
          retailReceiptLabels={receiptLabels}
          footerActions="print-email-close"
          emailDisabled={!lastSaleCustomerEmail}
          emailDisabledHint={t('retailKassaPage.receiptEmailNoCustomer')}
          onClose={() => setShowSuccessModal(false)}
          printDisabled={successReceiptPrintBusy}
          onPrint={async () => {
            if (!lastOrderReceipt) return
            try {
              setSuccessReceiptPrintBusy(true)
              const ok = await printRetailReceipt(lastOrderReceipt)
              if (ok) {
                setShowSuccessModal(false)
                focusBarcodeCapture()
              }
            } finally {
              setSuccessReceiptPrintBusy(false)
            }
          }}
          onEmail={async () => {
            if (!lastSaleCustomerEmail || !lastOrderReceipt) return
            const res = await authFetch('/api/retail/kassa/receipt-email', {
              method: 'POST',
              body: JSON.stringify({
                tenantSlug: tenant,
                toEmail: lastSaleCustomerEmail,
                locale,
                order: {
                  ...lastOrderReceipt,
                  createdAt: lastOrderReceipt.createdAt.toISOString(),
                },
              }),
            })
            const json = (await res.json()) as { ok?: boolean; error?: string }
            if (!json.ok) {
              if (json.error === 'smtp_not_configured') {
                alert(t('retailLoyalty.emailNotConfigured'))
              } else {
                alert(t('retailKassaPage.receiptEmailFailed'))
              }
              return
            }
            setShowSuccessModal(false)
            focusBarcodeCapture()
          }}
        />
      ) : null}

      {printAgentFallbackHtml !== null && (
        <div
          className="fixed inset-0 z-[220] flex items-center justify-center bg-black/55 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className={`w-full max-w-md space-y-3 p-5 ${KASSA_POS_BTN_SHAPE} ${KASSA_POS_MENU_PLATE_SHELL_BG_CLASS} border ${KASSA_POS_RULE_BLACK}`}
          >
            <p className="text-sm font-semibold text-white">{t('kassaApp.printAgentFallbackModalTitle')}</p>
            <p className="text-xs text-white/75">{t('kassaApp.printAgentFallbackModalBody')}</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className={`w-full py-2.5 sm:w-auto ${kassaPosButtonClass(false)}`}
                onClick={() => setPrintAgentFallbackHtml(null)}
              >
                {t('kassaApp.printAgentFallbackModalClose')}
              </button>
              <button
                type="button"
                disabled={!printAgentFallbackHtml || isAndroidTabletPrintClient()}
                className={`w-full py-2.5 sm:w-auto ${kassaPosButtonClass(true)} disabled:opacity-50`}
                onClick={() => {
                  const h = printAgentFallbackHtml
                  setPrintAgentFallbackHtml(null)
                  setThermalPrintBanner(null)
                  if (h) tryBrowserPrintFallback(h)
                }}
              >
                {t('kassaApp.printAgentFallbackModalContinue')}
              </button>
            </div>
          </div>
        </div>
      )}

      {articleSearchModalOpen && articleSearchResults.length > 0 ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 p-4">
          <div
            className={`flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden ${KASSA_POS_BTN_SHAPE} ${KASSA_POS_MENU_PLATE_SHELL_BG_CLASS} border ${KASSA_POS_RULE_BLACK}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="retail-article-search-modal-title"
          >
            <div className="flex shrink-0 items-start justify-between gap-2 border-b border-white/10 px-4 py-3">
              <div className="min-w-0">
                <p id="retail-article-search-modal-title" className="text-lg font-bold text-white">
                  {t('retailKassaPage.searchMultipleTitle')}
                </p>
                <p className="text-sm text-white/70">{t('retailKassaPage.searchMultipleHint')}</p>
              </div>
              <button
                type="button"
                className={`shrink-0 px-3 py-2 text-sm font-bold ${kassaPosButtonClass(false)}`}
                onClick={closeArticleSearchModal}
              >
                {t('common.close')}
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto overscroll-y-contain p-2 sm:p-3">
              <div className="flex min-w-[42rem] flex-col gap-2">
                {articleSearchResults.map((sku) => (
                  <div key={sku.lineKey}>
                    {renderScanBarRow(sku.lineKey, sku, {
                      onSelect: () => pickArticleFromSearchModal(sku),
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {importModalOpen ? (
        <div className="fixed inset-0 z-[125] flex items-center justify-center bg-black/70 p-4">
          <div
            className={`flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden ${KASSA_POS_BTN_SHAPE} ${KASSA_POS_MENU_PLATE_SHELL_BG_CLASS} border ${KASSA_POS_RULE_BLACK}`}
          >
            <div className="border-b border-white/10 px-4 py-3">
              <p className="text-lg font-bold text-white">{t('retailKassaPage.importTitle')}</p>
              <p className="text-sm text-white/70">
                {t('retailKassaPage.importPreview').replace('{count}', String(importPreview.length))}
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2 text-xs text-white/85">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-white/50">
                    <th className="py-1 pr-2">{t('retailKassaPage.barcodeCol')}</th>
                    <th className="py-1 pr-2">{t('retailKassaPage.nameCol')}</th>
                    <th className="py-1">{t('retailKassaPage.price')}</th>
                  </tr>
                </thead>
                <tbody>
                  {importPreview.slice(0, 12).map((row, i) => (
                    <tr key={`${row.barcode}-${i}`} className="border-t border-white/10">
                      <td className="py-1 pr-2 font-mono tabular-nums">{row.barcode}</td>
                      <td className="py-1 pr-2">{row.name}</td>
                      <td className="py-1 tabular-nums">€{row.price.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {importPreview.length > 12 ? (
                <p className="mt-2 text-white/50">+{importPreview.length - 12} …</p>
              ) : null}
            </div>
            <div className="flex gap-2 border-t border-white/10 p-4">
              <button
                type="button"
                disabled={importBusy}
                onClick={() => {
                  setImportModalOpen(false)
                  setImportPreview([])
                  setImportHighlight(null)
                }}
                className={`flex-1 py-2.5 ${kassaPosButtonClass(false)}`}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                disabled={importBusy}
                onClick={() => void confirmProductImport()}
                className={`flex-1 py-2.5 font-bold ${kassaPosButtonClass(true)}`}
              >
                {importBusy ? t('retailKassaPage.importBusy') : t('retailKassaPage.importConfirm')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {thermalPrintBanner ? (
        <div className="fixed inset-x-0 top-0 z-[210] bg-red-900/95 px-4 py-3 text-center text-xs text-white whitespace-pre-line">
          {thermalPrintBanner}
          <button
            type="button"
            className="ml-3 underline"
            onClick={() => setThermalPrintBanner(null)}
          >
            {t('common.close')}
          </button>
        </div>
      ) : null}

      <div className={`flex min-h-0 flex-1 flex-col overflow-hidden ${ui.shellBg}`}>
        <div
          data-testid="retail-kassa-title-header"
          className={`relative z-30 flex min-h-[56px] w-full min-w-0 shrink-0 flex-nowrap items-center gap-1.5 border-b px-2 py-2 sm:gap-2 sm:px-3 ${KASSA_POS_RULE_BLACK} ${
            appearanceDark ? `pb-3 ${KASSA_POS_MENU_PLATE_SHELL_BG_CLASS}`: 'bg-black'
          }`}
        >
          {hamburgerOpen && (
            <div
              className="fixed inset-0 z-10"
              onClick={() => {
                setHamburgerOpen(false)
                setHamburgerSubOpen(null)
              }}
            />
          )}

          <div className="relative z-20 flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setHamburgerSubOpen(null)
                setHamburgerOpen((open) => !open)
              }}
              className={`flex items-center gap-1.5 px-2 py-1.5 transition-colors sm:gap-2 sm:px-3 ${
                appearanceDark
                  ? kassaPosButtonClass(true)
                  : hamburgerOpen
                    ? 'rounded-xl bg-[#47c6fe] text-[#063042]'
                    : 'rounded-xl bg-[#58CCFF] text-[#063042] hover:bg-[#47c6fe]'
              }`}
              title={t('kassaApp.hamburgerMenu')}
              aria-expanded={hamburgerOpen}
            >
              <svg className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span className="font-bold text-[11px] leading-tight sm:text-xs">{t('kassaApp.hamburgerMenu')}</span>
            </button>
            <input
              ref={csvImportInputRef}
              type="file"
              accept=".csv,text/csv,text/plain"
              className="hidden"
              onChange={(e) => {
                void onImportFileSelected(e.target.files?.[0], 'csv')
                e.target.value = ''
              }}
            />
            <input
              ref={excelImportInputRef}
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              className="hidden"
              onChange={(e) => {
                void onImportFileSelected(e.target.files?.[0], 'excel')
                e.target.value = ''
              }}
            />
            <button
              type="button"
              data-testid="retail-import-csv"
              className={headerFileBtnClass(importHighlight === 'csv')}
              title={t('retailKassaPage.importCsvTitle')}
              onClick={() => csvImportInputRef.current?.click()}
            >
              <span>{t('retailKassaPage.importCsv')}</span>
            </button>
            <button
              type="button"
              data-testid="retail-import-excel"
              className={headerFileBtnClass(importHighlight === 'excel')}
              title={t('retailKassaPage.importExcelTitle')}
              onClick={() => excelImportInputRef.current?.click()}
            >
              <span>{t('retailKassaPage.importExcel')}</span>
            </button>
            {hamburgerOpen && (() => {
              const modules = filteredHamburgerModules
              const activeMod = modules.find((m) => m.rowKey === hamburgerSubOpen)
              return (
                <div className="absolute top-full left-0 mt-1 flex z-30">
                  <div className={`${ui.flyMenuPanel} overflow-y-auto`} style={{ width: 240, maxHeight: '85vh'}}>
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
                          className={`flex w-full items-center justify-between px-4 py-3 transition-colors ${hamburgerSubOpen === mod.rowKey ? ui.flyMenuRowActive : ui.flyMenuRowHover}`}
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
                  {hamburgerOpen && hamburgerSubOpen && activeMod && (
                    <div className={`ml-2 overflow-y-auto self-start ${ui.flyMenuPanel}`} style={{ width: 220, maxHeight: '85vh'}}>
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

          {KASSA_UI_APPEARANCE_TOGGLE_ENABLED ? (
            <button
              type="button"
              onClick={toggleKassaAppearance}
              className={headerQuickLinkBtnClass}
              title={appearanceDark ? t('kassaApp.lightMode') : t('kassaApp.darkMode')}
            >
              <span className={KASSA_HEADER_QUICK_LINK_LABEL}>
                {appearanceDark ? t('kassaApp.lightMode') : t('kassaApp.darkMode')}
              </span>
            </button>
          ) : null}

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
                className={`size-4 shrink-0 transition-transform ${langOpen ? 'rotate-180': ''}`}
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
            className={`relative z-20 ${
              appearanceDark
                ? headerUtilityBtnClass(true)
                : 'relative z-20 inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-lg bg-[#58CCFF] px-1.5 py-1 text-[11px] font-bold text-black transition-colors hover:bg-[#47c6fe] sm:gap-1 sm:px-2.5 sm:py-1.5 sm:text-sm'
            }`}
          >
            <span className={KASSA_HEADER_QUICK_LINK_LABEL}>{t('kassaApp.logout')}</span>
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden w-full">
          <div
            data-testid="retail-kassa-mode-bar"
            className={`shrink-0 flex gap-2 overflow-x-auto border-b px-3 py-2 sm:gap-2.5 sm:px-4 ${KASSA_POS_RULE_BLACK} ${KASSA_POS_MENU_PLATE_SHELL_BG_CLASS} [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
          >
            <button
              type="button"
              data-testid="retail-mode-sales"
              aria-pressed={mode === 'sales'}
              onClick={() => switchMode('sales')}
              className={retailTopNavBtnClass(mode === 'sales')}
            >
              {t('retailKassaPage.modeSales')}
            </button>
            <button
              type="button"
              data-testid="retail-mode-goods-receipt"
              aria-pressed={mode === 'goodsReceipt'}
              onClick={() => switchMode('goodsReceipt')}
              className={retailTopNavBtnClass(mode === 'goodsReceipt')}
            >
              {t('retailKassaPage.modeGoodsReceipt')}
            </button>
            <Link
              href={`${baseUrl}/voorraad`}
              prefetch={false}
              data-testid="retail-nav-voorraad"
              onClick={() => playClick()}
              className={retailTopNavLinkClass}
            >
              {t('adminHamburger.rows.voorraad')}
            </Link>
            <Link
              href={`${baseUrl}/rapporten`}
              prefetch={false}
              data-testid="retail-nav-rapporten"
              onClick={() => playClick()}
              className={retailTopNavLinkClass}
            >
              {t('adminHamburger.rows.rapporten')}
            </Link>
            {showKassaStaffClockButton && clockedInStaff.length > 0 ? (
              <>
                <span
                  className="mx-0.5 hidden h-7 w-px shrink-0 self-center bg-white/30 sm:mx-1 sm:block"
                  aria-hidden
                />
                <div
                  className="flex shrink-0 items-center gap-2"
                  role="group"
                  aria-label={t('staffClock.salesPickTitle')}
                >
                  {clockedInStaff.map((s) => {
                    const active = activeKassaStaff?.id === s.id
                    return (
                      <button
                        key={s.id}
                        type="button"
                        aria-pressed={active}
                        title={
                          active
                            ? t('staffClock.salesActiveBadge').replace('{name}', s.name)
                            : t('staffClock.salesPickStaffButton').replace('{name}', s.name)
                        }
                        onClick={() => selectActiveKassaStaff(s)}
                        className={`${retailTopNavBtnClass(active)} max-w-[9rem] truncate sm:max-w-[10.5rem]`}
                      >
                        <span className="truncate">{s.name}</span>
                      </button>
                    )
                  })}
                </div>
              </>
            ) : null}
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden w-full">
            <div className="flex min-h-0 flex-1 overflow-hidden w-full">
          <div className={`relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${ui.shellBg}`}>
            <input
              ref={barcodeCaptureRef}
              type="text"
              tabIndex={-1}
              autoComplete="off"
              data-kassa-no-web-keyboard
              aria-hidden
              onKeyDown={onBarcodeWedgeKeyDown}
              onBlur={() => {
                if (priceFixSku || articleSearchActiveRef.current) return
                const ae = document.activeElement
                if (ae === scanRef.current) return
                if (ae && ae !== document.body && ae !== barcodeCaptureRef.current) return
                window.setTimeout(() => releaseScanFocus(), 80)
              }}
              className="fixed left-0 top-0 h-px w-px opacity-0 overflow-hidden"
              aria-label={t('retailKassaPage.scanPlaceholder')}
            />
            <form
              onSubmit={onScanSubmit}
              className={`shrink-0 flex items-center gap-2 border-b px-3 pt-2 pb-2 sm:px-4 ${KASSA_POS_RULE_BLACK}`}
            >
              <input
                ref={scanRef}
                type="text"
                inputMode={articleSearchActive ? 'search': 'none'}
                autoComplete="off"
                readOnly={!articleSearchActive}
                data-retail-article-search
                {...(articleSearchActive ? {} : { 'data-kassa-no-web-keyboard': true })}
                placeholder={t('retailKassaPage.scanPlaceholder')}
                value={scanValue}
                onChange={(e) => setScanValue(e.target.value)}
                onPointerDown={(e) => {
                  if (!articleSearchActiveRef.current) {
                    e.preventDefault()
                    openArticleSearchKeyboard()
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
                className={`min-h-[2.35rem] min-w-0 flex-1 rounded-full px-5 py-2 text-base text-[#f0f0f0] placeholder:text-white/45 focus:outline-none sm:min-h-[2.6rem] sm:py-2.5 ${KASSA_POS_FIELD}`}
              />
              <button
                type="submit"
                data-testid="retail-article-search-btn"
                disabled={stockBusy}
                className={`shrink-0 ${retailScanRowActionBtnClass(true)}`}
              >
                {t('retailKassaPage.searchButton')}
              </button>
              <button
                type="button"
                data-testid="retail-add-ok"
                role="status"
                tabIndex={-1}
                aria-hidden={!addOkFlash}
                aria-label={t('retailKassaPage.addOk')}
                className={`pointer-events-none select-none ${
                  addOkFlash
                    ? `${retailTopNavShellClass} ${retailScanRowActionSizeClass} rounded-xl border-2 border-emerald-300/90 bg-emerald-500 font-bold text-white shadow-[0_0_22px_rgba(52,211,153,0.85)] transition-colors duration-150`
                    : `${retailScanRowActionBtnClass(false)} transition-colors duration-300`
                }`}
              >
                {t('retailKassaPage.addOk')}
              </button>
            </form>

            {linkedStoreCredit ? (
              <div
                className={`mx-3 mb-1 shrink-0 rounded-lg border border-sky-400/40 px-3 py-2 sm:mx-4 ${KASSA_POS_MENU_RECESS_TRAY_CLASS}`}
                data-testid="retail-store-credit-linked"
              >
                <p className="text-sm font-semibold text-sky-200">
                  {t('retailKassaPage.storeCreditLinked')
                    .replace('{amount}', linkedStoreCredit.amount_remaining.toFixed(2))
                    .replace('{n}', String(linkedStoreCredit.source_order_number))}
                </p>
                <p className="text-xs text-white/60">{linkedStoreCredit.credit_code}</p>
                <button
                  type="button"
                  className="mt-1 text-xs font-semibold text-white/80 underline"
                  onClick={() => {
                    playClick()
                    setLinkedStoreCredit(null)
                    focusBarcodeCapture()
                  }}
                >
                  {t('retailKassaPage.storeCreditUnlink')}
                </button>
              </div>
            ) : null}

            {loyaltyEnabled && linkedLoyaltyMember ? (
              <div
                className={`flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-3 py-1.5 sm:px-4 ${KASSA_POS_RULE_BLACK} ${KASSA_POS_MENU_PLATE_SHELL_BG_CLASS}`}
                data-testid="retail-loyalty-linked"
              >
                <div className="min-w-0 text-sm font-semibold text-white">
                  <span>
                    {t('retailKassaPage.loyaltyLinked').replace(
                      '{name}',
                      linkedLoyaltyMember.display_name?.trim() ||
                        linkedLoyaltyMember.card_code,
                    )}
                  </span>
                  <span className="ml-2 tabular-nums text-emerald-300">
                    {t('retailKassaPage.loyaltyPointsBalance').replace(
                      '{points}',
                      String(linkedLoyaltyMember.points_balance),
                    )}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {loyaltySettings.redeem_enabled &&
                  cartTotal > 0 &&
                  linkedLoyaltyMember.points_balance > 0 ? (
                    <button
                      type="button"
                      className={`shrink-0 px-3 py-1.5 text-xs font-bold ${retailScanRowBtnClass(false)}`}
                      onClick={() => openLoyaltyRedeemModal()}
                    >
                      {loyaltyRedeemPoints > 0
                        ? t('retailKassaPage.loyaltyRedeemActive').replace(
                            '{points}',
                            String(loyaltyRedeemPoints),
                          )
                        : t('retailKassaPage.loyaltyRedeemOpen')}
                    </button>
                  ) : null}
                  {loyaltyRedeemPoints > 0 ? (
                    <button
                      type="button"
                      className={`shrink-0 px-3 py-1.5 text-xs font-bold ${retailScanRowBtnClass(false)}`}
                      onClick={() => {
                        playClick()
                        clearLoyaltyRedeem()
                      }}
                    >
                      {t('retailKassaPage.loyaltyRedeemClear')}
                    </button>
                  ) : null}
                <button
                  type="button"
                  className={`shrink-0 px-3 py-1.5 text-xs font-bold ${retailScanRowBtnClass(false)}`}
                  onClick={() => {
                    playClick()
                    setLinkedLoyaltyMember(null)
                    setLoyaltyRedeemPoints(0)
                    focusBarcodeCapture()
                  }}
                >
                  {t('retailKassaPage.loyaltyUnlink')}
                </button>
                </div>
              </div>
            ) : null}

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-1 pt-1 sm:px-4">
              <div
                className={`flex min-h-0 flex-1 flex-col overflow-hidden ${KASSA_POS_MENU_RECESS_TRAY_CLASS} ${KASSA_POS_BTN_SHAPE} gks-menu-vignette`}
                data-testid="retail-gray-tray"
              >
                {mode === 'exchangeCredit'? (
                  <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 sm:p-4">
                    <p className="text-sm font-bold text-white">{t('retailKassaPage.exchangeTitle')}</p>
                    <p className="text-xs text-white/70">{t('retailKassaPage.exchangeHint')}</p>
                    <div className="flex flex-wrap items-end gap-2">
                      <label className="flex min-w-[8rem] flex-1 flex-col gap-1 text-xs text-white/80">
                        {t('retailKassaPage.exchangeOrderNumberLabel')}
                        <input
                          type="text"
                          inputMode="numeric"
                          value={exchangeOrderNumberDraft}
                          onChange={(e) => setExchangeOrderNumberDraft(e.target.value)}
                          className={`rounded-lg px-3 py-2 text-base text-black ${KASSA_POS_FIELD}`}
                        />
                      </label>
                      <button
                        type="button"
                        disabled={exchangeLookupBusy}
                        onClick={() => void loadExchangeOrder()}
                        className={`shrink-0 px-4 py-2.5 font-semibold ${kassaPosButtonClass(true)}`}
                      >
                        {exchangeLookupBusy
                          ? t('retailKassaPage.exchangeLoading')
                          : t('retailKassaPage.exchangeLoadOrder')}
                      </button>
                    </div>
                    {exchangeOrderLines ? (
                      <div className="flex min-h-0 flex-1 flex-col gap-2">
                        {exchangeOrderLines.map((line) =>
                          line.quantityReturnable <= 0 ? null : (
                            <div
                              key={line.lineKey}
                              className={`flex flex-wrap items-center gap-2 rounded-lg border border-white/15 px-3 py-2 ${KASSA_POS_MENU_RECESS_TRAY_CLASS}`}
                            >
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-white">{line.name}</p>
                                <p className="text-xs text-white/60">
                                  €{line.price.toFixed(2)} · {t('retailKassaPage.exchangeSold')}{' '}
                                  {line.quantitySold} · {t('retailKassaPage.exchangeReturnable')}{' '}
                                  {line.quantityReturnable}
                                </p>
                              </div>
                              <label className="flex items-center gap-1 text-xs text-white/80">
                                {t('retailKassaPage.exchangeReturnQty')}
                                <input
                                  type="number"
                                  min={0}
                                  max={line.quantityReturnable}
                                  value={exchangeReturnQty[line.lineKey] ?? 0}
                                  onChange={(e) => {
                                    const v = Math.min(
                                      line.quantityReturnable,
                                      Math.max(0, parseInt(e.target.value || '0', 10) || 0),
                                    )
                                    setExchangeReturnQty((prev) => ({ ...prev, [line.lineKey]: v }))
                                  }}
                                  className="w-14 rounded px-2 py-1 text-center text-black"
                                />
                              </label>
                            </div>
                          ),
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : loading && !barHasLines ? (
                  <p className={`flex flex-1 items-center justify-center px-4 text-center text-sm ${ui.menuEmptyMuted}`}>
                    {t('retailKassaPage.loading')}
                  </p>
                ) : !barHasLines ? (
                  <p className={`flex flex-1 items-center justify-center px-4 text-center text-sm ${ui.menuEmptyMuted}`}>
                    {mode === 'sales'? t('retailKassaPage.scanOnlyHint') : null}
                  </p>
                ) : (
                  <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
                    <div
                      className={`${scanBarRowGridClass} shrink-0 border-b border-white/15 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-white/45 sm:px-4`}
                    >
                      <span>{t('retailKassaPage.barcodeCol')}</span>
                      <span>{t('retailKassaPage.nameCol')}</span>
                      <span>{t('retailKassaPage.size')}</span>
                      <span>{t('retailKassaPage.color')}</span>
                      <span>{t('retailKassaPage.stock')}</span>
                      <span>{t('retailKassaPage.price')}</span>
                      <span className="sr-only">{t('common.delete')}</span>
                    </div>
                    <div
                      ref={scanBarRef}
                      data-testid="retail-kassa-scan-bar"
                      className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overflow-x-auto overscroll-y-contain touch-manipulation p-1.5 sm:p-2 [scrollbar-gutter:stable]"
                    >
                      {mode === 'sales'
                        ? cart.map((l) =>
                            renderScanBarRow(l.sku.lineKey, l.sku, {
                              quantity: l.quantity,
                              onRemove: () => {
                                playClick()
                                updateQty(l.sku.lineKey, 0)
                              },
                            }),
                          )
                        : stockActivity.map((row) => {
                            const note =
                              row.mode === 'goodsReceipt'
                                ? `${t('retailKassaPage.stockAdded').replace('{n}', String(row.delta))} · ${row.sku.stock_quantity}`
                                : `${t('retailKassaPage.stockPlusOne')} · ${row.sku.stock_quantity}`
                            return renderScanBarRow(row.key, row.sku, {
                              stockNote: note,
                              onRemove: () => removeStockActivityLine(row.key),
                            })
                          })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div
              className={`flex shrink-0 items-center gap-2 border-t py-1 pl-3 pr-2 sm:gap-2.5 sm:pr-3 ${KASSA_POS_RULE_BLACK} ${KASSA_POS_MENU_PLATE_SHELL_BG_CLASS}`}
            >
              <div
                className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto sm:gap-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                data-testid="retail-plate-tiles"
              >
                {renderRetailPlateTiles()}
              </div>
              <div
                className={`size-[4cm] shrink-0 overflow-hidden rounded-lg border ${KASSA_POS_RULE_BLACK} bg-black/20`}
                data-testid="retail-last-scan-thumb"
              >
                {selectedPreviewSku?.image_url?.trim() ? (
                  <img
                    src={selectedPreviewSku.image_url.trim()}
                    alt={selectedPreviewSku.name}
                    decoding="async"
                    loading="eager"
                    onError={kassaProductImageRetryOnError}
                    className="size-full object-cover"
                  />
                ) : (
                  <div
                    className="flex size-full items-center justify-center text-2xl text-white/25"
                    aria-hidden={!selectedPreviewSku}
                  >
                    {selectedPreviewSku ? '' : null}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div
            className={`flex min-h-0 w-80 min-w-0 flex-shrink-0 flex-col overflow-hidden border-l sm:w-96 lg:w-[380px] ${KASSA_POS_RULE_BLACK} ${KASSA_POS_MENU_PLATE_SHELL_BG_CLASS}`}
          >
            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden px-2.5 pt-3 pb-2 sm:px-3">
              <div
                ref={cartScrollRef}
                className={`flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-y-contain py-0.5 transition-opacity ${
                  numpadPanelVisible ? 'pointer-events-none opacity-[0.28]': 'opacity-100'
                }`}
                data-testid="retail-kassa-cart-scroll"
              >
                {mode !== 'sales'? (
                  stockActivity.length === 0 ? null : (
                    stockActivity
                      .slice()
                      .reverse()
                      .map((row) => (
                        <div
                          key={row.key}
                          role="button"
                          tabIndex={0}
                          data-retail-cart-line={row.key}
                          aria-pressed={selectedListLineKey === row.key}
                          onClick={() => selectRetailListLine(row.key, row.sku)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              selectRetailListLine(row.key, row.sku)
                            }
                          }}
                          className={`${retailListBarShellClass} flex shrink-0 cursor-pointer touch-manipulation items-center gap-2 p-2 transition-[background-color,box-shadow,border-color] ${
                            selectedListLineKey === row.key ? retailListBarSelectedClass : 'hover:bg-neutral-50'
                          }`}
                          data-retail-line-selected={selectedListLineKey === row.key ? 'true': undefined}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-black">{row.sku.name}</p>
                            <p className="text-xs text-black/70">
                              {row.mode === 'goodsReceipt'
                                ? t('retailKassaPage.stockAdded').replace('{n}', String(row.delta))
                                : t('retailKassaPage.stockPlusOne')}{' '}
                              · {t('retailKassaPage.stockNow')}: {row.sku.stock_quantity}
                            </p>
                          </div>
                        </div>
                      ))
                  )
                ) : cart.length === 0 ? null : (
                  cart.map((l) => (
                    <div
                      key={l.sku.lineKey}
                      role="button"
                      tabIndex={0}
                      data-retail-cart-line={l.sku.lineKey}
                      aria-pressed={selectedListLineKey === l.sku.lineKey}
                      onClick={() => selectRetailListLine(l.sku.lineKey, l.sku)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          selectRetailListLine(l.sku.lineKey, l.sku)
                        }
                      }}
                      className={`${retailListBarShellClass} flex shrink-0 cursor-pointer touch-manipulation items-center gap-2 p-2 transition-[background-color,box-shadow,border-color] ${
                        selectedListLineKey === l.sku.lineKey ? retailListBarSelectedClass : 'hover:bg-neutral-50'
                      }`}
                      data-retail-line-selected={selectedListLineKey === l.sku.lineKey ? 'true': undefined}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-black">{l.sku.name}</p>
                        <p className="text-xs tabular-nums text-black/70">
                          €{l.sku.price.toFixed(2)} × {l.quantity}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => updateQty(l.sku.lineKey, l.quantity - 1)}
                          className={retailListBarRemoveBtnClass}
                          aria-label={t('kassaApp.ariaDecreaseQty')}
                        >
                          {l.quantity === 1 ? '' : '−'}
                        </button>
                        <span className="w-6 text-center text-sm font-bold text-black">{l.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQty(l.sku.lineKey, l.quantity + 1)}
                          className={retailListBarRemoveBtnClass}
                          aria-label={t('kassaApp.ariaIncreaseQty')}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {lastOrderReceipt != null && lastOrderReceipt.orderNumber > 0 && (
                <p className="shrink-0 text-center text-xs text-emerald-300/90 py-1">
                  {t('retailKassaPage.lastOrder').replace('{n}', String(lastOrderReceipt.orderNumber))}
                </p>
              )}

              <div
                className={`absolute inset-0 z-[3] flex min-h-0 flex-col justify-end overflow-hidden ${KASSA_NUMPAD_PANEL_SLIDE_MOTION} ${
                  numpadPanelVisible ? 'translate-y-0 pointer-events-auto': 'translate-y-full pointer-events-none'
                }`}
                data-testid="retail-numpad-panel"
                aria-hidden={!numpadPanelVisible}
              >
                <div className="flex min-h-[15rem] flex-1 flex-col justify-end">
                  <div className={`mb-3 flex shrink-0 items-center gap-2.5 rounded-xl px-2.5 py-2 ${ui.numpadBarBg}`}>
                    {showKassaStaffClockButton ? (
                      <button
                        type="button"
                        onClick={() => openStaffClockModal()}
                        className={`shrink-0 active:scale-[0.98] transition-all ${ui.clockTileBg} ${ui.clockTileHover}`}
                        title={t('staffClock.buttonTitle')}
                        aria-label={t('staffClock.buttonTitle')}
                      >
                        <KassaAnalogClock size={72} />
                      </button>
                    ) : null}
                    <input
                      type="text"
                      value={numpadValue}
                      readOnly
                      tabIndex={-1}
                      aria-label={t('kassaApp.numpadPlaceholder')}
                      className={`min-w-0 flex-1 border-none bg-transparent text-right text-2xl font-bold outline-none sm:text-3xl ${ui.numpadInput}`}
                    />
                  </div>
                  <div
                    className="grid shrink-0 grid-cols-4 touch-manipulation select-none gap-2.5 [grid-template-rows:repeat(4,minmax(2.75rem,1fr))]"
                    onClick={(e) => {
                      const el = (e.target as HTMLElement).closest('[data-retail-numpad-key]')
                      if (!el || !(el instanceof HTMLElement)) return
                      const k = el.dataset.retailNumpadKey
                      if (k) handleNumpad(k)
                    }}
                  >
                    {RETAIL_NUMPAD_KEYS.map((key) => (
                      <button
                        key={key}
                        type="button"
                        data-retail-numpad-key={key}
                        className={ui.numpadKeyNum}
                      >
                        {key}
                      </button>
                    ))}
                  </div>
                  {numpadValue && parseFloat(numpadValue) > 0 ? (
                    <button
                      type="button"
                      data-testid="retail-add-custom-amount"
                      onClick={addCustomAmountFromNumpad}
                      className={`mt-3 shrink-0 touch-manipulation py-4 text-base font-bold ${kassaPosButtonClass(true)}`}
                    >
                      {t('kassaApp.addAmount').replace('{amount}', parseFloat(numpadValue || '0').toFixed(2))}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div
              className={`shrink-0 border-t px-3 py-2 space-y-2.5 ${KASSA_POS_RULE_BLACK}`}
            >
              <div className="flex w-full touch-manipulation select-none gap-3">
                <div
                  role="status"
                  aria-live="polite"
                  className={`flex min-h-[3.35rem] w-full min-w-0 items-center justify-between gap-2 px-3 py-2.5 sm:min-h-[3.65rem] ${kassaPosRaisedStripClass()}`}
                >
                  <span className={`shrink-0 text-lg font-bold tracking-[0.04em] sm:text-xl ${ui.numpadMeta}`}>
                    {mode === 'sales'
                      ? t('kassaApp.cartTotal')
                      : mode === 'exchangeCredit'
                        ? t('retailKassaPage.exchangeCreditTotalLabel')
                        : t('retailKassaPage.stockScans')}
                  </span>
                  <span
                    className={`min-w-0 truncate text-right font-bold tabular-nums tracking-tight text-[1.75rem] sm:text-[2rem] ${
                      mode === 'sales'? 'text-red-500': mode === 'exchangeCredit'? 'text-sky-300': 'text-emerald-300'
                    }`}
                  >
                    {mode === 'sales'
                      ? loyaltyDiscountEuro > 0 || storeCreditEuro > 0
                        ? `€${payTotal.toFixed(2)}`
                        : `€${cartTotal.toFixed(2)}`
                      : mode === 'exchangeCredit'
                        ? `€${exchangeCreditIssueTotal.toFixed(2)}`
                        : String(stockActivity.reduce((s, r) => s + r.delta, 0))}
                  </span>
                </div>
                {mode === 'sales' && loyaltyDiscountEuro > 0 ? (
                  <p className="text-right text-xs font-semibold text-emerald-300">
                    {t('retailKassaPage.loyaltyDiscountLine')
                      .replace('{points}', String(loyaltyRedeemPoints))
                      .replace('{euro}', loyaltyDiscountEuro.toFixed(2))}
                  </p>
                ) : null}
                {mode === 'sales' && storeCreditEuro > 0 ? (
                  <p className="text-right text-xs font-semibold text-sky-300">
                    {t('retailKassaPage.storeCreditDiscountLine').replace(
                      '{euro}',
                      storeCreditEuro.toFixed(2),
                    )}
                  </p>
                ) : null}
              </div>
              <div className="grid grid-cols-3 touch-manipulation select-none gap-3">
                {mode === 'sales'? (
                  <>
                    <button
                      type="button"
                      onClick={() => void openCashDrawer()}
                      className={`flex items-center justify-center px-2 py-3 ${retailSidebarFooterActionMinH} ${kassaPosButtonClass(false)}`}
                      title={t('kassaApp.drawerOpen')}
                    >
                      <span className={kassaSidebarActionLabelClass}>{t('kassaApp.drawerOpen')}</span>
                    </button>
                    <button
                      type="button"
                      disabled={cart.length === 0 || draftBonPrinting}
                      onClick={() => void printDraftBonFromCart()}
                      className={`flex items-center justify-center px-2 py-3 ${retailSidebarFooterActionMinH} ${kassaPosButtonClass(false)}`}
                      title={t('kassaApp.cartBonTitle')}
                    >
                      <span className={kassaSidebarActionLabelClass}>
                        {draftBonPrinting ? t('kassaReceipt.printSending') : t('kassaApp.cartBon')}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={clearCart}
                      disabled={cart.length === 0}
                      className={`flex items-center justify-center px-2 py-3 ${retailSidebarFooterActionMinH} ${kassaPosButtonClass(false)}`}
                      title={t('kassaApp.remove')}
                    >
                      <span className={kassaSidebarActionLabelClass}>{t('kassaApp.remove')}</span>
                    </button>
                  </>
                ) : mode === 'exchangeCredit'? (
                  <button
                    type="button"
                    onClick={() => switchMode('sales')}
                    className={`col-span-3 flex items-center justify-center px-2 py-3 ${retailSidebarFooterActionMinH} ${kassaPosButtonClass(false)}`}
                  >
                    <span className={kassaSidebarActionLabelClass}>
                      {t('retailKassaPage.exchangeGoToSales')}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={clearStockActivity}
                    disabled={stockActivity.length === 0}
                    className={`col-span-3 flex items-center justify-center px-2 py-3 ${retailSidebarFooterActionMinH} ${kassaPosButtonClass(false)}`}
                    title={t('kassaApp.remove')}
                  >
                    <span className={kassaSidebarActionLabelClass}>{t('retailKassaPage.clearStockLog')}</span>
                  </button>
                )}
              </div>
              <div className="flex touch-manipulation select-none gap-2.5">
                <button
                  type="button"
                  aria-pressed={numpadPanelVisible}
                  data-testid="retail-numpad-toggle"
                  onClick={toggleNumpadPanel}
                  className={`flex items-center justify-center px-3 py-3.5 ${retailSidebarFooterPrimaryMinH} ${KASSA_SIDEBAR_FOOTER_LEFT_COL} ${kassaPosButtonClass(numpadPanelVisible)}`}
                  title={t('kassaApp.numpadToggle')}
                >
                  <span className={kassaSidebarActionLabelClass}>{t('kassaApp.numpadToggle')}</span>
                </button>
                {mode === 'sales'? (
                  <button
                    type="button"
                    data-testid="retail-kassa-checkout"
                    onClick={() => {
                      if (cart.length === 0) return
                      if (blockSaleWithoutStaffIfNeeded()) return
                      setShowPaymentModal(true)
                      playClick()
                    }}
                    disabled={cart.length === 0}
                    className={`flex min-w-0 flex-1 items-center justify-center py-3.5 text-xl font-bold sm:text-[1.35rem] ${retailSidebarFooterPrimaryMinH} ${KASSA_POS_CHECKOUT_BTN}`}
                  >
                    {t('kassaApp.checkout')}
                  </button>
                ) : mode === 'exchangeCredit'? (
                  <button
                    type="button"
                    data-testid="retail-issue-store-credit"
                    disabled={
                      !exchangeOrderLines ||
                      exchangeCreditIssueTotal <= 0 ||
                      exchangeIssueBusy
                    }
                    onClick={() => void issueExchangeStoreCredit()}
                    className={`flex min-w-0 flex-1 items-center justify-center py-3.5 text-lg font-bold sm:text-xl ${retailSidebarFooterPrimaryMinH} ${KASSA_POS_CHECKOUT_BTN}`}
                  >
                    {exchangeIssueBusy
                      ? t('retailKassaPage.exchangeIssuing')
                      : t('retailKassaPage.exchangeIssueCredit')}
                  </button>
                ) : (
                  <div
                    className={`flex min-w-0 flex-1 items-center justify-center py-3.5 text-base font-semibold text-white/80 sm:text-lg ${retailSidebarFooterPrimaryMinH} ${kassaPosRaisedStripClass()}`}
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
      </div>
    </div>
  )
}
