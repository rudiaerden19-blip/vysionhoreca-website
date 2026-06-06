import type { KassaCartItem } from '@/lib/kassa-cart-types'
import type { GksTransactionInput, GksTransactionLineInput } from '@/lib/gks-kassa/fdm-types'
import { vatPercentToGksLabel } from '@/lib/gks-kassa/vat-label'

export function cartLinesToTransaction(
  lines: KassaCartItem[],
  resolveVatPercent: (line: KassaCartItem) => number,
  defaultDepartment = 'MENU',
): GksTransactionInput {
  const transactionLines: GksTransactionLineInput[] = []
  for (const line of lines) {
    const choicesTotal = (line.choices || []).reduce((s, c) => s + (c.price || 0), 0)
    const unit = line.product.price + choicesTotal
    const gross = Math.round(unit * line.quantity * 100) / 100
    const vatLabel = vatPercentToGksLabel(resolveVatPercent(line))
    const deptId = String(line.product.category_id || defaultDepartment)
    const deptName = deptId
    transactionLines.push({
      lineType: 'SINGLE_PRODUCT',
      mainProduct: {
        productId: String(line.product.id),
        productName: line.product.name,
        departmentId: deptId,
        departmentName: deptName,
        quantity: line.quantity,
        unitPrice: Math.round(unit * 10000) / 10000,
        vats: [{ label: vatLabel, price: gross }],
      },
      lineTotal: gross,
    })
  }
  const transactionTotal = transactionLines.reduce((s, l) => s + l.lineTotal, 0)
  return {
    transactionLines,
    transactionTotal: Math.round(transactionTotal * 100) / 100,
  }
}
