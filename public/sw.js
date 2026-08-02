const CACHE = 'chileme-v37-brand-copy'
const APP_SHELL = [
  '/', '/taste', '/studio', '/advisor', '/manifest.webmanifest', '/icon.svg',
  '/images/dishes/pickled-fish-soup.jpg',
  '/images/dishes/broccoli-shrimp.jpg',
  '/images/dishes/tomato-chicken-pasta.jpg',
  '/images/dishes/pepper-beef.jpg',
  '/images/dishes/mushroom-tofu.jpg',
  '/images/dishes/lemon-chicken.jpg',
  '/images/dishes/mapo-tofu.jpg',
  '/images/dishes/pumpkin-oatmeal.jpg',
  '/images/dishes/grain-bowl.jpg',
  '/images/heroes/sushi-platter.jpg',
  '/images/heroes/dumplings.jpg',
  '/images/heroes/avocado-toast.jpg',
  '/images/heroes/ramen.jpg',
  '/images/heroes/berry-pancakes.jpg',
  '/images/heroes/colorful-salad.jpg',
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone()
        caches.open(CACHE).then((cache) => cache.put(event.request, copy))
        return response
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/'))),
  )
})
