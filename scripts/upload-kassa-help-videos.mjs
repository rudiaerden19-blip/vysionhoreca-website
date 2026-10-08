/**
 * Upload lokale help-video’s naar Supabase Storage (bucket `media`, prefix `kassa-help/`).
 * Vereist `.env.local` met NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 *
 * Gebruik: node scripts/upload-kassa-help-videos.mjs
 * Optioneel: node scripts/upload-kassa-help-videos.mjs pincode   (alleen één topic-id)
 */
import fs from 'fs'
import os from 'os'
import path from 'path'
import { spawnSync } from 'child_process'
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
  {
    topicId: 'business-profile',
    files: [{ local: path.join(DESKTOP, 'zaak profiel.mp4'), storage: 'kassa-help/business-profile/01.mp4' }],
  },
  {
    topicId: 'opening-hours',
    files: [{ local: path.join(DESKTOP, 'openingstijden.mp4'), storage: 'kassa-help/opening-hours/01.mp4' }],
  },
  {
    topicId: 'delivery-pickup',
    files: [{ local: path.join(DESKTOP, 'levering en afhaal.mp4'), storage: 'kassa-help/delivery-pickup/01.mp4' }],
  },
  {
    topicId: 'colors-design',
    files: [{ local: path.join(DESKTOP, 'kleuren en design.mp4'), storage: 'kassa-help/colors-design/01.mp4' }],
  },
  {
    topicId: 'reviews-approve',
    files: [{ local: path.join(DESKTOP, 'reviews goedkeuren.mp4'), storage: 'kassa-help/reviews-approve/01.mp4' }],
  },
  {
    topicId: 'qr-codes',
    files: [{ local: path.join(DESKTOP, 'qr codes.mp4'), storage: 'kassa-help/qr-codes/01.mp4' }],
  },
  {
    topicId: 'cashbook',
    files: [{ local: path.join(DESKTOP, 'digitale kasboek.mp4'), storage: 'kassa-help/cashbook/01.mp4' }],
  },
]

function loadEnvFile(relPath) {
  const envPath = path.join(process.cwd(), relPath)
  if (!fs.existsSync(envPath)) return
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

/** `.env.local` eerst, daarna `.env.vercel.local` (overschrijft placeholders). */
function loadEnv() {
  loadEnvFile('.env.local')
  loadEnvFile('.env.vercel.local')
}

const HELP_VIDEO_BUCKET = 'kassa-help'

/** Schermopnames hebben vaak zwarte balken in 1080p — cropdetect verwijdert die vóór upload. */
function detectCropFilter(localPath) {
  const r = spawnSync(
    'ffmpeg',
    [
      '-hide_banner',
      '-ss',
      '2',
      '-i',
      localPath,
      '-vf',
      'cropdetect=24:16:0',
      '-frames:v',
      '45',
      '-f',
      'null',
      '-',
    ],
    { encoding: 'utf8' },
  )
  const text = `${r.stderr || ''}${r.stdout || ''}`
  const matches = [...text.matchAll(/crop=(\d+):(\d+):(\d+):(\d+)/g)]
  const last = matches.at(-1)
  if (!last) return 'crop=1920:720:0:180'
  const [, w, h, x, y] = last
  return `crop=${w}:${h}:${x}:${y}`
}

function transcodeHelpVideo(localPath) {
  const crop = detectCropFilter(localPath)
  const safeName = path.basename(localPath).replace(/\s+/g, '_')
  const out = path.join(os.tmpdir(), `kassa-help-crop-${Date.now()}-${safeName}`)
  console.log(`  letterbox crop: ${crop}`)
  const r = spawnSync(
    'ffmpeg',
    [
      '-hide_banner',
      '-y',
      '-i',
      localPath,
      '-vf',
      `${crop},scale=1920:-2:flags=lanczos`,
      '-c:v',
      'libx264',
      '-crf',
      '20',
      '-preset',
      'medium',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-movflags',
      '+faststart',
      out,
    ],
    { stdio: 'inherit' },
  )
  if (r.status !== 0) {
    console.warn('  transcode mislukt — origineel uploaden')
    return { body: fs.readFileSync(localPath), temp: null }
  }
  return { body: fs.readFileSync(out), temp: out }
}

function storageObjectKey(storagePath) {
  return storagePath.replace(/^kassa-help\//, '')
}

async function ensureHelpVideoBucket(supabase) {
  const { data: buckets, error: listErr } = await supabase.storage.listBuckets()
  if (listErr) throw listErr
  const exists = buckets?.some((b) => b.name === HELP_VIDEO_BUCKET)
  const opts = {
    public: true,
    allowedMimeTypes: ['video/mp4'],
  }
  if (!exists) {
    const { error } = await supabase.storage.createBucket(HELP_VIDEO_BUCKET, opts)
    if (error) throw new Error(`Bucket aanmaken mislukt: ${error.message}`)
    console.log(`Bucket "${HELP_VIDEO_BUCKET}" aangemaakt (public, video/mp4).`)
    return
  }
  const { error } = await supabase.storage.updateBucket(HELP_VIDEO_BUCKET, opts)
  if (error) {
    console.warn(`Bucket update warning (upload gaat door): ${error.message}`)
  }
}

async function main() {
  loadEnv()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL of SUPABASE_SERVICE_ROLE_KEY ontbreekt')
  if (/VERVANG-DIT/i.test(key)) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is nog placeholder — vul .env.vercel.local of .env.local in')
  }

  const filterTopic = process.argv[2] || null
  const entries = filterTopic ? MANIFEST.filter((m) => m.topicId === filterTopic) : MANIFEST
  if (filterTopic && entries.length === 0) {
    throw new Error(`Onbekend topic: ${filterTopic}`)
  }

  const supabase = createClient(url, key)
  await ensureHelpVideoBucket(supabase)

  let ok = 0
  let fail = 0

  for (const { topicId, files } of entries) {
    for (const { local, storage } of files) {
      if (!fs.existsSync(local)) {
        console.error(`MISSING ${topicId}: ${local}`)
        fail++
        continue
      }
      console.log(`\n${storage}`)
      const { body, temp } = transcodeHelpVideo(local)
      if (temp) {
        try {
          fs.unlinkSync(temp)
        } catch {
          /* ignore */
        }
      }
      const objectKey = storageObjectKey(storage)
      const { error } = await supabase.storage.from(HELP_VIDEO_BUCKET).upload(objectKey, body, {
        contentType: 'video/mp4',
        upsert: true,
        cacheControl: '86400',
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
