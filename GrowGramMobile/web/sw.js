/* GrowGram Service Worker – Share Target + Basic Cache */
const VERSION = 'gg-sw-v1';
const CACHE_STATIC = `${VERSION}-static`;
const CACHE_URLS = [
  '/', '/manifest.webmanifest', '/share/receive.html', '/open/index.html'
];

/* --- Mini IndexedDB Helper --- */
const DB_NAME = 'gg-share';
const DB_VER = 1;
const STORE_META = 'meta';
const STORE_FILES = 'files';

function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_META)) db.createObjectStore(STORE_META);
      if (!db.objectStoreNames.contains(STORE_FILES)) db.createObjectStore(STORE_FILES);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbPut(store, key, value) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value, key);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

/* --- Lifecycle --- */
self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE_STATIC);
    await cache.addAll(CACHE_URLS);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k.startsWith('gg-sw-') && k !== CACHE_STATIC) ? caches.delete(k) : null));
    self.clients.claim();
  })());
});

/* --- Share Target Handling + basic cache-first --- */
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Handle Web Share Target: POST /share/receive
  if (event.request.method === 'POST' && url.pathname === '/share/receive') {
    event.respondWith((async () => {
      try {
        const form = await event.request.formData();
        const title = form.get('title') || '';
        const text  = form.get('text') || '';
        const link  = form.get('url') || '';
        const files = form.getAll('files') || [];

        const fileKeys = [];
        for (const f of files) {
          if (f && f.name && f.size) {
            const key = `${Date.now()}-${Math.random().toString(36).slice(2)}-${f.name}`;
            await idbPut(STORE_FILES, key, f); // Blob/File speichen
            fileKeys.push({ key, name: f.name, type: f.type, size: f.size });
          }
        }

        await idbPut(STORE_META, 'last', {
          at: Date.now(),
          title: String(title),
          text: String(text),
          url: String(link),
          files: fileKeys
        });

        // Redirect zur UI-Seite
        return Response.redirect('/share/receive.html#ok=1', 303);
      } catch (err) {
        console.error('[SW] share receive failed', err);
        return Response.redirect('/share/receive.html#error=1', 303);
      }
    })());
    return;
  }

  // Cache-first for GET
  if (event.request.method === 'GET' && url.origin === location.origin) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_STATIC);
      const cached = await cache.match(event.request);
      if (cached) return cached;
      const fetched = await fetch(event.request);
      if (fetched.ok && (fetched.type === 'basic' || fetched.type === 'cors')) {
        cache.put(event.request, fetched.clone());
      }
      return fetched;
    })());
  }
});