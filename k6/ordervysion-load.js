/**
 * k6 load test — ordervysion tenant shops
 *
 * Per iteration: GET / → random sleep 1–3s → GET /menu
 * Tenants: skippsbv, frituurnolim (random per iteration)
 *
 * Run: k6 run k6/ordervysion-load.js
 * Env: DURATION (default 60s), VUS (default 50)
 */
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Trend, Rate } from 'k6/metrics'

const homeDuration = new Trend('home_duration_ms', true)
const menuDuration = new Trend('menu_duration_ms', true)
const homeFailed = new Rate('home_errors')
const menuFailed = new Rate('menu_errors')

const tenants = ['skippsbv', 'frituurnolim']

export const options = {
  vus: Number(__ENV.VUS) || 50,
  duration: __ENV.DURATION || '60s',
  thresholds: {
    http_req_failed: ['rate<0.1'],
    http_req_duration: ['p(95)<20000'],
    home_errors: ['rate<0.1'],
    menu_errors: ['rate<0.1'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
}

export default function main() {
  const tenant = tenants[Math.floor(Math.random() * tenants.length)]
  const base = `https://${tenant}.ordervysion.com`

  const homeRes = http.get(`${base}/`, {
    tags: { name: 'Home', tenant },
  })
  homeDuration.add(homeRes.timings.duration)
  const homeOk = check(homeRes, { 'home status 200': (r) => r.status === 200 })
  homeFailed.add(!homeOk)

  sleep(1 + Math.random() * 2)

  const menuRes = http.get(`${base}/menu`, {
    tags: { name: 'Menu', tenant },
  })
  menuDuration.add(menuRes.timings.duration)
  const menuOk = check(menuRes, { 'menu status 200': (r) => r.status === 200 })
  menuFailed.add(!menuOk)
}

/**
 * k6 print standaard al: http_req_duration, http_req_failed, checks.
 * Optioneel JSON naar bestand:
 *   k6 run --summary-export=k6/summary.json k6/ordervysion-load.js
 */
