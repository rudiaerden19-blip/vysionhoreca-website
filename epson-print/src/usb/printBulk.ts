import { findByIds, OutEndpoint } from 'usb'
import type { Interface as UsbInterface } from 'usb'

/** libusb LIBUSB_TRANSFER_TYPE_BULK */
const LIBUSB_TRANSFER_TYPE_BULK = 2

export function findBulkOutEndpoint(iface: UsbInterface): OutEndpoint | null {
  for (const e of iface.endpoints) {
    if (!(e instanceof OutEndpoint)) continue
    if (e.transferType === LIBUSB_TRANSFER_TYPE_BULK) return e
  }
  return null
}

/** Bulk-UIT naar gekozen printer-interface (Epson TM veelal `0`). */
export async function printUsbBulkAsync(
  vendorId: number,
  productId: number,
  data: Buffer,
  interfaceNo = 0,
): Promise<void> {
  const device = findByIds(vendorId, productId)
  if (!device) {
    throw new Error(`USB niet gevonden: vid=0x${vendorId.toString(16)} pid=0x${productId.toString(16)}`)
  }
  device.open()
  try {
    const iface = device.interface(interfaceNo)
    if (iface.isKernelDriverActive()) iface.detachKernelDriver()
    iface.claim()
    try {
      const ep = findBulkOutEndpoint(iface)
      if (!ep) {
        throw new Error(`Geen bulk-OUT op interface ${interfaceNo}.`)
      }
      await ep.transferAsync(data)
    } finally {
      await iface.releaseAsync()
    }
  } finally {
    device.close()
  }
}
