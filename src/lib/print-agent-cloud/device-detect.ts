/** Windows PC / kiosk — nooit cloud-iPad-route (localhost-print blijft). */
export function isWindowsDesktopPrintClient(): boolean {
  if (typeof navigator === 'undefined') return false
  return /\bWindows NT\b/i.test(navigator.userAgent)
}

/**
 * iPad Safari (incl. iOS 13+ „desktop” UA: MacIntel + touch).
 * Geen Android-kiosk, geen Windows-touchscreen.
 */
export function isIpadSafariCloudPrintClient(): boolean {
  if (typeof navigator === 'undefined') return false
  if (/Android/i.test(navigator.userAgent)) return false
  if (isWindowsDesktopPrintClient()) return false

  const ua = navigator.userAgent
  if (/\biPad\b/i.test(ua)) return true

  const touchMac =
    navigator.platform === 'MacIntel' &&
    navigator.maxTouchPoints > 1 &&
    /Safari/i.test(ua) &&
    !/\bChrome\b/i.test(ua) &&
    !/\bCriOS\b/i.test(ua)

  return touchMac
}

export type CloudPrintRoutingInput = {
  cloudPrintEnabled?: boolean
}

/** Cloud-wachtrij alleen voor iPad Safari wanneer tenant-flag aan staat. */
export function shouldRoutePrintViaCloudQueue(input: CloudPrintRoutingInput): boolean {
  return input.cloudPrintEnabled === true && isIpadSafariCloudPrintClient()
}
