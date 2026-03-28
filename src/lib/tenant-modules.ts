import { isAdminTenant } from '@/lib/protected-tenants'

/** Keys align with kassa hamburger `modules[].key`. */
export const TENANT_MODULE_IDS = [
  'kassa',
  'online-bestellingen',
  'instellingen',
  'online',
  'reservaties',
  'personeel',
  'kosten',
  'rapporten',
  'website',
  'account',
] as const

export type TenantModuleId = (typeof TENANT_MODULE_IDS)[number]

export const TENANT_MODULE_LABELS: Record<TenantModuleId, string> = {
  kassa: 'Kassa (producten, categorieën, …)',
  'online-bestellingen': 'Online bestellingen (schermen, bestellijst)',
  instellingen: 'Instellingen (uren, levering, betaling)',
  online: 'Online shop (klanten, promoties, WhatsApp, …)',
  reservaties: 'Reservaties',
  personeel: 'Personeel & uren',
  kosten: 'Kostenberekening',
  rapporten: 'Rapporten, Z-rapport, analyse',
  website: 'Website & content (design, SEO, media, …)',
  account: 'Mijn account / abonnement',
}

/** Starter template for new tenants (trial still sees all — see resolve). */
export function getStarterEnabledModulesRecord(): Record<TenantModuleId, boolean> {
  return {
    kassa: true,
    'online-bestellingen': true,
    instellingen: true,
    online: true,
    website: true,
    account: true,
    reservaties: false,
    personeel: false,
    kosten: false,
    rapporten: false,
  }
}

export function allTenantModulesTrue(): Record<TenantModuleId, boolean> {
  return Object.fromEntries(TENANT_MODULE_IDS.map((id) => [id, true])) as Record<
    TenantModuleId,
    boolean
  >
}

function normalizeSubscriptionStatus(s: string | null | undefined): string {
  return (s || '').toLowerCase()
}

export function isTrialSubscriptionActive(
  subscription: { status?: string | null; trial_ends_at?: string | null } | null,
  tenantRow: { subscription_status?: string | null; trial_ends_at?: string | null } | null
): boolean {
  const status = normalizeSubscriptionStatus(
    subscription?.status ?? tenantRow?.subscription_status ?? ''
  )
  if (status !== 'trial') return false
  const ends = subscription?.trial_ends_at || tenantRow?.trial_ends_at
  if (!ends) return true
  return new Date(ends) > new Date()
}

export function isTenantProPlan(
  subscription: { plan?: string | null } | null,
  tenantRow: { plan?: string | null } | null
): boolean {
  const p = (subscription?.plan || tenantRow?.plan || 'starter').toLowerCase()
  return p === 'pro'
}

export function parseEnabledModulesJson(raw: unknown): Record<string, boolean> | null {
  if (raw == null) return null
  if (typeof raw !== 'object' || Array.isArray(raw)) return null
  const out: Record<string, boolean> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'boolean') out[k] = v
  }
  return Object.keys(out).length ? out : null
}

/** Niet-leeg opgeslagen JSON in `tenants.enabled_modules` (superadmin of klant na trial). */
export function hasExplicitEnabledModules(json: Record<string, boolean> | null): boolean {
  return json != null && Object.keys(json).length > 0
}

/**
 * Trial/Pro-basis = alles aan; superadmin (of bewaarde keuze) kan modules uitzetten via expliciete false.
 */
export function mergeFullAccessWithExplicitJson(
  json: Record<string, boolean>
): Record<TenantModuleId, boolean> {
  const out = allTenantModulesTrue()
  for (const id of TENANT_MODULE_IDS) {
    if (json[id] === false) out[id] = false
    if (json[id] === true) out[id] = true
  }
  return out
}

/** Na trial vóór modulekeuze: beperkt starter-pakket. */
export function getResolvedStarterOnlyAccess(): Record<TenantModuleId, boolean> {
  const s = getStarterEnabledModulesRecord()
  return { ...s, kassa: true, account: true, instellingen: true }
}

