import { NextRequest, NextResponse } from 'next/server'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'
import {
  addRetailExtraBarcode,
  createRetailPurchaseOrder,
  deleteRetailExtraBarcode,
  listRetailExtraBarcodes,
  listRetailMemberPurchases,
  listRetailPurchaseOrders,
  listRetailPurchaseProducts,
  listRetailReorderSuggestions,
  listRetailStockMovements,
  listRetailSuppliers,
  lookupRetailGiftCard,
  nextRetailInvoiceNumber,
  receiveRetailPurchaseOrder,
  recordRetailStockMovements,
  redeemRetailGiftCard,
  saveRetailPurchaseFields,
  saveRetailSupplier,
} from '@/lib/retail-backoffice/server'

async function tenantOf(req: NextRequest, body?: { tenantSlug?: string }) {
  const tenantSlug = (body?.tenantSlug || req.nextUrl.searchParams.get('tenant') || '').trim()
  if (!tenantSlug) return { tenantSlug: '', denied: NextResponse.json({ ok: false, error: 'missing_tenant' }, { status: 400 }) }
  const access = await verifyTenantOrSuperAdmin(req, tenantSlug)
  if (!access.authorized) {
    return { tenantSlug, denied: NextResponse.json({ ok: false, error: access.error || 'forbidden' }, { status: 403 }) }
  }
  return { tenantSlug, denied: null }
}

export async function GET(req: NextRequest) {
  const op = req.nextUrl.searchParams.get('op') || ''
  const gate = await tenantOf(req)
  if (gate.denied) return gate.denied
  const tenantSlug = gate.tenantSlug
  if (op === 'suppliers') return NextResponse.json({ ok: true, suppliers: await listRetailSuppliers(tenantSlug) })
  if (op === 'products') return NextResponse.json(await listRetailPurchaseProducts(tenantSlug))
  if (op === 'barcodes') return NextResponse.json({ ok: true, barcodes: await listRetailExtraBarcodes(tenantSlug) })
  if (op === 'stock') return NextResponse.json({ ok: true, rows: await listRetailStockMovements(tenantSlug) })
  if (op === 'purchase-orders') return NextResponse.json({ ok: true, orders: await listRetailPurchaseOrders(tenantSlug) })
  if (op === 'reorder') return NextResponse.json({ ok: true, products: await listRetailReorderSuggestions(tenantSlug) })
  if (op === 'purchases') {
    const memberId = req.nextUrl.searchParams.get('memberId') || ''
    return NextResponse.json({ ok: true, orders: await listRetailMemberPurchases(tenantSlug, memberId) })
  }
  if (op === 'gift') {
    const code = req.nextUrl.searchParams.get('code') || ''
    return NextResponse.json(await lookupRetailGiftCard(tenantSlug, code))
  }
  return NextResponse.json({ ok: false, error: 'unknown_op' }, { status: 400 })
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  const gate = await tenantOf(req, { tenantSlug: String(body.tenantSlug || '') })
  if (gate.denied) return gate.denied
  const tenantSlug = gate.tenantSlug
  const op = String(body.op || '')

  if (op === 'supplier.save') {
    return NextResponse.json(
      await saveRetailSupplier(tenantSlug, {
        id: body.id ? String(body.id) : undefined,
        name: String(body.name || ''),
        email: body.email == null ? null : String(body.email),
        phone: body.phone == null ? null : String(body.phone),
      }),
    )
  }
  if (op === 'purchase.save') {
    return NextResponse.json(
      await saveRetailPurchaseFields(tenantSlug, String(body.productId || ''), {
        cost_price: body.costPrice == null || body.costPrice === '' ? null : Number(body.costPrice),
        brand: body.brand == null ? null : String(body.brand),
        supplier_id: body.supplierId ? String(body.supplierId) : null,
      }),
    )
  }
  if (op === 'barcode.add') {
    return NextResponse.json(
      await addRetailExtraBarcode(tenantSlug, {
        productId: String(body.productId || ''),
        variantId: body.variantId ? String(body.variantId) : null,
        barcode: String(body.barcode || ''),
      }),
    )
  }
  if (op === 'barcode.delete') {
    return NextResponse.json(await deleteRetailExtraBarcode(tenantSlug, String(body.id || '')))
  }
  if (op === 'stock.record') {
    const lines = Array.isArray(body.lines) ? body.lines : []
    return NextResponse.json(
      await recordRetailStockMovements(
        tenantSlug,
        lines.map((line) => {
          const row = line as Record<string, unknown>
          return {
            productId: row.productId ? String(row.productId) : null,
            variantId: row.variantId ? String(row.variantId) : null,
            skuName: row.skuName ? String(row.skuName) : null,
            reason: String(row.reason || 'correction'),
            delta: Number(row.delta) || 0,
            quantityAfter: row.quantityAfter == null ? null : Number(row.quantityAfter),
            quantityBefore: row.quantityBefore == null ? null : Number(row.quantityBefore),
            lowStockThreshold: row.lowStockThreshold == null ? null : Number(row.lowStockThreshold),
          }
        }),
      ),
    )
  }
  if (op === 'invoice.next') {
    return NextResponse.json(await nextRetailInvoiceNumber(tenantSlug))
  }
  if (op === 'gift.redeem') {
    return NextResponse.json(await redeemRetailGiftCard(tenantSlug, String(body.giftCardId || ''), Number(body.amount) || 0))
  }
  if (op === 'po.create') {
    const lines = Array.isArray(body.lines) ? body.lines : []
    return NextResponse.json(
      await createRetailPurchaseOrder(tenantSlug, {
        supplierId: body.supplierId ? String(body.supplierId) : null,
        lines: lines.map((line) => {
          const row = line as Record<string, unknown>
          return {
            productId: String(row.productId || ''),
            variantId: row.variantId ? String(row.variantId) : null,
            quantity: Number(row.quantity) || 0,
            costPrice: row.costPrice == null ? null : Number(row.costPrice),
          }
        }),
      }),
    )
  }
  if (op === 'po.receive') {
    return NextResponse.json(await receiveRetailPurchaseOrder(tenantSlug, String(body.orderId || '')))
  }
  return NextResponse.json({ ok: false, error: 'unknown_op' }, { status: 400 })
}
