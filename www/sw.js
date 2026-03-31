// 代驾出行 - Service Worker
const CACHE_NAME = 'daijia-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app-fixed.js',
  '/staff.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// 安装：缓存核心资源
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// 激活：清理旧缓存
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// 请求策略：网络优先，失败回退缓存
self.addEventListener('fetch', e => {
  // 跳过非 GET 请求
  if (e.request.method !== 'GET') return;

  // 地图 API 和外部资源不走缓存
  if (e.request.url.includes('map.qq.com') ||
      e.request.url.includes('apis.map.qq.com')) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then(response => {
        // 成功获取后更新缓存
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});
