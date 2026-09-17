// Офлайн: приложение открывается и работает без сети, данные и так лежат в телефоне.
const КЭШ = 'дневник-8';
const ФАЙЛЫ = [
  './', './index.html', './стиль.css', './приложение.js', './хранилище.js',
  './расчёты.js', './графики.js', './синхронизация.js',
  './экраны/день.js', './экраны/зал.js', './экраны/еда.js', './экраны/расчёты.js',
  './экраны/ключ.js', './значок-192.png', './значок-512.png', './manifest.json',
];

self.addEventListener('install', (событие) => {
  событие.waitUntil(caches.open(КЭШ).then((кэш) => кэш.addAll(ФАЙЛЫ)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (событие) => {
  событие.waitUntil(
    caches.keys()
      .then((имена) => Promise.all(имена.filter((и) => и !== КЭШ).map((и) => caches.delete(и))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (событие) => {
  const адрес = new URL(событие.request.url);
  // запросы к таблице никогда не кэшируем
  if (адрес.hostname.endsWith('google.com') || адрес.hostname.endsWith('googleusercontent.com')) return;
  if (событие.request.method !== 'GET') return;

  событие.respondWith(
    // сначала сеть, чтобы обновления приезжали сами; нет сети — берём из кэша
    fetch(событие.request)
      .then((ответ) => {
        const копия = ответ.clone();
        caches.open(КЭШ).then((кэш) => кэш.put(событие.request, копия)).catch(() => {});
        return ответ;
      })
      .catch(() => caches.match(событие.request).then((из) => из || caches.match('./index.html')))
  );
});
