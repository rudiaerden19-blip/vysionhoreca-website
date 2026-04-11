import type { TenantModuleId } from '@/lib/tenant-modules'
import { isTenantSubmenuEffectiveOn } from '@/lib/tenant-modules'

/** Altijd bereikbaar in menu en routes (abonnement / facturatie). */
export const SUBMENU_IDS_ALWAYS_ON = new Set<string>(['sm_abonnement'])

export type AdminHamburgerItem = {
  id: string
  icon: string
  /** Fallback als `labelKey` ontbreekt of vertaling niet geladen is */
  label: string
  /** Optioneel: vertaalde label via `useLanguage` in AdminHamburgerMenu */
  labelKey?: string
  href: string
}

export type AdminHamburgerModule = {
  /** Unieke rij voor React / open submenu (bij twee rijen dezelfde `key`). */
  rowKey: string
  key: TenantModuleId
  icon: string
  label: string
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

export function buildHamburgerModules(baseUrl: string, shopTenant: string): AdminHamburgerModule[] {
  return [
    {
      rowKey: 'bestellingen',
      key: 'online-bestellingen',
      icon: '📲',
      label: 'Bestellingen',
      items: [
        { id: 'sm_orders_bestellingen', icon: '📦', label: 'Bestellingen', href: `${baseUrl}/bestellingen` },
        { id: 'sm_orders_groepen', icon: '🏢', label: 'Groepsbestellingen', href: `${baseUrl}/groepen` },
      ],
    },
    {
      rowKey: 'kassa',
      key: 'kassa',
      icon: '🖥️',
      label: 'Kassa',
      items: [
        { id: 'sm_kassa_pincode', icon: '🔐', label: 'Pincode', href: `${baseUrl}/pincode` },
        { id: 'sm_kassa_categorieen', icon: '📁', label: 'Categorieën', href: `${baseUrl}/categorieen` },
        { id: 'sm_kassa_producten', icon: '🍟', label: 'Producten', href: `${baseUrl}/producten` },
        { id: 'sm_kassa_opties', icon: '➕', label: "Opties & Extra's", href: `${baseUrl}/opties` },
        { id: 'sm_kassa_voorraad', icon: '📦', label: 'Voorraad', href: `${baseUrl}/voorraad` },
        { id: 'sm_kassa_allergenen', icon: '⚠️', label: 'Allergenen', href: `${baseUrl}/allergenen` },
        { id: 'sm_kassa_bonnenprinter', icon: '🖨️', label: 'Bonnenprinter', href: `${baseUrl}/bonnenprinter` },
        { id: 'sm_kassa_labels', icon: '🏷️', label: 'Labels', href: `${baseUrl}/labels` },
      ],
    },
    {
      rowKey: 'online-platform',
      key: 'online',
      icon: '🛒',
      label: 'Online platform',
      items: [
        { id: 'sm_online_status', icon: '🟢', label: 'Online Aan/Uitzetten', href: `${baseUrl}/online-status` },
        { id: 'sm_online_klanten', icon: '👥', label: 'Klanten', href: `${baseUrl}/klanten` },
        { id: 'sm_online_beloningen', icon: '🎁', label: 'Beloningen', href: `${baseUrl}/klanten/beloningen` },
        { id: 'sm_online_promoties', icon: '🎫', label: 'Promoties', href: `${baseUrl}/promoties` },
        { id: 'sm_online_whatsapp', icon: '💬', label: 'WhatsApp', href: `${baseUrl}/whatsapp` },
      ],
    },
    {
      rowKey: 'website',
      key: 'website',
      icon: '🌐',
      label: 'Website',
      items: [
        { id: 'sm_web_profiel', icon: '🏠', label: 'Zaak Profiel', href: `${baseUrl}/profiel` },
        { id: 'sm_online_cadeaubonnen', icon: '🎟️', label: 'Cadeaubonnen', href: `${baseUrl}/cadeaubonnen` },
        { id: 'sm_inst_opening', icon: '🕐', label: 'Openingstijden', href: `${baseUrl}/openingstijden` },
        { id: 'sm_inst_levering', icon: '🚚', label: 'Levering & Afhalen', href: `${baseUrl}/levering` },
        { id: 'sm_web_design', icon: '🎨', label: 'Design', href: `${baseUrl}/design` },
        { id: 'sm_web_seo', icon: '🔍', label: 'SEO', href: `${baseUrl}/seo` },
        { id: 'sm_web_teksten', icon: '📝', label: 'Teksten & Info', href: `${baseUrl}/teksten` },
        { id: 'sm_web_reviews', icon: '⭐', label: 'Reviews', href: `${baseUrl}/reviews` },
        { id: 'sm_web_marketing', icon: '📣', label: 'Marketing', href: `${baseUrl}/marketing` },
        { id: 'sm_web_qr', icon: '📱', label: 'QR Codes', href: `${baseUrl}/qr-codes` },
        { id: 'sm_web_media', icon: '🖼️', label: 'Media', href: `${baseUrl}/media` },
        { id: 'sm_web_team', icon: '👥', label: 'Mijn team', href: `${baseUrl}/team` },
        { id: 'sm_web_site_preview', icon: '🔗', label: 'Bekijk je Website', href: `/shop/${shopTenant}` },
      ],
    },
    {
      rowKey: 'reservaties',
      key: 'reservaties',
      icon: '📅',
      label: 'Reservaties',
      items: [
        { id: 'sm_reserveringen', icon: '📅', label: 'Restaurant Reservaties', href: `${baseUrl}/reserveringen` },
      ],
    },
    {
      rowKey: 'personeel',
      key: 'personeel',
      icon: '👔',
      label: 'Personeel',
      items: [
        { id: 'sm_personeel_team', icon: '👤', label: 'Medewerkers', href: `${baseUrl}/personeel` },
        { id: 'sm_personeel_uren', icon: '⏱️', label: 'Urenregistratie', href: `${baseUrl}/uren` },
        { id: 'sm_personeel_vacatures', icon: '📋', label: 'Vacatures', href: `${baseUrl}/vacatures` },
      ],
    },
    {
      rowKey: 'online-schermen',
      key: 'online-bestellingen',
      icon: '📲',
      label: 'Online',
      items: [
        { id: 'sm_orders_display', icon: '🖥️', label: 'Online Scherm', href: `/shop/${shopTenant}/display` },
        { id: 'sm_orders_keuken', icon: '👨‍🍳', label: 'Keuken Scherm', href: `/keuken/${shopTenant}` },
        { id: 'sm_online_shop_preview', icon: '🔗', label: 'Bekijk je Shop', href: `/shop/${shopTenant}` },
      ],
    },
    {
      rowKey: 'kosten',
      key: 'kosten',
      icon: '🧮',
      label: 'Kosten berekening',
      items: [
        { id: 'sm_kosten_marge', icon: '⚙️', label: 'Marge Instellingen', href: `${baseUrl}/kosten/instellingen` },
        { id: 'sm_kosten_ingredienten', icon: '🥬', label: 'Ingrediënten', href: `${baseUrl}/kosten/ingredienten` },
        { id: 'sm_kosten_product', icon: '📊', label: 'Product Kostprijs', href: `${baseUrl}/kosten/producten` },
      ],
    },
    {
      rowKey: 'rapporten',
      key: 'rapporten',
      icon: '📊',
      label: 'Rapporten',
      items: [
        { id: 'sm_rpt_rapporten', icon: '📊', label: 'Rapportages', href: `${baseUrl}/rapporten` },
        { id: 'sm_rpt_z', icon: '🧾', label: 'Z-Rapporten (GKS)', href: `${baseUrl}/z-rapport` },
        { id: 'sm_rpt_analyse', icon: '📈', label: 'Bedrijfsanalyse', href: `${baseUrl}/analyse` },
        { id: 'sm_rpt_verkoop', icon: '💹', label: 'Verkoop', href: `${baseUrl}/verkoop` },
        { id: 'sm_rpt_populair', icon: '🔥', label: 'Populaire items', href: `${baseUrl}/populair` },
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
      items: [
        { id: 'sm_inst_betaling', icon: '💳', label: 'Betaalmethodes', href: `${baseUrl}/betaling` },
        { id: 'sm_abonnement', icon: '📦', label: 'Abonnement', href: `${baseUrl}/abonnement` },
      ],
    },
    {
      rowKey: 'account',
      key: 'account',
      icon: '👤',
      label: 'Account',
      items: [{ id: 'sm_abonnement', icon: '📋', label: 'Mijn Account', href: `${baseUrl}/abonnement` }],
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
      if (!seen.has(it.id)) {// sm_abonnement komt dubbel voor als id — Set dedup
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
  effectiveGroupOrders: boolean,
  effectiveLabelPrinting: boolean,
  enabledModulesJson: Record<string, boolean> | null
): AdminHamburgerModule[] {
  /** Account-blok altijd in het menu; overige modules volgens toggle. */
  const menuAccess: Record<TenantModuleId, boolean> = { ...effectiveAccess, account: true }

  return modules
    .filter((m) => {
      if (m.key === 'website') {
        return (
          menuAccess.website || menuAccess.instellingen || menuAccess.online
        )
      }
      return menuAccess[m.key]
    })
    .map((m) => ({
      ...m,
      items: m.items.filter((item) => {
        if (item.href.includes('/groepen') && !effectiveGroupOrders) return false
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
