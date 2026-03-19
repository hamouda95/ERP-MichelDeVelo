/**
 * Service Worker pour l'ERP Michel De Vélo
 * Gère le cache hors ligne et la synchronisation
 */

const CACHE_NAME = 'erp-michel-develo-v1';
const STATIC_CACHE_NAME = 'erp-static-v1';

// URLs à mettre en cache pour le mode hors ligne
const CACHE_URLS = [
  '/',
  '/dashboard',
  '/repairs',
  '/products',
  '/clients',
  '/manifest.json'
];

// URLs API à mettre en cache (GET uniquement)
const API_CACHE_URLS = [
  '/api/repairs/repairs/',
  '/api/products/',
  '/api/clients/',
  '/api/repairs/repairs/kanban/',
  '/api/repairs/repairs/statistics/'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      console.log('📦 Static cache opened');
      return cache.addAll(CACHE_URLS.map(url => new Request(url)));
    }).then(() => {
      console.log('✅ Service Worker installed');
      self.skipWaiting();
    })
  );
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker activated');
      self.clients.claim();
    })
  );
});

// Interception des requêtes
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Ignorer les requêtes non-GET pour le cache
  if (request.method !== 'GET') {
    return fetch(request);
  }
  
  // Servir depuis le cache si hors ligne
  if (!navigator.onLine) {
    return event.respondWith(
      caches.match(request).then((response) => {
        if (response) {
          console.log('📱 Serving from cache:', request.url);
          return response;
        }
        
        // Retourner une page hors ligne pour les requêtes non mises en cache
        if (url.pathname.startsWith('/api/')) {
          return new Response(
            JSON.stringify({
              error: 'Hors ligne',
              message: 'Cette fonctionnalité nécessite une connexion internet',
              cached: false
            }),
            {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }
        
        return new Response(
          `<!DOCTYPE html>
          <html>
          <head>
            <title>Hors ligne - ERP Michel De Vélo</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
              .container { max-width: 400px; margin: 50px auto; text-align: center; }
              .icon { font-size: 48px; margin-bottom: 20px; }
              h1 { color: #333; margin-bottom: 10px; }
              p { color: #666; margin-bottom: 20px; }
              .retry-btn { background: #2563eb; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 16px; }
              .retry-btn:hover { background: #1d4ed8; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="icon">🚴</div>
              <h1>Hors ligne</h1>
              <p>Vous êtes actuellement hors ligne. Certaines fonctionnalités peuvent être limitées.</p>
              <button class="retry-btn" onclick="window.location.reload()">Réessayer</button>
            </div>
          </body>
          </html>`,
          {
            status: 200,
            statusText: 'OK',
            headers: { 'Content-Type': 'text/html' }
          }
        );
      })
    );
  }
  
  // Stratégie de cache : Cache First pour les assets, Network First pour l'API
  if (url.pathname.startsWith('/api/')) {
    // Network First pour l'API (toujours avoir les données les plus récentes)
    return event.respondWith(
      fetch(request).then((response) => {
        // Mettre en cache seulement si la réponse est réussie
        if (response.ok && API_CACHE_URLS.some(apiUrl => url.pathname.includes(apiUrl))) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
            console.log('💾 Cached API response:', request.url);
          });
        }
        return response;
      }).catch(() => {
        // En cas d'erreur, essayer le cache
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            console.log('📱 Fallback to cache for API:', request.url);
            return cachedResponse;
          }
          throw new Error('Network error and no cache available');
        });
      })
    );
  } else {
    // Cache First pour les assets statiques
    return event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Rafraîchir le cache en arrière-plan
          fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.ok) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, networkResponse.clone());
                console.log('🔄 Updated cache:', request.url);
              });
            }
          }).catch(() => {
            // Ignorer les erreurs de réseau pour le rafraîchissement
          });
          
          console.log('📱 Serving from cache:', request.url);
          return cachedResponse;
        }
        
        // Si pas dans le cache, faire la requête réseau
        return fetch(request).then((networkResponse) => {
          if (networkResponse.ok) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
              console.log('💾 Cached new response:', request.url);
            });
          }
          return networkResponse;
        });
      })
    );
  }
});

