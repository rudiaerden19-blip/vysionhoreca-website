import { collectAllSubmenuIds } from '@/lib/admin-hamburger-modules'
import {
  getFirstAccessibleAdminPath,
  mergeEnabledModulesFromDb,
  TENANT_MODULE_IDS,
  type TenantModuleId,
} from '@/lib/tenant-modules'

/** Keuze bij gratis registratie — presets hieronder zijn aanpasbaar zonder UI-wijziging. */
export const REGISTRATION_PRODUCT_LINES = [
  'horeca_kassa',
  'retail_winkel',
  'online_bestellen',
  'restaurant_reservaties',
] as const

export type RegistrationProductLine = (typeof REGISTRATION_PRODUCT_LINES)[number]

export function isRegistrationProductLine(v: unknown): v is RegistrationProductLine {
  return (
    typeof v === 'string' &&
    (REGISTRATION_PRODUCT_LINES as readonly string[]).includes(v)
  )
}

type PresetDef = {
  /** Hoofdmodules (TenantModuleId). */
  modules: Partial<Record<TenantModuleId, boolean>>
  /** Submenu-id’s (`sm_*`) die aan staan; rest uit. */
  submenusOn: string[]
}

/** Winkelkassa + gekoppelde voorraad-submenu’s (niet voor horeca-preset). */
function isWinkelkassaSubmenuId(subId: string): boolean {
  return subId.startsWith('sm_retail_') || subId.startsWith('sm_voorraad_')
}

function allSubmenusExceptWinkelkassa(): string[] {
  return collectAllSubmenuIds().filter((id) => !isWinkelkassaSubmenuId(id))
}

function horecaKassaModules(): Partial<Record<TenantModuleId, boolean>> {
  const modules: Partial<Record<TenantModuleId, boolean>> = {}
  for (const id of TENANT_MODULE_IDS) {
    if (id === 'retail-kassa' || id === 'voorraad') modules[id] = false
    else modules[id] = true
  }
  return modules
}

const RETAIL_WEBSITE_SUBMENUS = [
  'sm_web_profiel',
  'sm_online_cadeaubonnen',
  'sm_inst_opening',
] as const

const RETAIL_ADMIN_SUBMENUS = [
  'sm_inst_betaling',
  'sm_inst_modules',
  'sm_abonnement',
  'sm_rpt_rapporten',
  'sm_rpt_z',
  'sm_rpt_analyse',
  'sm_rpt_verkoop',
  'sm_rpt_populair',
] as const

/**
 * Automatische modules per registratie-keuze.
 * Pas deze objecten aan wanneer producteigenaar de pakketten definitief zet.
 */
export const REGISTRATION_MODULE_PRESETS: Record<RegistrationProductLine, PresetDef> = {
  /** Alle modules behalve winkelkassa (retail-kassa + voorraad + sm_retail_* / sm_voorraad_*). */
  horeca_kassa: {
    modules: horecaKassaModules(),
    submenusOn: allSubmenusExceptWinkelkassa(),
  },
  retail_winkel: {
    modules: {
      'retail-kassa': true,
      voorraad: true,
      instellingen: true,
      account: true,
      rapporten: true,
      website: true,
      kassa: false,
      'online-bestellingen': false,
      online: false,
      reservaties: false,
      personeel: false,
      kosten: false,
    },
    submenusOn: [
      'sm_retail_kassa_pos',
      'sm_retail_kassa_producten',
      'sm_retail_product_intake',
      'sm_retail_loyalty',
      'sm_voorraad_beheer',
      'sm_voorraad_producten',
      ...RETAIL_WEBSITE_SUBMENUS,
      ...RETAIL_ADMIN_SUBMENUS,
    ],
  },
  online_bestellen: {
    modules: {
      'online-bestellingen': true,
      online: true,
      website: true,
      instellingen: true,
      account: true,
      rapporten: true,
      kosten: false,
      kassa: false,
      'retail-kassa': false,
      voorraad: false,
      reservaties: false,
      personeel: false,
    },
    submenusOn: [
      'sm_orders_bestellingen',
      'sm_orders_groepen',
      'sm_orders_display',
      'sm_orders_keuken',
      'sm_online_shop_preview',
      'sm_online_status',
      'sm_online_klanten',
      'sm_online_beloningen',
      'sm_online_promoties',
      'sm_online_whatsapp',
      'sm_web_profiel',
      'sm_online_cadeaubonnen',
      'sm_inst_opening',
      'sm_inst_levering',
      'sm_web_design',
      'sm_web_seo',
      'sm_web_teksten',
      'sm_web_reviews',
      'sm_web_marketing',
      'sm_web_qr',
      'sm_web_media',
      'sm_web_team',
      'sm_web_site_preview',
      'sm_rpt_rapporten',
      'sm_rpt_z',
      'sm_rpt_analyse',
      'sm_rpt_verkoop',
      'sm_rpt_populair',
      'sm_inst_betaling',
      'sm_inst_modules',
      'sm_abonnement',
    ],
  },
  restaurant_reservaties: {
    modules: {
      reservaties: true,
      instellingen: true,
      account: true,
      website: true,
      kassa: false,
      'retail-kassa': false,
      voorraad: false,
      'online-bestellingen': false,
      online: false,
      personeel: false,
      kosten: false,
      rapporten: false,
    },
    submenusOn: [
      'sm_reserveringen',
      'sm_web_profiel',
      'sm_inst_opening',
      'sm_inst_betaling',
      'sm_inst_modules',
      'sm_abonnement',
    ],
  },
}

/** JSON voor `tenants.enabled_modules`bij registratie. */
export function buildRegistrationEnabledModulesJson(
  line: RegistrationProductLine,
): Record<string, boolean> {
  const preset = REGISTRATION_MODULE_PRESETS[line]
  const allSubIds = collectAllSubmenuIds()
  const raw: Record<string, boolean> = {}

  for (const id of TENANT_MODULE_IDS) {
    if (id === 'account') {
      raw[id] = true
      continue
    }
    if (preset.modules[id] === true) raw[id] = true
    else if (preset.modules[id] === false) raw[id] = false
    else raw[id] = false
  }

  for (const subId of allSubIds) {
    raw[subId] = preset.submenusOn.includes(subId)
  }

  raw.account = true
  return raw
}

export function resolveRegistrationModuleAccess(line: RegistrationProductLine) {
  const json = buildRegistrationEnabledModulesJson(line)
  return mergeEnabledModulesFromDb(json, true)
}

/** Eerste admin-URL na registratie (welkom → doorverwijzen). */
export function getRegistrationPostSignupAdminPath(
  tenantSlug: string,
  line: RegistrationProductLine,
): string {
  const json = buildRegistrationEnabledModulesJson(line)
  const access = mergeEnabledModulesFromDb(json, true)
  return getFirstAccessibleAdminPath(tenantSlug, access, json)
}

export function registrationLineWantsDeliveryBootstrap(line: RegistrationProductLine): boolean {
  return line === 'horeca_kassa' || line === 'online_bestellen'
}