/**
 * Voor superadmin: DB-json. Zonder JSON en `postTrialModulesConfirmed === false` → starter (niet alles aan).
 */
export function mergeEnabledModulesFromDb(
  raw: unknown,
  postTrialModulesConfirmed: boolean | null | undefined = true
): Record<TenantModuleId, boolean> {
  const p = parseEnabledModulesJson(raw)
  const starter = getStarterEnabledModulesRecord()
  if (!p) {
    if (postTrialModulesConfirmed === false) {
      return getResolvedStarterOnlyAccess()
    }
    return allTenantModulesTrue()
  }
  const out = {} as Record<TenantModuleId, boolean>
  for (const id of TENANT_MODULE_IDS) {
    if (p[id] === true) out[id] = true
    else if (p[id] === false) out[id] = false
    else out[id] = starter[id]
  }
  return out
}

/**
 * Effective module access for UI and guards.
 * - Platform admin tenants: always all on.
 * - Active trial: standaard alles aan; mét expliciete `enabled_modules` (superadmin) worden alle keys
 *   (inclusief kassa / instellingen / account) exact gevolgd.
 * - Pro plan: idem.
 * - Anders: expliciete JSON indien gezet (geen geforceerde “altijd aan”-modules); anders bij
 *   post_trial_modules_confirmed → legacy vol pakket; bij false → starter-pakket tot klant bevestigt.
 */
export function resolveTenantModules(opts: {
  tenantSlug: string
  enabledModulesJson: Record<string, boolean> | null
  subscription: { status?: string | null; trial_ends_at?: string | null; plan?: string | null } | null
  tenantRow: {
    subscription_status?: string | null
    trial_ends_at?: string | null
    plan?: string | null
    post_trial_modules_confirmed?: boolean | null
  } | null
}): Record<TenantModuleId, boolean> {
  const { tenantSlug, enabledModulesJson, subscription, tenantRow } = opts

  if (isAdminTenant(tenantSlug)) {
    return allTenantModulesTrue()
  }
  if (isTrialSubscriptionActive(subscription, tenantRow)) {
    if (hasExplicitEnabledModules(enabledModulesJson) && enabledModulesJson) {
      return mergeFullAccessWithExplicitJson(enabledModulesJson)
    }
    return allTenantModulesTrue()
  }
  if (isTenantProPlan(subscription, tenantRow)) {
    if (hasExplicitEnabledModules(enabledModulesJson) && enabledModulesJson) {
      return mergeFullAccessWithExplicitJson(enabledModulesJson)
    }
    return allTenantModulesTrue()
  }

  const hasExplicit =
    enabledModulesJson !== null &&
    enabledModulesJson !== undefined &&
    Object.keys(enabledModulesJson).length > 0

  if (hasExplicit) {
    const starter = getStarterEnabledModulesRecord()
    const out = {} as Record<TenantModuleId, boolean>
    for (const id of TENANT_MODULE_IDS) {
      if (enabledModulesJson![id] === true) out[id] = true
      else if (enabledModulesJson![id] === false) out[id] = false
      else out[id] = starter[id]
    }
    return out
  }

  const postOk = tenantRow?.post_trial_modules_confirmed !== false
  if (postOk) {
    return allTenantModulesTrue()
  }

  return getResolvedStarterOnlyAccess()
}

export function customerNeedsPostTrialModulePicker(
  tenantSlug: string,
  subscription: { status?: string | null; trial_ends_at?: string | null; plan?: string | null } | null,
  tenantRow: {
    subscription_status?: string | null
    trial_ends_at?: string | null
    plan?: string | null
    post_trial_modules_confirmed?: boolean | null
  } | null
): boolean {
  if (!tenantRow) return false
  if (isAdminTenant(tenantSlug)) return false
  if (isTrialSubscriptionActive(subscription, tenantRow)) return false
  if (isTenantProPlan(subscription, tenantRow)) return false
  return tenantRow.post_trial_modules_confirmed === false
}

export type AdminModuleGateResult =
  | { kind: 'always' }
  | { kind: 'module'; module: TenantModuleId }

