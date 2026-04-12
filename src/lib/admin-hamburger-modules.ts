import type { TenantModuleId } from '@/lib/tenant-modules'
import { isTenantSubmenuEffectiveOn } from '@/lib/tenant-modules'

/** Altijd bereikbaar in menu en routes (abonnement / facturatie). */
export const SUBMENU_IDS_ALWAYS_ON = new Set<string>(['sm_abonnement'])

export type AdminHamburgerItem = {
  id: string
  icon: string
  /** Fallback als `labelKey` ontbreekt of vertaling niet geladen is */
  label: string
  /** Vertaalde label via `t(labelKey)` (kassa / superadmin / …) */
  labelKey?: string
  href: string
}

export type AdminHamburgerModule = {
  /** Unieke rij voor React / open submenu (bij twee rijen dezelfde `key`). */
  rowKey: string
  key: TenantModuleId
  icon: string
  label: string
  /** Vertaalde titel van de submenu-rij */
  labelKey?: string
  items: AdminHamburgerItem[]
}

/** Superadmin: één kaart per tenant-module; submenu’s van dubbele rijen mergen. */
export function mergeHamburgerRowsByTenantModule(
  modules: AdminHamburgerModule[]
): Record<TenantModuleId, AdminHamburgerModule> {
  const acc: Partial<Record<TenantModuleId, AdminHamburgerModule>> = {}
  for (const m of modules) {
    const cur = acc[m.key]
    if (!cur) {
      acc[m.key] = { ...m, items: [...m.items] }
    } else {
      const seen = new Set(cur.items.map((i) => i.id))
      const extra = m.items.filter((i) => !seen.has(i.id))
      acc[m.key] = { ...cur, items: [...cur.items, ...extra] }
    }
  }
  return acc as Record<TenantModuleId, AdminHamburgerModule>
}

function rowLabelKey(rowKey: string) {
  return `adminHamburger.rows.${rowKey}`
}

function itemLabelKey(id: string) {
  return `adminHamburger.items.${id}`
}

