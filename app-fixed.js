/* ================================================
   代驾出行 - v2.1 (Supabase)
   安全 · 快捷 · 专业 · 多端同步
================================================ */

// 当前版本号（每次发布请更新）
window.APP_VERSION = 'v2.2-20260401-b';

// 高德地图兼容层：让旧代码（TMap）兼容高德 API
window.addEventListener('amap-ready', function() {
  // 模拟 TMap 全局对象
  window.TMap = {
    LatLng: function(lat, lng) {
      return { getLat: function() { return lat; }, getLng: function() { return lng; } };
    },
    Map: function(div, opts) {
      return new AMap.Map(div, opts);
    },
    service: {
      Geocoder: function() {
        return {
          getAddress: function(opts) {
            return new Promise(function(resolve, reject) {
              AMap.plugin('AMap.Geocoder', function() {
                var geocoder = new AMap.Geocoder({ city: '全国' });
                geocoder.getAddress(opts.location, function(status, result) {
                  if (status === 'complete' && result.geocodes && result.geocodes.length > 0) {
                    resolve({ result: { address: result.geocodes[0].formattedAddress } });
                  } else {
                    reject(result);
                  }
                });
              });
            });
          }
        };
      },
      DrivingService: function() {
        return {
          search: function(opts, callback) {
            AMap.plugin('AMap.Driving', function() {
              var driving = new AMap.Driving({ policy: AMap.DrivingPolicy.LEAST_TIME });
              driving.search(opts.from, opts.to, function(status, result) {
                callback({ result: result });
              });
            });
          }
        };
      },
      PoiSearch: function() {
        return {
          search: function(opts) {
            return new Promise(function(resolve, reject) {
              AMap.plugin('AMap.PlaceSearch', function() {
                var placeSearch = new AMap.PlaceSearch({ pageSize: 8, city: '全国' });
                placeSearch.search(opts.keyword, function(status, result) {
                  if (status === 'complete' && result.poiList) {
                    resolve({ data: result.poiList.pois.map(function(p) {
                      return { title: p.name, address: p.address, location: { lat: p.location.getLat(), lng: p.location.getLng() } };
                    }) });
                  } else {
                    resolve({ data: [] });
                  }
                });
              });
            });
          }
        };
      }
    },
    MultiMarker: function(opts) {
      return new AMap.Marker({
        position: opts.geometries[0].position,
        content: opts.geometries[0].content,
        offset: new AMap.Pixel(-30, -15)
      });
    },
    MultiPolyline: function(opts) {
      return new AMap.Polyline({
        path: opts.geometries[0].paths[0],
        strokeColor: opts.styles['route-style'].color,
        strokeWeight: opts.styles['route-style'].width,
        strokeStyle: 'solid'
      });
    },
    PolylineStyle: function(opts) { return opts; },
    LatLngBounds: function(sw, ne) {
      return { contains: function() { return true; } };
    }
  };
  window.__tmapReady = true;
  console.log('高德地图已加载，TMap兼容层已启用');
  window.dispatchEvent(new Event('tmap-ready'));
});

// 全局错误处理：只在真正致命错误时才覆盖 app，地图/网络错误一律忽略
window.onerror = function(msg, url, line, col, error) {
  // 忽略来自高德/腾讯地图CDN的错误
  if (url && (url.indexOf('amap.com') >= 0 || url.indexOf('qq.com') >= 0 || url.indexOf('map') >= 0)) {
    console.warn('[地图错误已忽略]', msg, url);
    return true; // 阻止默认处理，不显示错误界面
  }
  // 忽略常见的非关键错误
  if (msg && (
    msg.indexOf('fireEvent') >= 0 ||
    msg.indexOf('ResizeObserver') >= 0 ||
    msg.indexOf('Script error') >= 0 ||
    msg.indexOf('Cannot read properties of undefined') >= 0 && url && url.indexOf('app-fixed') < 0
  )) {
    console.warn('[非关键错误已忽略]', msg, url, line);
    return true;
  }
  console.error('全局错误:', msg, 'at', line + ':' + col, error);
  // 只有 app-fixed.js 自身的严重错误才显示错误界面
  if (url && url.indexOf('app-fixed') >= 0 && line > 200) {
    var app = document.getElementById('app');
    if (app && app.innerHTML.length < 200) {
      // 只在 app 还没渲染出内容时才显示错误界面（避免覆盖已渲染的页面）
      app.innerHTML = '<div style="padding:40px;text-align:center"><div style="font-size:48px;margin-bottom:20px">⚠️</div><h3>应用加载失败</h3><p style="color:#666;margin:12px 0">' + msg + '</p><button onclick="window.location.reload()" style="padding:12px 24px;background:#3498db;color:#fff;border:none;border-radius:8px;font-size:16px">重新加载</button></div>';
    }
  }
  return false;
};

// 检查地图API加载状态
setTimeout(function() {
  console.log('检查地图API状态:', typeof TMap, 'window.__tmapReady:', window.__tmapReady);
  if (typeof TMap === 'undefined' && !window.__tmapReady) {
    console.warn('腾讯地图API加载超时，地图功能可能受限');
    // 如果地图API未加载，显示提示
    var app = document.getElementById('app');
    if (app && app.innerHTML.indexOf('加载中') >= 0) {
      app.innerHTML = '<div style="padding:40px;text-align:center"><div style="font-size:48px;margin-bottom:20px">⚠️</div><h3>地图加载中</h3><p style="color:#666;margin:12px 0">地图服务正在加载，请稍候...</p><p style="color:#999;font-size:13px;margin:8px 0">如果长时间未加载，请检查网络连接</p><button onclick="window.location.reload()" style="padding:12px 24px;background:#3498db;color:#fff;border:none;border-radius:8px;font-size:16px">重新加载</button></div>';
    }
  }
}, 5000); // 5秒后检查

// 应用启动日志
console.log('代驾出行应用启动，当前时间:', new Date().toLocaleTimeString());

// 确保地图API回调不会被覆盖
if (!window._originalOnTMapReady) {
  window._originalOnTMapReady = window.onTMapReady;
}

// 安全的回调包装
window.onTMapReady = function() {
  console.log('地图API回调执行');
  window.__tmapReady = true;
  window.dispatchEvent(new Event('tmap-ready'));
  
  // 调用原始回调（如果存在）
  if (window._originalOnTMapReady) {
    window._originalOnTMapReady();
  }
};

window.addEventListener('unhandledrejection', function(e) {
  console.error('未处理的Promise错误:', e.reason);
});

// ============ 地图模块 ============
// 初始化下单/创单页的交互式地图（支持路线规划）
// opts: { mapDivId, fromInputId, fromLatId, fromLngId, toInputId, toLatId, toLngId,
//         searchInputId, searchResultsId, locateBtnId, toolInfoId, routeInfoId }
// 高德地图适配器已在 amap-adapter.js 中实现
// 此处保留兼容：直接调用全局适配器函数
function initOrderMap(opts) {
  if (typeof window.initAMapOrderMap === 'function') {
    return window.initAMapOrderMap(opts);
  }
  console.warn('高德地图适配器未加载');
  var toolInfo = document.getElementById(opts.toolInfoId);
  if (toolInfo) toolInfo.textContent = '地图加载中...';
  return null;
}

function initRouteDisplayMap(mapDivId, fromLat, fromLng, toLat, toLng, options) {
  if (typeof window.initAMapRouteDisplay === 'function') {
    return window.initAMapRouteDisplay(mapDivId, fromLat, fromLng, toLat, toLng, options);
  }
  console.warn('高德地图适配器未加载');
  return null;
}




// ============ 地图全屏展开（使用高德地图） ============
function openMapFullscreen() {
  // 检查地图加载状态
  if (window.__amapLoadFailed) {
    showToast('地图加载失败，请检查网络后重试', 'error');
    return;
  }
  if (typeof AMap === 'undefined') {
    showToast('地图尚未加载完成，请稍候...', 'error');
    console.log('[Map] AMap未定义，等待加载...');
    // 尝试等待地图就绪
    if (window.__amapReady) {
      setTimeout(function() { openMapFullscreen(); }, 1000);
    }
    return;
  }

  // 获取订单数据
  var order = window.__lastDetailOrder || {};
  if (!order.fromLat || !order.fromLng || !order.toLat || !order.toLng) {
    showToast('订单缺少位置信息', 'error');
    return;
  }

  var fromAddr = order.from || '出发地';
  var toAddr = order.to || '目的地';
  var routeInfo = window.__detailRouteInfo || {};
  var distText = '';
  if (routeInfo.distance) {
    distText = routeInfo.distance >= 1000 ? (routeInfo.distance / 1000).toFixed(1) + ' km' : Math.round(routeInfo.distance) + ' m';
  }
  var durText = '';
  if (routeInfo.duration) {
    var mins = Math.round(routeInfo.duration / 60);
    if (mins >= 60) {
      durText = Math.floor(mins / 60) + '小时' + (mins % 60) + '分钟';
    } else {
      durText = mins + '分钟';
    }
  }

  // 创建全屏覆盖层
  var overlay = document.createElement('div');
  overlay.className = 'map-fullscreen-overlay';
  overlay.id = 'map-fullscreen-overlay';
  overlay.innerHTML =
    '<div class="map-fullscreen-header">' +
      '<div class="map-fullscreen-title">行程路线</div>' +
      '<button class="map-fullscreen-close" id="map-fs-close">✕</button>' +
    '</div>' +
    '<div class="map-fullscreen-container" id="map-fs-container"></div>' +
    '<div class="map-fullscreen-route-info">' +
      '<div class="route-endpoints">' +
        '<div class="endpoint-item"><span class="endpoint-dot start"></span><span>' + fromAddr + '</span></div>' +
        '<div class="endpoint-item"><span class="endpoint-dot end"></span><span>' + toAddr + '</span></div>' +
      '</div>' +
      (distText || durText ? '<div class="route-stats">' +
        (distText ? '<span>📏 ' + distText + '</span>' : '') +
        (durText ? '<span>🕐 约' + durText + '</span>' : '') +
      '</div>' : '') +
    '</div>';

  document.body.appendChild(overlay);

  // 等DOM渲染后创建地图
  requestAnimationFrame(function() {
    overlay.classList.add('active');

    setTimeout(function() {
      var container = document.getElementById('map-fs-container');
      if (!container) return;

      var order = window.__lastDetailOrder || {};
      var centerLng = (parseFloat(order.fromLng) + parseFloat(order.toLng)) / 2;
      var centerLat = (parseFloat(order.fromLat) + parseFloat(order.toLat)) / 2;

      var fsMap = new AMap.Map('map-fs-container', {
        zoom: 12,
        center: [centerLng, centerLat],
        mapStyle: 'amap://styles/normal'
      });

      // 起终点标记
      var startMarker = new AMap.Marker({
        position: [parseFloat(order.fromLng), parseFloat(order.fromLat)],
        content: '<div style="background:#27AE60;color:#fff;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:bold;box-shadow:0 2px 12px rgba(39,174,96,0.4);border:3px solid #fff">A</div>',
        offset: new AMap.Pixel(-18, -18)
      });

      var endMarker = new AMap.Marker({
        position: [parseFloat(order.toLng), parseFloat(order.toLat)],
        content: '<div style="background:#E74C3C;color:#fff;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:bold;box-shadow:0 2px 12px rgba(231,76,60,0.4);border:3px solid #fff">B</div>',
        offset: new AMap.Pixel(-18, -18)
      });

      fsMap.add([startMarker, endMarker]);

      // 规划驾车路线
      AMap.plugin('AMap.Driving', function() {
        var driving = new AMap.Driving({
          map: fsMap,
          panel: null,
          outlineColor: '#3777FF'
        });

        driving.search(
          new AMap.LngLat(parseFloat(order.fromLng), parseFloat(order.fromLat)),
          new AMap.LngLat(parseFloat(order.toLng), parseFloat(order.toLat)),
          function(status, result) {
            if (status === 'complete' && result.routes && result.routes.length > 0) {
              // 自动调整视野
              fsMap.setFitView();
            }
          }
        );
      });

      window.__fsMap = fsMap;

      // 禁止body滚动
      document.body.style.overflow = 'hidden';
    }, 50);
  });

  // 关闭按钮事件
  setTimeout(function() {
    var closeBtn = document.getElementById('map-fs-close');
    if (closeBtn) {
      closeBtn.addEventListener('touchstart', function(e) {
        e.stopPropagation();
        this.style.transform = 'scale(0.95)';
      });
      closeBtn.addEventListener('touchend', function(e) {
        e.stopPropagation();
        this.style.transform = '';
      });
      closeBtn.addEventListener('click', function() {
        closeMapFullscreen();
      });
    }

    // 点击地图区域不关闭，点击 overlay 背景关闭
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) {
        closeMapFullscreen();
      }
    });

    // 手机上的触摸关闭（向下滑动关闭）
    var startY = 0;
    overlay.addEventListener('touchstart', function(e) {
      startY = e.touches[0].clientY;
    });
    overlay.addEventListener('touchmove', function(e) {
      var currentY = e.touches[0].clientY;
      var diff = currentY - startY;
      if (diff > 100) {
        closeMapFullscreen();
      }
    });
  }, 100);

  // 关闭全屏地图的函数
  function closeMapFullscreen() {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    if (window.__fsMap) {
      window.__fsMap.destroy();
      window.__fsMap = null;
    }
    setTimeout(function() {
      var el = document.getElementById('map-fullscreen-overlay');
      if (el) el.remove();
    }, 260);
  }
}

// ============ 全局状态 ============
const State = {
  currentUser: null,
  currentPage: 'home',
  pageParams: {},
  driverOnline: false,
  reorderFrom: null,
  reorderTo: null,
  // 页面历史栈（用于返回导航）
  pageHistory: [],
};

// ============ 工具函数 ============
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function now() { return new Date().toLocaleString('zh-CN', { hour12: false }); }
function formatPrice(n) { return '¥' + Number(n).toFixed(2); }

const STATUS_MAP = {
  pending:   { text: '待接单',  cls: 'badge-warning' },
  accepted:  { text: '已接单',  cls: 'badge-info' },
  ongoing:   { text: '代驾中',  cls: 'badge-info' },
  completed: { text: '已完成',  cls: 'badge-muted' },
  cancelled: { text: '已取消',  cls: 'badge-danger' },
};
function statusBadge(status) {
  const s = STATUS_MAP[status] || { text: status, cls: 'badge-muted' };
  return '<span class="badge ' + s.cls + '">' + s.text + '</span>';
}

function showToast(msg, type) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const t = document.createElement('div');
  t.className = 'toast ' + (type || '');
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(function() { t.remove(); }, 2900);
}

/**
 * 许昌市区代驾计费规则：
 * - 白天（08:00-20:00）：起步价18元，30分钟内18元
 * - 夜间（20:00-08:00）：起步价28元，30分钟内28元
 * - 超时：每30分钟加收20元
 * 费用与路线长度无关，只与时间和时长有关
 */
function estimatePrice(from, to) {
  // 判断当前时段
  const hour = new Date().getHours();
  const isNightTime = hour >= 20 || hour < 8; // 晚上8点后为夜间

  // 基础起步价
  const basePrice = isNightTime ? 28 : 18;

  // 尝试获取路线规划的时间估算
  let durationMinutes = 30; // 默认30分钟
  let duration = 0;

  // 方式1：从 window.__orderMap 获取
  if (window.__orderMap && window.__orderMap._getRouteInfo) {
    const routeInfo = window.__orderMap._getRouteInfo();
    if (routeInfo && routeInfo.duration) {
      duration = routeInfo.duration;
      durationMinutes = Math.ceil(duration / 60);
      console.log('[estimatePrice] 从__orderMap获取时长:', duration, '秒 = ', durationMinutes, '分钟');
    }
  }

  // 方式2：从 DOM 缓存获取（备选方案）
  if (duration === 0) {
    var routeInfoEl = document.getElementById('route-info');
    if (routeInfoEl && routeInfoEl._cachedRouteInfo && routeInfoEl._cachedRouteInfo.duration) {
      duration = routeInfoEl._cachedRouteInfo.duration;
      durationMinutes = Math.ceil(duration / 60);
      console.log('[estimatePrice] 从DOM缓存获取时长:', duration, '秒 = ', durationMinutes, '分钟');
    }
  }

  // 如果还是0，说明没有路线规划，使用默认30分钟
  if (durationMinutes === 30 && duration === 0) {
    console.log('[estimatePrice] 未获取到路线时长，使用默认30分钟');
  }

  // 计算总价
  let totalPrice = basePrice;

  // 超出30分钟，每30分钟加收20元
  if (durationMinutes > 30) {
    const extraMinutes = durationMinutes - 30;
    const extraPeriods = Math.ceil(extraMinutes / 30); // 向上取整
    totalPrice = basePrice + extraPeriods * 20;
  }

  console.log('[estimatePrice] 结算：', basePrice, '元起步 + 超时费 = ', totalPrice, '元 (时长:', durationMinutes, '分钟)');
  return totalPrice;
}

/**
 * 获取费用说明文本
 */
function getPriceDescription() {
  const hour = new Date().getHours();
  const isNightTime = hour >= 20 || hour < 8;

  let desc = '';
  if (isNightTime) {
    desc = '夜间（20:00-08:00）：起步价28元，超30分钟每30分钟+20元';
  } else {
    desc = '白天（08:00-20:00）：起步价18元，超30分钟每30分钟+20元';
  }

  return desc;
}

function isNightTime() {
  const hour = new Date().getHours();
  return hour >= 20 || hour < 8;
}

// ============ 通知模块（本地localStorage存储 + 浏览器推送） ============
function _getNotifications() {
  try { return JSON.parse(localStorage.getItem('dj_notifications') || '[]'); } catch(e) { return []; }
}
function _saveNotifications(list) {
  try { localStorage.setItem('dj_notifications', JSON.stringify(list)); } catch(e) {}
}
function addNotification(userId, title, content, type) {
  var list = _getNotifications();
  list.unshift({ id: genId(), userId: String(userId), title: title, content: content, type: type || 'info', time: now(), read: false });
  if (list.length > 100) list = list.slice(0, 100);
  _saveNotifications(list);
  // 发送浏览器推送通知（如果用户已授权）
  sendBrowserNotification(title, content, type);
}

// ============ 浏览器推送通知 ============
function requestNotificationPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') return;
  if (Notification.permission === 'denied') return;
  // 延迟请求权限，避免页面加载时立即弹出
  setTimeout(function() {
    Notification.requestPermission().then(function(permission) {
      if (permission === 'granted') {
        console.log('浏览器通知权限已获取');
      }
    });
  }, 3000);
}
function sendBrowserNotification(title, body, type) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  // 避免重复通知：检查最近5秒内是否已发送过相同内容
  var lastNotify = window.__lastNotification || {};
  if (lastNotify.title === title && lastNotify.body === body && (Date.now() - lastNotify.time) < 5000) return;
  window.__lastNotification = { title: title, body: body, time: Date.now() };
  // 根据类型选择图标
  var icon = '/icons/icon-192x192.png';
  var badge = '/icons/icon-72x72.png';
  var tag = type || 'default';
  try {
    var notification = new Notification(title, {
      body: body,
      icon: icon,
      badge: badge,
      tag: tag,
      requireInteraction: false,
      silent: false
    });
    // 点击通知跳转到应用
    notification.onclick = function() {
      window.focus();
      notification.close();
    };
    // 5秒后自动关闭
    setTimeout(function() { notification.close(); }, 5000);
  } catch(e) {
    console.warn('浏览器通知发送失败:', e);
  }
}
function getUnreadCount(userId) {
  return _getNotifications().filter(function(n) { return n.userId === String(userId) && !n.read; }).length;
}
function markAllRead(userId) {
  var list = _getNotifications();
  list.forEach(function(n) { if (n.userId === String(userId)) n.read = true; });
  _saveNotifications(list);
}

// ============ Loading 状态 ============
function loadingHtml() {
  return '<div style="display:flex;align-items:center;justify-content:center;height:60vh"><div style="text-align:center"><div style="font-size:32px;margin-bottom:12px">⏳</div><div style="color:var(--text-muted)">加载中...</div></div></div>';
}

// ============ 路由（异步） ============
// 用于防止 popstate 和 navigate/goBack 之间的竞态条件
var _isNavigating = false;

function navigate(page, params, skipHistory) {
  // 切页时清理实时追踪和到达检测
  stopLiveTracking();
  stopArrivalCheck();

  // 记录页面历史（用于返回）
  if (!skipHistory && State.currentPage !== page) {
    State.pageHistory.push({
      page: State.currentPage,
      params: State.pageParams
    });
  }

  _isNavigating = true;
  State.currentPage = page;
  State.pageParams = params || {};
  render();

  // 更新浏览器历史（支持原生返回按钮）
  if (!skipHistory) {
    history.pushState({ page: page, params: params }, '', '#' + page);
  }
  _isNavigating = false;
}