// Synchronisation des données hors ligne
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered');
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Synchroniser les actions hors ligne
      syncOfflineActions().then(() => {
        console.log('✅ Background sync completed');
      })
    );
  }
});

// Gestion des messages
self.addEventListener('message', (event) => {
  console.log('📨 Message received:', event.data);
  
  switch (event.data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'CACHE_UPDATE':
      updateCache(event.data.urls);
      break;
    case 'CLEAR_CACHE':
      clearCache().then(() => {
        event.ports[0].postMessage({ type: 'CACHE_CLEARED' });
      });
      break;
  }
});

// Fonctions utilitaires
async function syncOfflineActions() {
  try {
    const offlineActions = await getOfflineActions();
    
    if (offlineActions.length === 0) {
      return;
    }
    
    console.log(`🔄 Syncing ${offlineActions.length} offline actions`);
    
    for (const action of offlineActions) {
      try {
        await syncAction(action);
        console.log('✅ Synced action:', action);
      } catch (error) {
        console.error('❌ Failed to sync action:', action, error);
      }
    }
    
    // Nettoyer les actions synchronisées
    await clearOfflineActions();
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
  }
}

async function getOfflineActions() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['offlineActions'], 'readonly');
    const store = transaction.objectStore('offlineActions');
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function clearOfflineActions() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['offlineActions'], 'readwrite');
    const store = transaction.objectStore('offlineActions');
    const request = store.clear();
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function syncAction(action) {
  const { method, url, data, timestamp } = action;
  
  const response = await fetch(url, {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'X-Offline-Sync': 'true',
      'X-Offline-Timestamp': timestamp.toString()
    },
    body: data ? JSON.stringify(data) : undefined
  });
  
  if (!response.ok) {
    throw new Error(`Sync failed: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

async function updateCache(urls) {
  const cache = await caches.open(CACHE_NAME);
  
  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        await cache.put(url, response);
        console.log('🔄 Updated cache for:', url);
      }
    } catch (error) {
      console.error('❌ Failed to update cache for:', url, error);
    }
  }
}

async function clearCache() {
  try {
    await caches.delete(CACHE_NAME);
    console.log('🗑️ Cache cleared');
  } catch (error) {
    console.error('❌ Failed to clear cache:', error);
  }
}

// Base de données IndexedDB pour les actions hors ligne
async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ERPOfflineDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('offlineActions')) {
        const store = db.createObjectStore('offlineActions', {
          keyPath: 'id',
          autoIncrement: true
        });
        
        store.createIndex('timestamp', 'timestamp');
        store.createIndex('method', 'method');
        store.createIndex('url', 'url');
      }
    };
  });
}

// Notification de mise à jour
self.addEventListener('push', (event) => {
  console.log('📬 Push notification received');
  
  const options = {
    body: event.data.text(),
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'erp-notification',
    renotify: true,
    requireInteraction: false,
    actions: [
      {
        action: 'view',
        title: 'Voir'
      },
      {
        action: 'dismiss',
        title: 'Ignorer'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('ERP Michel De Vélo', options)
  );
});

// Gestion du clic sur notification
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked');
  
  event.notification.close();
  
  if (event.action === 'view') {
    // Ouvrir l'application sur la page pertinente
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/')
    );
  }
});

// Nettoyage périodique du cache
self.addEventListener('activate', (event) => {
  // Nettoyer les anciens caches chaque 24h
  setInterval(async () => {
    try {
      const cacheNames = await caches.keys();
      const now = Date.now();
      
      for (const cacheName of cacheNames) {
        if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE_NAME) {
          const cache = await caches.open(cacheName);
          const requests = await cache.keys();
          
          // Supprimer les caches plus anciens que 7 jours
          const oldRequests = requests.filter(request => {
            const response = await cache.match(request);
            return response && (now - response.date) > 7 * 24 * 60 * 60 * 1000;
          });
          
          for (const request of oldRequests) {
            await cache.delete(request);
          }
          
          if (oldRequests.length > 0) {
            console.log(`🧹 Cleaned ${oldRequests.length} old cache entries from ${cacheName}`);
          }
        }
      }
    } catch (error) {
      console.error('❌ Cache cleanup failed:', error);
    }
  }, 24 * 60 * 60 * 1000); // Toutes les 24 heures
});