export function buildHamburgerModules(baseUrl: string, shopTenant: string): AdminHamburgerModule[] {
  return [
    {
      rowKey: 'bestellingen',
      key: 'online-bestellingen',
      icon: '📲',
      label: 'Bestellingen',
      labelKey: rowLabelKey('bestellingen'),
      items: [
        {
          id: 'sm_orders_bestellingen',
          icon: '📦',
          label: 'Bestellingen',
          labelKey: itemLabelKey('sm_orders_bestellingen'),
          href: `${baseUrl}/bestellingen`,
        },
        {
          id: 'sm_orders_groepen',
          icon: '🏢',
          label: 'Groepsbestellingen',
          labelKey: itemLabelKey('sm_orders_groepen'),
          href: `${baseUrl}/groepen`,
        },
        {
          id: 'sm_orders_school_shop',
          icon: '🏫',
          label: 'Schoolbestelling',
          labelKey: itemLabelKey('sm_orders_school_shop'),
          href: `${baseUrl}/groepen/school-shop`,
        },
      ],
    },
    {
      rowKey: 'kassa',
      key: 'kassa',
      icon: '🖥️',
      label: 'Kassa',
      labelKey: rowLabelKey('kassa'),
      items: [
        {
          id: 'sm_kassa_pincode',
          icon: '🔐',
          label: 'Pincode',
          labelKey: itemLabelKey('sm_kassa_pincode'),
          href: `${baseUrl}/pincode`,
        },
        {
          id: 'sm_kassa_categorieen',
          icon: '📁',
          label: 'Categorieën',
          labelKey: itemLabelKey('sm_kassa_categorieen'),
          href: `${baseUrl}/categorieen`,
        },
        {
          id: 'sm_kassa_producten',
          icon: '🍟',
          label: 'Producten',
          labelKey: itemLabelKey('sm_kassa_producten'),
          href: `${baseUrl}/producten`,
        },
        {
          id: 'sm_kassa_opties',
          icon: '➕',
          label: "Opties & Extra's",
          labelKey: itemLabelKey('sm_kassa_opties'),
          href: `${baseUrl}/opties`,
        },
        {
          id: 'sm_kassa_voorraad',
          icon: '📦',
          label: 'Voorraad',
          labelKey: itemLabelKey('sm_kassa_voorraad'),
          href: `${baseUrl}/voorraad`,
        },
        {
          id: 'sm_kassa_allergenen',
          icon: '⚠️',
          label: 'Allergenen',
          labelKey: itemLabelKey('sm_kassa_allergenen'),
          href: `${baseUrl}/allergenen`,
        },
        {
          id: 'sm_kassa_bonnenprinter',
          icon: '🖨️',
          label: 'Bonnenprinter',
          labelKey: itemLabelKey('sm_kassa_bonnenprinter'),
          href: `${baseUrl}/bonnenprinter`,
        },
        {
          id: 'sm_kassa_labels',
          icon: '🏷️',
          label: 'Labels',
          labelKey: itemLabelKey('sm_kassa_labels'),
          href: `${baseUrl}/labels`,
        },
      ],
    },
    {
      rowKey: 'online-platform',
      key: 'online',
      icon: '🛒',
      label: 'Online platform',
      labelKey: rowLabelKey('online-platform'),
      items: [
        {
          id: 'sm_online_status',
          icon: '🟢',
          label: 'Online Aan/Uitzetten',
          labelKey: itemLabelKey('sm_online_status'),
          href: `${baseUrl}/online-status`,
        },
        {
          id: 'sm_online_klanten',
          icon: '👥',
          label: 'Klanten',
          labelKey: itemLabelKey('sm_online_klanten'),
          href: `${baseUrl}/klanten`,
        },
        {
          id: 'sm_online_beloningen',
          icon: '🎁',
          label: 'Beloningen',
          labelKey: itemLabelKey('sm_online_beloningen'),
          href: `${baseUrl}/klanten/beloningen`,
        },
        {
          id: 'sm_online_promoties',
          icon: '🎫',
          label: 'Promoties',
          labelKey: itemLabelKey('sm_online_promoties'),
          href: `${baseUrl}/promoties`,
        },
        {
          id: 'sm_online_whatsapp',
          icon: '💬',
          label: 'WhatsApp',
          labelKey: itemLabelKey('sm_online_whatsapp'),
          href: `${baseUrl}/whatsapp`,
        },
      ],
    },
    {
      rowKey: 'website',
      key: 'website',
      icon: '🌐',
      label: 'Website',
      labelKey: rowLabelKey('website'),
      items: [
        {
          id: 'sm_web_profiel',
          icon: '🏠',
          label: 'Zaak Profiel',
          labelKey: itemLabelKey('sm_web_profiel'),
          href: `${baseUrl}/profiel`,
        },
        {
          id: 'sm_online_cadeaubonnen',
          icon: '🎟️',
          label: 'Cadeaubonnen',
          labelKey: itemLabelKey('sm_online_cadeaubonnen'),
          href: `${baseUrl}/cadeaubonnen`,
        },
        {
          id: 'sm_inst_opening',
          icon: '🕐',
          label: 'Openingstijden',
          labelKey: itemLabelKey('sm_inst_opening'),
          href: `${baseUrl}/openingstijden`,
        },
        {
          id: 'sm_inst_levering',
          icon: '🚚',
          label: 'Levering & Afhalen',
          labelKey: itemLabelKey('sm_inst_levering'),
          href: `${baseUrl}/levering`,
        },
        {
          id: 'sm_web_design',
          icon: '🎨',
          label: 'Design',
          labelKey: itemLabelKey('sm_web_design'),
          href: `${baseUrl}/design`,
        },
        {
          id: 'sm_web_seo',
          icon: '🔍',
          label: 'SEO',
          labelKey: itemLabelKey('sm_web_seo'),
          href: `${baseUrl}/seo`,
        },
        {
          id: 'sm_web_teksten',
          icon: '📝',
          label: 'Teksten & Info',
          labelKey: itemLabelKey('sm_web_teksten'),
          href: `${baseUrl}/teksten`,
        },
        {
          id: 'sm_web_reviews',
          icon: '⭐',
          label: 'Reviews',
          labelKey: itemLabelKey('sm_web_reviews'),
          href: `${baseUrl}/reviews`,
        },
        {
          id: 'sm_web_marketing',
          icon: '📣',
          label: 'Marketing',
          labelKey: itemLabelKey('sm_web_marketing'),
          href: `${baseUrl}/marketing`,
        },
        {
          id: 'sm_web_qr',
          icon: '📱',
          label: 'QR Codes',
          labelKey: itemLabelKey('sm_web_qr'),
          href: `${baseUrl}/qr-codes`,
        },
        {
          id: 'sm_web_media',
          icon: '🖼️',
          label: 'Media',
          labelKey: itemLabelKey('sm_web_media'),
          href: `${baseUrl}/media`,
        },
        {
          id: 'sm_web_team',
          icon: '👥',
          label: 'Mijn team',
          labelKey: itemLabelKey('sm_web_team'),
          href: `${baseUrl}/team`,
        },
        {
          id: 'sm_web_site_preview',
          icon: '🔗',
          label: 'Bekijk je Website',
          labelKey: itemLabelKey('sm_web_site_preview'),
          href: `/shop/${shopTenant}`,
        },
      ],
    },
    {
      rowKey: 'reservaties',
      key: 'reservaties',
      icon: '📅',
      label: 'Reservaties',
      labelKey: rowLabelKey('reservaties'),
      items: [
        {
          id: 'sm_reserveringen',
          icon: '📅',
          label: 'Restaurant Reservaties',
          labelKey: itemLabelKey('sm_reserveringen'),
          href: `${baseUrl}/reserveringen`,
        },
      ],
    },
    {
      rowKey: 'personeel',
      key: 'personeel',
      icon: '👔',
      label: 'Personeel',
      labelKey: rowLabelKey('personeel'),
      items: [
        {
          id: 'sm_personeel_team',
          icon: '👤',
          label: 'Medewerkers',
          labelKey: itemLabelKey('sm_personeel_team'),
          href: `${baseUrl}/personeel`,
        },
        {
          id: 'sm_personeel_inuitklokken',
          icon: '⏰',
          label: 'In/uitklokken',
          labelKey: 'personeelPage.submenuInOutClocking',
          href: `${baseUrl}/inklokken`,
        },
        {
          id: 'sm_personeel_uren',
          icon: '⏱️',
          label: 'Urenregistratie',
          labelKey: itemLabelKey('sm_personeel_uren'),
          href: `${baseUrl}/uren`,
        },
        {
          id: 'sm_personeel_vacatures',
          icon: '📋',
          label: 'Vacatures',
          labelKey: itemLabelKey('sm_personeel_vacatures'),
          href: `${baseUrl}/vacatures`,
        },
      ],
    },
    {
      rowKey: 'online-schermen',
      key: 'online-bestellingen',
      icon: '📲',
      label: 'Online',
      labelKey: rowLabelKey('online-schermen'),
      items: [
        {
          id: 'sm_orders_display',
          icon: '🖥️',
          label: 'Online Scherm',
          labelKey: itemLabelKey('sm_orders_display'),
          href: `/shop/${shopTenant}/display`,
        },
        {
          id: 'sm_orders_keuken',
          icon: '👨‍🍳',
          label: 'Keuken Scherm',
          labelKey: itemLabelKey('sm_orders_keuken'),
          href: `/keuken/${shopTenant}`,
        },
        {
          id: 'sm_online_shop_preview',
          icon: '🔗',
          label: 'Bekijk je Shop',
          labelKey: itemLabelKey('sm_online_shop_preview'),
          href: `/shop/${shopTenant}`,
        },
      ],
    },
    {
      rowKey: 'kosten',
      key: 'kosten',
      icon: '🧮',
      label: 'Kosten berekening',
      labelKey: rowLabelKey('kosten'),
      items: [
        {
          id: 'sm_kosten_marge',
          icon: '⚙️',
          label: 'Marge Instellingen',
          labelKey: itemLabelKey('sm_kosten_marge'),
          href: `${baseUrl}/kosten/instellingen`,
        },
        {
          id: 'sm_kosten_ingredienten',
          icon: '🥬',
          label: 'Ingrediënten',
          labelKey: itemLabelKey('sm_kosten_ingredienten'),
          href: `${baseUrl}/kosten/ingredienten`,
        },
        {
          id: 'sm_kosten_product',
          icon: '📊',
          label: 'Product Kostprijs',
          labelKey: itemLabelKey('sm_kosten_product'),
          href: `${baseUrl}/kosten/producten`,
        },
      ],
    },
    {
      rowKey: 'rapporten',
      key: 'rapporten',
      icon: '📊',
      label: 'Rapporten',
      labelKey: rowLabelKey('rapporten'),
      items: [
        {
          id: 'sm_rpt_rapporten',
          icon: '📊',
          label: 'Rapportages',
          labelKey: itemLabelKey('sm_rpt_rapporten'),
          href: `${baseUrl}/rapporten`,
        },
        {
          id: 'sm_rpt_z',
          icon: '🧾',
          label: 'Z-Rapporten (GKS)',
          labelKey: itemLabelKey('sm_rpt_z'),
          href: `${baseUrl}/z-rapport`,
        },
        {
          id: 'sm_rpt_analyse',
          icon: '📈',
          label: 'Bedrijfsanalyse',
          labelKey: itemLabelKey('sm_rpt_analyse'),
          href: `${baseUrl}/analyse`,
        },
        {
          id: 'sm_rpt_verkoop',
          icon: '💹',
          label: 'Verkoop',
          labelKey: itemLabelKey('sm_rpt_verkoop'),
          href: `${baseUrl}/verkoop`,
        },
        {
          id: 'sm_rpt_populair',
          icon: '🔥',
          label: 'Populaire items',
          labelKey: itemLabelKey('sm_rpt_populair'),
          href: `${baseUrl}/populair`,
        },
        {
          id: 'sm_rpt_kasboek',
          icon: '📒',
          label: 'Digitaal kasboek',
          labelKey: 'adminLayout.digitalCashBookSubmenu',
          href: `${baseUrl}/kasboek`,
        },
      ],
    },
    {
      rowKey: 'instellingen',
      key: 'instellingen',
      icon: '⚙️',
      label: 'Instellingen',
      labelKey: rowLabelKey('instellingen'),
      items: [
        {
          id: 'sm_inst_betaling',
          icon: '💳',
          label: 'Betaalmethodes',
          labelKey: itemLabelKey('sm_inst_betaling'),
          href: `${baseUrl}/betaling`,
        },
        {
          id: 'sm_abonnement',
          icon: '📦',
          label: 'Abonnement',
          labelKey: itemLabelKey('sm_abonnement'),
          href: `${baseUrl}/abonnement`,
        },
      ],
    },
    {
      rowKey: 'account',
      key: 'account',
      icon: '👤',
      label: 'Account',
      labelKey: rowLabelKey('account'),
      items: [
        {
          id: 'sm_abonnement',
          icon: '📋',
          label: 'Mijn Account',
          labelKey: itemLabelKey('sm_abonnement'),
          href: `${baseUrl}/abonnement`,
        },
      ],
    },
  ]
}

