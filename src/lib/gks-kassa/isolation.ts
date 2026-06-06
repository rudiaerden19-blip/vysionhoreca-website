/**
 * GKS-kassa (/admin/gks-kassa) mag productie-POS niet raken.
 * - Geen writes naar `orders` of `z_reports`
 * - Geen `/api/kassa/sync-z-report`
 * - Eigen localStorage / IndexedDB prefixes (storage-keys.ts)
 * - Commerciële data alleen via /api/gks-kassa/commercial-orders → gks_commercial_orders
 */

export const GKS_COMMERCIAL_TABLE = 'gks_commercial_orders' as const

/** Tabellen die gks-kassa via /api/admin/db nooit mag muteren. */
export const GKS_FORBIDDEN_ADMIN_DB_TABLES = ['orders', 'z_reports'] as const