// 初始化返回键监听
function initBackHandler() {
  // 监听浏览器返回键（popstate）
  window.addEventListener('popstate', function(e) {
    // 如果正在 navigate 过程中，跳过此 popstate（由 navigate 自身触发的）
    if (_isNavigating) {
      console.log('[DEBUG] popstate skipped, navigate in progress');
      return;
    }
    
    if (e.state && e.state.page) {
      // 浏览器返回时，从历史记录恢复
      stopLiveTracking();
      stopArrivalCheck();
      State.currentPage = e.state.page;
      State.pageParams = e.state.params || {};
      // 从本地历史栈同步（与 pushState 成对）
      if (State.pageHistory.length > 0) {
        State.pageHistory.pop();
      }
      render();
    } else if (State.pageHistory.length > 0) {
      // 没有 state 但有本地历史，执行返回
      goBack();
    }
  });

  // 监听 Cordova/PhoneGap 的 backbutton 事件
  document.addEventListener('backbutton', function(e) {
    e.preventDefault();
    goBack();
  });

  // 监听 Capacitor 的 backButton 事件
  function setupCapacitorBackButton() {
    if (window.CapacitorApp && typeof window.CapacitorApp.addListener === 'function') {
      window.CapacitorApp.addListener('backButton', function(data) {
        console.log('[Capacitor] backButton pressed');
        if (!goBack()) {
          // 返回失败（没有历史了），尝试退出
          tryExitApp();
        }
      });
      console.log('[Capacitor] backButton listener registered');
    } else {
      // Capacitor App 插件未加载，延迟重试或监听 ready 事件
      if (window.CapacitorApp === null) {
        // 插件加载失败，不重试
        console.warn('[Capacitor] App 插件不可用，跳过 backButton 监听');
        return;
      }
      // 监听插件加载完成事件
      window.addEventListener('capacitor-app-ready', setupCapacitorBackButton);
      // 最多重试 5 秒
      setTimeout(function() {
        window.removeEventListener('capacitor-app-ready', setupCapacitorBackButton);
      }, 5000);
    }
  }
  setupCapacitorBackButton();

  // 监听 Android WebView 的 onBackPressed
  window.Android && window.Android.onBackPressed && Android.onBackPressed.registerCallback(function() {
    goBack();
  });
}

// 尝试退出应用
function tryExitApp() {
  if (confirm('确定要退出应用吗？')) {
    // 尝试使用 Capacitor App 插件退出
    if (window.CapacitorApp && window.CapacitorApp.exitApp) {
      window.CapacitorApp.exitApp();
    } else if (navigator.app && navigator.app.exitApp) {
      navigator.app.exitApp();
    } else if (window.Android && window.Android.exitApp) {
      window.Android.exitApp();
    } else {
      window.close();
    }
  }
}

// goBack 返回是否成功（是否有历史可返回）
function goBack() {
  console.log('[DEBUG] goBack called. pageHistory length:', State.pageHistory.length, 'currentPage:', State.currentPage);
  // 清理当前页的追踪
  stopLiveTracking();
  stopArrivalCheck();
  cleanupNavMap();

  if (State.pageHistory.length > 0) {
    _isNavigating = true;
    var prev = State.pageHistory.pop();
    State.currentPage = prev.page;
    State.pageParams = prev.params || {};
    console.log('[DEBUG] goBack navigating to:', prev.page);
    // 使用 replaceState 而不是 pushState，避免触发 popstate
    // 这样 URL 和页面状态保持同步，但不会触发浏览器历史的变化
    history.replaceState({ page: prev.page, params: prev.params }, '', '#' + prev.page);
    render();
    _isNavigating = false;
    return true; // 返回成功
  } else {
    // 没有历史记录，返回 false 让调用者决定是否退出
    return false;
  }
}

async function render() {
  const app = document.getElementById('app');
  // 先显示loading
  app.innerHTML = loadingHtml();

  try {
    switch (State.currentPage) {
      case 'home':           app.innerHTML = renderHome(); break;
      case 'user-auth':      app.innerHTML = renderUserAuth(); break;
      case 'driver-auth':    app.innerHTML = renderDriverAuth(); break;
      case 'user-main':      app.innerHTML = await renderUserMain(); break;
      case 'driver-main':    app.innerHTML = await renderDriverMain(); break;
      case 'create-order':   app.innerHTML = renderCreateOrder(); break;
      case 'order-detail':   app.innerHTML = await renderOrderDetail(State.pageParams.orderId); break;
      case 'nav-map':        app.innerHTML = await renderNavMapPage(State.pageParams.orderId); initNavMap(State.pageParams.orderId); break;
      case 'order-hall':     app.innerHTML = await renderOrderHall(); break;
      case 'driver-create-order': app.innerHTML = renderDriverCreateOrder(); break;
      case 'user-orders':    app.innerHTML = await renderUserOrders(); break;
      case 'driver-orders':  app.innerHTML = await renderDriverOrders(); break;
      case 'profile':        app.innerHTML = await renderProfile(); break;
      case 'stats':          app.innerHTML = await renderStats(); break;
      case 'notifications':  app.innerHTML = renderNotifications(); break;
      case 'feedback':       app.innerHTML = renderFeedback(); break;
      case 'about':          app.innerHTML = renderAbout(); break;
      case 'manage-addresses': app.innerHTML = renderManageAddresses(); break;
      case 'staff-auth':     app.innerHTML = renderStaffAuth(State.pageParams && State.pageParams.tab); break;
      case 'staff-main':     app.innerHTML = await renderStaffMain(); break;
      case 'staff-orders':   app.innerHTML = await renderStaffOrders(); break;
      case 'staff-dispatch': app.innerHTML = await renderStaffDispatch(State.pageParams && State.pageParams.orderId); break;
      case 'staff-drivers':  app.innerHTML = await renderStaffDrivers(); break;
      case 'staff-users':    app.innerHTML = await renderStaffUsers(); break;
      case 'staff-stats':    app.innerHTML = await renderStaffStats(); break;
      default:               app.innerHTML = renderHome();
    }
  } catch (err) {
    console.error('render error:', err);
    app.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted)"><div style="font-size:32px;margin-bottom:12px">⚠️</div><div>页面加载失败</div><div style="margin-top:8px;font-size:13px">' + err.message + '</div></div>';
  }
  bindEvents();
  
  // 页面后置初始化（地图等需要DOM渲染后初始化的组件）
  // 如果高德地图API已就绪，直接初始化
  if (typeof AMap !== 'undefined' && window.__amapReady) {
    initPageExtras();
  } else if (typeof AMap !== 'undefined' && !window.__amapReady) {
    // AMap 已加载但 __amapReady 未触发，等待一下
    var checkOnce = setInterval(function() {
      if (window.__amapReady || window.__amapLoadFailed) {
        clearInterval(checkOnce);
        initPageExtras();
      }
    }, 100);
    setTimeout(function() { clearInterval(checkOnce); initPageExtras(); }, 15000);
  } else if (window.__amapReady) {
    // AMap 还未加载但即将就绪
    var initExtrasOnce = function() {
      initPageExtras();
      window.removeEventListener('amap-ready', initExtrasOnce);
    };
    window.addEventListener('amap-ready', initExtrasOnce);
    // 超时保护：20秒后强制初始化
    setTimeout(function() {
      if (!window.__initPageExtrasExecuted) {
        console.warn('地图API加载超时，强制初始化页面');
        initPageExtras();
        window.__initPageExtrasExecuted = true;
      }
    }, 20000);
  } else {
    // 监听高德地图就绪事件
    var initExtrasOnce = function() {
      initPageExtras();
      window.removeEventListener('amap-ready', initExtrasOnce);
    };
    window.addEventListener('amap-ready', initExtrasOnce);
    // 超时保护：20秒后强制初始化
    setTimeout(function() {
      if (!window.__initPageExtrasExecuted) {
        console.warn('地图API加载超时，强制初始化页面');
        initPageExtras();
        window.__initPageExtrasExecuted = true;
      }
    }, 20000);
  }
}

// ============================================================
//  首页 - 角色选择
// ============================================================
function renderHome() {
  return '<div class="home-page">' +
    '<div class="home-logo">🚗</div>' +
    '<h1 class="home-title">代驾出行</h1>' +
    '<p class="home-subtitle">安全 · 快捷 · 专业</p>' +
    '<div class="home-cards">' +
      '<div class="role-card" data-action="go-user">' +
        '<div class="icon">👤</div>' +
        '<div class="label">我是乘客</div>' +
        '<div class="desc">叫代驾司机</div>' +
      '</div>' +
      '<div class="role-card" data-action="go-driver">' +
        '<div class="icon">🧑‍✈️</div>' +
        '<div class="label">我是司机</div>' +
        '<div class="desc">接代驾订单</div>' +
      '</div>' +
      '<div class="role-card staff-role-card" data-action="go-staff">' +
        '<div class="icon">🎧</div>' +
        '<div class="label">客服管理</div>' +
        '<div class="desc">运营后台</div>' +
      '</div>' +
    '</div>' +
    '<p class="home-footer">© 2026 代驾出行 · 数据云端同步</p>' +
    '<div class="home-version">' + (window.APP_VERSION || 'v1.0') + '</div>' +
  '</div>';
}

// ============================================================
//  用户端 - 登录/注册
// ============================================================
function renderUserAuth() {
  var tab = State.pageParams && State.pageParams.tab ? State.pageParams.tab : 'login';
  if (!['login','register'].includes(tab)) tab = 'login';

  return '<div class="auth-page page">' +
    '<div class="auth-hero"><div class="icon">👤</div><h1>乘客端</h1></div>' +
    '<div class="auth-body"><div class="auth-card">' +
      '<div class="auth-tabs auth-tabs-2">' +
        '<button class="auth-tab ' + (tab === 'login' ? 'active' : '') + '" data-tab="login">登录</button>' +
        '<button class="auth-tab ' + (tab === 'register' ? 'active' : '') + '" data-tab="register">注册</button>' +
      '</div>' +

      (tab === 'login' ? '<form id="login-form">' +
        '<div class="form-group"><label>手机号</label><input class="form-control" type="tel" id="login-phone" placeholder="请输入手机号" maxlength="11" /></div>' +
        '<div class="form-group"><label>密码</label><input class="form-control" type="password" id="login-pwd" placeholder="请输入密码" /></div>' +
        '<button class="btn btn-primary btn-block" type="submit">登录</button>' +
        '<div class="auth-link">还没有账号？<a data-tab="register">立即注册</a></div>' +
      '</form>' : '<form id="register-form">' +
        '<div class="form-group"><label>手机号</label><input class="form-control" type="tel" id="reg-phone" placeholder="请输入手机号" maxlength="11" /></div>' +
        '<div class="form-group"><label>昵称</label><input class="form-control" type="text" id="reg-name" placeholder="请输入昵称" /></div>' +
        '<div class="form-group"><label>密码</label><input class="form-control" type="password" id="reg-pwd" placeholder="请设置密码（至少6位）" /></div>' +
        '<div class="form-group"><label>确认密码</label><input class="form-control" type="password" id="reg-pwd2" placeholder="请再次输入密码" /></div>' +
        '<button class="btn btn-primary btn-block" type="submit">注册</button>' +
        '<div class="auth-link">已有账号？<a data-tab="login">立即登录</a></div>' +
      '</form>') +
    '</div>' +
    '<div style="text-align:center;margin-top:20px"><button class="btn btn-outline btn-sm" data-action="go-home">← 返回首页</button></div>' +
  '</div></div>';
}

// ============================================================
//  司机端 - 登录/注册
// ============================================================
function renderDriverAuth() {
  var tab = State.pageParams && State.pageParams.tab ? State.pageParams.tab : 'login';
  if (!['login','register'].includes(tab)) tab = 'login';

  return '<div class="auth-page page" style="background:linear-gradient(180deg,#2C3E50 0%,#2C3E50 200px,var(--bg) 200px)">' +
    '<div class="auth-hero" style="background:transparent"><div class="icon">🧑‍✈️</div><h1>司机端</h1></div>' +
    '<div class="auth-body"><div class="auth-card">' +
      '<div class="auth-tabs auth-tabs-2">' +
        '<button class="auth-tab ' + (tab === 'login' ? 'active' : '') + '" data-tab="login">登录</button>' +
        '<button class="auth-tab ' + (tab === 'register' ? 'active' : '') + '" data-tab="register">注册</button>' +
      '</div>' +

      (tab === 'login' ? '<form id="driver-login-form">' +
        '<div class="form-group"><label>手机号</label><input class="form-control" type="tel" id="dlogin-phone" placeholder="请输入手机号" maxlength="11" /></div>' +
        '<div class="form-group"><label>密码</label><input class="form-control" type="password" id="dlogin-pwd" placeholder="请输入密码" /></div>' +
        '<button class="btn btn-secondary btn-block" type="submit" style="background:#2C3E50">登录</button>' +
        '<div class="auth-link">还没有账号？<a data-tab="register">立即注册</a></div>' +
      '</form>' : '<form id="driver-register-form">' +
        '<div class="form-group"><label>手机号</label><input class="form-control" type="tel" id="dreg-phone" placeholder="请输入手机号" maxlength="11" /></div>' +
        '<div class="form-group"><label>真实姓名</label><input class="form-control" type="text" id="dreg-name" placeholder="请输入真实姓名" /></div>' +
        '<div class="form-group"><label>驾驶证号</label><input class="form-control" type="text" id="dreg-license" placeholder="请输入驾驶证号" /></div>' +
        '<div class="form-group"><label>密码</label><input class="form-control" type="password" id="dreg-pwd" placeholder="请设置密码（至少6位）" /></div>' +
        '<div class="form-group"><label>确认密码</label><input class="form-control" type="password" id="dreg-pwd2" placeholder="请再次输入密码" /></div>' +
        '<button class="btn btn-block" type="submit" style="background:#2C3E50;color:#fff">注册成为司机</button>' +
        '<div class="auth-link">已有账号？<a data-tab="login">立即登录</a></div>' +
      '</form>') +
    '</div>' +
    '<div style="text-align:center;margin-top:20px"><button class="btn btn-outline btn-sm" data-action="go-home" style="border-color:#2C3E50;color:#2C3E50">← 返回首页</button></div>' +
  '</div></div>';
}

// ============================================================
//  用户端 - 主页
// ============================================================
async function renderUserMain() {
  const u = State.currentUser;
  const orders = await DB.getOrders();
  const myOrders = orders.filter(function(o) { return o.userId === u.id; });
  const activeOrder = myOrders.find(function(o) { return ['pending', 'accepted', 'ongoing'].includes(o.status); });
  const hour = new Date().getHours();
  const greeting = hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好';
  const completedOrders = myOrders.filter(function(o) { return o.status === 'completed'; });
  const totalSpent = completedOrders.reduce(function(s, o) { return s + Number(o.price); }, 0);
  const unreadCount = getUnreadCount(u.id);

  let activeOrderHtml = '';
  if (activeOrder) {
    activeOrderHtml = '<div class="section-title">📍 当前订单</div>' +
      '<div class="order-card" data-action="order-detail" data-order-id="' + activeOrder.id + '" style="margin:0 20px 12px">' +
        '<div class="order-header"><span class="order-id">订单 #' + activeOrder.id.slice(-6).toUpperCase() + '</span>' + statusBadge(activeOrder.status) + '</div>' +
        '<div class="order-route">' +
          '<div class="route-item"><span class="route-dot start"></span><span>' + activeOrder.from + '</span></div>' +
          '<div class="route-item" style="padding-left:2px"><span class="route-connector"></span></div>' +
          '<div class="route-item"><span class="route-dot end"></span><span>' + activeOrder.to + '</span></div>' +
        '</div>' +
        '<div class="order-footer"><span class="order-price">' + formatPrice(activeOrder.price) + '</span><span class="order-time">' + activeOrder.createdAt + '</span></div>' +
      '</div>';
  }

  let ordersHtml = '';
  if (myOrders.length === 0) {
    ordersHtml = '<div class="section-title">最近订单</div><div class="empty-state"><div class="empty-icon">🛣️</div><p>还没有订单，快去叫代驾吧</p></div>';
  } else {
    ordersHtml = '<div class="section-title">最近订单</div>';
    myOrders.slice().reverse().slice(0, 5).forEach(function(o) {
      ordersHtml += '<div class="order-card" data-action="order-detail" data-order-id="' + o.id + '" style="margin:0 20px 12px">' +
        '<div class="order-header"><span class="order-id">订单 #' + o.id.slice(-6).toUpperCase() + '</span>' + statusBadge(o.status) + '</div>' +
        '<div class="order-route">' +
          '<div class="route-item"><span class="route-dot start"></span><span>' + o.from + '</span></div>' +
          '<div class="route-item" style="padding-left:2px"><span class="route-connector"></span></div>' +
          '<div class="route-item"><span class="route-dot end"></span><span>' + o.to + '</span></div>' +
        '</div>' +
        '<div class="order-footer"><span class="order-price">' + formatPrice(o.price) + '</span><span class="order-time">' + o.createdAt + '</span></div>' +
      '</div>';
    });
  }

  return '<div class="user-home has-nav">' +
    '<div class="top-bar">' +
      '<div class="greeting">' + greeting + '，欢迎回来 👋</div>' +
      '<div style="display:flex;justify-content:space-between;align-items:center">' +
        '<div class="username">' + u.name + '</div>' +
        '<div class="topbar-icon-wrap" data-action="notifications">🔔' +
          (unreadCount > 0 ? '<span class="unread-badge">' + (unreadCount > 99 ? '99+' : unreadCount) + '</span>' : '') +
        '</div>' +
      '</div>' +
      '<div class="balance-bar">' +
        '<div><div class="balance-label">累计行程</div><div class="balance-value">' + completedOrders.length + ' 次</div></div>' +
        '<div style="text-align:right"><div class="balance-label">累计消费</div><div class="balance-value">' + formatPrice(totalSpent) + '</div></div>' +
      '</div>' +
    '</div>' +
    (isNightTime() ? '<div style="margin:16px 20px 0;padding:12px 16px;background:linear-gradient(135deg,#2C3E50,#4a3f6b);border-radius:12px;color:#fff;font-size:13px;display:flex;align-items:center;gap:10px"><span style="font-size:20px">🌙</span><div><div style="font-weight:600">夜间时段</div><div style="opacity:0.8;margin-top:2px">当前为夜间代驾时段（22:00-06:00），费用上浮30%</div></div></div>' : '') +
    '<div class="quick-actions">' +
      '<div class="quick-action" data-action="create-order"><div class="qa-icon" style="background:#FFF0EB;color:#FF6B35">🚗</div><span class="qa-label">叫代驾</span></div>' +
      '<div class="quick-action" data-action="user-orders"><div class="qa-icon" style="background:#EBF5FB;color:#3498DB">📋</div><span class="qa-label">我的订单</span></div>' +
      '<div class="quick-action" data-action="stats"><div class="qa-icon" style="background:#F0FFF4;color:#27AE60">📊</div><span class="qa-label">统计</span></div>' +
      '<div class="quick-action" data-action="profile"><div class="qa-icon" style="background:#FDF2F8;color:#9B59B6">👤</div><span class="qa-label">我的</span></div>' +
    '</div>' +
    activeOrderHtml +
    ordersHtml +
  '</div>' +
  '<nav class="bottom-nav">' +
    '<div class="nav-item active"><span class="nav-icon">🏠</span>首页</div>' +
    '<div class="nav-item" data-action="create-order"><span class="nav-icon">🚗</span>叫代驾</div>' +
    '<div class="nav-item" data-action="user-orders"><span class="nav-icon">📋</span>订单</div>' +
    '<div class="nav-item" data-action="profile"><span class="nav-icon">👤</span>我的</div>' +
  '</nav>';
}

// ============================================================
//  用户端 - 下单页面（不需要异步数据）
// ============================================================
function renderCreateOrder() {
  // 读取用户保存的常用地址
  var savedAddresses = [];
  try {
    savedAddresses = JSON.parse(localStorage.getItem('dj_saved_addresses') || '[]');
  } catch(e) {}
  // 构建常用地址快捷按钮HTML
  var quickAddrHtml = '';
  if (savedAddresses.length > 0) {
    quickAddrHtml = '<div class="quick-address-bar" style="margin-bottom:12px;padding:12px;background:linear-gradient(135deg,#f8f9fa,#e9ecef);border-radius:12px">' +
      '<div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">📍 常用地址</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">';
    savedAddresses.forEach(function(addr, idx) {
      var icon = addr.tag === 'home' ? '🏠' : addr.tag === 'work' ? '🏢' : '📍';
      var label = addr.tag === 'home' ? '家' : addr.tag === 'work' ? '公司' : addr.name || '地址' + (idx + 1);
      quickAddrHtml += '<button class="quick-addr-btn" data-addr-idx="' + idx + '" style="padding:8px 14px;background:#fff;border:1px solid var(--border);border-radius:20px;font-size:13px;display:flex;align-items:center;gap:6px;cursor:pointer;transition:all 0.2s">' +
        '<span>' + icon + '</span><span>' + label + '</span></button>';
    });
    quickAddrHtml += '</div></div>';
  }

  return '<div class="page">' +
    '<div class="page-header"><button class="back-btn" data-action="go-back">←</button><h2>叫代驾</h2></div>' +
    '<div class="page-content">' +
      '<div class="map-container" id="order-map-container">' +
        '<div id="order-map" class="map-canvas"></div>' +
        '<div class="map-search-bar"><div class="map-search-input-wrap"><span class="map-search-icon">🔍</span><input class="map-search-input" id="map-search-input" placeholder="搜索地点..." /></div></div>' +
        '<div class="map-search-results" id="map-search-results" style="display:none"></div>' +
        '<div class="map-toolbar">' +
          '<button class="map-tool-btn" id="map-zoom-in-btn" title="放大">➕</button>' +
          '<button class="map-tool-btn" id="map-zoom-out-btn" title="缩小">➖</button>' +
          '<button class="map-tool-btn" id="map-type-btn" title="切换卫星图">🛰️</button>' +
          '<button class="map-tool-btn" id="map-locate-btn" title="定位">📍</button>' +
          '<button class="map-tool-btn" id="map-traffic-btn" title="实时路况">🚦</button>' +
        '</div>' +
        '<div class="map-tool-info" id="map-tool-info">点击地图选位置 / 拖动标记</div>' +
        '<div id="route-info" class="route-info-panel" style="display:none"></div>' +
      '</div>' +
      quickAddrHtml +
      '<div class="card">' +
        '<div class="form-group"><label>🟢 出发地</label><input class="form-control" id="order-from" placeholder="点击地图选择或搜索设置" /><input type="hidden" id="order-from-lat" /><input type="hidden" id="order-from-lng" /></div>' +
        '<button class="swap-btn" id="swap-locations-btn" title="交换起终点">⇅ 交换</button>' +
        '<div class="form-group"><label>🔴 目的地</label><input class="form-control" id="order-to" placeholder="点击地图选择或搜索设置" /><input type="hidden" id="order-to-lat" /><input type="hidden" id="order-to-lng" /></div>' +
        '<div class="form-group"><label>📝 备注（可选）</label><input class="form-control" id="order-note" placeholder="例：喝了点酒，车停在地下车库B1" /></div>' +
      '</div>' +
      '<div id="price-estimate-box" style="display:none" class="price-estimate"><div><div class="price-label">预估费用</div><div style="font-size:12px;opacity:0.8;margin-top:2px" id="price-rule-desc">起步价+超时费</div></div><div class="price-value" id="price-display">¥0</div></div>' +
      '<button class="btn btn-primary btn-block" id="estimate-btn" style="margin-bottom:12px">估算费用</button>' +
      '<button class="btn btn-success btn-block" id="submit-order-btn" disabled>🚗 立即下单</button>' +
    '</div>' +
  '</div>';
}

