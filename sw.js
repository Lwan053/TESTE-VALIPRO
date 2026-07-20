const CACHE_NAME = 'valipro-v1';
const urlsToCache = [
    './',
    './index.html',
    './painel.html',
    './style.css',
    './login-style.css',
    './script.js',
    './login-script.js',
    './firebase-config.js',
    './manifest.json'
];

// Install: cacheia tolerante a falhas (uma URL 404 não invalida tudo)
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) =>
            Promise.allSettled(urlsToCache.map((url) => cache.add(url)))
        )
    );
    self.skipWaiting();
});

// Activate: remove caches antigos
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((names) =>
            Promise.all(names.map((n) => (n !== CACHE_NAME ? caches.delete(n) : null)))
        ).then(() => self.clients.claim())
    );
});

// Fetch: network-first para navegação/HTML, cache-first para assets estáticos
self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    // Não intercepta chamadas do Firestore/Auth (precisam de rede)
    const url = new URL(req.url);
    if (url.hostname.includes('googleapis.com') || url.hostname.includes('gstatic.com')) return;

    event.respondWith(
        fetch(req)
            .then((res) => {
                const copy = res.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
                return res;
            })
            .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
    );
});
