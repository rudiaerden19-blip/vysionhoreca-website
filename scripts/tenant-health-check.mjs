#!/usr/bin/env node
import { readFileSync } from 'node:fs'

/**
 * Multi-tenant health check (geen browser) — HTTP + HTML-string checks.
 *
 * Gebruik:
 *   node scripts/tenant-health-check.mjs
 *   node scripts/tenant-health-check.mjs frituurnolim skippsbv
 *   TENANT_LIST_FILE=./tenants.txt node scripts/tenant-health-check.mjs
 *
 * Omgeving:
 *   BASE_HOST_TEMPLATE  default: https://{tenant}.ordervysion.com
 *   REQUEST_TIMEOUT_MS  default: 25000
 */

const BASE_HOST_TEMPLATE =
  process.env.BASE_HOST_TEMPLATE || 'https://{tenant}.ordervysion.com'
const TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 25_000)

/** Paden om te combineren voor keyword-soft-check (homepage is vaak CSR → weinig tekst in eerste HTML) */
const PATHS_TO_FETCH = ['/', '/menu']

/** Teksten die op minstens één response moeten voorkomen (case-insensitive), anders waarschuwing */
const SOFT_KEYWORDS = ['menu', 'bestellen', 'winkelwagen']

/** Als deze substring in de gecombineerde HTML voorkomt → harde fout (verkeerde deployment/branding) */
const FORBIDDEN_SNIPPETS = ['scarda']

/**
 * Minimaal tekenen HTML totaal (alle paden) om "lege" error pages te filteren
 */
const MIN_COMBINED_HTML_LENGTH = 800

/**
 * Marker dat dit een Next-build lijkt (los van RSC vs Pages). Voorkomt false positives op statische 200 OK.
 */
function looksLikeNextApp(html) {
  return (
    html.includes('__NEXT_DATA__') ||
    html.includes('__next') ||
    html.includes('/_next/static') ||
    html.includes('next/dist')
  )
}

function loadTenants() {
  const argv = process.argv.slice(2).filter((a) => !a.startsWith('-'))
  if (argv.length) return argv

  const file = process.env.TENANT_LIST_FILE
  if (file) {
    const text = readFileSync(file, 'utf8')
    return text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
  }

  return ['skippsbv', 'frituurnolim']
}

;(async () => {
  const tenants = loadTenants()

  let exitCode = 0

  for (const tenant of tenants) {
    const host = BASE_HOST_TEMPLATE.replace(/\{tenant\}/g, tenant)
    console.log(`\n=== ${tenant.toUpperCase()} ===`)
    console.log(`Basis: ${host}`)

    let combined = ''
    let allOk = true

    for (const path of PATHS_TO_FETCH) {
      const url = `${host.replace(/\/$/, '')}${path}`
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS)

      try {
        const res = await fetch(url, {
          redirect: 'follow',
          signal: ctrl.signal,
          headers: {
            'user-agent': 'VysionTenantHealthCheck/1.0 (+https://www.vysionhoreca.com)',
            accept: 'text/html,application/xhtml+xml',
          },
        })
        clearTimeout(t)

        const status = res.status
        const html = await res.text()
        combined += `\n<!-- ${url} -->\n${html}`

        console.log(`  ${path} → ${status} (${html.length} bytes)`)

        if (status !== 200) {
          console.log(`  ❌ HTTP ${status} — niet OK`)
          allOk = false
          exitCode = 1
        }

        if (html.toLowerCase().includes('laden...')) {
          console.log(
            `  ⚠️  Bevat "Laden..." — typisch CSR; keyword-checks gebeuren op gecombineerde HTML (+ /menu).`,
          )
        }
      } catch (err) {
        clearTimeout(t)
        console.log(`  ❌ Fetch mislukt (${path}): ${err.message}`)
        allOk = false
        exitCode = 1
      }
    }

    if (!allOk) continue

    const lower = combined.toLowerCase()

    for (const bad of FORBIDDEN_SNIPPETS) {
      if (lower.includes(bad.toLowerCase())) {
        console.log(`  ❌ Verboden snippet gevonden: "${bad}" (verkeerde deployment/branding?)`)
        exitCode = 1
        allOk = false
      }
    }

    if (combined.length < MIN_COMBINED_HTML_LENGTH) {
      console.log(
        `  ❌ Gecombineerde HTML te kort (${combined.length} < ${MIN_COMBINED_HTML_LENGTH}) — mogelijk lege/error body`,
      )
      exitCode = 1
      allOk = false
    }

    if (!looksLikeNextApp(combined)) {
      console.log(
        '  ⚠️  Geen duidelijke Next.js-markers in HTML — controleer of dit echt jullie app is.',
      )
    }

    for (const kw of SOFT_KEYWORDS) {
      if (!lower.includes(kw.toLowerCase())) {
        console.log(`  ⚠️  Keyword niet gevonden in gecombineerde HTML: "${kw}"`)
      }
    }

    if (allOk) console.log('  ✅ Basis-checks OK (HTTP + geen verboden branding + voldoende payload)')
  }

  console.log('')
  process.exit(exitCode)
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