// ============================================================
//  用户端 - 订单详情
// ============================================================
async function renderOrderDetail(orderId) {
  const order = await DB.getOrderById(orderId);
  if (!order) return '<div class="page"><div class="page-content"><p>订单不存在</p></div></div>';

  // 保存订单数据供全屏地图使用
  window.__lastDetailOrder = order;

  const isUser = State.currentUser && State.currentUser.type === 'user';
  const isDriver = State.currentUser && State.currentUser.type === 'driver';
  const isStaff = State.currentUser && State.currentUser.type === 'staff';
  // 统一使用 go-back，通过历史栈返回，避免与手机返回键冲突
  const backAction = 'go-back';

  // 步骤进度
  const steps = [
    { key: 'pending', label: '待接单' },
    { key: 'accepted', label: '已接单' },
    { key: 'ongoing', label: '代驾中' },
    { key: 'completed', label: '已完成' },
  ];
  const stepIdx = steps.findIndex(function(s) { return s.key === order.status; });
  let stepsHtml = '';
  if (order.status === 'cancelled') {
    stepsHtml = '<div style="text-align:center;padding:16px 0"><span class="badge badge-danger" style="font-size:14px;padding:8px 20px">订单已取消</span></div>';
  } else {
    stepsHtml = '<div class="steps">' +
      steps.map(function(s, i) {
        return '<div class="step ' + (i < stepIdx ? 'done' : i === stepIdx ? 'active' : '') + '">' +
          '<div class="step-dot">' + (i < stepIdx ? '✓' : i + 1) + '</div>' +
          '<div class="step-label">' + s.label + '</div></div>';
      }).join('') +
    '</div>';
  }

  // 查找司机信息
  let driverInfoHtml = '';
  let etaHtml = ''; // ETA 预计到达时间
  if ((isUser || isStaff) && order.driverId && ['accepted', 'ongoing', 'completed'].includes(order.status)) {
    const drivers = await DB.getDrivers();
    const driver = drivers.find(function(d) { return d.id === order.driverId; });
    if (driver) {
      // 计算 ETA：如果有司机位置和出发地位置
      let etaText = '';
      if (order.status === 'accepted' && order.fromLat && order.fromLng) {
        // 尝试从 localStorage 获取司机最新位置
        let driverPos = null;
        try {
          var cached = JSON.parse(localStorage.getItem('dj_driver_pos_' + order.id) || 'null');
          if (cached && (Date.now() - cached.ts) < 120000) driverPos = cached;
        } catch(e) {}
        // 如果有司机位置，计算到出发地的距离和ETA
        if (driverPos) {
          var distToPickup = _calcDistance(driverPos.lat, driverPos.lng, parseFloat(order.fromLat), parseFloat(order.fromLng));
          var etaMin = Math.max(1, Math.ceil(distToPickup / 300)); // 假设平均速度 300m/分钟（约18km/h城市道路）
          etaText = '<div class="eta-badge" style="background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:6px 12px;border-radius:20px;font-size:13px;display:inline-flex;align-items:center;gap:6px;margin-top:8px"><span style="font-size:14px">🚗</span><span>距您 ' + (distToPickup >= 1000 ? (distToPickup/1000).toFixed(1) + 'km' : Math.round(distToPickup) + 'm') + '，约 ' + etaMin + ' 分钟到达</span></div>';
        } else {
          etaText = '<div class="eta-badge" style="background:#f0f0f0;color:#666;padding:6px 12px;border-radius:20px;font-size:13px;display:inline-flex;align-items:center;gap:6px;margin-top:8px"><span style="font-size:14px">🚗</span><span>司机正在赶来...</span></div>';
        }
        etaHtml = '<div style="margin-bottom:12px">' + etaText + '</div>';
      }
      driverInfoHtml = '<div class="card" style="margin-bottom:16px">' +
        '<div class="card-header">🧑‍✈️ 代驾司机</div>' +
        etaHtml +
        '<div class="driver-info-card">' +
          '<div class="driver-avatar">🧑‍✈️</div>' +
          '<div style="flex:1"><div class="driver-name">' + driver.name + '</div><div class="driver-detail">📞 ' + driver.phone + '</div><div class="driver-detail">驾驶证：' + (driver.license || '已验证') + '</div><div class="driver-rating">⭐ ' + (driver.rating || '4.9') + ' 分</div></div>' +
          (isUser && driver.phone ? '<a href="tel:' + driver.phone + '" class="btn btn-sm btn-success contact-btn" style="flex-shrink:0">📞 联系司机</a>' : '') +
        '</div></div>';
    }
  }

  // 查找乘客信息（司机/客服视角）
  let passengerInfoHtml = '';
  if ((isDriver || isStaff) && order.userId && ['accepted', 'ongoing', 'completed'].includes(order.status)) {
    const users = await DB.getUsers();
    const user = users.find(function(u) { return u.id === order.userId; });
    if (user) {
      passengerInfoHtml = '<div class="card" style="margin-bottom:16px">' +
        '<div class="card-header">👤 乘客信息</div>' +
        '<div class="driver-info-card">' +
          '<div class="driver-avatar" style="background:linear-gradient(135deg,#4facfe 0%,#00f2fe 100%)">👤</div>' +
          '<div style="flex:1"><div class="driver-name">' + user.name + '</div><div class="driver-detail">📞 ' + user.phone + '</div></div>' +
          (user.phone ? '<a href="tel:' + user.phone + '" class="btn btn-sm btn-success contact-btn" style="flex-shrink:0">📞 联系</a>' : '') +
        '</div></div>';
    }
  }

  // 路线地图（如果有经纬度）
  var routeMapHtml = '';
  // ongoing 状态显示实时追踪地图；其他状态显示普通路线地图
  const isOngoing = order.status === 'ongoing' || order.status === 'accepted';
  if (order.fromLat && order.fromLng && order.toLat && order.toLng) {
    if (isOngoing) {
      // 实时追踪地图（司机位置 + 导航）
      routeMapHtml = '<div id="detail-route-map-wrapper" style="position:relative;margin-bottom:12px">' +
        '<div id="detail-live-map" class="detail-route-map"></div>' +
        '<button class="map-expand-btn" data-action="expand-map" data-map-id="detail-live-map">⛶</button>' +
        // 导航按钮（司机视角）—— 内嵌地图导航
        (isDriver ? '<button id="nav-to-dest-btn" class="map-nav-btn" data-action="open-navigation-in-app" data-order-id="' + order.id + '" title="内嵌地图导航">🧭 导航</button>' : '') +
        '</div>' +
        // 实时状态栏
        '<div id="live-status-bar" style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:linear-gradient(135deg,#1a1a2e,#16213e);border-radius:10px;margin-bottom:10px;color:#fff;font-size:13px">' +
          '<span style="width:8px;height:8px;border-radius:50%;background:#00f5a0;animation:pulse-dot 1.5s infinite;flex-shrink:0"></span>' +
          '<span id="live-status-text">正在获取司机位置...</span>' +
          '<span id="live-dist-text" style="margin-left:auto;font-size:12px;color:#a0c4ff"></span>' +
        '</div>';
    } else {
      routeMapHtml = '<div id="detail-route-map-wrapper" style="position:relative;margin-bottom:12px">' +
        '<div id="detail-route-map" class="detail-route-map"></div>' +
        '<button class="map-expand-btn" data-action="expand-map" data-map-id="detail-route-map">⛶</button>' +
        '</div>';
    }
    // 距离信息
    var distText = '';
    if (order.distance && order.distance > 0) {
      distText = order.distance >= 1000 ? (order.distance / 1000).toFixed(1) + ' km' : order.distance + ' m';
    }
    if (distText && !isOngoing) {
      routeMapHtml += '<div style="font-size:13px;color:var(--text-muted);text-align:center;margin-bottom:8px">📏 预估距离：' + distText + '</div>';
    }
  }

  // 操作按钮
  let actionButtons = '';
  if (isUser && order.status === 'pending') {
    actionButtons = '<button class="btn btn-danger btn-block" data-action="cancel-order" data-order-id="' + order.id + '">取消订单</button>';
  }
  // 乘客主动结束订单（代驾中）
  if (isUser && order.status === 'ongoing') {
    actionButtons = '<button class="btn btn-warning btn-block" data-action="user-complete-order" data-order-id="' + order.id + '" style="background:#e67e22;border-color:#e67e22">🏁 确认到达，结束代驾</button>';
  }
  if (isDriver && order.driverId === State.currentUser.id) {
    if (order.status === 'accepted') {
      actionButtons = '<button class="btn btn-success btn-block" data-action="start-order" data-order-id="' + order.id + '">🚗 开始代驾</button>';
    }
    if (order.status === 'ongoing') {
      actionButtons = '<button class="btn btn-primary btn-block" data-action="complete-order" data-order-id="' + order.id + '" id="complete-order-btn">✅ 完成代驾</button>' +
        '<div id="arrive-check-msg" style="display:none;text-align:center;font-size:12px;color:var(--text-muted);margin-top:8px">📍 正在检测到达状态...</div>';
    }
  }

  return '<div class="page">' +
    '<div class="page-header"><button class="back-btn" data-action="' + backAction + '">←</button><h2>订单详情</h2>' + statusBadge(order.status) + '</div>' +
    '<div class="page-content">' +
      '<div class="card" style="margin-bottom:16px"><div class="card-header">📍 行程信息</div>' +
        stepsHtml +
        routeMapHtml +
        '<div class="order-route" style="margin-bottom:12px">' +
          '<div class="route-item"><span class="route-dot start"></span><div><div style="font-size:12px;color:var(--text-muted)">出发地</div><div>' + order.from + '</div></div></div>' +
          '<div class="route-item"><span class="route-connector"></span></div>' +
          '<div class="route-item"><span class="route-dot end"></span><div><div style="font-size:12px;color:var(--text-muted)">目的地</div><div>' + order.to + '</div></div></div>' +
        '</div>' +
      '</div>' +
      passengerInfoHtml +
      driverInfoHtml +
      '<div class="card" style="margin-bottom:16px"><div class="card-header">💰 费用信息</div>' +
        '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted)">订单编号</span><span style="font-size:12px">#' + order.id.slice(-8).toUpperCase() + '</span></div>' +
        '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted)">下单时间</span><span>' + order.createdAt + '</span></div>' +
        (order.acceptedAt ? '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted)">接单时间</span><span>' + order.acceptedAt + '</span></div>' : '') +
        (order.completedAt ? '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted)">完成时间</span><span>' + order.completedAt + '</span></div>' : '') +
        '<div style="display:flex;justify-content:space-between;padding:12px 0 0;align-items:center"><span style="font-size:15px;font-weight:600">应付金额</span><span style="font-size:24px;font-weight:700;color:var(--primary)">' + formatPrice(order.price) + '</span></div>' +
      '</div>' +
      actionButtons +
    '</div>' +
  '</div>';
}

// ============================================================
// 司机端 - 增强版内嵌导航地图
// ============================================================
var _navMapState = null; // 导航地图状态
var _speechSynth = window.speechSynthesis; // 语音合成对象
var _lastSpokenInstruction = ''; // 上次播报的指令（避免重复）
var _speechEnabled = true; // 语音开关
var _currentDriving = null; // 当前导航实例

function initNavMap(orderId) {
  console.log('[NavMap] initNavMap 被调用, orderId:', orderId);
  
  if (typeof AMap === 'undefined') {
    console.log('[NavMap] AMap 未定义，等待...');
    showToast('地图加载中，请稍候...', '');
    setTimeout(function() { initNavMap(orderId); }, 2000);
    return;
  }
  
  console.log('[NavMap] AMap 已就绪');

  var container = document.getElementById('nav-amap-container');
  console.log('[NavMap] 容器检查:', container ? '存在' : '不存在', 
    container ? container.clientWidth + 'x' + container.clientHeight : '');
  
  if (!container) {
    console.log('[NavMap] 容器不存在，等待重试...');
    setTimeout(function() { initNavMap(orderId); }, 500);
    return;
  }

  if (container.clientWidth === 0 || container.clientHeight === 0) {
    console.log('[NavMap] 容器尺寸为0，等待重试...');
    setTimeout(function() { initNavMap(orderId); }, 500);
    return;
  }
  
  console.log('[NavMap] 开始加载插件...');

  // 加载增强导航插件
  AMap.plugin(['AMap.Driving', 'AMap.Geolocation', 'AMap.ToolBar', 'AMap.HawkEye'], function() {
    _doInitNavMap(orderId, container);
  });
}

// 语音播报函数
function _speak(text, force) {
  if (!_speechEnabled && !force) return;
  if (!window.speechSynthesis) return;
  if (text === _lastSpokenInstruction && !force) return; // 避免重复播报
  
  _lastSpokenInstruction = text;
  window.speechSynthesis.cancel(); // 取消之前的播报
  var utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'zh-CN';
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  
  // 尝试选择中文语音
  var voices = window.speechSynthesis.getVoices();
  var zhVoice = voices.find(function(v) { return v.lang.indexOf('zh') >= 0; });
  if (zhVoice) utterance.voice = zhVoice;
  
  window.speechSynthesis.speak(utterance);
  console.log('[NavMap] 语音播报:', text);
}

// 切换语音开关
function _toggleSpeech() {
  _speechEnabled = !_speechEnabled;
  var btn = document.getElementById('speech-toggle-btn');
  if (btn) {
    btn.textContent = _speechEnabled ? '🔊' : '🔇';
    btn.title = _speechEnabled ? '点击关闭语音' : '点击开启语音';
  }
  if (!_speechEnabled) {
    window.speechSynthesis.cancel();
    _speak('语音导航已关闭', true);
  } else {
    _speak('语音导航已开启', true);
  }
}

// 解析导航指令文字
function _parseDrivingInstruction(instruction, distance) {
  if (!instruction) return null;
  
  // 简化指令文字
  var text = instruction
    .replace(/<[^>]+>/g, '') // 移除HTML标签
    .replace(/左转/gi, '左转')
    .replace(/右转/gi, '右转')
    .replace(/直行/gi, '直行')
    .replace(/掉头/gi, '掉头')
    .replace(/到达/gi, '到达')
    .replace(/经过/gi, '经过');
  
  // 添加距离信息
  var distText = '';
  if (distance) {
    if (distance >= 1000) {
      distText = Math.round(distance / 1000) + '公里后';
    } else {
      distText = Math.round(distance) + '米后';
    }
  }
  
  return distText + text;
}

// 格式化距离
function _formatDistance(meters) {
  if (meters >= 1000) {
    return (meters / 1000).toFixed(1) + ' km';
  }
  return Math.round(meters) + ' m';
}

// 格式化时间
function _formatDuration(seconds) {
  if (seconds >= 3600) {
    var hours = Math.floor(seconds / 3600);
    var mins = Math.round((seconds % 3600) / 60);
    return hours + 'h ' + mins + 'min';
  }
  if (seconds >= 60) {
    return Math.round(seconds / 60) + ' 分钟';
  }
  return seconds + ' 秒';
}

function _doInitNavMap(orderId, container) {
  DB.getOrderById(orderId).then(function(order) {
    if (!order || !order.toLat || !order.toLng) return;

    var destLat = parseFloat(order.toLat);
    var destLng = parseFloat(order.toLng);
    var destName = order.to || '目的地';

    // 获取司机当前位置
    var startLat = 0, startLng = 0;
    try {
      var cachedPos = JSON.parse(localStorage.getItem('dj_driver_pos') || '{}');
      startLat = parseFloat(cachedPos.lat) || 0;
      startLng = parseFloat(cachedPos.lng) || 0;
    } catch(e) {}

    // 创建地图
    var center = (startLat && startLng) ? [startLng, startLat] : [destLng, destLat];
    var map = new AMap.Map('nav-amap-container', {
      zoom: 15,
      center: center,
      mapStyle: 'amap://styles/normal',
      resizeEnable: true,
      viewMode: '2D'
    });

    // 添加地图控件
    map.addControl(new AMap.ToolBar({ position: 'right-bottom' }));
    
    // 存储地图实例
    _navMapState = {
      map: map,
      orderId: orderId,
      destLat: destLat,
      destLng: destLng,
      destName: destName,
      driverMarker: null,
      routeLine: null,
      passedLine: null,
      destMarker: null,
      heading: 0, // 当前朝向
      routeSteps: [], // 路线步骤
      currentStepIndex: 0
    };

    // 司机位置标记（带朝向箭头）
    _navMapState.driverMarker = new AMap.Marker({
      position: center,
      content: '<div id="driver-car-icon" style="width:32px;height:32px;text-align:center;transform-origin:center"><div style="width:0;height:0;border-left:10px solid transparent;border-right:10px solid transparent;border-bottom:18px solid #2196F3;margin:0 auto;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))"></div><div style="background:#2196F3;color:#fff;padding:2px 6px;border-radius:8px;font-size:10px;font-weight:bold;margin-top:-2px">导航</div></div>',
      offset: new AMap.Pixel(-16, -32),
      autoRotation: true,
      angle: 0
    });
    _navMapState.driverMarker.setMap(map);

    // 终点标记
    _navMapState.destMarker = new AMap.Marker({
      position: [destLng, destLat],
      content: '<div style="background:#E74C3C;color:#fff;padding:6px 10px;border-radius:16px;font-size:13px;font-weight:600;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.3)">🏁 ' + destName + '</div>',
      offset: new AMap.Pixel(-40, -15)
    });
    _navMapState.destMarker.setMap(map);

    // 初始化定位
    _initNavGeolocation(orderId);

    // 定期更新位置
    _navMapState._watchId = setInterval(function() {
      if (!_navMapState || _navMapState.orderId !== orderId) {
        clearInterval(_navMapState._watchId);
        return;
      }
      _updatePositionFromCache(orderId);
    }, 3000);
  });
}

