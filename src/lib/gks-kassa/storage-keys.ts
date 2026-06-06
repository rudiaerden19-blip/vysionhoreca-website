/** Client-side opslag — volledig gescheiden van /admin/kassa (prefix gks_). */

export const GKS_KASSA_ROUTE = 'gks-kassa'

export function gksTableOrdersStorageKey(tenantSlug: string): string {
  return `gks_table_orders_${tenantSlug}`
}

export function gksOfflineOrdersQueueStorageKey(tenantSlug: string): string {
  return `gks_offline_orders_${tenantSlug}`
}

export function gksAudioOkSessionKey(tenantSlug: string): string {
  return `gks_kassa_audio_ok_${tenantSlug}`
}

export function gksSettingsCacheKey(tenantSlug: string): string {
  return `gks_settings_${tenantSlug}`
}

export function gksMenuCatsCacheKey(tenantSlug: string): string {
  return `gks_menu_cats_${tenantSlug}`
}

export function gksMenuProdsCacheKey(tenantSlug: string): string {
  return `gks_menu_prods_${tenantSlug}`
}

export function gksMenuOptsCacheKey(tenantSlug: string): string {
  return `gks_menu_opts_${tenantSlug}`
}

export function gksCustomerDisplaySessionKey(tenantSlug: string): string {
  return `gks_klantscherm_${tenantSlug}`
}

export function gksCustomerDisplayWindowName(tenantSlug: string): string {
  return `gks_klantscherm_${tenantSlug}`
}

export function gksStoolStatusKey(tenantSlug: string, terrace: boolean): string {
  return terrace ? `gks_stool_status_terrace_${tenantSlug}` : `gks_stool_status_${tenantSlug}`
}

export function gksWebLockQueueName(tenantSlug: string): string {
  return `gks_queue_${tenantSlug}`
}

export function gksBarBonWatermarkStorageKey(tenantSlug: string): string {
  return `gks_bar_bon_watermark_v2_${tenantSlug}`
}

export function gksPaidReceiptDedupeStorageKey(tenantSlug: string, guardKey: string): string {
  return `gks_paid_print_ok:${tenantSlug}:${guardKey}`
}

export function gksFloorPlanTablesLocalStorageKey(tenantSlug: string, zone: string): string {
  return `gks_floor_plan_tables_${tenantSlug}_${zone}`
}
