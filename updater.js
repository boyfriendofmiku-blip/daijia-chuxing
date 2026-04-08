/**
 * 代驾出行 - 热更新模块
 * 启动时自动检查服务器版本，有新版本则静默下载后提示刷新
 */
(function() {
  'use strict';

  // ===== 配置 =====
  var UPDATE_SERVER = 'https://daijia-chuxing.vercel.app';
  var VERSION_URL   = UPDATE_SERVER + '/version.json';
  // 当前内置版本（每次打APK时更新这里）
  var CURRENT_VERSION = '2.2.0';
  // 本地存储的版本号 key
  var STORED_VER_KEY  = 'dj_cached_version';
  // 检查间隔：启动时 + 每30分钟
  var CHECK_INTERVAL  = 30 * 60 * 1000;

  // ===== 工具函数 =====

  /** 比较版本号，new > old 返回 true */
  function isNewer(remoteVer, localVer) {
    try {
      var r = remoteVer.split('.').map(Number);
      var l = localVer.split('.').map(Number);
      for (var i = 0; i < 3; i++) {
        var rv = r[i] || 0, lv = l[i] || 0;
        if (rv > lv) return true;
        if (rv < lv) return false;
      }
      return false;
    } catch(e) { return false; }
  }

  /** 获取已缓存的最新版本号（可能比APK内置更新） */
  function getLocalVersion() {
    return localStorage.getItem(STORED_VER_KEY) || CURRENT_VERSION;
  }

  /** 显示更新进度UI */
  function showUpdateUI(msg, progress) {
    var el = document.getElementById('dj-update-bar');
    if (!el) {
      el = document.createElement('div');
      el.id = 'dj-update-bar';
      el.style.cssText = [
        'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:99999',
        'background:linear-gradient(135deg,#1a73e8,#0d47a1)',
        'color:#fff', 'font-size:13px', 'padding:10px 16px',
        'display:flex', 'align-items:center', 'gap:10px',
        'box-shadow:0 2px 8px rgba(0,0,0,.3)',
        'transition:opacity .3s'
      ].join(';');
      document.body.appendChild(el);
    }
    var pct = (progress != null) ? ('<span style="margin-left:auto;font-size:11px;opacity:.8">' + progress + '%</span>') : '';
    el.innerHTML = '<span style="font-size:16px">🔄</span><span>' + msg + '</span>' + pct;
    el.style.opacity = '1';
  }

  /** 隐藏更新UI */
  function hideUpdateUI() {
    var el = document.getElementById('dj-update-bar');
    if (el) {
      el.style.opacity = '0';
      setTimeout(function(){ if(el.parentNode) el.parentNode.removeChild(el); }, 400);
    }
  }

  /** 显示"有新版本"提示条，点击重载 */
  function showReloadBar(remoteInfo) {
    var el = document.getElementById('dj-reload-bar');
    if (el) return; // 已存在

    el = document.createElement('div');
    el.id = 'dj-reload-bar';
    el.style.cssText = [
      'position:fixed', 'bottom:80px', 'left:50%',
      'transform:translateX(-50%)',
      'z-index:99999',
      'background:linear-gradient(135deg,#27ae60,#1e8449)',
      'color:#fff', 'font-size:14px',
      'padding:12px 20px', 'border-radius:24px',
      'box-shadow:0 4px 16px rgba(0,0,0,.3)',
      'cursor:pointer', 'white-space:nowrap',
      'animation:djSlideUp .4s ease',
      'display:flex', 'align-items:center', 'gap:8px'
    ].join(';');

    var log = remoteInfo.changelog || '新版本已就绪';
    el.innerHTML = [
      '<span style="font-size:18px">✅</span>',
      '<div>',
        '<div style="font-weight:600">v' + remoteInfo.version + ' 已下载</div>',
        '<div style="font-size:12px;opacity:.85">' + log + '</div>',
      '</div>',
      '<button onclick="window.__djApplyUpdate()" style="',
        'margin-left:12px;background:#fff;color:#27ae60;',
        'border:none;border-radius:12px;padding:6px 14px;',
        'font-size:13px;font-weight:600;cursor:pointer',
      '">立即更新</button>',
      '<button onclick="this.closest(\'#dj-reload-bar\').remove()" style="',
        'background:none;border:none;color:#fff;',
        'font-size:18px;cursor:pointer;padding:0 4px;opacity:.7',
      '">×</button>'
    ].join('');

    // 添加动画CSS（如果还没有）
    if (!document.getElementById('dj-update-style')) {
      var style = document.createElement('style');
      style.id = 'dj-update-style';
      style.textContent = [
        '@keyframes djSlideUp{from{opacity:0;transform:translateX(-50%) translateY(20px)}',
        'to{opacity:1;transform:translateX(-50%) translateY(0)}}',
        '#dj-reload-bar:active{transform:translateX(-50%) scale(.97)}'
      ].join('');
      document.head.appendChild(style);
    }

    document.body.appendChild(el);
  }

  /** 应用更新：刷新页面（SW会用最新缓存） */
  window.__djApplyUpdate = function() {
    showUpdateUI('正在应用更新…', null);
    // 注销旧SW，强制获取最新资源
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function(regs) {
        Promise.all(regs.map(function(r){ return r.unregister(); })).then(function() {
          location.reload(true);
        });
      });
    } else {
      location.reload(true);
    }
  };

  /**
   * 下载并缓存更新的文件
   * 使用 Cache API 把服务器最新文件写入 SW 缓存
   */
  function downloadAndCache(remoteInfo, onDone) {
    var files = remoteInfo.files || [];
    if (files.length === 0) { onDone && onDone(); return; }

    showUpdateUI('正在下载更新…', 0);

    var total = files.length;
    var done = 0;

    // 用时间戳 bust 缓存，强制从服务器取最新
    var ts = '?v=' + Date.now();

    if ('caches' in window) {
      caches.open('daijia-v-update').then(function(cache) {
        var promises = files.map(function(file) {
          var url = UPDATE_SERVER + '/' + file + ts;
          var cacheKey = '/' + file;
          return fetch(url, { cache: 'no-store' })
            .then(function(resp) {
              if (resp && resp.ok) {
                return cache.put(cacheKey, resp);
              }
            })
            .catch(function(e) {
              console.warn('[Updater] 下载失败:', file, e);
            })
            .finally(function() {
              done++;
              showUpdateUI('正在下载更新…', Math.round(done / total * 100));
            });
        });

        Promise.all(promises).then(function() {
          hideUpdateUI();
          // 保存新版本号到本地
          localStorage.setItem(STORED_VER_KEY, remoteInfo.version);
          onDone && onDone(remoteInfo);
        });
      }).catch(function(e) {
        console.warn('[Updater] Cache API error:', e);
        hideUpdateUI();
        // 即使缓存失败，也记录版本并提示刷新
        localStorage.setItem(STORED_VER_KEY, remoteInfo.version);
        onDone && onDone(remoteInfo);
      });
    } else {
      // 不支持 Cache API，直接提示刷新
      hideUpdateUI();
      localStorage.setItem(STORED_VER_KEY, remoteInfo.version);
      onDone && onDone(remoteInfo);
    }
  }

  /**
   * 主检查函数
   * @param {boolean} silent - true=静默（后台检查），false=首次启动检查
   */
  function checkUpdate(silent) {
    var localVer = getLocalVersion();

    fetch(VERSION_URL + '?t=' + Date.now(), {
      cache: 'no-store',
      signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined
    })
    .then(function(resp) {
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      return resp.json();
    })
    .then(function(remoteInfo) {
      var remoteVer = remoteInfo.version || '0.0.0';
      console.log('[Updater] 本地版本:', localVer, '服务器版本:', remoteVer);

      if (isNewer(remoteVer, localVer)) {
        console.log('[Updater] 发现新版本，开始下载…');
        downloadAndCache(remoteInfo, function(info) {
          showReloadBar(info);
        });
      } else {
        if (!silent) console.log('[Updater] 已是最新版本');
      }
    })
    .catch(function(e) {
      // 网络失败不影响正常使用
      console.warn('[Updater] 版本检查失败（忽略）:', e.message);
    });
  }

  // ===== 启动逻辑 =====

  /** 等待DOM和页面基本就绪后再检查 */
  function init() {
    // 延迟3秒，避免影响首屏加载速度
    setTimeout(function() {
      checkUpdate(false);
    }, 3000);

    // 之后每30分钟后台静默检查一次
    setInterval(function() {
      checkUpdate(true);
    }, CHECK_INTERVAL);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 暴露手动检查接口（方便调试）
  window.__djCheckUpdate = function() { checkUpdate(false); };

})();
