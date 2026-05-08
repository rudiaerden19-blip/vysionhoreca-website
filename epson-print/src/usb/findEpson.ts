import { promisify } from 'node:util'
import { getDeviceList, findByIds } from 'usb'
import { EPSON_VENDOR_ID } from '../epson/constants.js'

export type UsbPrinterCandidate = {
  vendorId: number
  productId: number
  manufacturer?: string
  product?: string
}

export function hexId(id: number) {
  return `0x${id.toString(16).padStart(4, '0')}`
}

/** Alleen descriptors (geen USB-string reads). */
export function listUsbDevicesSync(opts: { onlyEpson: boolean }): UsbPrinterCandidate[] {
  const devices = getDeviceList()
  const out: UsbPrinterCandidate[] = []
  for (const d of devices) {
    const vid = d.deviceDescriptor.idVendor
    if (opts.onlyEpson && vid !== EPSON_VENDOR_ID) continue
    out.push({
      vendorId: vid,
      productId: d.deviceDescriptor.idProduct,
    })
  }
  return out
}

export async function enrichWithStrings(c: UsbPrinterCandidate): Promise<UsbPrinterCandidate> {
  const device = findByIds(c.vendorId, c.productId)
  if (!device) return c
  try {
    device.open()
    const getStr = promisify(device.getStringDescriptor.bind(device)) as (
      idx: number,
    ) => Promise<string | undefined>
    let manufacturer: string | undefined
    let product: string | undefined
    if (device.deviceDescriptor.iManufacturer) {
      try {
        manufacturer = await getStr(device.deviceDescriptor.iManufacturer)
      } catch {
        manufacturer = undefined
      }
    }
    if (device.deviceDescriptor.iProduct) {
      try {
        product = await getStr(device.deviceDescriptor.iProduct)
      } catch {
        product = undefined
      }
    }
    return { ...c, manufacturer, product }
  } catch {
    return c
  } finally {
    try {
      device.close()
    } catch {
      /* ignore */
    }
  }
}

export function describeCandidate(c: UsbPrinterCandidate) {
  const vid = hexId(c.vendorId)
  const pid = hexId(c.productId)
  const name = [c.manufacturer, c.product].filter(Boolean).join(' — ')
  return `${vid} ${pid}${name ? `  ${name}` : ''}`
}

export { EPSON_VENDOR_ID }
