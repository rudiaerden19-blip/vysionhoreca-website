/**
 * One-off: remove dead kosten/ingredient i18n keys from all locale JSON files.
 * Run: node scripts/prune-kosten-i18n.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const locales = ['nl', 'en', 'de', 'fr', 'es', 'it', 'ja', 'zh', 'ar']

function del(obj, ...keys) {
  let o = obj
  for (let i = 0; i < keys.length - 1; i++) {
    if (!o || typeof o !== 'object') return
    o = o[keys[i]]
  }
  if (o && keys.length) delete o[keys.at(-1)]
}

function renumberProFeatures(pricing) {
  const f = pricing?.pro?.features
  if (!f || typeof f !== 'object') return
  const nums = Object.keys(f)
    .map((k) => Number(k))
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b)
  const kept = nums.filter((n) => n !== 5 && n !== 8).map((n) => f[String(n)])
  pricing.pro.features = {}
  kept.forEach((text, idx) => {
    pricing.pro.features[String(idx + 1)] = text
  })
}

for (const loc of locales) {
  const file = path.join(root, 'messages', `${loc}.json`)
  const raw = fs.readFileSync(file, 'utf8')
  const data = JSON.parse(raw)

  del(data, 'platform', 'kostencalculator')
  del(data, 'costCalculator')
  del(data, 'simulator')
  del(data, 'kostenInstellingenPage')
  del(data, 'dashboard', 'productCosts')
  del(data, 'dashboard', 'ingredients')
  del(data, 'dashboard', 'costSettings')
  del(data, 'dashboard', 'menu', 'costCalculator')
  del(data, 'adminHamburger', 'rows', 'kosten')
  del(data, 'adminHamburger', 'items', 'sm_kosten_marge')
  del(data, 'adminHamburger', 'items', 'sm_kosten_ingredienten')
  del(data, 'adminHamburger', 'items', 'sm_kosten_product')
  del(data, 'tenantModulesPage', 'modules', 'kosten')
  del(data, 'comparison', 'features', 'costCalculator')
  del(data, 'industry', 'accounting')

  if (data.kassaSidebar?.menu) {
    del(data.kassaSidebar, 'menu', 'costSettings')
    del(data.kassaSidebar, 'menu', 'ingredients')
    del(data.kassaSidebar, 'menu', 'productCosts')
    del(data.kassaSidebar, 'menu', 'costCalculation')
  }

  del(data, 'admin', 'categories', 'costCalculation')
  del(data, 'admin', 'menu', 'costSettings')
  del(data, 'admin', 'menu', 'ingredients')
  del(data, 'admin', 'menu', 'productCosts')
  del(data, 'admin', 'menu', 'costCalculation')

  if (data.pricing) renumberProFeatures(data.pricing)

  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
  console.log('pruned', loc)
}
