import { NextRequest, NextResponse } from 'next/server'
import {
  isPrivateLanIpv4,
  PRINT_PROXY_PRINT_TIMEOUT_MS,
  PRINT_PROXY_STATUS_TIMEOUT_MS,
  PRINTER_LAN_PRINT_SERVER_PORT,
  PRINTER_POST_MAX_ATTEMPTS,
  PRINTER_POST_RETRY_DELAY_MS,
} from '@/lib/printer-lan'

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * Naar de lokale print-server (iPad/Vysion Print). Alleen IPv4 op private ranges.
 * 3 pogingen, 1 s tussenpauze, ruime timeout per poging (WiFi/Starlink).
 */
async function forwardPrintToLanServer(printerIP: string, body: object): Promise<Response> {
  let lastResponse: Response | null = null
  let lastErr: unknown
  for (let attempt = 0; attempt < PRINTER_POST_MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), PRINT_PROXY_PRINT_TIMEOUT_MS)
    try {
      const response = await fetch(`http://${printerIP}:${PRINTER_LAN_PRINT_SERVER_PORT}/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      lastResponse = response
      if (response.ok) return response
    } catch (e: unknown) {
      clearTimeout(timeoutId)
      lastErr = e
      lastResponse = null
    }
    if (attempt < PRINTER_POST_MAX_ATTEMPTS - 1) {
      await sleep(PRINTER_POST_RETRY_DELAY_MS)
    }
  }
  if (lastResponse) return lastResponse
  throw lastErr instanceof Error ? lastErr : new Error('Print failed')
}

async function forwardStatusToLanServer(printerIP: string): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), PRINT_PROXY_STATUS_TIMEOUT_MS)
  try {
    return await fetch(`http://${printerIP}:${PRINTER_LAN_PRINT_SERVER_PORT}/status`, {
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { printerIP, order, businessInfo, printType } = body

    if (!printerIP || typeof printerIP !== 'string') {
      return NextResponse.json({ error: 'No printer IP provided' }, { status: 400 })
    }

    const clean = printerIP.split(':')[0].trim()
    if (!isPrivateLanIpv4(clean)) {
      console.error(`🚫 Print proxy blocked: ${printerIP} is not a private IPv4`)
      return NextResponse.json({ error: 'Invalid printer IP - use local IPv4 only (e.g. 192.168.x.x)' }, { status: 403 })
    }

    console.log(`🖨️ Print proxy: sending ${printType} receipt to ${clean}`)

    const response = await forwardPrintToLanServer(clean, { order, businessInfo, printType })

    if (response.ok) {
      console.log(`✅ Print successful`)
      return NextResponse.json({ success: true })
    } else {
      const errorText = await response.text()
      console.error(`❌ Print failed: ${errorText}`)
      return NextResponse.json({ error: errorText }, { status: response.status })
    }
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string }
    console.error('❌ Print proxy error:', err?.message)

    if (err?.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Printer timeout — check WiFi, Starlink, or iPad print app' },
        { status: 504 },
      )
    }

    return NextResponse.json({ error: err?.message || 'Print failed' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const printerIP = searchParams.get('printerIP')

    if (!printerIP) {
      return NextResponse.json({ error: 'No printer IP provided' }, { status: 400 })
    }

    const clean = printerIP.split(':')[0].trim()
    if (!isPrivateLanIpv4(clean)) {
      return NextResponse.json({ error: 'Invalid printer IP' }, { status: 403 })
    }

    const response = await forwardStatusToLanServer(clean)

    if (response.ok) {
      const data = await response.json()
      return NextResponse.json({ status: 'online', ...data })
    }
    return NextResponse.json({ status: 'offline' }, { status: 200 })
  } catch {
    return NextResponse.json({ status: 'offline' }, { status: 200 })
  }
}
