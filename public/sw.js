// Vysion Kassa – Service Worker
// Zorgt voor offline werking van de kassa app

const CACHE = 'vysion-kassa-v3'
const STATIC_CACHE = 'vysion-static-v3'

// Bij installatie: skip waiting zodat de nieuwe SW meteen actief wordt
self.addEventListener('install', () => self.skipWaiting())

// Bij activatie: oude caches verwijderen + clients overnemen
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== CACHE && k !== STATIC_CACHE)
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Alleen GET-verzoeken via http(s)
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) return

  // Supabase API-calls: altijd live (nooit cachen)
  if (url.hostname.includes('supabase.co') || url.hostname.includes('supabase.in')) return

  // Eigen API-routes: altijd live
  if (url.pathname.startsWith('/api/')) return

  // Externe domeinen (Sentry, Stripe, Google): altijd live
  if (url.hostname !== self.location.hostname) return

  // Next.js statische assets (hash in naam): cache-first – nooit verlopen
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/_next/image')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(cache =>
        cache.match(request).then(cached => {
          if (cached) return cached
          return fetch(request).then(response => {
            if (response.ok) cache.put(request, response.clone())
            return response
          })
        })
      )
    )
    return
  }

  // Statische publieke bestanden: cache-first
  if (
    url.pathname === '/manifest.json' ||
    url.pathname === '/favicon.svg' ||
    url.pathname.endsWith('.mp3') ||
    url.pathname.startsWith('/images/')
  ) {
    event.respondWith(
      caches.open(CACHE).then(cache =>
        cache.match(request).then(cached => {
          if (cached) return cached
          return fetch(request).then(r => {
            if (r.ok) cache.put(request, r.clone())
            return r
          })
        })
      )
    )
    return
  }

  // App-pagina's (kassa, admin, shop): network-first → cache als fallback
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          caches.open(CACHE).then(cache => cache.put(request, response.clone()))
        }
        return response
      })
      .catch(() =>
        caches.match(request).then(cached => {
          if (cached) return cached
          // Fallback offline-pagina
          return new Response(
            `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Vysion Kassa – Offline</title>
  <style>
    body { font-family: sans-serif; background: #1a1a2e; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; padding: 2rem; }
    h1 { font-size: 3rem; margin-bottom: 1rem; }
    p { font-size: 1.1rem; opacity: 0.8; max-width: 400px; }
    .badge { background: #f97316; color: white; padding: 0.5rem 1.5rem; border-radius: 9999px; font-weight: bold; margin-top: 1.5rem; display: inline-block; }
    button { margin-top: 1rem; background: #f97316; color: white; border: none; padding: 0.75rem 2rem; border-radius: 0.5rem; font-size: 1rem; cursor: pointer; }
  </style>
</head>
<body>
  <h1>📴</h1>
  <h2>Offline</h2>
  <p>Geen internetverbinding. Zodra u terug online bent, wordt de kassa automatisch herladen.</p>
  <p>Offline bestellingen worden bewaard en automatisch verstuurd bij reconnect.</p>
  <div class="badge">Vysion Kassa</div>
  <button onclick="location.reload()">↺ Opnieuw proberen</button>
</body>
</html>`,
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          )
        })
      )
  )
})
