/**
 * Firebase Messaging Service Worker
 * 
 * Bu dosya arka planda push notification'ları almak için kullanılır.
 * public/ klasörüne yerleştirilmelidir.
 */

// Firebase SDK'yı import et
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDFqmZg4khPVJron56Cyj0nfsupvBjuTAA",
  authDomain: "bilardo-skor.firebaseapp.com",
  projectId: "bilardo-skor",
  storageBucket: "bilardo-skor.firebasestorage.app",
  messagingSenderId: "413070873797",
  appId: "1:413070873797:web:9017509d95240516afccac",
  measurementId: "G-VZJ76K1SLM"
};

// Firebase'i başlat
firebase.initializeApp(firebaseConfig);

// Messaging instance al
const messaging = firebase.messaging();

// Arka planda bildirim geldiğinde
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Arka plan bildirimi alındı:', payload);
  
  const notificationTitle = payload.notification?.title || '🎱 3CScore Bildirimi';
  const notificationOptions = {
    body: payload.notification?.body || 'Yeni bir bildirim var',
    icon: '/logo192.png',
    badge: '/logo192.png',
    vibrate: [200, 100, 200],
    tag: payload.data?.matchId || 'match-notification',
    requireInteraction: true,
    data: {
      type: payload.data?.type || 'MATCH_STARTED',
      tableId: payload.data?.tableId || 'table_1',
      matchId: payload.data?.matchId || '',
      url: payload.data?.url || '/'
    },
    actions: [
      {
        action: 'open',
        title: '🎱 Maça Git'
      },
      {
        action: 'dismiss',
        title: '❌ Kapat'
      }
    ]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Bildirime tıklandığında
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Bildirime tıklandı:', event);
  
  event.notification.close();
  
  const action = event.action;
  const notificationData = event.notification.data;
  
  if (action === 'dismiss') {
    return;
  }
  
  // Maç kontrol sayfasına yönlendir
  let targetUrl = '/';
  
  if (notificationData.type === 'MATCH_STARTED' && notificationData.tableId) {
    // MobileController sayfasına yönlendir
    // URL formatı: /?mode=controller&table=table_1
    targetUrl = `/?mode=controller&table=${notificationData.tableId}`;
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Açık bir pencere varsa ona odaklan
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            data: notificationData
          });
          return client.focus();
        }
      }
      // Açık pencere yoksa yeni aç
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Service Worker kurulumu
self.addEventListener('install', (event) => {
  console.log('[firebase-messaging-sw.js] Service Worker kuruldu');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Service Worker aktif');
  event.waitUntil(clients.claim());
});
