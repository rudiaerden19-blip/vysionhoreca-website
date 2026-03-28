import type { TenantModuleId } from '@/lib/tenant-modules'

export type AdminHamburgerModule = {
  key: TenantModuleId
  icon: string
  label: string
  items: { icon: string; label: string; href: string }[]
}

export function buildHamburgerModules(baseUrl: string, shopTenant: string): AdminHamburgerModule[] {
  return [
    {
      key: 'kassa',
      icon: '🖥️',
      label: 'Kassa',
      items: [
        { icon: '🔐', label: 'Pincode', href: `${baseUrl}/pincode` },
        { icon: '📁', label: 'Categorieën', href: `${baseUrl}/categorieen` },
        { icon: '🍟', label: 'Producten', href: `${baseUrl}/producten` },
        { icon: '➕', label: "Opties & Extra's", href: `${baseUrl}/opties` },
        { icon: '📦', label: 'Voorraad', href: `${baseUrl}/voorraad` },
        { icon: '⚠️', label: 'Allergenen', href: `${baseUrl}/allergenen` },
        { icon: '🖨️', label: 'Bonnenprinter', href: `${baseUrl}/bonnenprinter` },
        { icon: '🏷️', label: 'Labels', href: `${baseUrl}/labels` },
      ],
    },
    {
      key: 'online-bestellingen',
      icon: '📲',
      label: 'Bestellingen',
      items: [
        { icon: '📦', label: 'Bestellingen', href: `${baseUrl}/bestellingen` },
        { icon: '🏢', label: 'Groepsbestellingen', href: `${baseUrl}/groepen` },
        { icon: '🖥️', label: 'Online Scherm', href: `/shop/${shopTenant}/display` },
        { icon: '👨‍🍳', label: 'Keuken Scherm', href: `/keuken/${shopTenant}` },
      ],
    },
    {
      key: 'instellingen',
      icon: '⚙️',
      label: 'Instellingen',
      items: [
        { icon: '🕐', label: 'Openingstijden', href: `${baseUrl}/openingstijden` },
        { icon: '🚚', label: 'Levering & Afhalen', href: `${baseUrl}/levering` },
        { icon: '💳', label: 'Betaalmethodes', href: `${baseUrl}/betaling` },
        { icon: '📦', label: 'Abonnement', href: `${baseUrl}/abonnement` },
      ],
    },
    {
      key: 'online',
      icon: '🛒',
      label: 'Online',
      items: [
        { icon: '🟢', label: 'Online Aan/Uitzetten', href: `${baseUrl}/online-status` },
        { icon: '👥', label: 'Klanten', href: `${baseUrl}/klanten` },
        { icon: '🎁', label: 'Beloningen', href: `${baseUrl}/klanten/beloningen` },
        { icon: '🎫', label: 'Promoties', href: `${baseUrl}/promoties` },
        { icon: '🎟️', label: 'Cadeaubonnen', href: `${baseUrl}/cadeaubonnen` },
        { icon: '💬', label: 'WhatsApp', href: `${baseUrl}/whatsapp` },
        { icon: '🔗', label: 'Bekijk je Shop', href: `/shop/${shopTenant}` },
      ],
    },
    {
      key: 'reservaties',
      icon: '📅',
      label: 'Reservaties',
      items: [{ icon: '📅', label: 'Restaurant Reservaties', href: `${baseUrl}/reserveringen` }],
    },
    {
      key: 'personeel',
      icon: '👔',
      label: 'Personeel',
      items: [
        { icon: '👤', label: 'Medewerkers', href: `${baseUrl}/personeel` },
        { icon: '⏱️', label: 'Urenregistratie', href: `${baseUrl}/uren` },
        { icon: '📋', label: 'Vacatures', href: `${baseUrl}/vacatures` },
      ],
    },
    {
      key: 'kosten',
      icon: '🧮',
      label: 'Kostenberekening',
      items: [
        { icon: '⚙️', label: 'Marge Instellingen', href: `${baseUrl}/kosten/instellingen` },
        { icon: '🥬', label: 'Ingrediënten', href: `${baseUrl}/kosten/ingredienten` },
        { icon: '📊', label: 'Product Kostprijs', href: `${baseUrl}/kosten/producten` },
      ],
    },
    {
      key: 'rapporten',
      icon: '📊',
      label: 'Rapporten',
      items: [
        { icon: '📊', label: 'Rapportages', href: `${baseUrl}/rapporten` },
        { icon: '🧾', label: 'Z-Rapporten (GKS)', href: `${baseUrl}/z-rapport` },
        { icon: '📈', label: 'Bedrijfsanalyse', href: `${baseUrl}/analyse` },
        { icon: '💹', label: 'Verkoop', href: `${baseUrl}/verkoop` },
        { icon: '📊', label: 'Dashboard', href: `${baseUrl}` },
        { icon: '🔥', label: 'Populaire items', href: `${baseUrl}/populair` },
      ],
    },
    {
      key: 'website',
      icon: '🌐',
      label: 'Website',
      items: [
        { icon: '🏠', label: 'Zaak Profiel', href: `${baseUrl}/profiel` },
        { icon: '🎨', label: 'Design', href: `${baseUrl}/design` },
        { icon: '🔍', label: 'SEO', href: `${baseUrl}/seo` },
        { icon: '📝', label: 'Teksten & Info', href: `${baseUrl}/teksten` },
        { icon: '⭐', label: 'Reviews', href: `${baseUrl}/reviews` },
        { icon: '📣', label: 'Marketing', href: `${baseUrl}/marketing` },
        { icon: '📱', label: 'QR Codes', href: `${baseUrl}/qr-codes` },
        { icon: '🖼️', label: 'Media', href: `${baseUrl}/media` },
        { icon: '👥', label: 'Mijn team', href: `${baseUrl}/team` },
        { icon: '🔗', label: 'Bekijk je Website', href: `/shop/${shopTenant}` },
      ],
    },
    {
      key: 'account',
      icon: '👤',
      label: 'Account',
      items: [{ icon: '📋', label: 'Mijn Account', href: `${baseUrl}/abonnement` }],
    },
  ]
}

export function filterHamburgerModulesForAccess(
  modules: AdminHamburgerModule[],
  effectiveAccess: Record<TenantModuleId, boolean>,
  effectiveGroupOrders: boolean,
  effectiveLabelPrinting: boolean
): AdminHamburgerModule[] {
  return modules
    .filter((m) => effectiveAccess[m.key])
    .map((m) => ({
      ...m,
      items: m.items.filter((item) => {
        if (item.href.includes('/groepen') && !effectiveGroupOrders) return false
        if (item.href.includes('/labels') && !effectiveLabelPrinting) return false
        return true
      }),
    }))
    .filter((m) => m.items.length > 0)
}
