/**
 * Upload lokale help-video’s naar Supabase Storage (bucket `media`, prefix `kassa-help/`).
 * Vereist `.env.local` met NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 *
 * Gebruik: node scripts/upload-kassa-help-videos.mjs
 * Optioneel: node scripts/upload-kassa-help-videos.mjs pincode   (alleen één topic-id)
 */
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const DESKTOP = '/Users/rudiaerden/Desktop'
const PRODUCTEN = path.join(DESKTOP, 'PRODUCTEN CATEGORIEN EN OPTIES')

/** @type {{ topicId: string, files: { local: string, storage: string }[] }[]} */
const MANIFEST = [
  {
    topicId: 'pincode',
    // Eén video: 1.mp4 → 01.mp4
    files: [{ local: path.join(DESKTOP, 'PIN WIJZIGEN', '1.mp4'), storage: 'kassa-help/pincode/01.mp4' }],
  },
  {
    topicId: 'rewards',
    // Eén video: 1.mp4 → 01.mp4
    files: [{ local: path.join(DESKTOP, 'BELONINGEN', '1.mp4'), storage: 'kassa-help/rewards/01.mp4' }],
  },
  {
    topicId: 'online-toggle',
    // Volgorde = 1.mp4 → 2.mp4. Niet hersorteren.
    files: [
      { local: path.join(DESKTOP, 'ONLINE AAN UIT ZETTEN', '1.mp4'), storage: 'kassa-help/online-toggle/01.mp4' },
      { local: path.join(DESKTOP, 'ONLINE AAN UIT ZETTEN', '2.mp4'), storage: 'kassa-help/online-toggle/02.mp4' },
    ],
  },
  {
    topicId: 'inventory',
    // Volgorde = 1.mp4 → 2.mp4. Niet hersorteren.
    files: [
      { local: path.join(DESKTOP, 'VOORAAD BEHEER', '1.mp4'), storage: 'kassa-help/inventory/01.mp4' },
      { local: path.join(DESKTOP, 'VOORAAD BEHEER', '2.mp4'), storage: 'kassa-help/inventory/02.mp4' },
    ],
  },
  {
    topicId: 'reports',
    // Eén video: raportages.mp4 → 01.mp4 (bestandsnaam behouden op Desktop)
    files: [
      { local: path.join(DESKTOP, 'RAPPORTEN', 'raportages.mp4'), storage: 'kassa-help/reports/01.mp4' },
    ],
  },
  {
    topicId: 'add-category',
    // Volgorde = afspeelvolgorde in kassa (stap 1 → 5). Niet hersorteren.
    files: [
      { local: path.join(PRODUCTEN, 'categorieen', 'intro 1 .mp4'), storage: 'kassa-help/add-category/01.mp4' },
      { local: path.join(PRODUCTEN, 'categorieen', '2.mp4'), storage: 'kassa-help/add-category/02.mp4' },
      { local: path.join(PRODUCTEN, 'categorieen', '3.mp4'), storage: 'kassa-help/add-category/03.mp4' },
      { local: path.join(PRODUCTEN, 'categorieen', '4.mp4'), storage: 'kassa-help/add-category/04.mp4' },
      { local: path.join(PRODUCTEN, 'categorieen', '5.mp4'), storage: 'kassa-help/add-category/05.mp4' },
    ],
  },
  {
    topicId: 'add-product',
    // Volgorde = 1.mp4 → 5.mp4 (map heet «product toevoegen » met spatie). Niet hersorteren.
    files: [
      { local: path.join(PRODUCTEN, 'product toevoegen ', '1.mp4'), storage: 'kassa-help/add-product/01.mp4' },
      { local: path.join(PRODUCTEN, 'product toevoegen ', '2.mp4'), storage: 'kassa-help/add-product/02.mp4' },
      { local: path.join(PRODUCTEN, 'product toevoegen ', '3.mp4'), storage: 'kassa-help/add-product/03.mp4' },
      { local: path.join(PRODUCTEN, 'product toevoegen ', '4.mp4'), storage: 'kassa-help/add-product/04.mp4' },
      { local: path.join(PRODUCTEN, 'product toevoegen ', '5.mp4'), storage: 'kassa-help/add-product/05.mp4' },
    ],
  },
  {
    topicId: 'options-extras',
    // Volgorde = 1.mp4 → 5.mp4 (map opties&extras). Niet hersorteren.
    files: [
      { local: path.join(PRODUCTEN, 'opties&extras', '1.mp4'), storage: 'kassa-help/options-extras/01.mp4' },
      { local: path.join(PRODUCTEN, 'opties&extras', '2.mp4'), storage: 'kassa-help/options-extras/02.mp4' },
      { local: path.join(PRODUCTEN, 'opties&extras', '3.mp4'), storage: 'kassa-help/options-extras/03.mp4' },
      { local: path.join(PRODUCTEN, 'opties&extras', '4.mp4'), storage: 'kassa-help/options-extras/04.mp4' },
      { local: path.join(PRODUCTEN, 'opties&extras', '5.mp4'), storage: 'kassa-help/options-extras/05.mp4' },
    ],
  },
]

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) throw new Error('Geen .env.local — Supabase-keys nodig')
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq)
    let val = trimmed.slice(eq + 1)
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    process.env[key] = val
  }
}

async function main() {
  loadEnvLocal()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL of SUPABASE_SERVICE_ROLE_KEY ontbreekt')

  const filterTopic = process.argv[2] || null
  const entries = filterTopic ? MANIFEST.filter((m) => m.topicId === filterTopic) : MANIFEST
  if (filterTopic && entries.length === 0) {
    throw new Error(`Onbekend topic: ${filterTopic}`)
  }

  const supabase = createClient(url, key)
  let ok = 0
  let fail = 0

  for (const { topicId, files } of entries) {
    for (const { local, storage } of files) {
      if (!fs.existsSync(local)) {
        console.error(`MISSING ${topicId}: ${local}`)
        fail++
        continue
      }
      const body = fs.readFileSync(local)
      const { error } = await supabase.storage.from('media').upload(storage, body, {
        contentType: 'video/mp4',
        upsert: true,
        cacheControl: '3600',
      })
      if (error) {
        console.error(`FAIL ${storage}:`, error.message)
        fail++
      } else {
        console.log(`OK ${storage} (${(body.length / 1024 / 1024).toFixed(1)} MB)`)
        ok++
      }
    }
  }

  console.log(`\nKlaar: ${ok} geüpload, ${fail} mislukt.`)
  if (fail > 0) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
