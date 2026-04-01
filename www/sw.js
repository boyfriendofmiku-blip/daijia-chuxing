// 代驾出行 - Service Worker
// v3 - 修复CDN拦截问题，升级缓存版本强制清除旧缓存
const CACHE_NAME = 'daijia-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app-fixed.js',
  '/supabase.js',
  '/staff.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// 判断是否为外部请求（不应被缓存）
function isExternal(url) {
  return url.includes('cdn.jsdelivr.net') ||
         url.includes('unpkg.com') ||
         url.includes('esm.sh') ||
         url.includes('supabase.co') ||
         url.includes('map.qq.com') ||
         url.includes('apis.map.qq.com') ||
         url.includes('lbs.qq.com');
}

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

// 请求策略：外部资源直接透传，本地资源网络优先+缓存回退
self.addEventListener('fetch', e => {
  // 跳过非 GET 请求
  if (e.request.method !== 'GET') return;

  // 外部CDN/API请求：直接透传，不缓存、不拦截
  if (isExternal(e.request.url)) {
    return; // 让浏览器直接处理
  }

  // 本地资源：网络优先，失败回退缓存
  e.respondWith(
    fetch(e.request)
      .then(response => {
        // 只缓存成功的同源响应
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(e.request);
      })
  );
});
