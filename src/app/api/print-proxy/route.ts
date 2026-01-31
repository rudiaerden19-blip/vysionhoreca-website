import { NextRequest, NextResponse } from 'next/server'

/**
 * SECURITY: Validate that the IP is a private/local network IP
 * This prevents SSRF attacks where attackers could reach internal services
 */
function isPrivateIP(ip: string): boolean {
  // Remove any port if present
  const cleanIP = ip.split(':')[0]
  
  // Check for localhost
  if (cleanIP === 'localhost' || cleanIP === '127.0.0.1') {
    return true
  }
  
  // Parse IP octets
  const parts = cleanIP.split('.')
  if (parts.length !== 4) {
    return false
  }
  
  const octets = parts.map(p => parseInt(p, 10))
  if (octets.some(o => isNaN(o) || o < 0 || o > 255)) {
    return false
  }
  
  const [a, b] = octets
  
  // Private IP ranges:
  // 10.0.0.0 - 10.255.255.255 (Class A)
  if (a === 10) return true
  
  // 172.16.0.0 - 172.31.255.255 (Class B)
  if (a === 172 && b >= 16 && b <= 31) return true
  
  // 192.168.0.0 - 192.168.255.255 (Class C)
  if (a === 192 && b === 168) return true
  
  // Link-local 169.254.x.x - BLOCK this as it includes cloud metadata endpoints
  if (a === 169 && b === 254) return false
  
  return false
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { printerIP, order, businessInfo, printType } = body

    if (!printerIP) {
      return NextResponse.json({ error: 'No printer IP provided' }, { status: 400 })
    }

    // SECURITY: Validate that printer IP is on a private network
    if (!isPrivateIP(printerIP)) {
      console.error(`🚫 Print proxy blocked: ${printerIP} is not a private IP`)
      return NextResponse.json({ error: 'Invalid printer IP - must be on local network' }, { status: 403 })
    }

    console.log(`🖨️ Print proxy: sending ${printType} receipt to ${printerIP}`)

    // Forward request to iPad print server
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    const response = await fetch(`http://${printerIP}:3001/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order, businessInfo, printType }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (response.ok) {
      console.log(`✅ Print successful`)
      return NextResponse.json({ success: true })
    } else {
      const errorText = await response.text()
      console.error(`❌ Print failed: ${errorText}`)
      return NextResponse.json({ error: errorText }, { status: response.status })
    }
  } catch (error: any) {
    console.error('❌ Print proxy error:', error.message)
    
    if (error.name === 'AbortError') {
      return NextResponse.json({ error: 'Printer timeout - check if iPad app is running' }, { status: 504 })
    }
    
    return NextResponse.json({ error: error.message || 'Print failed' }, { status: 500 })
  }
}

// Also handle printer status check
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const printerIP = searchParams.get('printerIP')

    if (!printerIP) {
      return NextResponse.json({ error: 'No printer IP provided' }, { status: 400 })
    }

    // SECURITY: Validate that printer IP is on a private network
    if (!isPrivateIP(printerIP)) {
      return NextResponse.json({ error: 'Invalid printer IP' }, { status: 403 })
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)

    const response = await fetch(`http://${printerIP}:3001/status`, {
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (response.ok) {
      const data = await response.json()
      return NextResponse.json({ status: 'online', ...data })
    } else {
      return NextResponse.json({ status: 'offline' }, { status: 200 })
    }
  } catch (error) {
    return NextResponse.json({ status: 'offline' }, { status: 200 })
  }
}
