const CACHE_PREFIX = 'icebound-stellar-';
const CACHE_NAME = `${CACHE_PREFIX}v75`;
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './game.js',
  './pwa.js',
  './scorecard.html',
  './scorecard.css',
  './scorecard.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

// cache:'reload' umgeht den HTTP-Cache des Browsers. Ohne das kann selbst ein
// frisch installierter Worker eine veraltete Datei aus dem Browser-Cache
// uebernehmen und dauerhaft weiter ausliefern.
function shellRequests() {
  return APP_SHELL.map(url => new Request(url, { cache: 'reload' }));
}

async function refreshShell() {
  const names = await caches.keys();
  await Promise.all(
    names.filter(name => name.startsWith(CACHE_PREFIX)).map(name => caches.delete(name))
  );
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(shellRequests());
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(shellRequests()))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(
        names
          .filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
          .map(name => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

// Bedient das Einstellungsmenue: Versionsabfrage und erzwungene Auffrischung.
// Die Antwort kommt vom aktiven Worker und nennt damit den Stand, der gerade
// wirklich ausgeliefert wird.
self.addEventListener('message', event => {
  const type = event.data?.type;
  const reply = payload => {
    if (event.ports?.[0]) event.ports[0].postMessage(payload);
    else event.source?.postMessage(payload);
  };

  if (type === 'icebound-version') {
    reply({ type: 'icebound-version', version: CACHE_NAME.slice(CACHE_PREFIX.length) });
    return;
  }

  if (type === 'icebound-refresh') {
    event.waitUntil(
      refreshShell().then(
        () => reply({ type: 'icebound-refresh', ok: true }),
        () => reply({ type: 'icebound-refresh', ok: false })
      )
    );
  }
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Stale-while-revalidate: sofort aus dem Cache, Auffrischung im Hintergrund.
  // NIE auf das Netz warten, solange ein Cache-Treffer da ist. Ein network-first-
  // Fetch wuerde im Mobilfunknetz an der unerreichbaren WLAN-IP des Servers
  // minutenlang haengen, statt wie im Flugmodus sofort zu scheitern.
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then(cached => {
        const network = fetch(request)
          .then(response => {
            if (response && response.ok) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy));
            }
            return response;
          })
          .catch(() => null);
        event.waitUntil(network);
        return cached || network.then(response => response || caches.match('./index.html'));
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then(cached => cached || fetch(request).then(response => {
      if (!response || !response.ok) return response;
      return caches.open(CACHE_NAME)
        .then(cache => cache.put(request, response.clone()))
        .then(() => response);
    }))
  );
});