// 初始化定位
function _initNavGeolocation(orderId) {
  console.log('[NavMap] 开始初始化定位...');
  
  // 首先尝试从缓存获取位置
  var cachedLat = 0, cachedLng = 0;
  try {
    var pos = JSON.parse(localStorage.getItem('dj_driver_pos') || '{}');
    cachedLat = parseFloat(pos.lat) || 0;
    cachedLng = parseFloat(pos.lng) || 0;
  } catch(e) {}
  
  if (!window.navigator.geolocation) {
    console.warn('[NavMap] 浏览器不支持定位');
    // 使用缓存位置或订单出发地
    _usePositionForRoute(cachedLat, cachedLng, orderId);
    return;
  }

  // 尝试使用高德定位
  if (typeof AMap !== 'undefined') {
    console.log('[NavMap] 使用高德定位...');
    var geolocation = new AMap.Geolocation({
      enableHighAccuracy: true,
      timeout: 10000,
      convert: true
    });
    
    geolocation.getCurrentPosition(function(status, result) {
      console.log('[NavMap] 高德定位结果:', status, result);
      if (status === 'complete' && result.position) {
        _onNavLocationSuccess(result.position.lat, result.position.lng, result.heading || 0, orderId);
        // 开始持续定位
        geolocation.watchPosition(function(res) {
          if (res.position) {
            _onNavLocationSuccess(res.position.lat, res.position.lng, res.heading || _navMapState.heading, orderId);
          }
        });
      } else {
        console.warn('[NavMap] 高德定位失败，使用缓存/订单位置');
        _usePositionForRoute(cachedLat, cachedLng, orderId);
      }
    });
    
    // 添加定位超时后备
    setTimeout(function() {
      if (!_navMapState || !_navMapState._firstLocationDone) {
        console.warn('[NavMap] 定位超时，使用后备位置');
        _usePositionForRoute(cachedLat, cachedLng, orderId);
      }
    }, 12000);
  } else {
    console.log('[NavMap] 使用浏览器原生定位...');
    // 使用浏览器原生定位
    window.navigator.geolocation.getCurrentPosition(
      function(pos) {
        console.log('[NavMap] 浏览器定位成功:', pos.coords.latitude, pos.coords.longitude);
        _onNavLocationSuccess(pos.coords.latitude, pos.coords.longitude, pos.coords.heading || 0, orderId);
      },
      function(err) {
        console.warn('[NavMap] 浏览器定位失败:', err);
        _usePositionForRoute(cachedLat, cachedLng, orderId);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }
}

// 使用位置开始路线规划（后备函数）
function _usePositionForRoute(lat, lng, orderId) {
  if (!_navMapState || _navMapState.orderId !== orderId) return;
  
  console.log('[NavMap] _usePositionForRoute:', lat, lng);
  
  // 如果缓存没有位置，尝试使用订单出发地
  if (!lat || !lng) {
    DB.getOrderById(orderId).then(function(order) {
      if (order && order.fromLat && order.fromLng) {
        console.log('[NavMap] 使用订单出发地:', order.fromLat, order.fromLng);
        _onNavLocationSuccess(parseFloat(order.fromLat), parseFloat(order.fromLng), 0, orderId);
      } else {
        // 最后后备：使用地图中心点（北京）
        console.warn('[NavMap] 无可用位置，使用默认位置');
        _onNavLocationSuccess(39.908823, 116.397470, 0, orderId);
      }
    });
  } else {
    _onNavLocationSuccess(lat, lng, 0, orderId);
  }
}

// 定位成功回调
function _onNavLocationSuccess(lat, lng, heading, orderId) {
  console.log('[NavMap] _onNavLocationSuccess 被调用:', lat, lng, heading, orderId);
  
  if (!_navMapState || _navMapState.orderId !== orderId) {
    console.warn('[NavMap] _navMapState 不匹配，跳过');
    return;
  }
  
  if (!lat || !lng || lat === 0 || lng === 0) {
    console.warn('[NavMap] 坐标无效:', lat, lng);
    return;
  }
  
  console.log('[NavMap] 定位成功:', lat, lng, '朝向:', heading);
  
  // 更新标记位置和朝向
  _navMapState.driverMarker.setPosition([lng, lat]);
  if (heading && heading !== 0) {
    _navMapState.driverMarker.setAngle(heading);
  }
  _navMapState.heading = heading || _navMapState.heading;
  
  // 更新坐标显示
  var coordsEl = document.getElementById('nav-coords');
  if (coordsEl) coordsEl.textContent = lat.toFixed(5) + ', ' + lng.toFixed(5);
  
  // 地图跟随中心（首次定位）
  if (!_navMapState._firstLocationDone) {
    _navMapState._firstLocationDone = true;
    _navMapState.map.setCenter([lng, lat]);
    _navMapState.map.setZoom(16);
    // 首次定位后规划路线
    _drawNavRoute(lat, lng);
  }
}

// 从缓存更新位置
function _updatePositionFromCache(orderId) {
  if (!_navMapState || _navMapState.orderId !== orderId) return;
  
  try {
    var pos = JSON.parse(localStorage.getItem('dj_driver_pos') || '{}');
    var lat = parseFloat(pos.lat);
    var lng = parseFloat(pos.lng);
    if (lat && lng) {
      _onNavLocationSuccess(lat, lng, _navMapState.heading, orderId);
    }
  } catch(e) {}
}

// 绘制导航路线
function _drawNavRoute(fromLat, fromLng) {
  if (!_navMapState) return;
  
  var destLat = _navMapState.destLat;
  var destLng = _navMapState.destLng;
  var destName = _navMapState.destName;
  
  console.log('[NavMap] 开始规划路线:', fromLat, fromLng, '->', destLat, destLng);
  
  // 清除旧路线
  if (_navMapState.routeLine) {
    _navMapState.routeLine.setMap(null);
    _navMapState.routeLine = null;
  }
  if (_navMapState.passedLine) {
    _navMapState.passedLine.setMap(null);
    _navMapState.passedLine = null;
  }
  if (_currentDriving) {
    _currentDriving = null;
  }
  
  // 使用高德导航
  var policy = (typeof AMap !== 'undefined' && AMap.DrivingPolicy) ? AMap.DrivingPolicy.LEAST_TIME : 0;
  _currentDriving = new AMap.Driving({
    policy: policy,
    showTraffic: true,
    extensions: 'all'
  });
  
  // 设置超时处理
  var routeTimeout = setTimeout(function() {
    console.warn('[NavMap] 路线规划超时');
    // 超时后显示到达目的地的简单路线
    _showSimpleRoute();
  }, 8000);
  
  _currentDriving.search([fromLng, fromLat], [destLng, destLat], function(status, result) {
    clearTimeout(routeTimeout);
    
    if (status === 'complete' && result.routes && result.routes.length > 0) {
      var route = result.routes[0];
      
      // 存储路线步骤用于语音播报
      if (route.steps) {
        _navMapState.routeSteps = route.steps;
      }
      
      // 绘制已行驶路线（蓝色）
      var path = route.path;
      if (path && path.length > 0) {
        _navMapState.routeLine = new AMap.Polyline({
          path: path,
          strokeColor: '#3777FF',
          strokeWeight: 8,
          strokeStyle: 'solid',
          lineJoin: 'round'
        });
        _navMapState.routeLine.setMap(_navMapState.map);
      }
      
      // 更新距离和时间
      var distance = parseFloat(route.distance) || 0;
      var duration = parseFloat(route.time || route.duration) || 0;
      var distEl = document.getElementById('nav-distance');
      var durEl = document.getElementById('nav-duration');
      if (distEl) distEl.textContent = _formatDistance(distance);
      if (durEl) durEl.textContent = _formatDuration(duration);
      
      // 显示导航提示
      _updateNavInstruction(route.steps, fromLat, fromLng);
      
      // 地图自适应
      if (_navMapState.routeLine) {
        _navMapState.map.setFitView(_navMapState.routeLine, false, [60, 80, 60, 120]);
      }
      
      // 首次播报
      if (!_navMapState._routeAnnounced) {
        _navMapState._routeAnnounced = true;
        _speak('导航开始，目的地是' + destName + '，全程' + _formatDistance(distance));
      }
    } else {
      console.warn('[NavMap] 路线规划失败:', status, result);
      _showSimpleRoute();
    }
  });
}

// 显示简单路线（当详细路线规划失败时）
function _showSimpleRoute() {
  if (!_navMapState) return;
  
  var fromLat = 0, fromLng = 0;
  try {
    var pos = JSON.parse(localStorage.getItem('dj_driver_pos') || '{}');
    fromLat = parseFloat(pos.lat) || 0;
    fromLng = parseFloat(pos.lng) || 0;
  } catch(e) {}
  
  if (!fromLat || !fromLng) return;
  
  var destLat = _navMapState.destLat;
  var destLng = _navMapState.destLng;
  var destName = _navMapState.destName;
  
  // 绘制简单直线
  _navMapState.routeLine = new AMap.Polyline({
    path: [[fromLng, fromLat], [destLng, destLat]],
    strokeColor: '#3777FF',
    strokeWeight: 6,
    strokeStyle: 'dashed',
    lineJoin: 'round'
  });
  _navMapState.routeLine.setMap(_navMapState.map);
  
  // 计算直线距离
  var dist = _calcDistance(fromLat, fromLng, destLat, destLng);
  var distEl = document.getElementById('nav-distance');
  if (distEl) distEl.textContent = _formatDistance(dist);
  
  var durEl = document.getElementById('nav-duration');
  if (durEl) durEl.textContent = '≈ ' + Math.round(dist / 500) + ' 分钟'; // 假设500m/分钟
  
  // 更新导航提示
  var instructionEl = document.getElementById('nav-instruction');
  var iconEl = document.getElementById('nav-instruction-icon');
  if (instructionEl) {
    instructionEl.innerHTML = '<div style="font-size:14px;font-weight:600;color:#fff">沿道路向目的地行驶</div>' +
      '<div style="font-size:12px;color:rgba(255,255,255,0.7);margin-top:4px">全程约 ' + _formatDistance(dist) + '</div>';
  }
  if (iconEl) iconEl.textContent = '➡️';
  
  // 地图自适应
  _navMapState.map.setFitView();
  
  console.log('[NavMap] 显示简单路线，距离:', dist);
}

// 更新导航指令显示
function _updateNavInstruction(steps, currentLat, currentLng) {
  if (!steps || !_navMapState) return;
  
  // 找到下一个转弯指令
  var nextStep = null;
  var passedDistance = 0;
  
  for (var i = 0; i < steps.length; i++) {
    var step = steps[i];
    // 判断是否经过该步骤（简单判断）
    if (step.path && step.path.length > 0) {
      // 检查车辆是否已进入该路段
      var stepStart = step.path[0];
      var stepEnd = step.path[step.path.length - 1];
      var distToStep = _calcDistance(currentLat, currentLng, stepStart.lat, stepStart.lng);
      
      if (distToStep < 50) { // 距离起点50米内
        // 这是当前或下一个要经过的步骤
        if (step.instruction && step.instruction.indexOf('直行') === -1) {
          nextStep = step;
          break;
        }
      }
    }
  }
  
  // 更新UI
  var instructionEl = document.getElementById('nav-instruction');
  var instructionIconEl = document.getElementById('nav-instruction-icon');
  
  if (nextStep) {
    var instruction = nextStep.instruction.replace(/<[^>]+>/g, '');
    var distance = nextStep.distance || 0;
    var distText = _formatDistance(distance);
    
    if (instructionEl) {
      instructionEl.innerHTML = '<div style="font-size:16px;font-weight:600;color:#fff;margin-bottom:4px">' + instruction + '</div>' +
        '<div style="font-size:13px;color:rgba(255,255,255,0.7)">前方 ' + distText + '</div>';
    }
    
    // 更新图标
    var icon = '⬆️';
    if (instruction.indexOf('左转') >= 0) icon = '⬅️';
    else if (instruction.indexOf('右转') >= 0) icon = '➡️';
    else if (instruction.indexOf('掉头') >= 0) icon = '🔄';
    else if (instruction.indexOf('到达') >= 0) icon = '🏁';
    if (instructionIconEl) instructionIconEl.textContent = icon;
    
    // 语音播报（接近转弯时）
    if (distance < 500 && distance > 100) {
      var speechText = _parseDrivingInstruction(instruction, distance);
      if (speechText) _speak(speechText);
    }
  } else {
    // 没有明确转弯，跟随路线
    if (instructionEl) {
      instructionEl.innerHTML = '<div style="font-size:14px;color:rgba(255,255,255,0.8)">跟随蓝色路线行驶</div>';
    }
    if (instructionIconEl) instructionIconEl.textContent = '🛣️';
  }
}

// 计算两点间距离（米）
function _calcDistance(lat1, lng1, lat2, lng2) {
  var R = 6371000; // 地球半径（米）
  var dLat = (lat2 - lat1) * Math.PI / 180;
  var dLng = (lng2 - lng1) * Math.PI / 180;
  var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// 更新司机标记（兼容旧函数）
function _updateDriverMarker(map, lat, lng, label) {
  var marker = new AMap.Marker({
    position: [lng, lat],
    content: '<div style="background:#2196F3;color:#fff;padding:6px 10px;border-radius:16px;font-size:13px;font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,0.3)">🧑‍✈️ 您的位置</div>',
    offset: new AMap.Pixel(-40, -15)
  });
  marker.setMap(map);
  return marker;
}

// 退出导航时清理
function cleanupNavMap() {
  if (_navMapState) {
    if (_navMapState._watchId) clearInterval(_navMapState._watchId);
    if (_navMapState.map) _navMapState.map.destroy();
    _navMapState = null;
  }
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  _currentDriving = null;
  _lastSpokenInstruction = '';
}

function _updateDriverMarker(map, lat, lng, label) {
  var marker = new AMap.Marker({
    position: [lng, lat],
    content: '<div style="background:#2196F3;color:#fff;padding:6px 10px;border-radius:16px;font-size:13px;font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,0.3)">🧑‍✈️ 您的位置</div>',
    offset: new AMap.Pixel(-40, -15)
  });
  marker.setMap(map);
  return marker;
}

function _drawNavRoute(map, fromLat, fromLng, toLat, toLng) {
  if (!_navMapState) return;
  // 清除旧路线
  if (_navMapState.routeLine) {
    _navMapState.routeLine.setMap(null);
    _navMapState.routeLine = null;
  }

  var policy = (AMap.DrivingPolicy && AMap.DrivingPolicy.LEAST_TIME) ? AMap.DrivingPolicy.LEAST_TIME : 0;
  var driving = new AMap.Driving({ policy: policy });
  driving.search([fromLng, fromLat], [toLng, toLat], function(status, result) {
    if (status === 'complete' && result.routes && result.routes.length > 0) {
      var route = result.routes[0];
      var path = route.path;
      if ((!path || path.length === 0) && route.steps) {
        path = [];
        route.steps.forEach(function(step) {
          if (step.path) path = path.concat(step.path);
        });
      }
      if (path && path.length > 0) {
        var polyline = new AMap.Polyline({
          path: path,
          strokeColor: '#3777FF',
          strokeWeight: 6,
          strokeStyle: 'solid',
          lineJoin: 'round'
        });
        polyline.setMap(map);
        _navMapState.routeLine = polyline;
      }
      // 更新距离和时间
      var distance = parseFloat(route.distance) || 0;
      var duration = parseFloat(route.time || route.duration) || 0;
      var distEl = document.getElementById('nav-distance');
      if (distEl) {
        var distText = distance >= 1000 ? (distance / 1000).toFixed(1) + ' km' : distance + ' m';
        var durText = duration >= 60 ? Math.round(duration / 60) + ' min' : duration + ' s';
        distEl.textContent = distText;
        distEl.nextElementSibling.textContent = durText;
      }
      map.setFitView(polyline, false, [60, 80, 60, 120]);
    }
  });
}

// 退出导航时清理
function cleanupNavMap() {
  if (_navMapState) {
    if (_navMapState._watchId) clearInterval(_navMapState._watchId);
    if (_navMapState.map) _navMapState.map.destroy();
    _navMapState = null;
  }
}

// ============================================================
//  司机端 - 内嵌导航地图页
// ============================================================
async function renderNavMapPage(orderId) {
  var order = await DB.getOrderById(orderId);
  if (!order) return '<div class="page"><div class="page-header"><button class="back-btn" data-action="go-back">←</button></div><div class="page-content"><p>订单不存在</p></div></div>';

  var destLat = order.toLat;
  var destLng = order.toLng;
  var destName = order.to || '目的地';

  if (!destLat || !destLng) {
    return '<div class="page">' +
      '<div class="page-header"><button class="back-btn" data-action="go-back">←</button><h2>导航</h2></div>' +
      '<div class="page-content"><div class="empty-state"><div class="empty-icon">📍</div><p>订单缺少目的地坐标</p></div></div>' +
      '</div>';
  }

  var destAddr = destName;
  var startLat = 0, startLng = 0;

  // 尝试从 localStorage 读取司机最新位置
  try {
    var cachedPos = localStorage.getItem('dj_driver_pos');
    if (cachedPos) {
      var pos = JSON.parse(cachedPos);
      startLat = parseFloat(pos.lat) || 0;
      startLng = parseFloat(pos.lng) || 0;
    }
  } catch(e) {}

  return '<div class="page nav-map-page" style="padding:0">' +
    // 顶部信息栏
    '<div style="position:absolute;top:0;left:0;right:0;z-index:200;background:linear-gradient(180deg,rgba(26,26,46,0.95) 0%,rgba(26,26,46,0.85) 100%);backdrop-filter:blur(10px);padding:12px 16px;display:flex;align-items:center;gap:10px;border-bottom:1px solid rgba(255,255,255,0.1);height:60px;box-sizing:border-box">' +
      '<button class="back-btn" data-action="go-back" style="background:rgba(255,255,255,0.1);border:none;color:#fff;width:36px;height:36px;border-radius:50%;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center">←</button>' +
      '<div style="flex:1">' +
        '<div style="font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:2px">🧭 内嵌导航 · 增强版</div>' +
        '<div style="font-size:14px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + destAddr + '</div>' +
      '</div>' +
      // 语音开关按钮
      '<button id="speech-toggle-btn" onclick="_toggleSpeech()" style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.2);color:#fff;width:36px;height:36px;border-radius:50%;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0" title="点击切换语音">🔊</button>' +
      // 距离信息
      '<div style="background:linear-gradient(135deg,#3777FF,#6259FF);border-radius:20px;padding:6px 14px;text-align:center;min-width:80px;box-shadow:0 2px 10px rgba(55,119,255,0.4)">' +
        '<div id="nav-distance" style="font-size:18px;font-weight:700;color:#fff">--</div>' +
        '<div id="nav-duration" style="font-size:11px;color:rgba(255,255,255,0.8)">--</div>' +
      '</div>' +
    '</div>' +
    // 地图区域
    '<div id="nav-amap-container" style="position:absolute;top:60px;left:0;right:0;bottom:100px;z-index:100"></div>' +
    // 导航提示卡片（中间悬浮）
    '<div style="position:absolute;top:70px;left:50%;transform:translateX(-50%);z-index:300;background:rgba(26,26,46,0.95);border-radius:16px;padding:12px 20px;min-width:200px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1)">' +
      '<div id="nav-instruction-icon" style="font-size:28px;margin-bottom:4px">⬆️</div>' +
      '<div id="nav-instruction"><div style="font-size:14px;color:rgba(255,255,255,0.8)">正在规划路线...</div></div>' +
    '</div>' +
    // 底部状态栏
    '<div style="position:absolute;bottom:0;left:0;right:0;z-index:200;background:linear-gradient(0deg,rgba(26,26,46,0.98) 0%,rgba(26,26,46,0.9) 100%);backdrop-filter:blur(10px);padding:12px 16px 24px;border-top:1px solid rgba(255,255,255,0.1);height:100px;box-sizing:border-box">' +
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">' +
        '<div id="nav-dot" style="width:10px;height:10px;border-radius:50%;background:#4CAF50;box-shadow:0 0 8px #4CAF50;animation:pulse 2s infinite;flex-shrink:0"></div>' +
        '<div style="font-size:14px;color:#fff;font-weight:500">📍 GPS定位中</div>' +
        '<div style="flex:1"></div>' +
        '<div id="nav-coords" style="font-size:11px;color:rgba(255,255,255,0.5)">--</div>' +
      '</div>' +
      // 外部导航按钮
      '<div style="display:flex;gap:10px">' +
        '<a href="amap://navi?sourceApplication=代驾出行&lat=' + destLat + '&lng=' + destLng + '&name=' + encodeURIComponent(destName) + '&dev=1" style="flex:1;background:linear-gradient(135deg,#52c41a,#73d13d);color:#fff;padding:10px;border-radius:10px;text-align:center;font-size:13px;font-weight:600;text-decoration:none;box-shadow:0 2px 10px rgba(82,196,26,0.3)">📱 高德导航</a>' +
        '<a href="http://maps.apple.com/?daddr=' + destLat + ',' + destLng + '&dirflg=d" style="flex:1;background:linear-gradient(135deg,#1890ff,#40a9ff);color:#fff;padding:10px;border-radius:10px;text-align:center;font-size:13px;font-weight:600;text-decoration:none;box-shadow:0 2px 10px rgba(24,144,255,0.3)">🍎 Apple Maps</a>' +
      '</div>' +
    '</div>' +
    '<style>' +
      '@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }' +
      '@keyframes bounceIn { 0%{transform:translateX(-50%) scale(0.5);opacity:0} 100%{transform:translateX(-50%) scale(1);opacity:1} }' +
      '#nav-instruction { animation: bounceIn 0.3s ease-out }' +
      '.nav-map-page .page-header{display:none}' +
    '</style>' +
  '</div>';
}

// ============================================================
//  用户端 - 我的订单
// ============================================================
async function renderUserOrders() {
  const u = State.currentUser;
  const orders = await DB.getOrders();
  const allOrders = orders.filter(function(o) { return o.userId === u.id; }).reverse();
  const drivers = await DB.getDrivers();
  const filter = State.pageParams.filter || 'all';
  const filtered = filter === 'all' ? allOrders : allOrders.filter(function(o) { return o.status === filter; });
  const tabs = [
    { key: 'all', label: '全部' },
    { key: 'pending', label: '待接单' },
    { key: 'accepted', label: '进行中' },
    { key: 'completed', label: '已完成' },
    { key: 'cancelled', label: '已取消' },
  ];

  let ordersHtml = '';
  if (filtered.length === 0) {
    ordersHtml = '<div class="empty-state"><div class="empty-icon">📋</div><p>' + (filter === 'all' ? '还没有订单' : '没有' + (tabs.find(function(t) { return t.key === filter; }) || {}).label + '的订单') + '</p></div>';
  } else {
    filtered.forEach(function(o) {
      const driver = o.driverId ? drivers.find(function(d) { return d.id === o.driverId; }) : null;
      ordersHtml += '<div class="order-card" data-action="order-detail" data-order-id="' + o.id + '">' +
        '<div class="order-header"><span class="order-id">订单 #' + o.id.slice(-6).toUpperCase() + '</span>' + statusBadge(o.status) + '</div>' +
        (driver && ['accepted','ongoing','completed'].includes(o.status) ? '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding:8px 10px;background:var(--bg);border-radius:8px"><span style="font-size:18px">🧑‍✈️</span><div style="flex:1"><div style="font-size:13px;font-weight:600">' + driver.name + '</div><div style="font-size:12px;color:var(--text-muted)">⭐ ' + (driver.rating || '4.9') + ' 分</div></div></div>' : '') +
        '<div class="order-route">' +
          '<div class="route-item"><span class="route-dot start"></span><span>' + o.from + '</span></div>' +
          '<div class="route-item" style="padding-left:2px"><span class="route-connector"></span></div>' +
          '<div class="route-item"><span class="route-dot end"></span><span>' + o.to + '</span></div>' +
        '</div>' +
        '<div class="order-footer"><span class="order-price">' + formatPrice(o.price) + '</span><span class="order-time">' + o.createdAt + '</span></div>' +
      '</div>';
    });
  }

  return '<div class="page">' +
    '<div class="page-header"><button class="back-btn" data-action="go-back">←</button><h2>我的订单</h2></div>' +
    '<div class="page-content">' +
      '<div class="filter-tabs">' +
        tabs.map(function(t) { return '<div class="filter-tab ' + (filter === t.key ? 'active' : '') + '" data-action="user-orders" data-filter="' + t.key + '">' + t.label + '</div>'; }).join('') +
      '</div>' +
      ordersHtml +
    '</div></div>';
}

// ============================================================
//  司机端 - 主页
// ============================================================
async function renderDriverMain() {
  const d = State.currentUser;
  const orders = await DB.getOrders();
  const myOrders = orders.filter(function(o) { return o.driverId === d.id; });
  const completedOrders = myOrders.filter(function(o) { return o.status === 'completed'; });
  const totalIncome = completedOrders.reduce(function(s, o) { return s + Number(o.price); }, 0);
  const pendingOrders = orders.filter(function(o) { return o.status === 'pending'; });
  const unreadCount = getUnreadCount(d.id);

  let pendingHtml = '';
  if (State.driverOnline) {
    if (pendingOrders.length > 0) {
      pendingHtml = '<div style="background:linear-gradient(135deg,#f093fb,#f5576c);border-radius:16px;padding:16px;color:#fff;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;cursor:pointer" data-action="order-hall">' +
        '<div><div style="font-size:16px;font-weight:700">📢 有新订单！</div><div style="font-size:13px;opacity:0.9;margin-top:4px">当前 ' + pendingOrders.length + ' 个订单等待接单</div></div>' +
        '<div style="font-size:28px">→</div></div>';
    } else {
      pendingHtml = '<div class="empty-state" style="padding:40px 0"><div class="empty-icon">🔍</div><p>暂无新订单，等待中…</p></div>';
    }
  } else {
    pendingHtml = '<div class="empty-state" style="padding:40px 0"><div class="empty-icon">😴</div><p>上线后即可查看并接单</p></div>';
  }

  let activeOrdersHtml = '';
  if (myOrders.filter(function(o) { return o.status === 'accepted' || o.status === 'ongoing'; }).length > 0) {
    activeOrdersHtml = '<div class="section-title">🚗 进行中的订单</div>';
    myOrders.filter(function(o) { return ['accepted','ongoing'].includes(o.status); }).forEach(function(o) {
      activeOrdersHtml += '<div class="order-card" data-action="order-detail" data-order-id="' + o.id + '" style="margin:0 20px 12px">' +
        '<div class="order-header"><span class="order-id">订单 #' + o.id.slice(-6).toUpperCase() + '</span>' + statusBadge(o.status) + '</div>' +
        '<div class="order-route">' +
          '<div class="route-item"><span class="route-dot start"></span><span>' + o.from + '</span></div>' +
          '<div class="route-item" style="padding-left:2px"><span class="route-connector"></span></div>' +
          '<div class="route-item"><span class="route-dot end"></span><span>' + o.to + '</span></div>' +
        '</div>' +
        '<div class="order-footer"><span class="order-price">' + formatPrice(o.price) + '</span><span class="order-time">' + o.createdAt + '</span></div>' +
      '</div>';
    });
  }

  return '<div class="driver-home has-nav">' +
    renderDispatchNotification() +
    '<div class="top-bar">' +
      '<div style="display:flex;justify-content:space-between;align-items:center">' +
        '<div><div class="greeting" style="font-size:14px;opacity:0.8">代驾司机</div><div class="username" style="font-size:22px;font-weight:700;color:#fff">' + d.name + '</div></div>' +
        '<div style="display:flex;align-items:center;gap:12px">' +
          '<div class="topbar-icon-wrap topbar-icon-light" data-action="notifications">🔔' + (unreadCount > 0 ? '<span class="unread-badge">' + (unreadCount > 99 ? '99+' : unreadCount) + '</span>' : '') + '</div>' +
          '<div style="color:#fff;opacity:0.8;font-size:13px">📞 ' + d.phone + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="status-toggle" data-action="toggle-online" style="cursor:pointer">' +
        '<div class="toggle-switch ' + (State.driverOnline ? 'on' : '') + '" id="toggle-sw"></div>' +
        '<div class="toggle-label"><div style="color:#fff;font-size:14px;font-weight:600">' + (State.driverOnline ? '🟢 接单中' : '⚫ 休息中') + '</div><div style="color:rgba(255,255,255,0.6);font-size:12px">' + (State.driverOnline ? '您已上线，可以接单' : '点击开始接单') + '</div></div>' +
        '<div class="toggle-status ' + (State.driverOnline ? 'on' : 'off') + '">' + (State.driverOnline ? 'ON' : 'OFF') + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="stats-bar">' +
      '<div class="stat-item"><div class="stat-value">' + completedOrders.length + '</div><div class="stat-label">总行程</div></div>' +
      '<div class="stat-item"><div class="stat-value">' + formatPrice(totalIncome) + '</div><div class="stat-label">累计收入</div></div>' +
      '<div class="stat-item"><div class="stat-value">' + (d.rating || '4.9') + '</div><div class="stat-label">评分</div></div>' +
    '</div>' +
    '<div style="padding:20px 20px 0">' + pendingHtml + '</div>' +
    activeOrdersHtml +
  '</div>' +
  '<nav class="bottom-nav">' +
    '<div class="nav-item active"><span class="nav-icon">🏠</span>首页</div>' +
    '<div class="nav-item" data-action="order-hall"><span class="nav-icon">📢</span>接单大厅</div>' +
    '<div class="nav-item" data-action="driver-orders"><span class="nav-icon">📋</span>我的订单</div>' +
    '<div class="nav-item" data-action="profile"><span class="nav-icon">👤</span>我的</div>' +
  '</nav>';
}

// ============================================================
//  司机端 - 订单大厅
// ============================================================
async function renderOrderHall() {
  if (!State.driverOnline) {
    return '<div class="page"><div class="page-header"><button class="back-btn" data-action="go-back">←</button><h2>接单大厅</h2></div>' +
      '<div class="page-content"><div class="empty-state"><div class="empty-icon">⚫</div><p>请先上线才能查看订单</p><button class="btn btn-secondary" data-action="toggle-online" style="margin-top:16px;background:#2C3E50">立即上线</button></div></div></div>';
  }

  const orders = await DB.getOrders();
  const allOrders = orders.filter(function(o) { return o.status === 'pending'; });
  const users = await DB.getUsers();

  let ordersHtml = '';
  if (allOrders.length === 0) {
    ordersHtml = '<div class="empty-state"><div class="empty-icon">🔍</div><p>暂无待接订单，稍后再来看看</p></div>';
  } else {
    allOrders.forEach(function(o) {
      const user = o.userId ? users.find(function(u) { return u.id === o.userId; }) : null;
      const pName = user ? user.name : '乘客';
      const pPhone = user ? user.phone : '';
      // 迷你地图：仅当订单有经纬度时显示
      const hasCoords = o.from_lat && o.from_lng && o.to_lat && o.to_lng;
      const miniMapHtml = hasCoords
        ? '<div class="hall-mini-map" id="hall-map-' + o.id + '" data-from-lat="' + o.from_lat + '" data-from-lng="' + o.from_lng + '" data-to-lat="' + o.to_lat + '" data-to-lng="' + o.to_lng + '"></div>'
        : '';
      // 距离信息
      var distText = '';
      if (o.distance && o.distance > 0) {
        distText = o.distance >= 1000 ? (o.distance / 1000).toFixed(1) + ' km' : o.distance + ' m';
      }
      const distHtml = distText ? '<div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">📏 ' + distText + '</div>' : '';
      ordersHtml += '<div class="hall-order-card">' +
        '<div class="hall-header"><div><div class="order-user">👤 ' + pName + '</div>' +
          (pPhone ? '<div class="order-meta">📞 ' + pPhone + '</div>' : '') +
          '<div class="order-meta">' + o.createdAt + '</div></div>' +
          '<span class="order-price" style="font-size:20px">' + formatPrice(o.price) + '</span></div>' +
        miniMapHtml +
        distHtml +
        '<div class="order-route" style="margin-bottom:12px">' +
          '<div class="route-item"><span class="route-dot start"></span><span>' + o.from + '</span></div>' +
          '<div class="route-item" style="padding-left:2px"><span class="route-connector"></span></div>' +
          '<div class="route-item"><span class="route-dot end"></span><span>' + o.to + '</span></div>' +
        '</div>' +
        '<button class="btn btn-secondary btn-block" data-action="accept-order" data-order-id="' + o.id + '" style="background:#2C3E50">🚗 接单</button>' +
      '</div>';
    });
  }

  return '<div class="page"><div class="page-header"><button class="back-btn" data-action="go-back">←</button><h2>接单大厅</h2><span class="badge badge-warning">' + allOrders.length + ' 个待接</span></div>' +
    renderDispatchNotification() +
    '<div class="page-content">' + ordersHtml +
      '<div style="margin-top:24px;padding-top:16px;border-top:1px solid var(--border)">' +
        '<div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:16px;padding:16px;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:space-between" data-action="driver-create-order">' +
          '<div><div style="font-size:16px;font-weight:700">🤝 主动创单</div><div style="font-size:13px;opacity:0.9;margin-top:4px">为客户创建代驾订单</div></div>' +
          '<div style="font-size:28px">+</div>' +
        '</div>' +
      '</div>' +
    '</div></div>';
}

// ============================================================
//  司机端 - 主动创单
// ============================================================
function renderDriverCreateOrder() {
  return '<div class="page">' +
    '<div class="page-header"><button class="back-btn" data-action="order-hall">←</button><h2>主动创单</h2></div>' +
    '<div class="page-content">' +
      '<div class="map-container" id="drv-map-container">' +
        '<div id="drv-order-map" class="map-canvas"></div>' +
        '<div class="map-search-bar"><div class="map-search-input-wrap"><span class="map-search-icon">🔍</span><input class="map-search-input" id="drv-map-search-input" placeholder="搜索地点..." /></div></div>' +
        '<div class="map-search-results" id="drv-map-search-results" style="display:none"></div>' +
        '<div class="map-toolbar">' +
          '<button class="map-tool-btn" id="drv-map-zoom-in-btn" title="放大">➕</button>' +
          '<button class="map-tool-btn" id="drv-map-zoom-out-btn" title="缩小">➖</button>' +
          '<button class="map-tool-btn" id="drv-map-type-btn" title="切换地图类型">🗺️</button>' +
          '<button class="map-tool-btn" id="drv-map-locate-btn" title="定位">📍</button>' +
        '</div>' +
        '<div class="map-tool-info" id="drv-map-tool-info">点击地图选择位置</div>' +
        '<div id="drv-route-info" class="route-info-panel" style="display:none"></div>' +
      '</div>' +
      '<div class="card">' +
        '<div class="form-group"><label>👤 客户姓名</label><input class="form-control" id="drv-co-name" placeholder="请输入客户姓名" /></div>' +
        '<div class="form-group"><label>📞 客户电话</label><input class="form-control" id="drv-co-phone" placeholder="请输入客户手机号" /></div>' +
        '<div class="form-group"><label>🟢 出发地 <span style="color:var(--text-muted);font-size:12px;font-weight:400">（地图选点或搜索）</span></label><input class="form-control" id="drv-co-from" placeholder="请输入出发地址" /><input type="hidden" id="drv-co-from-lat" /><input type="hidden" id="drv-co-from-lng" /></div>' +
        '<div style="text-align:center;color:var(--text-muted);font-size:18px;padding:2px 0">⇅</div>' +
        '<div class="form-group"><label>🔴 目的地 <span style="color:var(--text-muted);font-size:12px;font-weight:400">（地图选点或搜索）</span></label><input class="form-control" id="drv-co-to" placeholder="请输入目的地址" /><input type="hidden" id="drv-co-to-lat" /><input type="hidden" id="drv-co-to-lng" /></div>' +
        '<div class="form-group"><label>💰 费用（元）</label><input class="form-control" id="drv-co-price" type="number" placeholder="请输入代驾费用" /></div>' +
        '<div class="form-group"><label>📝 备注（可选）</label><input class="form-control" id="drv-co-note" placeholder="例：车停在地下车库B1" /></div>' +
      '</div>' +
      '<div class="card" style="margin-top:12px;background:#FFF9EB;border:1px solid #FFD93D"><div style="font-size:13px;color:#8B6914;display:flex;align-items:flex-start;gap:8px"><span style="font-size:16px">💡</span><div><strong>提示：</strong>创建的订单将自动指派给您，状态直接变为"已接单"。</div></div></div>' +
      '<button class="btn btn-success btn-block" id="drv-create-order-btn" style="margin-top:16px">🤝 确认创单</button>' +
    '</div></div>';
}

// ============================================================
//  司机端 - 我的订单
// ============================================================
async function renderDriverOrders() {
  const d = State.currentUser;
  const orders = await DB.getOrders();
  const users = await DB.getUsers();
  const allOrders = orders.filter(function(o) { return o.driverId === d.id; }).reverse();
  const filter = State.pageParams.filter || 'all';
  const filtered = filter === 'all' ? allOrders : allOrders.filter(function(o) { return o.status === filter; });
  const tabs = [
    { key: 'all', label: '全部' },
    { key: 'accepted', label: '已接单' },
    { key: 'ongoing', label: '代驾中' },
    { key: 'completed', label: '已完成' },
    { key: 'cancelled', label: '已取消' },
  ];

  let ordersHtml = '';
  if (filtered.length === 0) {
    ordersHtml = '<div class="empty-state"><div class="empty-icon">📋</div><p>' + (filter === 'all' ? '还没有接过订单' : '没有' + (tabs.find(function(t) { return t.key === filter; }) || {}).label + '的订单') + '</p></div>';
  } else {
    filtered.forEach(function(o) {
      const pName = o.userId ? (users.find(function(u) { return u.id === o.userId; }) || {}).name : '';
      const pPhone = o.userId ? (users.find(function(u) { return u.id === o.userId; }) || {}).phone : '';
      ordersHtml += '<div class="order-card" data-action="order-detail" data-order-id="' + o.id + '">' +
        '<div class="order-header"><span class="order-id">订单 #' + o.id.slice(-6).toUpperCase() + '</span>' + statusBadge(o.status) + '</div>' +
        (pName && ['accepted','ongoing','completed'].includes(o.status) ? '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding:8px 10px;background:var(--bg);border-radius:8px"><span style="font-size:18px">👤</span><div style="flex:1"><div style="font-size:13px;font-weight:600">' + pName + '</div>' + (pPhone ? '<div style="font-size:12px;color:var(--text-muted)">📞 ' + pPhone + '</div>' : '') + '</div></div>' : '') +
        '<div class="order-route">' +
          '<div class="route-item"><span class="route-dot start"></span><span>' + o.from + '</span></div>' +
          '<div class="route-item" style="padding-left:2px"><span class="route-connector"></span></div>' +
          '<div class="route-item"><span class="route-dot end"></span><span>' + o.to + '</span></div>' +
        '</div>' +
        '<div class="order-footer"><span class="order-price">' + formatPrice(o.price) + '</span><span class="order-time">' + o.createdAt + '</span></div>' +
      '</div>';
    });
  }

  return '<div class="page"><div class="page-header"><button class="back-btn" data-action="go-back">←</button><h2>我的订单</h2></div>' +
    '<div class="page-content">' +
      '<div class="filter-tabs">' +
        tabs.map(function(t) { return '<div class="filter-tab ' + (filter === t.key ? 'active' : '') + '" data-action="driver-orders" data-filter="' + t.key + '">' + t.label + '</div>'; }).join('') +
      '</div>' +
      ordersHtml +
    '</div></div>';
}

// ============================================================
//  个人中心
// ============================================================
async function renderProfile() {
  const u = State.currentUser;
  const isDriver = u.type === 'driver';
  const unreadCount = getUnreadCount(u.id);

  return '<div class="page">' +
    '<div class="page-header"><button class="back-btn" data-action="' + (isDriver ? 'driver-main' : 'user-main') + '">←</button><h2>个人中心</h2><div class="topbar-icon-wrap" data-action="notifications" style="position:relative;top:0">🔔' + (unreadCount > 0 ? '<span class="unread-badge">' + (unreadCount > 99 ? '99+' : unreadCount) + '</span>' : '') + '</div></div>' +
    '<div class="page-content">' +
      '<div style="text-align:center;padding:24px 0">' +
        '<div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,var(--primary),#FF8C42);display:flex;align-items:center;justify-content:center;font-size:36px;margin:0 auto 12px">' + (isDriver ? '🧑‍✈️' : '👤') + '</div>' +
        '<div style="font-size:20px;font-weight:700">' + u.name + '</div>' +
        '<div style="font-size:14px;color:var(--text-muted);margin-top:4px">' + (isDriver ? '代驾司机' : '乘客') + '</div>' +
      '</div>' +
      '<div class="card"><div class="card-header">账号信息</div>' +
        '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted)">手机号</span><span>' + u.phone + '</span></div>' +
        '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted)">注册时间</span><span style="font-size:12px">' + (u.createdAt || '未知') + '</span></div>' +
        (isDriver ? '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted)">驾驶证号</span><span>' + (u.license || '未填写') + '</span></div><div style="display:flex;justify-content:space-between;padding:8px 0"><span style="color:var(--text-muted)">评分</span><span>⭐ ' + (u.rating || '4.9') + '</span></div>' :
        '<div style="display:flex;justify-content:space-between;padding:8px 0"><span style="color:var(--text-muted)">账号ID</span><span style="font-size:12px;color:var(--text-muted)">' + u.id.slice(-8).toUpperCase() + '</span></div>') +
      '</div>' +
      '<div class="card"><div class="card-header">更多</div>' +
        '<div style="display:flex;flex-direction:column;gap:4px">' +
          (isDriver ? '' : '<div data-action="manage-addresses" style="padding:12px 0;border-bottom:1px solid var(--border);cursor:pointer;display:flex;justify-content:space-between;align-items:center"><span>📍 常用地址管理</span><span style="color:var(--text-muted)">›</span></div>') +
          '<div data-action="notifications" style="padding:12px 0;border-bottom:1px solid var(--border);cursor:pointer;display:flex;justify-content:space-between;align-items:center"><span>📢 消息通知</span><span style="display:flex;align-items:center;gap:6px">' + (unreadCount > 0 ? '<span class="unread-badge" style="font-size:11px">' + unreadCount + '</span>' : '') + '<span style="color:var(--text-muted)">›</span></span></div>' +
          '<div data-action="stats" style="padding:12px 0;border-bottom:1px solid var(--border);cursor:pointer;display:flex;justify-content:space-between;align-items:center"><span>📊 统计报表</span><span style="color:var(--text-muted)">›</span></div>' +
          '<div data-action="feedback" style="padding:12px 0;border-bottom:1px solid var(--border);cursor:pointer;display:flex;justify-content:space-between;align-items:center"><span>💡 意见反馈</span><span style="color:var(--text-muted)">›</span></div>' +
          '<div data-action="about" style="padding:12px 0;border-bottom:1px solid var(--border);cursor:pointer;display:flex;justify-content:space-between;align-items:center"><span>ℹ️ 关于</span><span style="color:var(--text-muted)">›</span></div>' +
          '<div data-action="clear-data" style="padding:12px 0;cursor:pointer;display:flex;justify-content:space-between;align-items:center"><span style="color:var(--danger)">🗑️ 清空本地数据</span><span style="color:var(--text-muted)">›</span></div>' +
        '</div>' +
      '</div>' +
      '<button class="btn btn-danger btn-block" data-action="logout" style="margin-top:8px">退出登录</button>' +
    '</div></div>';
}

// ============================================================
//  统计报表
// ============================================================
async function renderStats() {
  const u = State.currentUser;
  const isDriver = u.type === 'driver';
  const orders = await DB.getOrders();
  const myOrders = isDriver
    ? orders.filter(function(o) { return o.driverId === u.id; })
    : orders.filter(function(o) { return o.userId === u.id; });

  const completed = myOrders.filter(function(o) { return o.status === 'completed'; });
  const cancelled = myOrders.filter(function(o) { return o.status === 'cancelled'; });
  const ongoing = myOrders.filter(function(o) { return ['accepted', 'ongoing'].includes(o.status); });
  const pending = myOrders.filter(function(o) { return o.status === 'pending'; });
  const totalMoney = completed.reduce(function(s, o) { return s + Number(o.price); }, 0);

  return '<div class="page"><div class="page-header"><button class="back-btn" data-action="' + (isDriver ? 'driver-main' : 'user-main') + '">←</button><h2>统计报表</h2></div>' +
    '<div class="page-content">' +
      '<div class="card"><div class="card-header">' + (isDriver ? '📊 接单统计' : '📊 出行统计') + '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">' +
          '<div style="text-align:center;padding:16px;background:var(--bg);border-radius:12px"><div style="font-size:28px;font-weight:700;color:var(--primary)">' + myOrders.length + '</div><div style="font-size:13px;color:var(--text-muted);margin-top:4px">总订单数</div></div>' +
          '<div style="text-align:center;padding:16px;background:var(--bg);border-radius:12px"><div style="font-size:28px;font-weight:700;color:var(--success)">' + completed.length + '</div><div style="font-size:13px;color:var(--text-muted);margin-top:4px">已完成</div></div>' +
          '<div style="text-align:center;padding:16px;background:var(--bg);border-radius:12px"><div style="font-size:28px;font-weight:700;color:var(--warning)">' + (pending.length + ongoing.length) + '</div><div style="font-size:13px;color:var(--text-muted);margin-top:4px">进行中</div></div>' +
          '<div style="text-align:center;padding:16px;background:var(--bg);border-radius:12px"><div style="font-size:28px;font-weight:700;color:var(--danger)">' + cancelled.length + '</div><div style="font-size:13px;color:var(--text-muted);margin-top:4px">已取消</div></div>' +
        '</div>' +
      '</div>' +
      '<div class="card"><div class="card-header">' + (isDriver ? '💰 收入统计' : '💰 消费统计') + '</div>' +
        '<div style="text-align:center;padding:20px 0"><div style="font-size:36px;font-weight:700;color:var(--primary)">' + formatPrice(totalMoney) + '</div><div style="font-size:13px;color:var(--text-muted);margin-top:8px">' + (isDriver ? '累计收入' : '累计消费') + '</div></div>' +
        (completed.length > 0 ? '<div style="border-top:1px solid var(--border);padding-top:12px"><div style="display:flex;justify-content:space-between;font-size:13px;color:var(--text-muted)"><span>平均每单</span><span style="color:var(--text)">' + formatPrice(totalMoney / completed.length) + '</span></div></div>' : '') +
      '</div>' +
    '</div></div>';
}

// ============================================================
//  通知中心
// ============================================================
function renderNotifications() {
  var u = State.currentUser;
  var isDriver = u.type === 'driver';
  var allNotifs = _getNotifications();
  var myNotifs = allNotifs.filter(function(n) { return n.userId === String(u.id); });
  var unreadNotifs = myNotifs.filter(function(n) { return !n.read; });
  if (unreadNotifs.length > 0) { markAllRead(u.id); }
  var notifs = myNotifs.slice(0, 30);
  var typeIcons = { order: '📦', system: '📢', promo: '🎉', payment: '💰', rating: '⭐' };

  let html = '';
  if (notifs.length === 0) {
    html = '<div class="empty-state"><div class="empty-icon">🔔</div><p>暂无消息</p></div>';
  } else {
    notifs.forEach(function(n) {
      var icon = typeIcons[n.type] || '📢';
      html += '<div class="notification-card" style="opacity:' + (n.read ? '0.6' : '1') + '">' +
        '<div class="notification-icon">' + icon + '</div>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-size:14px;font-weight:600;margin-bottom:3px">' + n.title + '</div>' +
          '<div style="font-size:13px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + n.content + '</div>' +
          '<div style="font-size:11px;color:var(--text-muted);margin-top:4px;opacity:0.7">' + n.time + '</div>' +
        '</div></div>';
    });
  }

  return '<div class="page"><div class="page-header"><button class="back-btn" data-action="' + (isDriver ? 'driver-main' : 'user-main') + '">←</button><h2>消息通知</h2></div>' +
    '<div class="page-content">' + html + '</div></div>';
}

// ============================================================
//  意见反馈
// ============================================================
function renderFeedback() {
  var u = State.currentUser;
  return '<div class="page"><div class="page-header"><button class="back-btn" data-action="profile">←</button><h2>意见反馈</h2></div>' +
    '<div class="page-content"><div class="card"><div class="card-header">📝 您的反馈对我们很重要</div>' +
      '<div style="margin-bottom:16px"><label style="font-size:13px;font-weight:600;display:block;margin-bottom:8px">反馈类型</label>' +
        '<div class="feedback-types" id="feedback-types">' +
          '<div class="feedback-type active" data-type="suggestion">💡 建议</div>' +
          '<div class="feedback-type" data-type="bug">🐛 问题</div>' +
          '<div class="feedback-type" data-type="complaint">😤 投诉</div>' +
          '<div class="feedback-type" data-type="praise">👍 表扬</div>' +
        '</div>' +
      '</div>' +
      '<div style="margin-bottom:16px"><label style="font-size:13px;font-weight:600;display:block;margin-bottom:8px">详细描述</label><textarea id="feedback-content" class="form-control" style="min-height:120px;resize:vertical;font-family:inherit" placeholder="请详细描述您的反馈内容，我们会认真对待每一条反馈…"></textarea></div>' +
      '<div style="margin-bottom:16px"><label style="font-size:13px;font-weight:600;display:block;margin-bottom:8px">联系方式（选填）</label><input class="form-control" id="feedback-contact" placeholder="手机号或邮箱" value="' + (u.phone || '') + '" /></div>' +
      '<button class="btn btn-primary btn-block" id="submit-feedback-btn">提交反馈</button>' +
    '</div>' +
    '<div style="margin-top:16px;padding:16px;background:var(--bg);border-radius:12px;font-size:13px;color:var(--text-muted);display:flex;align-items:flex-start;gap:10px"><span style="font-size:18px">📞</span><div>如需紧急帮助，请拨打客服热线：<strong style="color:var(--primary)">400-888-6666</strong>（工作日 9:00-18:00）</div></div>' +
    '</div></div>';
}

// ============================================================
//  关于页面
// ============================================================
function renderAbout() {
  return '<div class="page"><div class="page-header"><button class="back-btn" data-action="profile">←</button><h2>关于</h2></div>' +
    '<div class="page-content">' +
      '<div style="text-align:center;padding:32px 0 24px"><div style="font-size:56px;margin-bottom:12px">🚗</div><div style="font-size:22px;font-weight:700">代驾出行</div><div style="font-size:13px;color:var(--text-muted);margin-top:6px">安全 · 快捷 · 专业</div><div style="font-size:12px;color:var(--text-muted);margin-top:12px;padding:4px 12px;background:var(--bg);border-radius:12px;display:inline-block">' + (window.APP_VERSION || 'v2.0.0') + ' · 云端同步</div></div>' +
      '<div class="card"><div class="card-header">🔄 检查更新</div>' +
        '<div style="padding:8px 0"><button class="btn btn-outline btn-block" id="check-update-btn" data-action="check-update">🆙 检查更新</button></div>' +
        '<div id="update-status" style="text-align:center;font-size:13px;color:var(--text-muted);padding:8px 0"></div>' +
      '</div>' +
      '<div class="card"><div class="card-header">🛡️ 服务保障</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
        '<div style="text-align:center;padding:12px;background:var(--bg);border-radius:10px"><div style="font-size:24px;margin-bottom:4px">🛡️</div><div style="font-size:13px;font-weight:600">安全保障</div><div style="font-size:11px;color:var(--text-muted);margin-top:2px">全程保险护航</div></div>' +
        '<div style="text-align:center;padding:12px;background:var(--bg);border-radius:10px"><div style="font-size:24px;margin-bottom:4px">🧑‍✈️</div><div style="font-size:13px;font-weight:600">专业司机</div><div style="font-size:11px;color:var(--text-muted);margin-top:2px">严格筛选培训</div></div>' +
        '<div style="text-align:center;padding:12px;background:var(--bg);border-radius:10px"><div style="font-size:24px;margin-bottom:4px">💰</div><div style="font-size:13px;font-weight:600">透明计价</div><div style="font-size:11px;color:var(--text-muted);margin-top:2px">无隐形消费</div></div>' +
        '<div style="text-align:center;padding:12px;background:var(--bg);border-radius:10px"><div style="font-size:24px;margin-bottom:4px">📞</div><div style="font-size:13px;font-weight:600">24h客服</div><div style="font-size:11px;color:var(--text-muted);margin-top:2px">随时在线支持</div></div>' +
      '</div></div>' +
      '<div style="text-align:center;padding:20px 0;font-size:12px;color:var(--text-muted)">© 2026 代驾出行<br>数据实时云端同步</div>' +
    '</div></div>';
}

// ============================================================
//  常用地址管理
// ============================================================
function renderManageAddresses() {
  var savedAddresses = [];
  try {
    savedAddresses = JSON.parse(localStorage.getItem('dj_saved_addresses') || '[]');
  } catch(e) {}

  var listHtml = '';
  if (savedAddresses.length === 0) {
    listHtml = '<div class="empty-state" style="padding:40px 0"><div class="empty-icon">📍</div><p>还没有保存的地址</p><p style="font-size:13px;color:var(--text-muted);margin-top:8px">添加家或公司地址，下单更快捷</p></div>';
  } else {
    listHtml = '<div style="display:flex;flex-direction:column;gap:12px">';
    savedAddresses.forEach(function(addr, idx) {
      var icon = addr.tag === 'home' ? '🏠' : addr.tag === 'work' ? '🏢' : '📍';
      var label = addr.tag === 'home' ? '家' : addr.tag === 'work' ? '公司' : addr.name || '地址' + (idx + 1);
      listHtml += '<div class="card" style="position:relative">' +
        '<div style="display:flex;align-items:flex-start;gap:12px">' +
          '<div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">' + icon + '</div>' +
          '<div style="flex:1;min-width:0">' +
            '<div style="font-weight:600;margin-bottom:4px">' + label + '</div>' +
            '<div style="font-size:13px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + addr.address + '</div>' +
          '</div>' +
          '<button class="btn btn-sm btn-danger" data-action="delete-address" data-addr-idx="' + idx + '" style="flex-shrink:0">删除</button>' +
        '</div>' +
      '</div>';
    });
    listHtml += '</div>';
  }

  return '<div class="page">' +
    '<div class="page-header"><button class="back-btn" data-action="profile">←</button><h2>常用地址</h2></div>' +
    '<div class="page-content">' +
      '<div class="card" style="margin-bottom:16px"><div class="card-header">➕ 添加新地址</div>' +
        '<div class="form-group"><label>地址类型</label>' +
          '<div style="display:flex;gap:12px;margin-bottom:12px">' +
            '<label style="flex:1;padding:12px;border:2px solid var(--border);border-radius:10px;text-align:center;cursor:pointer;transition:all 0.2s" class="addr-type-option" data-type="home"><div style="font-size:24px;margin-bottom:4px">🏠</div><div style="font-size:13px">家</div></label>' +
            '<label style="flex:1;padding:12px;border:2px solid var(--border);border-radius:10px;text-align:center;cursor:pointer;transition:all 0.2s" class="addr-type-option" data-type="work"><div style="font-size:24px;margin-bottom:4px">🏢</div><div style="font-size:13px">公司</div></label>' +
            '<label style="flex:1;padding:12px;border:2px solid var(--border);border-radius:10px;text-align:center;cursor:pointer;transition:all 0.2s" class="addr-type-option" data-type="other"><div style="font-size:24px;margin-bottom:4px">📍</div><div style="font-size:13px">其他</div></label>' +
          '</div>' +
          '<input type="hidden" id="new-addr-type" value="home" />' +
        '</div>' +
        '<div class="form-group" id="addr-name-group" style="display:none"><label>地址名称</label><input class="form-control" id="new-addr-name" placeholder="如：父母家、健身房" /></div>' +
        '<div class="form-group"><label>详细地址</label><input class="form-control" id="new-addr-address" placeholder="请输入详细地址" /></div>' +
        '<div class="form-group"><label>经纬度（可选，用于地图定位）</label><div style="display:flex;gap:8px">' +
          '<input class="form-control" id="new-addr-lat" placeholder="纬度" style="flex:1" />' +
          '<input class="form-control" id="new-addr-lng" placeholder="经度" style="flex:1" />' +
        '</div></div>' +
        '<button class="btn btn-primary btn-block" id="add-address-btn">添加地址</button>' +
      '</div>' +
      '<div class="card"><div class="card-header">📍 已保存地址</div>' + listHtml + '</div>' +
    '</div></div>';
}

// ============================================================
//  事件绑定
// ============================================================
function bindEvents() {
  // 通用 data-action 路由
  document.querySelectorAll('[data-action]').forEach(function(el) {
    el.addEventListener('click', function(e) {
      e.stopPropagation();
      var action = el.dataset.action;
      var dataset = el.dataset;
      console.log('[DEBUG] data-action clicked:', action, dataset);
      handleAction(action, dataset);
    });
  });

  // Tab 切换（支持 login / register）
  document.querySelectorAll('[data-tab]').forEach(function(el) {
    el.addEventListener('click', function(e) {
      e.stopPropagation();
      var tab = el.dataset.tab;
      if (State.currentPage === 'user-auth') { navigate('user-auth', { tab: tab }); }
      else if (State.currentPage === 'driver-auth') { navigate('driver-auth', { tab: tab }); }
      else if (State.currentPage === 'staff-auth') { navigate('staff-auth', { tab: tab }); }
    });
  });

  // 联系按钮阻止冒泡
  document.querySelectorAll('.contact-btn, .contact-list-btn').forEach(function(el) {
    el.addEventListener('click', function(e) { e.stopPropagation(); });
  });

  // ===== 用户登录（异步） =====
  var loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      var phone = document.getElementById('login-phone').value.trim();
      var pwd = document.getElementById('login-pwd').value;
      var user = await DB.findUser(phone, pwd, 'passenger');
      if (!user) { showToast('手机号或密码错误', 'error'); return; }
      State.currentUser = { id: user.id, name: user.name, phone: user.phone, type: 'user', createdAt: user.createdAt };
      showToast('登录成功，欢迎回来 ' + user.name, 'success');
      requestNotificationPermission(); // 请求浏览器通知权限
      navigate('user-main');
    });
  }

  // ===== 用户注册（异步） =====
  var regForm = document.getElementById('register-form');
  if (regForm) {
    regForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      var name = document.getElementById('reg-name').value.trim();
      var phone = document.getElementById('reg-phone').value.trim();
      var pwd = document.getElementById('reg-pwd').value;
      var pwd2 = document.getElementById('reg-pwd2').value;
      if (!/^1\d{10}$/.test(phone)) { showToast('请输入正确的手机号', 'error'); return; }
      if (!name) { showToast('请输入昵称', 'error'); return; }
      if (pwd.length < 6) { showToast('密码至少6位', 'error'); return; }
      if (pwd !== pwd2) { showToast('两次密码不一致', 'error'); return; }
      showLoading('注册中...');
      var result = await DB.registerUser({ name: name, phone: phone, pwd: pwd, role: 'passenger' });
      hideLoading();
      if (result.error) { showToast(result.error, 'error'); return; }
      State.currentUser = { id: result.id, name: result.name, phone: result.phone, type: 'user', createdAt: result.createdAt };
      showToast('注册成功！', 'success');
      navigate('user-main');
    });
  }

  // ===== 司机登录（异步） =====
  var dLoginForm = document.getElementById('driver-login-form');
  if (dLoginForm) {
    dLoginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      var phone = document.getElementById('dlogin-phone').value.trim();
      var pwd = document.getElementById('dlogin-pwd').value;
      var driver = await DB.findUser(phone, pwd, 'driver');
      if (!driver) { showToast('手机号或密码错误', 'error'); return; }
      State.currentUser = { id: driver.id, name: driver.name, phone: driver.phone, license: driver.license || driver.car_plate, type: 'driver', rating: driver.rating, createdAt: driver.createdAt };
      showToast('登录成功，欢迎 ' + driver.name, 'success');
      requestNotificationPermission(); // 请求浏览器通知权限
      navigate('driver-main');
    });
  }

  // ===== 司机注册（异步） =====
  // ===== 地图初始化 =====
  window.__orderMap = null;
  window.__drvMap = null;
  
  // 无论地图是否加载，先解除输入框的readonly限制
  // 确保用户在地图加载失败时也能手动输入地址
  var fromInputEl = document.getElementById('order-from');
  var toInputEl = document.getElementById('order-to');
  var drvFromEl = document.getElementById('drv-co-from');
  var drvToEl = document.getElementById('drv-co-to');
  if (fromInputEl) fromInputEl.removeAttribute('readonly');
  if (toInputEl) toInputEl.removeAttribute('readonly');
  if (drvFromEl) drvFromEl.removeAttribute('readonly');
  if (drvToEl) drvToEl.removeAttribute('readonly');
  
  // 立即为搜索框和输入框添加基础事件，不等待地图API
  var searchInputEl = document.getElementById('map-search-input');
  var drvSearchInputEl = document.getElementById('drv-map-search-input');
  
  // 为地图搜索框添加立即生效的基础事件
  if (searchInputEl) {
    console.log('找到地图搜索框元素，添加基础事件');
    searchInputEl.removeAttribute('readonly');
    searchInputEl.addEventListener('click', function(e) {
      e.stopPropagation();
      searchInputEl.focus();
      console.log('地图搜索框被点击');
    });
    searchInputEl.addEventListener('touchstart', function(e) {
      e.stopPropagation();
      searchInputEl.focus();
      console.log('地图搜索框被触摸');
    });
  }
  
  if (drvSearchInputEl) {
    drvSearchInputEl.removeAttribute('readonly');
    drvSearchInputEl.addEventListener('click', function(e) {
      e.stopPropagation();
      drvSearchInputEl.focus();
    });
    drvSearchInputEl.addEventListener('touchstart', function(e) {
      e.stopPropagation();
      drvSearchInputEl.focus();
    });
  }
  
  // 为出发地和目的地输入框添加基础事件
  var fromInputEl = document.getElementById('order-from');
  var toInputEl = document.getElementById('order-to');
  var drvFromEl = document.getElementById('drv-co-from');
  var drvToEl = document.getElementById('drv-co-to');
  
  if (fromInputEl) {
    console.log('找到出发地输入框，添加基础事件');
    fromInputEl.removeAttribute('readonly');
    fromInputEl.addEventListener('focus', function() {
      console.log('出发地输入框获得焦点');
    });
    fromInputEl.addEventListener('input', function(e) {
      console.log('出发地输入框输入:', e.target.value);
    });
  }
  
  if (toInputEl) {
    console.log('找到目的地输入框，添加基础事件');
    toInputEl.removeAttribute('readonly');
    toInputEl.addEventListener('focus', function() {
      console.log('目的地输入框获得焦点');
    });
    toInputEl.addEventListener('input', function(e) {
      console.log('目的地输入框输入:', e.target.value);
    });
  }
  
  if (drvFromEl) {
    drvFromEl.removeAttribute('readonly');
    drvFromEl.addEventListener('focus', function() {
      console.log('司机端出发地输入框获得焦点');
    });
  }
  
  if (drvToEl) {
    drvToEl.removeAttribute('readonly');
    drvToEl.addEventListener('focus', function() {
      console.log('司机端目的地输入框获得焦点');
    });
  }
  
  function doInitMaps() {
    console.log('[Map] doInitMaps 执行');
    // 检查高德或腾讯地图API
    var mapReady = typeof TMap !== 'undefined' || typeof AMap !== 'undefined';
    console.log('[Map] API状态 - TMap:', typeof TMap, 'AMap:', typeof AMap);
    if (!mapReady) {
      console.warn('[Map] 地图API未就绪');
      return;
    }
    
    var orderMapEl = document.getElementById('order-map');
    console.log('[Map] order-map元素:', orderMapEl);
    if (orderMapEl) {
      window.__orderMap = initOrderMap({
        mapDivId: 'order-map',
        fromInputId: 'order-from', fromLatId: 'order-from-lat', fromLngId: 'order-from-lng',
        toInputId: 'order-to', toLatId: 'order-to-lat', toLngId: 'order-to-lng',
        searchInputId: 'map-search-input', searchResultsId: 'map-search-results',
        locateBtnId: 'map-locate-btn', toolInfoId: 'map-tool-info',
        routeInfoId: 'route-info',
        zoomInBtnId: 'map-zoom-in-btn', zoomOutBtnId: 'map-zoom-out-btn',
        typeBtnId: 'map-type-btn', swapBtnId: 'swap-locations-btn',
        trafficBtnId: 'map-traffic-btn'
      });
    }
    var drvMapEl = document.getElementById('drv-order-map');
    if (drvMapEl && (typeof TMap !== 'undefined' || typeof AMap !== 'undefined')) {
      window.__drvMap = initOrderMap({
        mapDivId: 'drv-order-map',
        fromInputId: 'drv-co-from', fromLatId: 'drv-co-from-lat', fromLngId: 'drv-co-from-lng',
        toInputId: 'drv-co-to', toLatId: 'drv-co-to-lat', toLngId: 'drv-co-to-lng',
        searchInputId: 'drv-map-search-input', searchResultsId: 'drv-map-search-results',
        locateBtnId: 'drv-map-locate-btn', toolInfoId: 'drv-map-tool-info',
        routeInfoId: 'drv-route-info',
        zoomInBtnId: 'drv-map-zoom-in-btn', zoomOutBtnId: 'drv-map-zoom-out-btn',
        typeBtnId: 'drv-map-type-btn', swapBtnId: 'drv-swap-locations-btn',
        trafficBtnId: 'drv-map-traffic-btn'
      });
    }
  }
  
  // 如果地图API已就绪，直接初始化；否则等待
  var mapReady = typeof TMap !== 'undefined' || typeof AMap !== 'undefined';
  if (mapReady) {
    doInitMaps();
  } else {
    // 等待任意地图API就绪
    var mapReadyHandler = function() {
      doInitMaps();
      window.removeEventListener('tmap-ready', mapReadyHandler);
      window.removeEventListener('amap-ready', mapReadyHandler);
    };
    window.addEventListener('tmap-ready', mapReadyHandler);
    window.addEventListener('amap-ready', mapReadyHandler);
  }

  // ===== 常用地址快捷选择 =====
  var quickAddrBtns = document.querySelectorAll('.quick-addr-btn');
  quickAddrBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var idx = parseInt(btn.dataset.addrIdx);
      var savedAddresses = [];
      try {
        savedAddresses = JSON.parse(localStorage.getItem('dj_saved_addresses') || '[]');
      } catch(e) {}
      var addr = savedAddresses[idx];
      if (!addr) return;

      // 判断当前焦点在哪个输入框，或者自动填充目的地（如果出发地已有）
      var fromInput = document.getElementById('order-from');
      var toInput = document.getElementById('order-to');
      var fromLat = document.getElementById('order-from-lat');
      var fromLng = document.getElementById('order-from-lng');
      var toLat = document.getElementById('order-to-lat');
      var toLng = document.getElementById('order-to-lng');

      if (fromInput && !fromInput.value) {
        // 填充出发地
        fromInput.value = addr.address;
        if (fromLat) fromLat.value = addr.lat || '';
        if (fromLng) fromLng.value = addr.lng || '';
        showToast('已设置出发地：' + addr.name, 'success');
      } else if (toInput && !toInput.value) {
        // 填充目的地
        toInput.value = addr.address;
        if (toLat) toLat.value = addr.lat || '';
        if (toLng) toLng.value = addr.lng || '';
        showToast('已设置目的地：' + addr.name, 'success');
      } else {
        // 都填了，询问替换哪个
        if (confirm('出发地和目的地都已有地址，是否将【' + addr.name + '】设为目的地？')) {
          toInput.value = addr.address;
          if (toLat) toLat.value = addr.lat || '';
          if (toLng) toLng.value = addr.lng || '';
        }
      }

      // 如果地图已初始化，更新标记
      if (window.__orderMap && addr.lat && addr.lng) {
        var TMap = window.TMap || window.AMap;
        if (TMap) {
          var pos = new TMap.LatLng(addr.lat, addr.lng);
          window.__orderMap.setCenter(pos);
        }
      }
    });
  });

  // ===== 估算费用 =====
  var estimateBtn = document.getElementById('estimate-btn');
  if (estimateBtn) {
    estimateBtn.addEventListener('click', function() {
      var fromVal = (document.getElementById('order-from') || {}).value || '';
      var toVal   = (document.getElementById('order-to')   || {}).value || '';
      fromVal = fromVal.trim();
      toVal   = toVal.trim();

      if (!fromVal || !toVal) {
        showToast('请输入出发地和目的地', 'error');
        return;
      }

      var price = estimatePrice(fromVal, toVal);

      var box     = document.getElementById('price-estimate-box');
      var display = document.getElementById('price-display');
      var ruleDesc = document.getElementById('price-rule-desc');
      if (box && display) {
        var periodNote = isNightTime()
          ? '<div style="font-size:11px;color:#9b59b6;margin-top:4px">🌙 夜间时段（20:00-08:00）起步价28元</div>'
          : '<div style="font-size:11px;color:#27ae60;margin-top:4px">☀️ 白天时段（08:00-20:00）起步价18元</div>';
        display.innerHTML = '¥' + price + periodNote;
        if (ruleDesc) {
          ruleDesc.textContent = '超30分钟每30分钟+20元';
        }
        box.style.display = 'flex';
      }

      var submitBtn = document.getElementById('submit-order-btn');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.dataset.from  = fromVal;
        submitBtn.dataset.to    = toVal;
        submitBtn.dataset.price = price;
      }
      showToast('预估费用：¥' + price, 'success');
    });
  }

  // ===== 下单按钮（异步） =====
  var submitOrderBtn = document.getElementById('submit-order-btn');
  if (submitOrderBtn) {
    // 再来一单：自动预填
    if (State.reorderFrom && State.reorderTo) {
      var fromInput = document.getElementById('order-from');
      var toInput = document.getElementById('order-to');
      if (fromInput) fromInput.value = State.reorderFrom;
      if (toInput) toInput.value = State.reorderTo;
      var price = estimatePrice(State.reorderFrom, State.reorderTo);
      var box = document.getElementById('price-estimate-box');
      var display = document.getElementById('price-display');
      if (box && display) {
        display.innerHTML = '¥' + price;
        box.style.display = 'flex';
      }
      submitOrderBtn.disabled = false;
      submitOrderBtn.dataset.from = State.reorderFrom;
      submitOrderBtn.dataset.to = State.reorderTo;
      submitOrderBtn.dataset.price = price;
      State.reorderFrom = null;
      State.reorderTo = null;
      showToast('已自动填入上次行程 🚗', 'success');
    }
    submitOrderBtn.addEventListener('click', async function() {
      var from = submitOrderBtn.dataset.from;
      var to = submitOrderBtn.dataset.to;
      var price = submitOrderBtn.dataset.price;
      var note = document.getElementById('order-note') ? document.getElementById('order-note').value.trim() : '';
      if (!from || !to) { showToast('请先估算费用', 'error'); return; }

      // 获取经纬度和距离
      var fromLat = document.getElementById('order-from-lat') ? document.getElementById('order-from-lat').value : '';
      var fromLng = document.getElementById('order-from-lng') ? document.getElementById('order-from-lng').value : '';
      var toLat = document.getElementById('order-to-lat') ? document.getElementById('order-to-lat').value : '';
      var toLng = document.getElementById('order-to-lng') ? document.getElementById('order-to-lng').value : '';
      var distance = 0;
      if (window.__orderMap && window.__orderMap._getRouteInfo) {
        distance = window.__orderMap._getRouteInfo().distance || 0;
      }

      showToast('正在提交订单...', '');
      var order = await DB.createOrder({
        userId: State.currentUser.id,
        from: from, to: to, price: price,
        from_lat: fromLat || null, from_lng: fromLng || null,
        to_lat: toLat || null, to_lng: toLng || null,
        distance: distance || null,
        status: 'pending'
      });
      if (!order) { showToast('下单失败，请重试', 'error'); return; }

      addNotification(State.currentUser.id, '下单成功', '您的代驾订单 #' + order.id.slice(-6).toUpperCase() + ' 已提交，等待司机接单。', 'order');
      showToast('下单成功！等待司机接单 🎉', 'success');
      navigate('order-detail', { orderId: order.id });
      // 自动派单：查找附近司机并派单
      if (order.from_lat && order.from_lng) {
        triggerAutoDispatch(order.id, order.from_lat, order.from_lng);
      }
    });
  }

  // ===== 司机主动创单（异步） =====
  var drvCreateBtn = document.getElementById('drv-create-order-btn');
  if (drvCreateBtn) {
    drvCreateBtn.addEventListener('click', async function() {
      var customerName = document.getElementById('drv-co-name').value.trim();
      var customerPhone = document.getElementById('drv-co-phone').value.trim();
      var from = document.getElementById('drv-co-from').value.trim();
      var to = document.getElementById('drv-co-to').value.trim();
      var price = document.getElementById('drv-co-price').value.trim();
      var note = document.getElementById('drv-co-note').value.trim();

      if (!customerName) { showToast('请输入客户姓名', 'error'); return; }
      if (!customerPhone) { showToast('请输入客户电话', 'error'); return; }
      if (!from) { showToast('请输入出发地', 'error'); return; }
      if (!to) { showToast('请输入目的地', 'error'); return; }
      if (!price || isNaN(price) || Number(price) <= 0) { showToast('请输入有效的费用金额', 'error'); return; }

      // 获取经纬度和距离
      var dFromLat = document.getElementById('drv-co-from-lat') ? document.getElementById('drv-co-from-lat').value : '';
      var dFromLng = document.getElementById('drv-co-from-lng') ? document.getElementById('drv-co-from-lng').value : '';
      var dToLat = document.getElementById('drv-co-to-lat') ? document.getElementById('drv-co-to-lat').value : '';
      var dToLng = document.getElementById('drv-co-to-lng') ? document.getElementById('drv-co-to-lng').value : '';
      var dDistance = 0;
      if (window.__drvMap && window.__drvMap._getRouteInfo) {
        dDistance = window.__drvMap._getRouteInfo().distance || 0;
      }

      showToast('正在创建订单...', '');
      var order = await DB.createOrder({
        from: from, to: to, price: price,
        from_lat: dFromLat || null, from_lng: dFromLng || null,
        to_lat: dToLat || null, to_lng: dToLng || null,
        distance: dDistance || null,
        status: 'accepted',
        driverId: State.currentUser.id,
        customerName: customerName,
        customerPhone: customerPhone,
        createdByDriver: true
      });
      if (!order) { showToast('创单失败，请重试', 'error'); return; }
      showToast('创单成功！已自动指派给您 🤝', 'success');
      navigate('order-detail', { orderId: order.id });
    });
  }

  // ===== 反馈 =====
  document.querySelectorAll('.feedback-type').forEach(function(type) {
    type.addEventListener('click', function() {
      document.querySelectorAll('.feedback-type').forEach(function(t) { t.classList.remove('active'); });
      type.classList.add('active');
    });
  });
  var feedbackBtn = document.getElementById('submit-feedback-btn');
  if (feedbackBtn) {
    feedbackBtn.addEventListener('click', function() {
      var activeType = document.querySelector('.feedback-type.active');
      var feedbackType = activeType ? activeType.dataset.type : 'suggestion';
      var content = document.getElementById('feedback-content').value.trim();
      var contact = document.getElementById('feedback-contact').value.trim();
      if (!content) { showToast('请输入反馈内容', 'error'); return; }
      if (content.length < 5) { showToast('反馈内容至少5个字', 'error'); return; }
      var list = JSON.parse(localStorage.getItem('dj_feedbacks') || '[]');
      list.unshift({ id: genId(), userId: State.currentUser.id, type: feedbackType, content: content, contact: contact, time: now() });
      try { localStorage.setItem('dj_feedbacks', JSON.stringify(list)); } catch(e) {}

      showToast('反馈提交成功！感谢您的宝贵意见 💚', 'success');
      setTimeout(function() { navigate('profile'); }, 800);
    });
  }

  // ===== 常用地址管理页面事件 =====
  if (State.currentPage === 'manage-addresses') {
    // 地址类型选择
    document.querySelectorAll('.addr-type-option').forEach(function(el) {
      el.addEventListener('click', function() {
        document.querySelectorAll('.addr-type-option').forEach(function(o) { o.style.borderColor = 'var(--border)'; o.style.background = ''; });
        el.style.borderColor = 'var(--primary)';
        el.style.background = '#FFF0EB';
        var type = el.dataset.type;
        document.getElementById('new-addr-type').value = type;
        var nameGroup = document.getElementById('addr-name-group');
        if (nameGroup) nameGroup.style.display = (type === 'other') ? 'block' : 'none';
      });
    });
    // 默认选中家
    var defaultType = document.querySelector('.addr-type-option[data-type="home"]');
    if (defaultType) {
      defaultType.style.borderColor = 'var(--primary)';
      defaultType.style.background = '#FFF0EB';
    }

    // 添加地址按钮
    var addAddrBtn = document.getElementById('add-address-btn');
    if (addAddrBtn) {
      addAddrBtn.addEventListener('click', function() {
        var type = document.getElementById('new-addr-type').value;
        var name = (type === 'other') ? (document.getElementById('new-addr-name').value.trim() || '其他地址') : (type === 'home' ? '家' : '公司');
        var address = document.getElementById('new-addr-address').value.trim();
        var lat = document.getElementById('new-addr-lat').value.trim();
        var lng = document.getElementById('new-addr-lng').value.trim();

        if (!address) { showToast('请输入详细地址', 'error'); return; }

        var savedAddresses = [];
        try { savedAddresses = JSON.parse(localStorage.getItem('dj_saved_addresses') || '[]'); } catch(e) {}
        // 检查是否已存在同类型地址
        var existingIdx = savedAddresses.findIndex(function(a) { return a.tag === type; });
        if (existingIdx >= 0 && type !== 'other') {
          if (!confirm('已存在' + (type === 'home' ? '家' : '公司') + '地址，是否覆盖？')) return;
          savedAddresses[existingIdx] = { tag: type, name: name, address: address, lat: lat, lng: lng };
        } else {
          savedAddresses.push({ tag: type, name: name, address: address, lat: lat, lng: lng });
        }
        localStorage.setItem('dj_saved_addresses', JSON.stringify(savedAddresses));
        showToast('地址添加成功！', 'success');
        render(); // 刷新页面显示新地址
      });
    }
  }

  // 客服端事件绑定
  if (typeof bindStaffEvents === 'function') {
    bindStaffEvents();
  }
}

