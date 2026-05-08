import { describeCandidate, enrichWithStrings, listUsbDevicesSync } from './usb/findEpson.js'
import { printUsbBulkAsync } from './usb/printBulk.js'
import { buildTestReceipt } from './escpos/buffer.js'

/** Alles ná `tsx src/cli.ts` / `node dist/cli.js` */
const argv = process.argv.slice(2)

function parseHexUint(s: string | undefined): number | undefined {
  if (s == null || s === '') return undefined
  const trimmed = s.trim()
  const withPrefix = trimmed.startsWith('0x') || trimmed.startsWith('0X') ? trimmed : `0x${trimmed}`
  const n = Number.parseInt(withPrefix, 16)
  if (!Number.isFinite(n) || n < 0 || n > 0xffff) {
    throw new Error(`Ongeldige hex ID: ${JSON.stringify(s)}`)
  }
  return n
}

function argvFlag(name: string): string | undefined {
  const i = argv.indexOf(name)
  if (i === -1) return undefined
  return argv[i + 1]
}

async function cmdList(): Promise<void> {
  const allUsb = argv.includes('--all')
  const candidates = listUsbDevicesSync({ onlyEpson: !allUsb })
  if (candidates.length === 0) {
    console.log(allUsb ? 'Geen USB-apparaten gezien (rechten/driver?).' : 'Geen Epson (VID 0x04B8) USB-apparaat gevonden.')
    return
  }
  console.log(allUsb ? 'USB-apparaten:' : 'Epson-filter (VID 0x04B8):')
  for (const raw of candidates) {
    const c = await enrichWithStrings(raw)
    console.info(` • ${describeCandidate(c)}`)
  }
}

async function cmdTestPrint(): Promise<void> {
  const ifaceStr = argvFlag('--interface')
  const interfaceNo = ifaceStr !== undefined ? Number.parseInt(ifaceStr, 10) : 0
  if (Number.isNaN(interfaceNo) || interfaceNo < 0) {
    throw new Error('Optie --interface moet een niet-negatief geheel getal zijn.')
  }

  let vid = parseHexUint(argvFlag('--vid'))
  let pid = parseHexUint(argvFlag('--pid'))

  if ((vid !== undefined && pid === undefined) || (vid === undefined && pid !== undefined)) {
    throw new Error('Geef beide --vid en --pid, of gebruik --epson-first.')
  }

  if (vid === undefined || pid === undefined) {
    if (!argv.includes('--epson-first')) {
      throw new Error('Gebruik: --vid ... --pid ... OF --epson-first')
    }
    const list = listUsbDevicesSync({ onlyEpson: true })
    if (list.length === 0) {
      throw new Error('Geen Epson USB (VID 0x04B8) gevonden. Is de printer aan en kabel OK?')
    }
    const first = list[0]
    vid = first.vendorId
    pid = first.productId
  }

  console.info(`Print test → vid=${hexFmt(vid!)} pid=${hexFmt(pid!)} iface=${interfaceNo}`)
  await printUsbBulkAsync(vid!, pid!, buildTestReceipt(), interfaceNo)
  console.info('Klaar.')
}

function hexFmt(n: number) {
  return `0x${n.toString(16).padStart(4, '0')}`
}

async function main() {
  const sub = argv[0]
  if (!sub || sub === '-h' || sub === '--help') {
    console.log(`
EPSON-print (USB, ESC/P test)

Gebruik:
  npm run list -- [--all]
      Standaard: alleen Seiko Epson (VID 0x04B8). Met --all: alle USB-apparaten.

  npm run print:test -- [--epson-first | --vid 0x04b8 --pid ...] [--interface N]
      Print een korte testbon + snede. Epson-first = eerste Epson in de USB-lijst.

Voorbeelden:
  npm run list --
  npm run print:test -- --epson-first
  npm run print:test -- --vid 0x04b8 --pid 0xe11 --interface 0
`)
    process.exit(sub ? 0 : 1)
    return
  }

  switch (sub) {
    case 'list':
      await cmdList()
      break
    case 'test-print':
      await cmdTestPrint()
      break
    default:
      console.error('Onbekend commando:', sub)
      process.exit(1)
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
