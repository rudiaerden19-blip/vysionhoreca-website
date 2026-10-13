import type { VysionPrintAgentBody } from '@/lib/vysion-print-agent-client'

function shortStableHash(text: string): string {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(36)
}

/**
 * Tenant-scoped idempotency — voorkomt dubbele bon bij dubbel tikken / parallelle iPads met dezelfde bon.
 * Herdruk: geef `reprintNonce` (uniek per bewuste herdruk).
 */
export function buildPrintJobIdempotencyKey(
  body: VysionPrintAgentBody,
  opts: { tenantSlug: string; reprintNonce?: string },
): string {
  const mode = body.receiptMode || 'kassa'
  const orderPart =
    body.orderData?.orderNumber != null
      ? String(body.orderData.orderNumber)
      : `txt-${shortStableHash(String(body.bonInhoud || '').slice(0, 4000))}`
  const drawer = body.openDrawer === true ? '-drawer' : ''
  const copies = body.copies != null ? `-c${body.copies}` : ''
  let key = `${opts.tenantSlug.trim()}-${orderPart}-${mode}${copies}${drawer}`
  const reprint = opts.reprintNonce?.trim()
  if (reprint) key += `-re-${reprint}`
  return key.slice(0, 200)
}

/** Lade-kick zonder bon — elke actie uniek (geen idempotency-blokkade). */
export function buildDrawerOnlyIdempotencyKey(tenantSlug: string, nonce: string): string {
  return `${tenantSlug.trim()}-drawer-${nonce}`.slice(0, 200)
}
