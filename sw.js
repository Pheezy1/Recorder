const CACHE_NAME = 'arb-commander-pro-v3';
const ASSETS_TO_CACHE = [
    'index.html',
    'styles.css',
    'index.js',
    'manifest.json',
    'icon-192.png',
    'icon-512.png'
];

// Installation Cycle: Open cache instance and force cache baseline assets immediately
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Premium Offline Cache Layer Primed Successfully.');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting())
    );
});

// Activation Cycle: Completely clear out previous legacy caching layers
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('Purging legacy asset footprint:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Intercept Fetch Requests: Strict Cache-First Strategy for 100% Offline Capability
self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request)
            .then((cachedResponse) => {
                // If asset exists in the local phone memory cache, serve it immediately without touching the internet
                if (cachedResponse) {
                    return cachedResponse;
                }
                
                // Otherwise fallback to network stream smoothly
                return fetch(e.request).then((networkResponse) => {
                    // Check if it's a valid asset response before caching it dynamically
                    if(!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                        return networkResponse;
                    }

                    // Dynamically cache any new internal matching assets generated along the workspace route
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(e.request, responseToCache);
                    });

                    return networkResponse;
                });
            }).catch(() => {
                // Return fallback if both network and cache miss completely (e.g. navigation pages)
                return caches.match('index.html');
            })
    );
});
