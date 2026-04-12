// Vysion Kassa – Service Worker
// Offline: kassa-app + statische assets + sector-marketingpagina’s; productafbeeldingen (externe URL's)

const CACHE = 'vysion-kassa-v11'
const STATIC_CACHE = 'vysion-static-v11'
const IMAGE_CACHE = 'vysion-images-v3'

/** Eerste install: marketing-sectoren + start zodat PWA na één online bezoek ook zonder net start. */
const PRECACHE_SAME_ORIGIN = [
  '/',
  '/manifest.json',
  '/manifest',
  '/favicon.svg',
  '/sectoren/bakkerij',
  '/sectoren/cafe',
  '/sectoren/frituur',
  '/sectoren/kebab',
  '/sectoren/kapper',
  '/sectoren/retail',
]

self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(STATIC_CACHE)
        await Promise.all(
          PRECACHE_SAME_ORIGIN.map(url =>
            fetch(url, { credentials: 'same-origin' })
              .then(r => {
                if (r.ok) return cache.put(url, r.clone())
              })
              .catch(() => {})
          )
        )
      } catch {
        /* precache is best-effort */
      }
      await self.skipWaiting()
    })()
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(keys.filter(k => k !== CACHE && k !== STATIC_CACHE && k !== IMAGE_CACHE).map(k => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  )
})

function isSupabaseHost(hostname) {
  return hostname.includes('supabase.co') || hostname.includes('supabase.in')
}

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

/** Background Sync: client-tab krijgt flush-opdracht (Supabase zit in de pagina, niet in de SW). */
self.addEventListener('sync', event => {
  if (event.tag === 'vysion-offline-orders') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
        clients.forEach(c => {
          try {
            c.postMessage({ type: 'VYSION_FLUSH_OFFLINE_ORDERS' })
          } catch {
            /* ignore */
          }
        })
      })
    )
  }
})

self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET' || !url.protocol.startsWith('http')) return

  if (isSupabaseNonStorageRequest(url)) return

  if (url.hostname === 'api.qrserver.com' || url.hostname.endsWith('.qrserver.com')) return

  if (url.hostname !== self.location.hostname) {
    event.respondWith(cacheFirstExternalImage(request, url))
    return
  }

  if (url.pathname.startsWith('/api/')) return

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

  if (url.pathname === '/superadmin' || url.pathname.startsWith('/superadmin/')) {
    event.respondWith(fetch(request, { cache: 'no-store' }))
    return
  }

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
  <p>Offline bestellingen worden bewaard en automatisch verstuurd bij reconnect (of via achtergrond-sync).</p>
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
