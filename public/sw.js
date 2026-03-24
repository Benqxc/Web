const CACHE_NAME = 'nobame-cache-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/script.js',
  '/manifest.json'
];

// Установка Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        // Кэшируем только существующие ресурсы
        return Promise.all(
          urlsToCache.map(url => {
            return fetch(url)
              .then(response => {
                if (response.ok) {
                  return cache.put(url, response);
                }
              })
              .catch(err => {
                console.log(`Cache skip: ${url}`, err);
              });
          })
        );
      })
  );
  self.skipWaiting();
});

// Активация Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Перехват запросов
self.addEventListener('fetch', event => {
  // Пропускаем API запросы
  if (event.request.url.includes('/api/')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Возвращаем из кэша или делаем запрос
        if (response) {
          return response;
        }
        return fetch(event.request)
          .then(response => {
            // Не кэшируем не успешные ответы
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Клонируем ответ для кэширования
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          });
      })
      .catch(err => {
        console.log('Fetch error:', err);
      })
  );
});