/** Alle submenu-id's (uniek) voor superadmin en guards. */
export function collectAllSubmenuIds(): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  const mods = buildHamburgerModules('/shop/_/admin', '_')
  for (const m of mods) {
    for (const it of m.items) {
      if (!seen.has(it.id)) {
        // sm_abonnement komt dubbel voor als id — Set dedup
        seen.add(it.id)
        out.push(it.id)
      }
    }
  }
  return out
}

export function getSubmenuIdForPathname(pathname: string, tenantSlug: string): string | null {
  const baseUrl = `/shop/${tenantSlug}/admin`
  const modules = buildHamburgerModules(baseUrl, tenantSlug)
  let best: { id: string; len: number } | null = null
  for (const mod of modules) {
    for (const item of mod.items) {
      if (pathname === item.href || pathname.startsWith(item.href + '/')) {
        const len = item.href.length
        if (!best || len > best.len) best = { id: item.id, len }
      }
    }
  }
  return best?.id ?? null
}

export function isSubmenuForcedOn(subId: string): boolean {
  return SUBMENU_IDS_ALWAYS_ON.has(subId)
}

/**
 * `enabledJson` = ruwe tenants.enabled_modules. Ontbrekende submenu-key = aan zolang parent-module aan is en JSON expliciet is.
 */
