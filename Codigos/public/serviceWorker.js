const VERSION = 'v1.0.0';
const CACHE_NAME = `vitalence-${VERSION}`;

const APP_SHELL = [
  './',
  // html
  './index.html',
  './admin.html',
  './createUser.html',
  './dashboard.html',
  './home.html',
  './mySurvey.html',
  './survey.html',
  './userManagement.html',
  './vitalSigns.html',

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


// Instalación
self.addEventListener('install', event => {
  console.log('[SW] Instalando y cacheando app shell...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => console.log('[SW] ✅ Instalación completada.'))
      .catch(err => console.error('[SW] Error cacheando archivos:', err))
  );
});

// Activar y limpiar
self.addEventListener('activate', event => {
  console.log('[SW] Activado');
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => key !== CACHE_NAME ? caches.delete(key) : null)
    ))
  );
});

// Manejo
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request)
        .then(networkResponse => {
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse.clone()));
          return networkResponse;
        })
        .catch(() => {
          if (event.request.mode === 'navigate') return caches.match('/dashboard.html');
        });
    })
  );
});