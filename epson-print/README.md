# Epson USB-print (lokaal)

Kleine **Node/TypeScript-cli** voor **USB-thermalprinters van Epson** (en veel klonen) via **ESC/P-commando’s**. Los van de Next.js-site bedoeld als **lokale daemon/utility** naast de browser of kiosk.

## Vereisten

- **Node ≥ 18**
- **libusb** (via npm-pakket `usb`) — gebruikt systeemdrivers:
  - **macOS / Linux**: meestal voldoende; op Linux bij claim-fout evt. **udev-rules** voor de printer-interface.
  - **Windows**: vaak **WinUSB**/libusb via **Zadig** voor het juiste composite-interface als de OS-printerdriver claimt.

Native build: eerste `npm install` compileert addons (`node-gyp`); zorg voor build-tools (Xcode CLI Tools, MSVC build tools, …).

## Commando’s

Vanuit deze map (`epson-print/`):

```bash
npm install
npm run list          # Epson-filter (VID 0x04B8)
npm run list -- --all # alle USB-apparaten met vid/pid
npm run print:test -- --epson-first
npm run print:test -- --vid 0x04b8 --pid 0x??? --interface 0
```

`--interface`: USB-interface-nummer (veel Epson TM gebruiken **`0`**; soms `1`).

## Vanuit de repo-root

```bash
npm run epson-print:list
npm run epson-print:test -- --help
npm run epson-print:test -- --epson-first
```

## Disclaimer

Geen officiele Epson-SDK hier: puur gangbare **ESC/P** op bulk-OUT. Specifieke modellen/Afstandsbediening/snijden verschillen; test altijd met echte printer. Voor garantie/certificatie in productie: Epson **TM**-documentatie of leveranciers-SDK raadplegen.
