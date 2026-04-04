// Vysion Kassa – Service Worker
// Zorgt voor offline werking van de kassa app + cache van productafbeeldingen (externe URL's)

const CACHE = 'vysion-kassa-v10'
const STATIC_CACHE = 'vysion-static-v10'
const IMAGE_CACHE = 'vysion-images-v2'

// Bij installatie: skip waiting zodat de nieuwe SW meteen actief wordt
self.addEventListener('install', () => self.skipWaiting())

// Bij activatie: oude caches verwijderen + clients overnemen
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== CACHE && k !== STATIC_CACHE && k !== IMAGE_CACHE)
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

function isSupabaseHost(hostname) {
  return hostname.includes('supabase.co') || hostname.includes('supabase.in')
}

/** Supabase REST/Auth/etc.: niet via SW — alleen Storage-objecten cachen we als afbeelding. */
function isSupabaseNonStorageRequest(url) {
  return isSupabaseHost(url.hostname) && !url.pathname.includes('/storage/v1/')
}

function isCacheableProductImageUrl(url) {
  if (url.pathname.includes('/storage/v1/')) return true
  if (/\.(jpg|jpeg|png|gif|webp|avif)(\?|$)/i.test(url.pathname)) return true
  return false
}

function shouldStoreImageResponse(url, request, response) {
  if (!response.ok) return false
  if (isCacheableProductImageUrl(url)) return true
  if (request.destination === 'image') return true
  const ct = (response.headers.get('content-type') || '').toLowerCase()
  if (ct.startsWith('image/')) return true
  return false
}

/** Externe GET: cache-first in IMAGE_CACHE; alleen afbeeldingen wegschrijven. */
function cacheFirstExternalImage(request, url) {
  return caches.open(IMAGE_CACHE).then(cache =>
    cache.match(request).then(cached => {
      if (cached) return cached
      return fetch(request)
        .then(response => {
          if (shouldStoreImageResponse(url, request, response)) {
            cache.put(request, response.clone())
          }
          return response
        })
        .catch(() => cache.match(request))
    })
  )
}

self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Alleen GET-verzoeken via http(s)
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) return

  // Supabase API / auth: altijd live, niet cachen
  if (isSupabaseNonStorageRequest(url)) return

  // QR-service: nooit via SW (cache-first brak SVG/QR op shop-landingspagina’s)
  if (url.hostname === 'api.qrserver.com' || url.hostname.endsWith('.qrserver.com')) return

  // Externe hosts: cache-first voor afbeeldingen (Supabase Storage, CDN, prefetch, …)
  if (url.hostname !== self.location.hostname) {
    event.respondWith(cacheFirstExternalImage(request, url))
    return
  }

  // Eigen API-routes: altijd live
  if (url.pathname.startsWith('/api/')) return

  // Next.js build assets: network-first — cache-first liet oude superadmin-JS eeuwig zien na deploy
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/_next/image')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            caches.open(STATIC_CACHE).then(cache => cache.put(request, response.clone()))
          }
          return response
        })
        .catch(() =>
          caches.open(STATIC_CACHE).then(cache =>
            cache.match(request).then(cached => cached || new Response('Offline', { status: 503 }))
          )
        )
    )
    return
  }

  // Statische publieke bestanden: cache-first
  if (
    url.pathname === '/manifest.json' ||
    url.pathname === '/manifest' ||
    url.pathname === '/favicon.svg' ||
    url.pathname.startsWith('/icons/') ||
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

  // Platform superadmin: NOOIT via SW cachen — oude HTML/JS gaf "ontbrekende knoppen" na deploy
  if (url.pathname === '/superadmin' || url.pathname.startsWith('/superadmin/')) {
    event.respondWith(fetch(request, { cache: 'no-store' }))
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
