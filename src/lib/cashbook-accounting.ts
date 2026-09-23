import type { SupabaseClient } from '@supabase/supabase-js'

export const ACCOUNTING_PACKAGES = ['none', 'scrada', 'exact', 'octopus', 'winbooks', 'yuki', 'billit', 'other'] as const
export const ACCOUNTING_EXPORT_FORMATS = ['csv', 'pdf', 'xlsx'] as const

export type AccountingPackage = (typeof ACCOUNTING_PACKAGES)[number]
export type AccountingExportFormat = (typeof ACCOUNTING_EXPORT_FORMATS)[number]

export type AccountingSettings = {
  storageReady: boolean
  accountantName: string
  accountantEmail: string
  packageName: AccountingPackage
  clientReference: string
  exportFormat: AccountingExportFormat
  autoExport: boolean
  autoExportDay: number
}

const EMPTY: AccountingSettings = {
  storageReady: true,
  accountantName: '',
  accountantEmail: '',
  packageName: 'none',
  clientReference: '',
  exportFormat: 'csv',
  autoExport: false,
  autoExportDay: 1,
}

function missingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  return /42P01|PGRST205|does not exist|schema cache/i.test(`${error.code || ''} ${error.message || ''}`)
}

export async function loadAccountingSettings(client: SupabaseClient, tenantSlug: string): Promise<AccountingSettings> {
  const res = await client.from('accounting_settings').select('*').eq('tenant_slug', tenantSlug).maybeSingle()
  if (missingTable(res.error)) return { ...EMPTY, storageReady: false }
  const row = res.data as Record<string, unknown> | null
  if (!row) return EMPTY
  const packageName = String(row.package || 'none')
  const exportFormat = String(row.export_format || 'csv')
  return {
    storageReady: true,
    accountantName: String(row.accountant_name || ''),
    accountantEmail: String(row.accountant_email || ''),
    packageName: (ACCOUNTING_PACKAGES as readonly string[]).includes(packageName) ? (packageName as AccountingPackage) : 'none',
    clientReference: String(row.client_reference || ''),
    exportFormat: (ACCOUNTING_EXPORT_FORMATS as readonly string[]).includes(exportFormat) ? (exportFormat as AccountingExportFormat) : 'csv',
    autoExport: row.auto_export === true,
    autoExportDay: Math.min(28, Math.max(1, Number(row.auto_export_day) || 1)),
  }
}

export async function saveAccountingSettings(
  client: SupabaseClient,
  tenantSlug: string,
  input: Omit<AccountingSettings, 'storageReady'>,
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const existing = await client.from('accounting_settings').select('id').eq('tenant_slug', tenantSlug).maybeSingle()
  if (missingTable(existing.error)) {
    return { ok: false, error: 'De boekhoudinstellingen staan nog niet in de database.', status: 503 }
  }
  const payload = {
    tenant_slug: tenantSlug,
    accountant_name: input.accountantName.trim() || null,
    accountant_email: input.accountantEmail.trim() || null,
    package: input.packageName,
    client_reference: input.clientReference.trim() || null,
    export_format: input.exportFormat,
    auto_export: input.autoExport,
    auto_export_day: input.autoExportDay,
    updated_at: new Date().toISOString(),
  }
  const saved = existing.data
    ? await client.from('accounting_settings').update(payload).eq('tenant_slug', tenantSlug)
    : await client.from('accounting_settings').insert(payload)
  if (saved.error) return { ok: false, error: 'Instellingen opslaan mislukt.', status: 500 }
  return { ok: true }
}
