import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!

    // Probeer via Supabase Management API
    const res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({ sql: "ALTER TABLE reservations ADD COLUMN IF NOT EXISTS special_requests TEXT DEFAULT ''" }),
    })

    if (!res.ok) {
      // Fallback: probeer direct via pg protocol
      const res2 = await fetch(`${url}/pg`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': key,
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({ query: "ALTER TABLE reservations ADD COLUMN IF NOT EXISTS special_requests TEXT DEFAULT ''" }),
      })
      const data2 = await res2.text()
      return NextResponse.json({ method: 'pg', result: data2 })
    }

    const data = await res.text()
    return NextResponse.json({ method: 'exec_sql', result: data, ok: res.ok })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
