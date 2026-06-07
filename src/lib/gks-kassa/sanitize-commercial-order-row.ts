const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isGksUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

const ALLOWED_KEYS = new Set([
  'tenant_slug',
  'kassa_client_uuid',
  'order_number',
  'customer_name',
  'status',
  'payment_status',
  'payment_method',
  'order_type',
  'table_number',
  'floor_plan_zone',
  'customer_notes',
  'subtotal',
  'tax',
  'total',
  'payment_split_cash',
  'payment_split_card',
  'kassa_staff_id',
  'items',
  'created_at',
  'updated_at',
])

/** Alleen kolommen van gks_commercial_orders; geldige UUIDs voor uuid-kolommen. */
export function sanitizeGksCommercialOrderRow(
  raw: Record<string, unknown>,
  tenantSlug: string,
): { row: Record<string, unknown> } | { error: string } {
  const row: Record<string, unknown> = { tenant_slug: tenantSlug }
  for (const [key, value] of Object.entries(raw)) {
    if (!ALLOWED_KEYS.has(key) || key === 'tenant_slug') continue
    if (value === undefined) continue
    row[key] = value
  }
  const uuid = row.kassa_client_uuid
  if (!isGksUuid(uuid)) {
    return { error: 'kassa_client_uuid moet een geldige UUID zijn' }
  }
  if (row.kassa_staff_id != null && row.kassa_staff_id !== '' && !isGksUuid(row.kassa_staff_id)) {
    delete row.kassa_staff_id
  }
  return { row }
}
