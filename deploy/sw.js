// HabitRPG Service Worker
const CACHE_NAME  = 'habitrpg-v5';
const CORE_ASSETS = ['/', '/index.html', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch (Network-first for HTML, cache-first for assets) ───────────────────
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Skip non-GET and external requests (Supabase, Google Fonts, etc.)
  if (e.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // HTML: network first, fall back to cache
  if (e.request.headers.get('accept')?.includes('text/html')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request).then(r => r || caches.match('/')))
    );
    return;
  }

  // Other assets: cache first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});

// ─── Push notifications ───────────────────────────────────────────────────────
self.addEventListener('push', e => {
  let data = { title: 'HabitRPG', body: '¡Es hora de completar tus hábitos!', icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', tag: 'habitrpg-reminder' };
  if (e.data) {
    try { Object.assign(data, e.data.json()); } catch (_) { data.body = e.data.text(); }
  }
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body:    data.body,
      icon:    data.icon || '/icons/icon-192.png',
      badge:   data.badge || '/icons/icon-192.png',
      tag:     data.tag  || 'habitrpg',
      vibrate: [200, 100, 200],
      data:    { url: data.url || '/' },
    })
  );
});

// ─── Notification click ───────────────────────────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = e.notification.data?.url || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes(self.location.origin) && 'focus' in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow(target);
    })
  );
});

// ─── RPG rotating daily messages ─────────────────────────────────────────────
const RPG_DAILY_MSGS = [
  { title: '⚔️ HabitRPG', body: 'Tu héroe despertó. Las misiones del día te esperan ⚔️' },
  { title: '🌅 HabitRPG', body: 'Un nuevo día comienza. ¿Estás listo para la aventura? 🌅' },
  { title: '💪 HabitRPG', body: 'El destino llama. Completa tus misiones y fortalece a tu héroe 💪' },
  { title: '🌟 HabitRPG', body: 'Hoy es un nuevo capítulo. Tu personaje necesita de ti 🌟' },
  { title: '🗡️ HabitRPG', body: 'Las puertas del dungeon se abren. ¿Aceptas el desafío? 🗡️' },
];

// ─── Periodic Background Sync (daily reminder + streak check fallback) ────────
self.addEventListener('periodicsync', e => {
  if (e.tag === 'habitrpg-daily') e.waitUntil(checkAndNotify());
});

async function checkAndNotify() {
  const db = await caches.open('habitrpg-config');
  const res = await db.match('/sw-config');
  if (!res) return;
  const cfg = await res.json();
  if (!cfg.reminderEnabled) return;

  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const hour = now.getHours();

  // Daily morning reminder
  const [h] = (cfg.reminderTime || '09:00').split(':').map(Number);
  if (cfg.lastNotified !== todayKey && hour === h) {
    const idx = Math.floor(Date.now() / 86400000) % RPG_DAILY_MSGS.length;
    const msg = RPG_DAILY_MSGS[idx];
    await self.registration.showNotification(msg.title, {
      body:    msg.body,
      icon:    '/icons/icon-192.png',
      badge:   '/icons/icon-192.png',
      tag:     'habitrpg-daily',
      vibrate: [200, 100, 200],
      data:    { url: '/' },
    });
  }

  // Streak danger at 20:00
  if (hour === 20 && (cfg.streak || 0) >= 2 && cfg.lastStreakCheck !== todayKey) {
    await self.registration.showNotification('🔥 ¡Racha en peligro!', {
      body:    `Tu racha de ${cfg.streak} días está en peligro — completa al menos una misión antes de medianoche`,
      icon:    '/icons/icon-192.png',
      badge:   '/icons/icon-192.png',
      tag:     'habitrpg-streak',
      vibrate: [300, 100, 300, 100, 300],
      data:    { url: '/' },
    });
  }
}

// ─── Message from app ─────────────────────────────────────────────────────────
self.addEventListener('message', async e => {
  if (e.data?.type === 'SAVE_CONFIG') {
    const db = await caches.open('habitrpg-config');
    await db.put('/sw-config', new Response(JSON.stringify(e.data.config), {
      headers: { 'Content-Type': 'application/json' },
    }));
  }
  if (e.data?.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag, icon } = e.data;
    await self.registration.showNotification(title || 'HabitRPG', {
      body:    body || '',
      icon:    icon || '/icons/icon-192.png',
      badge:   '/icons/icon-192.png',
      tag:     tag  || 'habitrpg',
      vibrate: [100, 50, 100],
      data:    { url: '/' },
    });
  }
});
