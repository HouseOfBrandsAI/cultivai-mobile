// CultivAI Employee — Service Worker
// Strategy: offline-first for app shell, network-first for API, queue POST submissions when offline.

const CACHE_VERSION = 'cultivai-mobile-v1'
const SHELL_CACHE = `${CACHE_VERSION}-shell`
const API_CACHE = `${CACHE_VERSION}-api`
const SHELL_ASSETS = ['/', '/index.html', '/manifest.json']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET') return

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request))
    return
  }

  event.respondWith(cacheFirst(request))
})

async function networkFirst(request) {
  try {
    const response = await fetch(request)
    const cache = await caches.open(API_CACHE)
    cache.put(request, response.clone())
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    return new Response(JSON.stringify({ offline: true }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response && response.status === 200) {
      const cache = await caches.open(SHELL_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const shell = await caches.match('/index.html')
    if (shell) return shell
    throw new Error('Offline and no cached shell')
  }
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'cultivai-form-sync') {
    event.waitUntil(replayQueuedSubmissions())
  }
})

async function replayQueuedSubmissions() {
  // Stub — actual queue replay is driven by the app on reconnect via useOnlineStatus.
  // Background Sync support varies across browsers; this event is a best-effort hint.
}
