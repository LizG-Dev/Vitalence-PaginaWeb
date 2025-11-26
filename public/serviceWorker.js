const VERSION = 'v1.0.1';
const CACHE_NAME = `vitalence-${VERSION}`;

const APP_SHELL = [
  // HTML
  './',
  './index.html',
  './admin.html',
  './createUser.html',
  './dashboard.html',
  './home.html',
  './mySurvey.html',
  './survey.html',
  './userManagement.html',
  './vitalSigns.html',
  './profile.html',
  './profilead.html',

  // js
  './js/home.js',
  './js/script.js',
  './js/main.js',

  // styles
  './styles/admin.css',
  './styles/createUser.css',
  './styles/dashboard.css',
  './styles/home.css',
  './styles/mySurvey.css',
  './styles/style.css',
  './styles/userManagement.css',
  './styles/vitalSigns.css',
  './styles/profile.css',
  './styles/profile2.css',

  // Img
  './img/about.jpg',
  './img/g1.png',
  './img/g2.jpg',
  './img/g3.png',
  './img/g4.jpg',
  './img/g5.jpg',
  './img/g6.jpg',
  './img/home1.png',
  './img/logo.jpeg',
  './img/logoremov.png',
  './img/t1.jpg',
  './img/t2.png',
  './img/t3.png',
  './img/t4.png',
  './img/t5.png',
  './img/t6.jpg',
  './img/user.jpg'
];

self.addEventListener('install', event => {
  console.log('[SW] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
});

self.addEventListener('activate', event => {
  console.log('[SW] Activado');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => key !== CACHE_NAME ? caches.delete(key) : null))
    )
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (url.pathname.startsWith('/api/')) {
    return event.respondWith(fetch(event.request));
  }

  if (event.request.method !== 'GET') return;

  event.respondWith(
    (async () => {
      const cached = await caches.match(event.request);

      if (cached) {
        event.waitUntil(updateCache(event.request));
        return cached;
      }

      try {
        const networkResponse = await fetch(event.request);
        event.waitUntil(saveToCache(event.request, networkResponse.clone()));

        return networkResponse;
      } catch (err) {
        if (event.request.mode === 'navigate') {
          return caches.match('/dashboard.html');
        }
        throw err;
      }
    })()
  );
});

async function saveToCache(request, response) {
  if (!response || !response.ok) return;
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response);
}

async function updateCache(request) {
  try {
    const fresh = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, fresh.clone());
  } catch (err) {
    console.warn("[SW] No se pudo actualizar en background", err);
  }
}