export function isSubmenuEnabledInTenantConfig(
  subId: string,
  enabledJson: Record<string, boolean> | null,
  parentModuleAllowed: boolean
): boolean {
  if (isSubmenuForcedOn(subId)) return true
  return isTenantSubmenuEffectiveOn(subId, enabledJson, parentModuleAllowed)
}

export function filterHamburgerModulesForAccess(
  modules: AdminHamburgerModule[],
  effectiveAccess: Record<TenantModuleId, boolean>,
  effectiveLabelPrinting: boolean,
  enabledModulesJson: Record<string, boolean> | null
): AdminHamburgerModule[] {
  /** Account-blok altijd in het menu; overige modules volgens toggle. */
  const menuAccess: Record<TenantModuleId, boolean> = { ...effectiveAccess, account: true }

  return modules
    .filter((m) => {
      if (m.key === 'website') {
        return menuAccess.website || menuAccess.instellingen || menuAccess.online
      }
      return menuAccess[m.key]
    })
    .map((m) => ({
      ...m,
      items: m.items.filter((item) => {
        if (item.href.includes('/labels') && !effectiveLabelPrinting) return false
        let parentOn = effectiveAccess[m.key]
        if (m.key === 'website') {
          if (item.id === 'sm_inst_opening' || item.id === 'sm_inst_levering') {
            parentOn = effectiveAccess.website || effectiveAccess.instellingen
          } else if (item.id === 'sm_online_cadeaubonnen') {
            parentOn = effectiveAccess.website || effectiveAccess.online
          }
        }
        return isSubmenuEnabledInTenantConfig(item.id, enabledModulesJson, parentOn)
      }),
    }))
    .filter((m) => m.items.length > 0)
}
