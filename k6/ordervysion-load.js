/**
 * k6 load test — ordervysion tenant shops
 *
 * Standaard: GET / → sleep 1–3s → GET /menu
 *
 * HARD=1 (zwaarder): kortere sleep (0,2–0,6s) + GET /checkout + GET /api/health
 *
 * RAMP=1: oplopende VUs (ramping-vus), negeert VUS/DURATION tenzij anders gedocumenteerd
 *
 * Run vanaf repo-root:
 *   k6 run k6/ordervysion-load.js
 *   HARD=1 VUS=200 DURATION=3m k6 run k6/ordervysion-load.js
 *   RAMP=1 RAMP_TARGET=300 RAMP_STEADY=2m k6 run k6/ordervysion-load.js
 *
 * Env: VUS, DURATION, TENANT_FILE, BASE_HOST, HARD, RAMP, RAMP_TARGET, RAMP_STEADY
 */
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Trend, Rate } from 'k6/metrics'
import { SharedArray } from 'k6/data'

const homeDuration = new Trend('home_duration_ms', true)
const menuDuration = new Trend('menu_duration_ms', true)
const checkoutDuration = new Trend('checkout_duration_ms', true)
const healthDuration = new Trend('health_duration_ms', true)
const homeFailed = new Rate('home_errors')
const menuFailed = new Rate('menu_errors')
const checkoutFailed = new Rate('checkout_errors')
const healthFailed = new Rate('health_errors')

const isHard = __ENV.HARD === '1' || __ENV.HARD === 'true'
const isRamp = __ENV.RAMP === '1' || __ENV.RAMP === 'true'

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

function thinkTime() {
  if (isHard) {
    sleep(0.2 + Math.random() * 0.4)
  } else {
    sleep(1 + Math.random() * 2)
  }
}

const thresholds = {
  http_req_failed: ['rate<0.15'],
  http_req_duration: ['p(95)<30000'],
  home_errors: ['rate<0.15'],
  menu_errors: ['rate<0.15'],
  ...(isHard
    ? {
        checkout_errors: ['rate<0.15'],
        health_errors: ['rate<0.15'],
      }
    : {}),
}

export const options = isRamp
  ? {
      scenarios: {
        ramp_stress: {
          executor: 'ramping-vus',
          startVUs: 0,
          stages: [
            {
              duration: __ENV.RAMP_UP || '30s',
              target: Number(__ENV.RAMP_TARGET) || 200,
            },
            {
              duration: __ENV.RAMP_STEADY || '2m',
              target: Number(__ENV.RAMP_TARGET) || 200,
            },
            { duration: __ENV.RAMP_DOWN || '30s', target: 0 },
          ],
          gracefulRampDown: '45s',
        },
      },
      thresholds,
      summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
    }
  : {
      vus: Number(__ENV.VUS) || 50,
      duration: __ENV.DURATION || '60s',
      thresholds,
      summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
    }

export default function main() {
  const tenant = tenants[Math.floor(Math.random() * tenants.length)]
  const hostTemplate = (__ENV.BASE_HOST || '{tenant}.ordervysion.com').replace(
    '{tenant}',
    tenant,
  )
  const base = hostTemplate.startsWith('http')
    ? hostTemplate.replace(/\/$/, '')
    : `https://${hostTemplate.replace(/\/$/, '')}`

  const homeRes = http.get(`${base}/`, {
    tags: { name: 'Home', tenant },
  })
  homeDuration.add(homeRes.timings.duration)
  const homeOk = check(homeRes, { 'home status 200': (r) => r.status === 200 })
  homeFailed.add(!homeOk)

  thinkTime()

  const menuRes = http.get(`${base}/menu`, {
    tags: { name: 'Menu', tenant },
  })
  menuDuration.add(menuRes.timings.duration)
  const menuOk = check(menuRes, { 'menu status 200': (r) => r.status === 200 })
  menuFailed.add(!menuOk)

  if (isHard) {
    thinkTime()

    const checkoutRes = http.get(`${base}/checkout`, {
      tags: { name: 'Checkout', tenant },
    })
    checkoutDuration.add(checkoutRes.timings.duration)
    const checkoutOk = check(checkoutRes, {
      'checkout status 200': (r) => r.status === 200,
    })
    checkoutFailed.add(!checkoutOk)

    thinkTime()

    const healthRes = http.get(`${base}/api/health`, {
      tags: { name: 'Health', tenant },
    })
    healthDuration.add(healthRes.timings.duration)
    const healthOk = check(healthRes, {
      'health status 200': (r) => r.status === 200,
    })
    healthFailed.add(!healthOk)
  }
}