// ============================================================
//  Action 处理器（异步）
// ============================================================
async function handleAction(action, dataset) {
  // 客服端 action 优先处理
  if (typeof handleStaffAction === 'function' && handleStaffAction(action, dataset)) return;

  switch (action) {
    case 'go-user':     navigate('user-auth', { tab: 'login' }); break;
    case 'go-driver':   navigate('driver-auth', { tab: 'login' }); break;
    case 'go-home':     navigate('home'); break;
    case 'go-staff':    navigate('staff-auth'); break;
    case 'user-main':   navigate('user-main'); break;
    case 'driver-main': navigate('driver-main'); break;
    case 'create-order': navigate('create-order'); break;
    case 'driver-create-order': navigate('driver-create-order'); break;
    case 'user-orders': navigate('user-orders', { filter: dataset.filter || 'all' }); break;
    case 'driver-orders': navigate('driver-orders', { filter: dataset.filter || 'all' }); break;
    case 'order-hall':  navigate('order-hall'); break;
    case 'stats':       navigate('stats'); break;
    case 'profile':     navigate('profile'); break;
    case 'notifications': navigate('notifications'); break;
    case 'feedback':    navigate('feedback'); break;
    case 'about':       navigate('about'); break;
    case 'manage-addresses': navigate('manage-addresses'); break;
    case 'logout':      logout(); break;
    case 'go-back': {
      if (!goBack()) {
        // 没有历史记录，显示退出确认
        tryExitApp();
      }
      break;
    }
    case 'check-update': {
      var statusEl = document.getElementById('update-status');
      if (statusEl) statusEl.innerHTML = '<span style="color:var(--primary)">正在检查更新...</span>';
      if (window.__djCheckUpdate) {
        window.__djCheckUpdate();
        setTimeout(function() {
          var el = document.getElementById('update-status');
          if (el) el.innerHTML = '<span style="color:var(--success)">✓ 已完成最新检查</span>';
          setTimeout(function() {
            var el2 = document.getElementById('update-status');
            if (el2) el2.innerHTML = '';
          }, 3000);
        }, 3000);
      } else {
        if (statusEl) statusEl.innerHTML = '<span style="color:var(--danger)">更新服务暂不可用</span>';
      }
      break;
    }
    case 'clear-data':  clearLocalData(); break;
    case 'delete-address': {
      var idx = parseInt(dataset.addrIdx);
      var savedAddresses = [];
      try { savedAddresses = JSON.parse(localStorage.getItem('dj_saved_addresses') || '[]'); } catch(e) {}
      if (idx >= 0 && idx < savedAddresses.length) {
        if (confirm('确定删除该地址吗？')) {
          savedAddresses.splice(idx, 1);
          localStorage.setItem('dj_saved_addresses', JSON.stringify(savedAddresses));
          showToast('地址已删除', 'success');
          render();
        }
      }
      break;
    }

    case 'order-detail':
      navigate('order-detail', { orderId: dataset.orderId });
      break;

    case 'toggle-online': {
      State.driverOnline = !State.driverOnline;
      await DB.setDriverOnline(State.currentUser.id, State.driverOnline);
      if (State.driverOnline) {
        startDriverLocationTracking();
      } else {
        stopDriverLocationTracking();
      }
      showToast(State.driverOnline ? '🟢 已上线，开始接单！' : '⚫ 已下线', State.driverOnline ? 'success' : '');
      render();
      break;
    }

    // 司机接单（派单）
    case 'accept-dispatch': {
      var dOrderId = dataset.orderId;
      var dOrder = await DB.getOrderById(dOrderId);
      if (!dOrder || dOrder.status !== 'pending') {
        showToast('订单已不存在或已被处理', 'error');
        render();
        break;
      }
      var dResult = await DB.acceptDispatch(dOrderId, State.currentUser.id);
      if (dResult && dResult.success) {
        if (dOrder.userId) addNotification(dOrder.userId, '司机已接单', '您的代驾订单已被司机接单，请等待司机到达。', 'order');
        addNotification(State.currentUser.id, '接单成功', '您已成功接单，请尽快前往出发地。', 'order');
        showToast('接单成功！请前往出发地 🚗', 'success');
        // 清理派单 localStorage
        localStorage.removeItem('dj_dispatch_for_' + State.currentUser.id);
        localStorage.removeItem('dj_dispatch_' + dOrderId);
        navigate('order-detail', { orderId: dOrderId });
      } else {
        showToast('接单失败，请重试', 'error');
        render();
      }
      break;
    }

    // 司机拒绝派单
    case 'reject-dispatch': {
      var rOrderId = dataset.orderId;
      await DB.rejectDispatch(rOrderId, State.currentUser.id);
      localStorage.removeItem('dj_dispatch_for_' + State.currentUser.id);
      localStorage.removeItem('dj_dispatch_' + rOrderId);
      showToast('已拒绝派单', '');
      render();
      break;
    }

    // 司机接单（抢单大厅）
    case 'accept-order': {
      var orderId = dataset.orderId;
      var order = await DB.getOrderById(orderId);
      if (!order || order.status !== 'pending') {
        showToast('订单已被其他司机抢走了', 'error');
        render();
        break;
      }
      showToast('正在接单...', '');
      var result = await DB.updateOrder(orderId, {
        status: 'accepted',
        driverId: State.currentUser.id,
        acceptedAt: true
      });
      if (result) {
        if (order.userId) addNotification(order.userId, '司机已接单', '您的代驾订单已被司机接单，请等待司机到达。', 'order');
        addNotification(State.currentUser.id, '接单成功', '您已成功接单，请尽快前往出发地。', 'order');
        showToast('接单成功！请前往出发地 🚗', 'success');
        navigate('order-detail', { orderId: orderId });
      } else {
        showToast('接单失败，请重试', 'error');
        render();
      }
      break;
    }

    // 开始代驾
    case 'start-order': {
      var orderId2 = dataset.orderId;
      showToast('正在更新...', '');
      var result2 = await DB.updateOrder(orderId2, { status: 'ongoing' });
      var order2 = await DB.getOrderById(orderId2);
      if (order2 && order2.userId) addNotification(order2.userId, '代驾已开始', '您的代驾行程已开始，祝您一路顺风！', 'order');
      showToast('代驾已开始，行程进行中 🚗', 'success');
      navigate('order-detail', { orderId: orderId2 });
      break;
    }

    // 完成代驾（司机端 - 需靠近目的地500m内）
    case 'complete-order': {
      var orderId3 = dataset.orderId;
      var order3pre = await DB.getOrderById(orderId3);

      // 如果有目的地坐标，检查距离
      if (order3pre && order3pre.toLat && order3pre.toLng) {
        if (!_driverCurrentPos) {
          // 尝试实时获取一次
          await new Promise(function(resolve) {
            if (!navigator.geolocation) { resolve(); return; }
            navigator.geolocation.getCurrentPosition(function(pos) {
              _driverCurrentPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
              resolve();
            }, function() { resolve(); }, { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 });
          });
        }
        if (_driverCurrentPos) {
          var dist3 = _calcDistance(_driverCurrentPos.lat, _driverCurrentPos.lng, parseFloat(order3pre.toLat), parseFloat(order3pre.toLng));
          if (dist3 > 500) {
            var distStr3 = dist3 >= 1000 ? (dist3 / 1000).toFixed(1) + ' km' : Math.round(dist3) + ' m';
            showToast('距目的地 ' + distStr3 + '，请到达目的地附近（500m内）再完成代驾', 'error');
            break;
          }
        }
      }

      showToast('正在完成...', '');
      stopLiveTracking();
      stopArrivalCheck();
      var result3 = await DB.updateOrder(orderId3, { status: 'completed', completedAt: true });
      var order3 = await DB.getOrderById(orderId3);
      if (order3) {
        if (order3.userId) addNotification(order3.userId, '行程已完成', '您的代驾行程已完成，别忘了给司机评价哦！', 'payment');
        addNotification(State.currentUser.id, '订单已完成', '订单已完成，收入 ' + (order3.price || '0') + ' 元。', 'payment');
      }
      showToast('行程完成！感谢您的服务 ✅', 'success');
      navigate('order-detail', { orderId: orderId3 });
      break;
    }

    // 乘客主动结束代驾（ongoing状态）
    case 'user-complete-order': {
      var orderId5 = dataset.orderId;
      if (!confirm('确认您已到达目的地，结束本次代驾？\n\n完成后将进行结算。')) break;
      showToast('正在结束代驾...', '');
      stopLiveTracking();
      var result5 = await DB.updateOrder(orderId5, { status: 'completed', completedAt: true });
      var order5 = await DB.getOrderById(orderId5);
      if (order5) {
        if (order5.driverId) addNotification(order5.driverId, '乘客确认到达', '乘客已确认到达目的地，订单完成，收入 ' + (order5.price || '0') + ' 元。', 'payment');
        addNotification(State.currentUser.id, '行程已完成', '您的代驾行程已完成，感谢使用！', 'payment');
      }
      showToast('行程已结束，感谢使用代驾服务 ✅', 'success');
      navigate('order-detail', { orderId: orderId5 });
      break;
    }

    // 打开内嵌导航地图（司机端）
    case 'open-navigation-in-app': {
      var navOrderId2 = dataset.orderId;
      console.log('[DEBUG] open-navigation-in-app clicked, orderId:', navOrderId2);
      navigate('nav-map', { orderId: navOrderId2 });
      break;
    }

    // 取消订单
    case 'cancel-order': {
      var orderId4 = dataset.orderId;
      if (confirm('确定要取消这个订单吗？')) {
        showToast('正在取消...', '');
        var result4 = await DB.updateOrder(orderId4, { status: 'cancelled' });
        showToast('订单已取消', '');
        navigate('user-orders');
      }
      break;
    }

    // 展开地图全屏
    case 'expand-map': {
      openMapFullscreen();
      break;
    }
  }
}

