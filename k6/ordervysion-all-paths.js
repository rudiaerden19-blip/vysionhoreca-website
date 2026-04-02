/**
 * k6 — alle bekende GET-paden onder tenant-host (*.ordervysion.com).
 *
 * Per iteration: kies willekeurige tenant → GET op elk pad (kort sleep ertussen).
 * Voor zware runs: VUS laag houden (elke iteration = N requests).
 *
 *   TENANT_FILE=k6/tenants.txt VUS=5 DURATION=2m k6 run k6/ordervysion-all-paths.js
 *
 * Env: VUS, DURATION, TENANT_FILE, BASE_HOST, PATH_SLEEP (sec, default 0.05)
 */
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Trend, Rate } from 'k6/metrics'
import { SharedArray } from 'k6/data'

const pathDuration = new Trend('path_duration_ms', true)
const pathFailed = new Rate('path_errors')

/** Geen /shop/{slug}-prefix: middleware zet dat op tenant-subdomein zelf. */
const SHOP_PATHS = [
  '/',
  '/menu',
  '/checkout',
  '/menukaart',
  '/reserveren',
  '/reserveren/bevestiging',
  '/display',
  '/welkom',
  '/review',
  '/account',
  '/account/login',
  '/account/register',
  '/admin',
  '/admin/kassa',
  '/admin/bestellingen',
  '/admin/categorieen',
  '/admin/producten',
  '/admin/opties',
  '/admin/rapporten',
  '/admin/z-rapport',
  '/admin/reserveringen',
  '/admin/bonnenprinter',
  '/admin/pincode',
  '/admin/openingstijden',
  '/admin/levering',
  '/admin/media',
  '/admin/design',
  '/admin/seo',
  '/admin/team',
  '/admin/teksten',
  '/admin/marketing',
  '/admin/whatsapp',
  '/admin/reviews',
  '/admin/promoties',
  '/admin/populair',
  '/admin/allergenen',
  '/admin/qr-codes',
  '/admin/labels',
  '/admin/profiel',
  '/admin/betaling',
  '/admin/abonnement',
  '/admin/analyse',
  '/admin/personeel',
  '/admin/uren',
  '/admin/online-status',
  '/admin/voorraad',
  '/admin/cadeaubonnen',
  '/admin/vacatures',
  '/admin/verkoop',
  '/admin/klanten',
  '/admin/klanten/beloningen',
  '/admin/kosten/ingredienten',
  '/admin/kosten/producten',
  '/admin/kosten/instellingen',
  '/admin/groepen',
  '/admin/groepen/sessies',
  '/admin/groepen/bestellingen',
]

const DEFAULT_TENANTS = ['skippsbv', 'frituurnolim']

function loadTenantSlugs() {
  const path = __ENV.TENANT_FILE || 'k6/tenants.txt'
  try {
    const raw = open(path)
    if (!raw) return DEFAULT_TENANTS
    const lines = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
    return lines.length ? lines : DEFAULT_TENANTS
  } catch (e) {
    return DEFAULT_TENANTS
  }
}

const tenants = new SharedArray('tenants', loadTenantSlugs)

const pathSleep = Number(__ENV.PATH_SLEEP || 0.05)

export const options = {
  vus: Number(__ENV.VUS) || 10,
  duration: __ENV.DURATION || '2m',
  thresholds: {
    http_req_failed: ['rate<0.2'],
    http_req_duration: ['p(95)<45000'],
    path_errors: ['rate<0.2'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
}

export default function allPaths() {
  const tenant = tenants[Math.floor(Math.random() * tenants.length)]
  const hostTemplate = (__ENV.BASE_HOST || '{tenant}.ordervysion.com').replace(
    '{tenant}',
    tenant,
  )
  const base = hostTemplate.startsWith('http')
    ? hostTemplate.replace(/\/$/, '')
    : `https://${hostTemplate.replace(/\/$/, '')}`

  for (const p of SHOP_PATHS) {
    const url = `${base}${p}`
    const res = http.get(url, {
      tags: { name: p || '/', tenant },
    })
    pathDuration.add(res.timings.duration)
    const ok = check(res, {
      [`${p} status 200`]: (r) => r.status === 200,
    })
    pathFailed.add(!ok)
    sleep(pathSleep)
  }
}
