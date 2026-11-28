// 11-28: this folder now holds a newer build without offline caching; the old service worker clears itself so returning players get it
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil((async () => { for (const k of await caches.keys()) await caches.delete(k); await self.registration.unregister(); for (const c of await self.clients.matchAll({ type: 'window' })) c.navigate(c.url) })()))
