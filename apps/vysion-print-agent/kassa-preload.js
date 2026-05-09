/**
 * Kassa preload: onderschept alle fetch-aanroepen naar localhost:9742
 * en stuurt ze via Electron IPC naar het main process.
 * Geen HTTP, geen netwerk, geen PNA-blokkering mogelijk.
 */
const { ipcRenderer } = require('electron')

const _originalFetch = window.fetch.bind(window)

window.fetch = async function (input, init) {
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
      ? input.href
      : input instanceof Request
      ? input.url
      : String(input)

  if (/https?:\/\/(127\.0\.0\.1|localhost):9742/.test(url)) {
    try {
      const u = new URL(url)
      const method = ((init && init.method) || 'GET').toUpperCase()
      let body = null
      if (init && init.body) {
        try {
          body = JSON.parse(init.body)
        } catch {
          body = init.body
        }
      }

      const result = await ipcRenderer.invoke('agent:request', {
        path: u.pathname,
        method,
        body,
      })

      return new Response(JSON.stringify(result.body), {
        status: result.status,
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, success: false, error: String(e.message || e) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  return _originalFetch(input, init)
}

/* -------------------------------------------------------------------------
 * Login-onthouden (autofill)
 * Bewaart email + wachtwoord versleuteld via Electron safeStorage
 * en vult ze automatisch in zodra een login-formulier verschijnt.
 * ------------------------------------------------------------------------- */
;(function setupAutofill() {
  let lastFilledNode = null
  let savePending = false

  function findFields(root) {
    const scope = root || document
    const email =
      scope.querySelector('input[type="email"]') ||
      scope.querySelector('input[name*="email" i]') ||
      scope.querySelector('input[id*="email" i]')
    const password = scope.querySelector('input[type="password"]')
    return { email, password }
  }

  /** React/Next.js inputs negeren `el.value = ...`; we moeten via de native setter. */
  function setReactValue(el, value) {
    try {
      const proto = Object.getPrototypeOf(el)
      const desc = Object.getOwnPropertyDescriptor(proto, 'value')
      if (desc && desc.set) desc.set.call(el, value)
      else el.value = value
    } catch { el.value = value }
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }

  async function tryFill() {
    const { email, password } = findFields()
    if (!email || !password) return
    if (lastFilledNode === password && (email.value || password.value)) return
    let creds = null
    try { creds = await ipcRenderer.invoke('kassa-creds:load') } catch { creds = null }
    if (!creds || !creds.email || !creds.password) return
    if (!email.value) setReactValue(email, creds.email)
    if (!password.value) setReactValue(password, creds.password)
    lastFilledNode = password
  }

  function maybeSaveFrom(scope) {
    const { email, password } = findFields(scope)
    if (!email || !password) return
    const e = (email.value || '').trim()
    const p = password.value || ''
    if (!e || !p) return
    if (savePending) return
    savePending = true
    Promise.resolve(ipcRenderer.invoke('kassa-creds:save', { email: e, password: p }))
      .finally(() => { savePending = false })
  }

  function attachListeners() {
    document.addEventListener('submit', (ev) => {
      const f = ev.target
      if (f && f.tagName === 'FORM') maybeSaveFrom(f)
    }, true)
    document.addEventListener('click', (ev) => {
      const t = ev.target
      if (!t || !t.closest) return
      const btn = t.closest('button, [role="button"], input[type="submit"]')
      if (!btn) return
      const form = btn.closest('form')
      maybeSaveFrom(form || document)
    }, true)
    document.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Enter') return
      const t = ev.target
      if (!t || !(t instanceof HTMLInputElement)) return
      const form = t.closest('form')
      maybeSaveFrom(form || document)
    }, true)
  }

  function init() {
    attachListeners()
    tryFill()
    const obs = new MutationObserver(() => { tryFill() })
    try { obs.observe(document.documentElement, { childList: true, subtree: true }) } catch {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true })
  } else {
    init()
  }
})()