// ============================================================
//  页面后置初始化 - 地图、动态组件等
// ============================================================
async function initPageExtras() {
  // 检查高德地图 API 是否就绪
  if (typeof AMap === 'undefined') {
    console.warn('[Map] 高德地图API未就绪，跳过地图初始化');
    return;
  }
  
  // 如果地图已完全加载（__amapReady=true），直接初始化
  // 否则等待地图加载完成
  if (!window.__amapReady) {
    console.log('[Map] 等待高德地图加载...');
    await new Promise(function(resolve) {
      if (window.__amapReady) { resolve(); return; }
      var checkAmap = setInterval(function() {
        if (window.__amapReady || window.__amapLoadFailed) {
          clearInterval(checkAmap);
          resolve();
        }
      }, 100);
      setTimeout(function() { clearInterval(checkAmap); resolve(); }, 15000);
    });
    if (window.__amapLoadFailed) {
      console.warn('[Map] 高德地图加载失败');
      return;
    }
  }
  
  // 初始化订单详情页的路线地图 / 实时追踪地图
  if (State.currentPage === 'order-detail' && State.pageParams.orderId) {
    var order = await DB.getOrderById(State.pageParams.orderId);
    if (order && order.fromLat && order.fromLng && order.toLat && order.toLng) {
      var isActiveOrder = (order.status === 'ongoing' || order.status === 'accepted');
      if (isActiveOrder) {
        // 实时追踪地图 - 增加重试逻辑确保容器已渲染
        var initLiveMapWithRetry = function(attempts) {
          if (attempts === undefined) attempts = 0;
          var mapDiv = document.getElementById('detail-live-map');
          if (!mapDiv) {
            if (attempts < 10) {
              console.log('[Map] detail-live-map 容器未就绪，等待中...', attempts);
              setTimeout(function() { initLiveMapWithRetry(attempts + 1); }, 200);
            }
            return;
          }
          // 确保容器有尺寸
          if (mapDiv.clientWidth === 0 || mapDiv.clientHeight === 0) {
            if (attempts < 10) {
              console.log('[Map] detail-live-map 容器尺寸为0，等待中...', attempts);
              setTimeout(function() { initLiveMapWithRetry(attempts + 1); }, 200);
            }
            return;
          }
          console.log('[Map] 初始化 detail-live-map 地图');
          initLiveTrackMap(order);
        };
        setTimeout(function() { initLiveMapWithRetry(0); }, 100);
      } else {
        setTimeout(function() {
          var m = initRouteDisplayMap('detail-route-map', order.fromLat, order.fromLng, order.toLat, order.toLng, {
            showInfo: true,
            onRouteReady: function(info) {
              window.__detailRouteInfo = info;
            }
          });
          if (m) window.__detailRouteMap = m;
        }, 100);
      }
    }
    // 司机端 ongoing：启动到达检测
    if (order && order.status === 'ongoing' && State.currentUser && State.currentUser.type === 'driver') {
      setTimeout(function() { startArrivalCheck(order); }, 800);
    }
  }
  
  // 初始化接单大厅的订单卡片小地图
  if (State.currentPage === 'order-hall') {
    var miniMaps = document.querySelectorAll('.hall-mini-map');
    miniMaps.forEach(function(el) {
      var fl = el.dataset.fromLat, fg = el.dataset.fromLng;
      var tl = el.dataset.toLat, tg = el.dataset.toLng;
      if (fl && fg && tl && tg) {
        setTimeout(function() {
          initRouteDisplayMap(el.id, parseFloat(fl), parseFloat(fg), parseFloat(tl), parseFloat(tg), {
            disableZoom: true
          });
        }, 150);
      }
    });
  }
}

