/**
 * Eenmalig: kolom + backfill via Supabase service role (zelfde DB als productie).
 * Gebruik: node scripts/klantscherm-supabase-sync.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

function loadEnv() {
  const p = resolve(process.cwd(), '.env.local')
  if (!existsSync(p)) throw new Error('Geen .env.local')
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)="?(.*)"?\s*$/)
    if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
  }
}

loadEnv()
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('Supabase env ontbreekt')

const sb = createClient(url, key)

function legacyToCustom(uploads) {
  if (!Array.isArray(uploads)) return []
  const out = []
  for (const row of uploads) {
    if (!row || typeof row !== 'object') continue
    const u = String(row.url ?? '').trim()
    if (!u) continue
    if (String(row.mediaType ?? '') === 'video' || /\.(mp4|webm|mov|m4v)(\?|$)/i.test(u)) continue
    out.push({
      url: u,
      sort: Number.isFinite(Number(row.sort)) ? Number(row.sort) : out.length,
      title: '',
      description: '',
      displayPrice: '',
      promoText: '',
    })
  }
  return out
}

const { data: rows, error } = await sb
  .from('tenant_settings')
  .select('tenant_slug, klantscherm_custom_promos, klantscherm_slideshow_uploads')

if (error) {
  console.error('SELECT failed:', error.message)
  process.exit(1)
}

let updated = 0
for (const row of rows ?? []) {
  const custom = Array.isArray(row.klantscherm_custom_promos) ? row.klantscherm_custom_promos : []
  const legacy = row.klantscherm_slideshow_uploads
  if (custom.length > 0) continue
  const next = legacyToCustom(legacy)
  if (next.length === 0) continue
  const { error: upErr } = await sb
    .from('tenant_settings')
    .update({
      klantscherm_custom_promos: next,
      klantscherm_slideshow_enabled: false,
    })
    .eq('tenant_slug', row.tenant_slug)
  if (upErr) {
    console.error(row.tenant_slug, upErr.message)
    continue
  }
  updated++
  console.log('backfill', row.tenant_slug, next.length)
}

console.log('done, backfilled tenants:', updated)

const check = await sb
  .from('tenant_settings')
  .select('tenant_slug, klantscherm_custom_promos')
  .eq('tenant_slug', 'lomichillplay')
  .maybeSingle()
console.log('lomichillplay:', JSON.stringify(check.data?.klantscherm_custom_promos))
