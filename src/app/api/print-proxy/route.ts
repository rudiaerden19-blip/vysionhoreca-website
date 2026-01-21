import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { printerIP, order, businessInfo, printType } = body

    if (!printerIP) {
      return NextResponse.json({ error: 'No printer IP provided' }, { status: 400 })
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