// ============================================================
//  实时追踪地图 - 司机位置实时展示
// ============================================================
var _liveTrackTimer = null;
var _liveTrackMap = null;
var _liveDriverMarker = null;

function initLiveTrackMap(order) {
  var mapDiv = document.getElementById('detail-live-map');
  if (!mapDiv || typeof AMap === 'undefined') return;

  // 创建地图，以起终点中间为中心
  var centerLng = (parseFloat(order.fromLng) + parseFloat(order.toLng)) / 2;
  var centerLat = (parseFloat(order.fromLat) + parseFloat(order.toLat)) / 2;
  var map = new AMap.Map(mapDiv, {
    zoom: 14,
    center: [centerLng, centerLat],
    mapStyle: 'amap://styles/normal'
  });
  _liveTrackMap = map;

  // 目的地标记（红旗）
  var toMarker = new AMap.Marker({
    position: [parseFloat(order.toLng), parseFloat(order.toLat)],
    content: '<div style="background:#E74C3C;color:#fff;padding:5px 10px;border-radius:20px;font-size:12px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.3)">🏁 目的地</div>',
    offset: new AMap.Pixel(-30, -20)
  });
  toMarker.setMap(map);

  // 出发地标记
  var fromMarker = new AMap.Marker({
    position: [parseFloat(order.fromLng), parseFloat(order.fromLat)],
    content: '<div style="background:#27AE60;color:#fff;padding:5px 10px;border-radius:20px;font-size:12px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.3)">🟢 出发地</div>',
    offset: new AMap.Pixel(-30, -20)
  });
  fromMarker.setMap(map);

  // 初始化司机位置标记
  _liveDriverMarker = new AMap.Marker({
    position: [parseFloat(order.fromLng), parseFloat(order.fromLat)],
    content: '<div style="background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:6px 12px;border-radius:20px;font-size:13px;white-space:nowrap;box-shadow:0 3px 12px rgba(102,126,234,0.6);font-weight:600">🚗 司机</div>',
    offset: new AMap.Pixel(-25, -22)
  });
  _liveDriverMarker.setMap(map);

  // 绘制路线
  AMap.plugin('AMap.Driving', function() {
    var policy = (AMap.DrivingPolicy && AMap.DrivingPolicy.LEAST_TIME) ? AMap.DrivingPolicy.LEAST_TIME : 0;
    var driving = new AMap.Driving({ policy: policy, showTraffic: true });
    driving.search(
      [parseFloat(order.fromLng), parseFloat(order.fromLat)],
      [parseFloat(order.toLng), parseFloat(order.toLat)],
      function(status, result) {
        if (status === 'complete' && result.routes && result.routes.length > 0) {
          var route = result.routes[0];
          var path = route.path;
          if ((!path || path.length === 0) && route.steps) {
            path = [];
            route.steps.forEach(function(step) { if (step.path) path = path.concat(step.path); });
          }
          if (path && path.length > 0) {
            new AMap.Polyline({
              path: path,
              strokeColor: '#764ba2',
              strokeWeight: 5,
              strokeStyle: 'solid',
              strokeOpacity: 0.7
            }).setMap(map);
          }
          map.setFitView();
        }
      }
    );
  });

  // 存储订单数据
  window.__liveTrackOrder = order;

  // 开始位置追踪
  _startLocationTracking(order, map);
}

