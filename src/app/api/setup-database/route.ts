import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Admin client with service role for DDL operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST() {
  try {
    // Create daily_sales table if it doesn't exist
    const { error: dailySalesError } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS daily_sales (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          tenant_slug VARCHAR(255) NOT NULL,
          date DATE NOT NULL,
          cash_revenue DECIMAL(10,2) DEFAULT 0,
          card_revenue DECIMAL(10,2) DEFAULT 0,
          total_revenue DECIMAL(10,2) DEFAULT 0,
          order_count INTEGER DEFAULT 0,
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(tenant_slug, date)
        );
        
        CREATE INDEX IF NOT EXISTS idx_daily_sales_tenant_date ON daily_sales(tenant_slug, date);
      `
    })

    if (dailySalesError) {
      // If RPC doesn't exist, try direct query
      console.log('RPC not available, table may need manual creation')
      
      // Check if table exists by trying to select from it
      const { error: checkError } = await supabaseAdmin
        .from('daily_sales')
        .select('id')
        .limit(1)
      
      if (checkError && checkError.message.includes('does not exist')) {
        return NextResponse.json({ 
          error: 'Table daily_sales does not exist. Please create it manually in Supabase SQL Editor.',
          sql: `CREATE TABLE IF NOT EXISTS daily_sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  cash_revenue DECIMAL(10,2) DEFAULT 0,
  card_revenue DECIMAL(10,2) DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  order_count INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_slug, date)
);`
        }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, message: 'Database setup complete' })
  } catch (error: any) {
    console.error('Setup error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET() {
  // Check which tables exist
  try {
    const tables = ['daily_sales', 'fixed_costs', 'variable_costs', 'business_targets']
    const results: Record<string, boolean> = {}

    for (const table of tables) {
      const { error } = await supabaseAdmin
        .from(table)
        .select('id')
        .limit(1)
      
      results[table] = !error || !error.message.includes('does not exist')
    }

    return NextResponse.json({ tables: results })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
