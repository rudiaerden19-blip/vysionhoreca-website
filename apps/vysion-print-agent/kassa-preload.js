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
