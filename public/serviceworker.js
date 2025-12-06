const CACHE_NAME = "veresion-1";
const urlToCache = ['index.html', 'offline.html'];


const self = this;

self.addEventListener('install', (event) => {

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('opened cache');

                return cache.addAll(urlToCache);
            })
    )

});

self.addEventListener('fetch', (event) => {

    event.respondWith(
        caches.match(event.request)
            .then(() => {
                return fetch(event.request)
                    .catch(() => caches.match('offline.html'))
            })
    )

});


self.addEventListener('activate', (event) => {
    const cacheWhitelist = [];

    cacheWhitelist.push(CACHE_NAME);

    event.waitUntil(
        caches.keys().then((cacheNamesList) =>
            Promise.all(
                cacheNamesList.map((cacheName) => {
                    if (!cacheWhitelist.includes(cacheName)) {
                        return caches.delete(cacheName);
                    }
                })
            )
        )
    )
});