function _startLocationTracking(order, map) {
  if (_liveTrackTimer) clearInterval(_liveTrackTimer);

  function updatePosition() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(function(pos) {
      var lat = pos.coords.latitude;
      var lng = pos.coords.longitude;

      if (State.currentUser && State.currentUser.type === 'driver') {
        // 司机端：更新自身位置到地图，并缓存到 localStorage 供本地到达检测用
        _driverCurrentPos = { lat: lat, lng: lng };
        localStorage.setItem('dj_driver_pos_' + order.id, JSON.stringify({ lat: lat, lng: lng, ts: Date.now() }));
        _updateDriverMarker(lat, lng, order, map);
      } else {
        // 乘客/客服端：尝试从 localStorage 读取司机最新位置（司机设备写入的）
        var cached = null;
        try { cached = JSON.parse(localStorage.getItem('dj_driver_pos_' + order.id) || 'null'); } catch(e) {}
        if (cached && (Date.now() - cached.ts) < 30000) {
          _updateDriverMarker(cached.lat, cached.lng, order, map);
        } else {
          var statusEl = document.getElementById('live-status-text');
          if (statusEl) statusEl.textContent = '等待司机位置更新...';
        }
      }
    }, function(err) {
      var statusEl = document.getElementById('live-status-text');
      if (statusEl) {
        if (State.currentUser && State.currentUser.type === 'driver') {
          if (err && err.code === 1) {
            statusEl.textContent = '⚠️ 位置权限未开启，无法追踪';
            // 显示权限引导
            if (typeof showGeoPermissionTip === 'function' && !window.__geoPermTipShown) {
              window.__geoPermTipShown = true;
              showGeoPermissionTip();
            }
          } else {
            statusEl.textContent = '📡 GPS信号弱，重试中...';
          }
        } else {
          statusEl.textContent = '代驾服务中，请稍候';
        }
      }
    }, { enableHighAccuracy: true, timeout: 8000, maximumAge: 5000 });
  }

  updatePosition();
  _liveTrackTimer = setInterval(updatePosition, 8000);
}

function _updateDriverMarker(dLat, dLng, order, map) {
  if (!_liveDriverMarker || !map) return;

  _liveDriverMarker.setPosition([dLng, dLat]);

  // 计算与目的地距离
  var toLat = parseFloat(order.toLat), toLng = parseFloat(order.toLng);
  var dist = _calcDistance(dLat, dLng, toLat, toLng);
  var distStr = dist >= 1000 ? (dist / 1000).toFixed(1) + ' km' : Math.round(dist) + ' m';

  var statusEl = document.getElementById('live-status-text');
  var distEl = document.getElementById('live-dist-text');
  if (statusEl) statusEl.textContent = '司机位置实时更新中';
  if (distEl) distEl.textContent = '距目的地 ' + distStr;

  // 地图中心跟随司机
  map.setCenter([dLng, dLat]);
}

// 清除追踪定时器（页面切走时调用）
function stopLiveTracking() {
  if (_liveTrackTimer) { clearInterval(_liveTrackTimer); _liveTrackTimer = null; }
  _liveTrackMap = null;
  _liveDriverMarker = null;
}

// ============================================================
//  到达检测 - 司机完成代驾前校验
// ============================================================
var _arrivalCheckTimer = null;
var _driverCurrentPos = null; // 缓存司机当前位置

function startArrivalCheck(order) {
  if (!navigator.geolocation) return;

  function checkArrival() {
    navigator.geolocation.getCurrentPosition(function(pos) {
      _driverCurrentPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      var dist = _calcDistance(pos.coords.latitude, pos.coords.longitude, parseFloat(order.toLat), parseFloat(order.toLng));
      var msgEl = document.getElementById('arrive-check-msg');
      var btnEl = document.getElementById('complete-order-btn');
      if (!msgEl || !btnEl) { stopArrivalCheck(); return; }

      var distStr = dist >= 1000 ? (dist / 1000).toFixed(1) + ' km' : Math.round(dist) + ' m';

      if (dist <= 500) {
        // 已到达范围内
        msgEl.innerHTML = '📍 距目的地 <strong>' + distStr + '</strong>，可以完成代驾 ✅';
        msgEl.style.color = '#27AE60';
        msgEl.style.display = 'block';
        btnEl.disabled = false;
        btnEl.style.opacity = '1';
        stopArrivalCheck(); // 到达后停止检测
      } else {
        // 尚未到达
        msgEl.innerHTML = '📍 距目的地 <strong>' + distStr + '</strong>，请驾车到达目的地附近再完成代驾';
        msgEl.style.color = '#E67E22';
        msgEl.style.display = 'block';
        btnEl.disabled = true;
        btnEl.style.opacity = '0.5';
      }
    }, function(err) {
      // GPS获取失败时降级：允许手动完成，但提示无法校验
      var msgEl = document.getElementById('arrive-check-msg');
      if (msgEl) {
        var errTip = (err && err.code === 1)
          ? '⚠️ 位置权限未开启，请在浏览器设置中允许定位，或手动完成代驾'
          : '⚠️ 无法获取GPS位置，您可手动完成代驾（请确认已到达）';
        msgEl.innerHTML = errTip;
        msgEl.style.color = '#999';
        msgEl.style.display = 'block';
      }
      var btnEl = document.getElementById('complete-order-btn');
      if (btnEl) { btnEl.disabled = false; btnEl.style.opacity = '1'; }
      stopArrivalCheck();
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  }

  checkArrival();
  _arrivalCheckTimer = setInterval(checkArrival, 15000); // 每15秒重新检测
}

function stopArrivalCheck() {
  if (_arrivalCheckTimer) { clearInterval(_arrivalCheckTimer); _arrivalCheckTimer = null; }
}

// 计算两点之间的球面距离（米）
function _calcDistance(lat1, lng1, lat2, lng2) {
  var R = 6371000; // 地球半径(m)
  var dLat = (lat2 - lat1) * Math.PI / 180;
  var dLng = (lng2 - lng1) * Math.PI / 180;
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ============================================================
//  自动派单引擎
// ============================================================
var _autoDispatchTimers = {}; // orderId -> timer

async function triggerAutoDispatch(orderId, fromLat, fromLng) {
  var DISPATCH_RADIUS = 500; // 米
  var DISPATCH_TIMEOUT = 30000; // 30秒自动放弃当前司机

  console.log('[AutoDispatch] 查找附近司机，距离范围:', DISPATCH_RADIUS, '米');
  var nearby = await DB.getNearbyDrivers(fromLat, fromLng, DISPATCH_RADIUS);

  if (nearby.length === 0) {
    console.log('[AutoDispatch] 500米内无在线司机，等待大厅抢单');
    showToast('500米内暂无空闲司机，请等待大厅司机主动接单', '', 5000);
    return;
  }

  var driver = nearby[0];
  console.log('[AutoDispatch] 派单给司机:', driver.name, '距离:', Math.round(driver.distance), '米');
  showToast('系统已自动派单给附近司机 🚗', '', 4000);

  // 派单：设置 assigned_to 和过期时间
  var expiresAt = new Date(Date.now() + DISPATCH_TIMEOUT).toISOString();
  await DB.setOrderDispatch(orderId, driver.driverId, expiresAt);

  // 存储派单信息到 localStorage（司机端可感知）
  var dispatchInfo = {
    orderId: orderId,
    driverId: driver.driverId,
    expiresAt: expiresAt,
    driverName: driver.name,
    distance: driver.distance,
    dispatchedAt: Date.now()
  };
  localStorage.setItem('dj_dispatch_' + orderId, JSON.stringify(dispatchInfo));
  // 同时按 driverId 存储（司机端轮询用）
  localStorage.setItem('dj_dispatch_for_' + driver.driverId, JSON.stringify(dispatchInfo));

  // 设置超时：如果司机30秒内未响应，清除派单，尝试下一个司机
  _scheduleNextDriver(orderId, fromLat, fromLng, nearby, 0);
}

function _scheduleNextDriver(orderId, fromLat, fromLng, nearbyDrivers, startIdx) {
  var DISPATCH_TIMEOUT = 30000;
  // 清除旧的 timer
  if (_autoDispatchTimers[orderId]) {
    clearTimeout(_autoDispatchTimers[orderId]);
    _autoDispatchTimers[orderId] = null;
  }

  if (startIdx >= nearbyDrivers.length) {
    console.log('[AutoDispatch] 所有附近司机均未响应，等待大厅抢单');
    delete _autoDispatchTimers[orderId];
    return;
  }

  var driver = nearbyDrivers[startIdx];
  var expiresAt = new Date(Date.now() + DISPATCH_TIMEOUT).toISOString();
  var dispatchInfo = {
    orderId: orderId,
    driverId: driver.driverId,
    expiresAt: expiresAt,
    driverName: driver.name,
    distance: driver.distance,
    dispatchedAt: Date.now()
  };
  localStorage.setItem('dj_dispatch_' + orderId, JSON.stringify(dispatchInfo));
  localStorage.setItem('dj_dispatch_for_' + driver.driverId, JSON.stringify(dispatchInfo));

  console.log('[AutoDispatch] 派单给司机:', driver.name, '距离:', Math.round(driver.distance), '米');

  _autoDispatchTimers[orderId] = setTimeout(async function() {
    var current = JSON.parse(localStorage.getItem('dj_dispatch_' + orderId) || '{}');
    if (current.driverId === driver.driverId) {
      await DB.clearOrderDispatch(orderId);
      localStorage.removeItem('dj_dispatch_' + orderId);
      localStorage.removeItem('dj_dispatch_for_' + driver.driverId);
      _scheduleNextDriver(orderId, fromLat, fromLng, nearbyDrivers, startIdx + 1);
    }
  }, DISPATCH_TIMEOUT);
}

// ============================================================
//  司机位置上报
// ============================================================
var _driverLocationTimer = null;

async function startDriverLocationTracking() {
  if (!navigator.geolocation) {
    console.warn('[GPS] 浏览器不支持定位');
    return;
  }
  function updateLocation() {
    navigator.geolocation.getCurrentPosition(async function(pos) {
      var lat = pos.coords.latitude;
      var lng = pos.coords.longitude;
      var accuracy = pos.coords.accuracy;
      await DB.updateDriverLocation(State.currentUser.id, lat, lng, accuracy);
      localStorage.setItem('dj_my_location', JSON.stringify({ lat: lat, lng: lng, ts: Date.now() }));
    }, function(err) {
      console.warn('[GPS] 获取位置失败:', err.message);
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 });
  }
  updateLocation();
  _driverLocationTimer = setInterval(updateLocation, 10000);
}

function stopDriverLocationTracking() {
  if (_driverLocationTimer) {
    clearInterval(_driverLocationTimer);
    _driverLocationTimer = null;
  }
}

// ============================================================
//  派单通知 UI
// ============================================================
function renderDispatchNotification() {
  if (!State.currentUser || State.currentUser.type !== 'driver' || !State.driverOnline) return '';
  var pendingDispatches = [];
  var dispatchKey = 'dj_dispatch_for_' + State.currentUser.id;
  var raw = localStorage.getItem(dispatchKey);
  if (raw) {
    try {
      var info = JSON.parse(raw);
      if (info && info.driverId === State.currentUser.id && new Date(info.expiresAt) > new Date()) {
        pendingDispatches.push(info);
      } else if (info && info.driverId === State.currentUser.id) {
        localStorage.removeItem(dispatchKey); // 已过期，清理
      }
    } catch(e) {}
  }
  if (pendingDispatches.length === 0) return '';

  var info = pendingDispatches[0];
  var distText = info.distance ? (info.distance >= 1000 ? (info.distance / 1000).toFixed(1) + 'km' : Math.round(info.distance) + 'm') : '';
  var remainingSec = Math.max(0, Math.round((new Date(info.expiresAt) - new Date()) / 1000));
  return '<div id="dispatch-notification" class="dispatch-notification">' +
    '<div class="dispatch-header">📍 系统派单</div>' +
    '<div class="dispatch-body">' +
      '<div style="font-size:13px;color:var(--text-muted);margin-bottom:6px">您有一条新派单</div>' +
      (distText ? '<div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">📏 距离您约 ' + distText + '</div>' : '') +
      '<div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">⏱️ 剩余 <span id="dispatch-countdown">' + remainingSec + '</span> 秒</div>' +
      '<div style="display:flex;gap:8px">' +
        '<button class="btn btn-sm btn-primary" data-action="accept-dispatch" data-order-id="' + info.orderId + '" style="flex:1">🚗 接单</button>' +
        '<button class="btn btn-sm btn-outline" data-action="reject-dispatch" data-order-id="' + info.orderId + '" style="flex:1">❌ 拒绝</button>' +
      '</div>' +
    '</div>' +
  '</div>';
}

// ============================================================
//  工具操作
// ============================================================
function logout() {
  if (State.currentUser && State.currentUser.type === 'driver' && State.driverOnline) {
    DB.setDriverOnline(State.currentUser.id, false);
  }
  State.currentUser = null;
  State.driverOnline = false;
  showToast('已退出登录');
  navigate('home');
}

function clearLocalData() {
  if (confirm('确定要清空所有本地缓存吗？（云端数据不会删除）')) {
    var keys = Object.keys(localStorage);
    keys.filter(function(k) { return k.startsWith('dj_'); }).forEach(function(k) { localStorage.removeItem(k); });
    alert('本地缓存已清空，页面将刷新');
    location.reload();
  }
}

// ============================================================
//  实时订阅
// ============================================================
let _orderSubscription = null;
let _userSubscription = null;

function startRealtime() {
  // 监听订单变更，自动刷新当前页面
  _orderSubscription = DB.subscribeOrders(function(payload) {
    if (!State.currentUser) return;
    // 如果在需要实时数据的页面，自动刷新
    var realtimePages = ['driver-main', 'order-hall', 'user-main', 'user-orders', 'driver-orders', 'staff-main', 'staff-orders'];
    if (realtimePages.indexOf(State.currentPage) >= 0) {
      render();
    }
  });

  // 监听用户变更（上下线）
  _userSubscription = DB.subscribeUsers(function(payload) {
    // 如果在订单大厅，刷新
    if (State.currentPage === 'order-hall' || State.currentPage === 'driver-main') {
      render();
    }
  });
}

// ============================================================
//  初始化
// ============================================================
// 解析初始页面（从URL hash）
function _getInitialPage() {
  var hash = window.location.hash;
  if (hash && hash.length > 1) {
    var page = hash.slice(1); // 去掉 #
    // 验证页面是否有效
    var validPages = ['home', 'user-auth', 'driver-auth', 'user-main', 'driver-main',
      'create-order', 'order-detail', 'nav-map', 'order-hall', 'driver-create-order',
      'user-orders', 'driver-orders', 'profile', 'stats', 'notifications',
      'feedback', 'about', 'manage-addresses', 'staff-auth', 'staff-main',
      'staff-orders', 'staff-dispatch', 'staff-drivers', 'staff-users', 'staff-stats'];
    if (validPages.indexOf(page) >= 0) {
      return { page: page, params: {} };
    }
  }
  return null;
}

function _startApp() {
  initBackHandler();
  startRealtime();
  
  // 尝试从URL hash获取初始页面
  var initial = _getInitialPage();
  if (initial) {
    // 从URL直接进入某个页面，不需要推入历史
    State.currentPage = initial.page;
    State.pageParams = initial.params;
    render();
  } else {
    // 正常进入首页
    navigate('home');
  }
}

window.addEventListener('DOMContentLoaded', function() {
  // supabase.js是同步加载的，DB此时应已在window上
  // 如果仍未定义（例如supabase.js有错误），等待supabase-loaded事件
  if (typeof window.DB !== 'undefined') {
    _startApp();
    return;
  }
  console.warn('window.DB未就绪，等待supabase.js加载...');
  var started = false;
  function onReady() {
    if (started) return;
    started = true;
    window.removeEventListener('supabase-loaded', onReady);
    window.removeEventListener('supabase-load-failed', onReady);
    _startApp();
  }
  window.addEventListener('supabase-loaded', onReady);
  window.addEventListener('supabase-load-failed', onReady);
  // 保底：3秒后强制启动
  setTimeout(onReady, 3000);
});