/**
 * Eerste admin-route waar de tenant recht op heeft (bij geweigerde module / kassa uit).
 */
export function getFirstAccessibleAdminPath(
  tenantSlug: string,
  access: Record<TenantModuleId, boolean>
): string {
  const base = `/shop/${tenantSlug}/admin`
  const candidates: { m: TenantModuleId; path: string }[] = [
    { m: 'kassa', path: '/kassa' },
    { m: 'online-bestellingen', path: '/bestellingen' },
    { m: 'reservaties', path: '/reserveringen' },
    { m: 'instellingen', path: '/openingstijden' },
    { m: 'online', path: '/online-status' },
    { m: 'personeel', path: '/personeel' },
    { m: 'kosten', path: '/kosten' },
    { m: 'rapporten', path: '/rapporten' },
    { m: 'website', path: '/design' },
    { m: 'account', path: '/abonnement' },
  ]
  for (const { m, path } of candidates) {
    if (access[m]) return `${base}${path}`
  }
  return `${base}/`
}

/**
 * Map admin pathname to module. Paths under /shop/:tenant/admin only.
 */
export function adminPathToModule(pathname: string, tenantSlug: string): AdminModuleGateResult {
  const base = `/shop/${tenantSlug}/admin`
  if (!pathname.startsWith(base)) {
    return { kind: 'always' }
  }
  const rest = pathname.slice(base.length).replace(/\/$/, '') || '/'

  if (rest === '/' || rest === '') return { kind: 'always' }
  if (rest.startsWith('/welkom')) return { kind: 'always' }
  if (rest.startsWith('/kassa')) return { kind: 'module', module: 'kassa' }
  if (rest.startsWith('/pincode')) return { kind: 'module', module: 'kassa' }
  if (rest.startsWith('/abonnement')) return { kind: 'always' }

  if (
    rest.startsWith('/categorieen') ||
    rest.startsWith('/producten') ||
    rest.startsWith('/opties') ||
    rest.startsWith('/voorraad') ||
    rest.startsWith('/allergenen') ||
    rest.startsWith('/bonnenprinter') ||
    rest.startsWith('/labels')
  ) {
    return { kind: 'module', module: 'kassa' }
  }
  if (rest.startsWith('/bestellingen') || rest.startsWith('/groepen')) {
    return { kind: 'module', module: 'online-bestellingen' }
  }
  if (rest.startsWith('/openingstijden') || rest.startsWith('/levering') || rest.startsWith('/betaling')) {
    return { kind: 'module', module: 'instellingen' }
  }
  if (
    rest.startsWith('/online-status') ||
    rest.startsWith('/klanten') ||
    rest.startsWith('/promoties') ||
    rest.startsWith('/cadeaubonnen') ||
    rest.startsWith('/whatsapp')
  ) {
    return { kind: 'module', module: 'online' }
  }
  if (rest.startsWith('/reserveringen')) {
    return { kind: 'module', module: 'reservaties' }
  }
  if (rest.startsWith('/personeel') || rest.startsWith('/uren') || rest.startsWith('/vacatures')) {
    return { kind: 'module', module: 'personeel' }
  }
  if (rest.startsWith('/kosten')) {
    return { kind: 'module', module: 'kosten' }
  }
  if (
    rest.startsWith('/rapporten') ||
    rest.startsWith('/z-rapport') ||
    rest.startsWith('/analyse') ||
    rest.startsWith('/populair') ||
    rest.startsWith('/verkoop')
  ) {
    return { kind: 'module', module: 'rapporten' }
  }
  if (
    rest.startsWith('/profiel') ||
    rest.startsWith('/design') ||
    rest.startsWith('/seo') ||
    rest.startsWith('/teksten') ||
    rest.startsWith('/reviews') ||
    rest.startsWith('/marketing') ||
    rest.startsWith('/qr-codes') ||
    rest.startsWith('/media') ||
    rest.startsWith('/team')
  ) {
    return { kind: 'module', module: 'website' }
  }

  return { kind: 'always' }
}
