'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  completeRetailCashSale,
  fetchRetailPosProducts,
  findRetailProductByBarcode,
  retailLineInStock,
  type RetailCartLine,
  type RetailPosProduct,
} from '@/lib/retail-kassa-pos'
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
  const scanBarRef = useRef<HTMLDivElement>(null)
  const langRef = useRef<HTMLDivElement>(null)

  const [tenantInfo, setTenantInfo] = useState<TenantSettings | null>(null)
  const [products, setProducts] = useState<RetailPosProduct[]>([])
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

  const reload = useCallback(async () => {
    setLoading(true)
    const list = await fetchRetailPosProducts(tenant)
    setProducts(list)
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

  useEffect(() => {
    scanRef.current?.focus()
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
    () => cart.reduce((s, l) => s + l.product.price * l.quantity, 0),
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

  function addToCart(p: RetailPosProduct, qty = 1) {
    if (!retailLineInStock(p, qty)) {
      alert(t('retailKassaPage.outOfStock'))
      return
    }
    setCart((prev) => {
      const i = prev.findIndex((l) => l.product.id === p.id)
      if (i < 0) return [...prev, { product: p, quantity: qty }]
      const next = [...prev]
      const merged = next[i].quantity + qty
      if (!retailLineInStock(p, merged)) {
        alert(t('retailKassaPage.outOfStock'))
        return prev
      }
      next[i] = { ...next[i], quantity: merged }
      return next
    })
    setScanValue('')
    scanRef.current?.focus()
    requestAnimationFrame(() => {
      const el = scanBarRef.current
      if (el) el.scrollLeft = el.scrollWidth
    })
  }

  function updateQty(productId: string, qty: number) {
    if (qty < 1) {
      setCart((prev) => prev.filter((l) => l.product.id !== productId))
      return
    }
    setCart((prev) => {
      const i = prev.findIndex((l) => l.product.id === productId)
      if (i < 0) return prev
      const p = prev[i].product
      if (!retailLineInStock(p, qty)) {
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
    scanRef.current?.focus()
  }

  function onScanSubmit(e: React.FormEvent) {
    e.preventDefault()
    const hit = findRetailProductByBarcode(products, scanValue)
    if (hit) addToCart(hit, 1)
    else alert(t('retailKassaPage.barcodeNotFound'))
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
    scanRef.current?.focus()
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
            <form
              onSubmit={onScanSubmit}
              className="shrink-0 flex gap-2 px-3 pt-2 pb-1.5 sm:px-4"
            >
              <input
                ref={scanRef}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder={t('retailKassaPage.scanPlaceholder')}
                value={scanValue}
                onChange={(e) => setScanValue(e.target.value)}
                className={`flex-1 px-4 py-2.5 text-base text-[#f0f0f0] placeholder:text-white/45 focus:outline-none ${KASSA_POS_FIELD}`}
              />
              <button type="submit" className={`shrink-0 px-5 py-2.5 font-bold ${kassaPosButtonClass(true)}`}>
                {t('retailKassaPage.add')}
              </button>
            </form>

            <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 pt-0.5 sm:px-4">
              <div
                className={`flex min-h-0 flex-1 flex-col overflow-hidden justify-center ${KASSA_POS_MENU_RECESS_TRAY_CLASS} ${KASSA_POS_BTN_SHAPE} gks-menu-vignette`}
              >
                {loading && cart.length === 0 ? (
                  <p className={`px-4 text-center text-sm ${ui.menuEmptyMuted}`}>{t('retailKassaPage.loading')}</p>
                ) : cart.length === 0 ? (
                  <p className={`px-6 text-center text-base font-medium sm:text-lg ${ui.menuEmptyMuted}`}>
                    {t('retailKassaPage.scanOnlyHint')}
                  </p>
                ) : (
                  <div
                    ref={scanBarRef}
                    data-testid="retail-kassa-scan-bar"
                    className="flex w-full min-h-[9.5rem] max-h-[42vh] flex-row items-stretch gap-3 overflow-x-auto overflow-y-hidden overscroll-x-contain px-4 py-5 touch-manipulation [scrollbar-gutter:stable]"
                  >
                    {cart.map((l) => {
                      const p = l.product
                      return (
                        <div
                          key={p.id}
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
                              {t('retailKassaPage.article')}: {p.article_number || '—'}
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
                {cart.length === 0 ? (
                  <p className="px-2 py-8 text-center text-sm text-white/50">{t('retailKassaPage.cartEmpty')}</p>
                ) : (
                  cart.map((l) => (
                    <div key={l.product.id} className={KASSA_POS_CART_ROW}>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#f2f2f2]">{l.product.name}</p>
                        <p className="text-xs tabular-nums text-white/70">
                          €{l.product.price.toFixed(2)} × {l.quantity}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => updateQty(l.product.id, l.quantity - 1)}
                          className={kassaPosCartQtyButtonClass(true)}
                          aria-label={t('kassaApp.ariaDecreaseQty')}
                        >
                          {l.quantity === 1 ? '🗑' : '−'}
                        </button>
                        <span className="w-6 text-center text-sm font-bold text-[#f0f0f0]">{l.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQty(l.product.id, l.quantity + 1)}
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
                    {t('kassaApp.cartTotal')}
                  </span>
                  <span className="min-w-0 truncate text-right font-bold tabular-nums tracking-tight text-red-500 text-2xl sm:text-[1.65rem]">
                    €{total.toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 touch-manipulation select-none gap-3">
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
              </div>
              <div className="flex touch-manipulation select-none gap-2.5">
                <button
                  type="button"
                  onClick={() => scanRef.current?.focus()}
                  className={`flex items-center justify-center px-3 min-h-[3.5rem] py-3 ${KASSA_SIDEBAR_FOOTER_LEFT_COL} ${kassaPosButtonClass(false)}`}
                  title={t('retailKassaPage.scanPlaceholder')}
                >
                  <span className={kassaSidebarActionLabelClass}>{t('kassaApp.numpadToggle')}</span>
                </button>
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
