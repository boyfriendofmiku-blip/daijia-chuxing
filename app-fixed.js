/* ================================================
   代驾出行 - v1.0
   安全 · 快捷 · 专业
================================================ */

// ============ 地图模块 ============
// 通用地图初始化函数（乘客下单 / 司机创单共用）
function initOrderMap(mapDivId, fromInputId, fromLatId, fromLngId, toInputId, toLatId, toLngId, searchInputId, searchResultsId, locateBtnId, toolInfoId) {
  const mapDiv = document.getElementById(mapDivId);
  const fromInput = document.getElementById(fromInputId);
  const toInput = document.getElementById(toInputId);
  const searchInput = document.getElementById(searchInputId);
  const searchResults = document.getElementById(searchResultsId);
  const locateBtn = document.getElementById(locateBtnId);
  const toolInfo = document.getElementById(toolInfoId);
  if (!mapDiv) return;

  // 选择状态：'from' = 选出发地, 'to' = 选目的地
  let selectMode = 'from';
  // 地图实例
  let map = null;
  let fromMarker = null;
  let toMarker = null;
  let geocoder = null;
  let searchTimer = null;

  // 初始化地图（默认显示广州）
  const center = new TMap.LatLng(23.129, 113.264);
  map = new TMap.Map(mapDiv, {
    center: center,
    zoom: 13,
    pitch: 30,
    mapStyleId: 'style1'
  });

  // 创建逆地理编码服务
  geocoder = new TMap.service.Geocoder();

  // 更新工具栏提示
  function updateInfo(text) {
    if (toolInfo) toolInfo.textContent = text;
  }

  // 更新标记
  function updateMarker(type, lat, lng, address) {
    var pos = new TMap.LatLng(lat, lng);
    if (type === 'from') {
      if (fromMarker) fromMarker.setMap(null);
      fromMarker = new TMap.MultiMarker({
        map: map,
        geometries: [{
          id: 'from_marker',
          position: pos,
          content: '<div style="background:#27AE60;color:#fff;padding:4px 10px;border-radius:20px;font-size:13px;font-weight:600;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.3);position:relative"><span style="position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid #27AE60"></span>🟢 出发地</div>'
        }]
      });
      if (fromInput) fromInput.value = address;
      var fl = document.getElementById(fromLatId);
      var fg = document.getElementById(fromLngId);
      if (fl) fl.value = lat;
      if (fg) fg.value = lng;
    } else {
      if (toMarker) toMarker.setMap(null);
      toMarker = new TMap.MultiMarker({
        map: map,
        geometries: [{
          id: 'to_marker',
          position: pos,
          content: '<div style="background:#E74C3C;color:#fff;padding:4px 10px;border-radius:20px;font-size:13px;font-weight:600;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.3);position:relative"><span style="position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid #E74C3C"></span>🔴 目的地</div>'
        }]
      });
      if (toInput) toInput.value = address;
      var tl = document.getElementById(toLatId);
      var tg = document.getElementById(toLngId);
      if (tl) tl.value = lat;
      if (tg) tg.value = lng;
    }
    // 调整视野
    var bounds = [];
    if (fromMarker) bounds.push(new TMap.LatLng(
      document.getElementById(fromLatId).value,
      document.getElementById(fromLngId).value
    ));
    if (toMarker) bounds.push(new TMap.LatLng(
      document.getElementById(toLatId).value,
      document.getElementById(toLngId).value
    ));
    if (bounds.length === 2) {
      map.fitBounds(new TMap.LatLngBounds(bounds), { padding: 60 });
    }
  }

  // 地图点击事件 — 根据模式设置出发地或目的地
  map.on('click', function(evt) {
    var lat = evt.latLng.getLat();
    var lng = evt.latLng.getLng();
    geocoder.getAddress({ location: new TMap.LatLng(lat, lng) }).then(function(res) {
      var address = res.result.address;
      updateMarker(selectMode, lat, lng, address);
      // 自动切换选择模式
      if (selectMode === 'from' && !(toInput && toInput.value)) {
        selectMode = 'to';
        updateInfo('📍 已设置出发地，点击地图选择目的地');
      } else if (selectMode === 'to') {
        updateInfo('✅ 出发地和目的地已设置');
      }
    }).catch(function() {
      updateMarker(selectMode, lat, lng, lat.toFixed(6) + ', ' + lng.toFixed(6));
    });
  });

  // 自动定位按钮
  if (locateBtn) {
    locateBtn.addEventListener('click', function() {
      if (!navigator.geolocation) {
        showToast('当前浏览器不支持定位功能', 'error');
        return;
      }
      updateInfo('⏳ 正在定位...');
      navigator.geolocation.getCurrentPosition(function(pos) {
        var lat = pos.coords.latitude;
        var lng = pos.coords.longitude;
        var latLng = new TMap.LatLng(lat, lng);
        map.setCenter(latLng);
        map.setZoom(15);
        geocoder.getAddress({ location: latLng }).then(function(res) {
          var address = res.result.address;
          updateMarker(selectMode, lat, lng, address);
          updateInfo('✅ 定位成功');
          if (selectMode === 'from' && !(toInput && toInput.value)) {
            selectMode = 'to';
            setTimeout(function() { updateInfo('📍 点击地图或搜索设置目的地'); }, 1500);
          }
        }).catch(function() {
          updateMarker(selectMode, lat, lng, '我的位置');
          updateInfo('✅ 已定位');
        });
      }, function(err) {
        showToast('定位失败：' + (err.message || '请允许浏览器获取位置'), 'error');
        updateInfo('点击地图选择位置');
      }, { enableHighAccuracy: true, timeout: 8000 });
    });
  }

  // 搜索功能（防抖）
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      var keyword = searchInput.value.trim();
      if (searchTimer) clearTimeout(searchTimer);
      if (!keyword) {
        if (searchResults) searchResults.style.display = 'none';
        return;
      }
      searchTimer = setTimeout(function() {
        var poiservice = new TMap.service.PoiSearch();
        poiservice.search({ keyword: keyword, pageSize: 8 }).then(function(res) {
          var list = res.data;
          if (!list || list.length === 0) {
            if (searchResults) { searchResults.innerHTML = '<div class="map-search-empty">未找到相关地点</div>'; searchResults.style.display = 'block'; }
            return;
          }
          var html = list.map(function(poi, idx) {
            return '<div class="map-search-item" data-idx="' + idx + '">' +
              '<div class="map-search-item-title">' + poi.title + '</div>' +
              '<div class="map-search-item-addr">' + (poi.address || poi.title) + '</div>' +
              '</div>';
          }).join('');
          if (searchResults) {
            searchResults.innerHTML = html;
            searchResults.style.display = 'block';
            // 绑定点击
            searchResults.querySelectorAll('.map-search-item').forEach(function(item) {
              item.addEventListener('click', function(e) {
                e.stopPropagation();
                var idx = parseInt(item.dataset.idx);
                var poi = list[idx];
                var lat = poi.location.lat;
                var lng = poi.location.lng;
                var address = poi.title + (poi.address ? '（' + poi.address + '）' : '');
                map.setCenter(new TMap.LatLng(lat, lng));
                map.setZoom(15);
                updateMarker(selectMode, lat, lng, address);
                if (searchResults) searchResults.style.display = 'none';
                if (searchInput) searchInput.value = '';
                if (selectMode === 'from' && !(toInput && toInput.value)) {
                  selectMode = 'to';
                  updateInfo('📍 已设置出发地，点击地图或搜索设置目的地');
                } else if (selectMode === 'to') {
                  updateInfo('✅ 出发地和目的地已设置');
                }
              });
            });
          }
        }).catch(function() {
          if (searchResults) { searchResults.innerHTML = '<div class="map-search-empty">搜索失败，请重试</div>'; searchResults.style.display = 'block'; }
        });
      }, 400);
    });
  }

  // 点击页面其他地方关闭搜索结果
  document.addEventListener('click', function(e) {
    if (searchResults && !searchResults.contains(e.target) && e.target !== searchInput) {
      searchResults.style.display = 'none';
    }
  });

  // 出发地输入框聚焦时切换到选出发地模式
  if (fromInput) {
    fromInput.addEventListener('focus', function() {
      selectMode = 'from';
      updateInfo('🟢 点击地图或搜索选择出发地');
    });
    // 使 readonly 的输入框仍可手动编辑（覆盖 readonly）
    fromInput.removeAttribute('readonly');
    fromInput.addEventListener('change', function() {
      // 手动输入地址时直接使用文本
    });
  }
  if (toInput) {
    toInput.addEventListener('focus', function() {
      selectMode = 'to';
      updateInfo('🔴 点击地图或搜索选择目的地');
    });
    toInput.removeAttribute('readonly');
  }

  // 启动时自动定位
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(pos) {
      var lat = pos.coords.latitude;
      var lng = pos.coords.longitude;
      map.setCenter(new TMap.LatLng(lat, lng));
      map.setZoom(15);
      geocoder.getAddress({ location: new TMap.LatLng(lat, lng) }).then(function(res) {
        updateMarker('from', lat, lng, res.result.address);
        updateInfo('✅ 已自动定位，点击地图设置出发地/目的地');
      }).catch(function() {
        updateInfo('📍 点击地图选择出发地');
      });
    }, function() {
      updateInfo('📍 点击地图或点击左下角定位按钮');
    }, { enableHighAccuracy: true, timeout: 8000 });
  } else {
    updateInfo('📍 点击地图选择位置');
  }
}

// ============ 数据层 ============
const DB = {
  get(key) { try { return JSON.parse(localStorage.getItem('dj_' + key)) || null; } catch { return null; } },
  set(key, val) { localStorage.setItem('dj_' + key, JSON.stringify(val)); },
  getList(key) { return this.get(key) || []; },
  push(key, item) { const list = this.getList(key); list.push(item); this.set(key, list); },
  update(key, id, updater) {
    const list = this.getList(key);
    const idx = list.findIndex(i => i.id === id);
    if (idx >= 0) { list[idx] = { ...list[idx], ...updater(list[idx]) }; this.set(key, list); return list[idx]; }
    return null;
  }
};

// ============ 全局状态 ============
const State = {
  currentUser: null,    // { id, name, phone, type:'user'|'driver', ... }
  currentPage: 'home',
  pageParams: {},
  driverOnline: false,
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
  return `<span class="badge ${s.cls}">${s.text}</span>`;
}

function showToast(msg, type = '') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => t.remove(), 2900);
}

function estimatePrice(from, to) {
  const base = 30;
  const dist = (from.length + to.length) % 20 + 5;
  let price = base + dist * 2 + Math.random() * 20;
  // 夜间时段加价（22:00-06:00 加收30%）
  const hour = new Date().getHours();
  const isNight = hour >= 22 || hour < 6;
  if (isNight) price *= 1.3;
  return price.toFixed(0);
}
function isNightTime() {
  const hour = new Date().getHours();
  return hour >= 22 || hour < 6;
}

// ============ 通知模块 ============
function addNotification(userId, title, content, type) {
  var list = DB.getList('notifications');
  list.unshift({ id: genId(), userId: userId, title: title, content: content, type: type || 'info', time: now(), read: false });
  // 只保留最近100条
  if (list.length > 100) list = list.slice(0, 100);
  DB.set('notifications', list);
}
function getUnreadCount(userId) {
  return DB.getList('notifications').filter(function(n) { return n.userId === userId && !n.read; }).length;
}
function markAllRead(userId) {
  var list = DB.getList('notifications');
  list.forEach(function(n) { if (n.userId === userId) n.read = true; });
  DB.set('notifications', list);
}

// ============ 路由 ============
function navigate(page, params = {}) {
  State.currentPage = page;
  State.pageParams = params;
  render();
}

function render() {
  const app = document.getElementById('app');
  switch (State.currentPage) {
    case 'home':           app.innerHTML = renderHome(); break;
    case 'user-auth':      app.innerHTML = renderUserAuth(); break;
    case 'driver-auth':    app.innerHTML = renderDriverAuth(); break;
    case 'user-main':      app.innerHTML = renderUserMain(); break;
    case 'driver-main':    app.innerHTML = renderDriverMain(); break;
    case 'create-order':   app.innerHTML = renderCreateOrder(); break;
    case 'order-detail':   app.innerHTML = renderOrderDetail(State.pageParams.orderId); break;
    case 'order-hall':     app.innerHTML = renderOrderHall(); break;
    case 'driver-create-order': app.innerHTML = renderDriverCreateOrder(); break;
    case 'user-orders':    app.innerHTML = renderUserOrders(); break;
    case 'driver-orders':  app.innerHTML = renderDriverOrders(); break;
    case 'profile':        app.innerHTML = renderProfile(); break;
    case 'stats':          app.innerHTML = renderStats(); break;
    case 'notifications':  app.innerHTML = renderNotifications(); break;
    case 'feedback':       app.innerHTML = renderFeedback(); break;
    case 'about':          app.innerHTML = renderAbout(); break;
    // 客服端路由
    case 'staff-auth':     app.innerHTML = renderStaffAuth(State.pageParams.tab); break;
    case 'staff-main':     app.innerHTML = renderStaffMain(); break;
    case 'staff-orders':   app.innerHTML = renderStaffOrders(); break;
    case 'staff-dispatch': app.innerHTML = renderStaffDispatch(State.pageParams.orderId); break;
    case 'staff-drivers':  app.innerHTML = renderStaffDrivers(); break;
    case 'staff-users':    app.innerHTML = renderStaffUsers(); break;
    case 'staff-stats':    app.innerHTML = renderStaffStats(); break;
    default:               app.innerHTML = renderHome();
  }
  bindEvents();
}

// ============================================================
//  首页 - 角色选择
// ============================================================
function renderHome() {
  return `
  <div class="home-page">
    <div class="home-logo">🚗</div>
    <h1 class="home-title">代驾出行</h1>
    <p class="home-subtitle">安全 · 快捷 · 专业</p>
    <div class="home-cards">
      <div class="role-card" data-action="go-user">
        <div class="icon">👤</div>
        <div class="label">我是乘客</div>
        <div class="desc">叫代驾司机</div>
      </div>
      <div class="role-card" data-action="go-driver">
        <div class="icon">🧑‍✈️</div>
        <div class="label">我是司机</div>
        <div class="desc">接代驾订单</div>
      </div>
      <div class="role-card staff-role-card" data-action="go-staff">
        <div class="icon">🎧</div>
        <div class="label">客服管理</div>
        <div class="desc">运营后台</div>
      </div>
    </div>
    <p class="home-footer">© 2026 代驾出行</p>
  </div>`;
}

// ============================================================
//  用户端 - 登录/注册
// ============================================================
function renderUserAuth() {
  const tab = State.pageParams && State.pageParams.tab === 'register' ? 'register' : 'login';
  return `
  <div class="auth-page page">
    <div class="auth-hero">
      <div class="icon">👤</div>
      <h1>乘客端</h1>
    </div>
    <div class="auth-body">
      <div class="auth-card">
        <div class="auth-tabs">
          <button class="auth-tab ${tab === 'login' ? 'active' : ''}" data-tab="login">登录</button>
          <button class="auth-tab ${tab === 'register' ? 'active' : ''}" data-tab="register">注册</button>
        </div>
        ${tab === 'login' ? `
        <form id="login-form">
          <div class="form-group">
            <label>手机号</label>
            <input class="form-control" type="tel" id="login-phone" placeholder="请输入手机号" maxlength="11" />
          </div>
          <div class="form-group">
            <label>密码</label>
            <input class="form-control" type="password" id="login-pwd" placeholder="请输入密码" />
          </div>
          <button class="btn btn-primary btn-block" type="submit">登录</button>
          <div class="auth-link">还没有账号？<a data-tab="register">立即注册</a></div>
        </form>` : `
        <form id="register-form">
          <div class="form-group">
            <label>昵称</label>
            <input class="form-control" type="text" id="reg-name" placeholder="请输入昵称" />
          </div>
          <div class="form-group">
            <label>手机号</label>
            <input class="form-control" type="tel" id="reg-phone" placeholder="请输入手机号" maxlength="11" />
          </div>
          <div class="form-group">
            <label>密码</label>
            <input class="form-control" type="password" id="reg-pwd" placeholder="请设置密码（至少6位）" />
          </div>
          <div class="form-group">
            <label>确认密码</label>
            <input class="form-control" type="password" id="reg-pwd2" placeholder="请再次输入密码" />
          </div>
          <button class="btn btn-primary btn-block" type="submit">注册</button>
          <div class="auth-link">已有账号？<a data-tab="login">立即登录</a></div>
        </form>`}
      </div>
      <div style="text-align:center;margin-top:20px">
        <button class="btn btn-outline btn-sm" data-action="go-home">← 返回首页</button>
      </div>
    </div>
  </div>`;
}

// ============================================================
//  司机端 - 登录/注册
// ============================================================
function renderDriverAuth() {
  const tab = State.pageParams && State.pageParams.tab === 'register' ? 'register' : 'login';
  return `
  <div class="auth-page page" style="background:linear-gradient(180deg,#2C3E50 0%,#2C3E50 200px,var(--bg) 200px)">
    <div class="auth-hero" style="background:transparent">
      <div class="icon">🧑‍✈️</div>
      <h1>司机端</h1>
    </div>
    <div class="auth-body">
      <div class="auth-card">
        <div class="auth-tabs">
          <button class="auth-tab ${tab === 'login' ? 'active' : ''}" data-tab="login">登录</button>
          <button class="auth-tab ${tab === 'register' ? 'active' : ''}" data-tab="register">注册</button>
        </div>
        ${tab === 'login' ? `
        <form id="driver-login-form">
          <div class="form-group">
            <label>手机号</label>
            <input class="form-control" type="tel" id="dlogin-phone" placeholder="请输入手机号" maxlength="11" />
          </div>
          <div class="form-group">
            <label>密码</label>
            <input class="form-control" type="password" id="dlogin-pwd" placeholder="请输入密码" />
          </div>
          <button class="btn btn-secondary btn-block" type="submit" style="background:#2C3E50">登录</button>
          <div class="auth-link">还没有账号？<a data-tab="register">立即注册</a></div>
        </form>` : `
        <form id="driver-register-form">
          <div class="form-group">
            <label>真实姓名</label>
            <input class="form-control" type="text" id="dreg-name" placeholder="请输入真实姓名" />
          </div>
          <div class="form-group">
            <label>手机号</label>
            <input class="form-control" type="tel" id="dreg-phone" placeholder="请输入手机号" maxlength="11" />
          </div>
          <div class="form-group">
            <label>驾驶证号</label>
            <input class="form-control" type="text" id="dreg-license" placeholder="请输入驾驶证号" />
          </div>
          <div class="form-group">
            <label>密码</label>
            <input class="form-control" type="password" id="dreg-pwd" placeholder="请设置密码（至少6位）" />
          </div>
          <div class="form-group">
            <label>确认密码</label>
            <input class="form-control" type="password" id="dreg-pwd2" placeholder="请再次输入密码" />
          </div>
          <button class="btn btn-block" type="submit" style="background:#2C3E50;color:#fff">注册成为司机</button>
          <div class="auth-link">已有账号？<a data-tab="login">立即登录</a></div>
        </form>`}
      </div>
      <div style="text-align:center;margin-top:20px">
        <button class="btn btn-outline btn-sm" data-action="go-home" style="border-color:#2C3E50;color:#2C3E50">← 返回首页</button>
      </div>
    </div>
  </div>`;
}

// ============================================================
//  用户端 - 主页
// ============================================================
function renderUserMain() {
  const u = State.currentUser;
  const orders = DB.getList('orders').filter(o => o.userId === u.id);
  const activeOrder = orders.find(o => ['pending', 'accepted', 'ongoing'].includes(o.status));
  const hour = new Date().getHours();
  const greeting = hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好';
  const completedOrders = orders.filter(o => o.status === 'completed');
  const totalSpent = completedOrders.reduce((s, o) => s + Number(o.price), 0);
  const unreadCount = getUnreadCount(u.id);

  return `
  <div class="user-home has-nav">
    <div class="top-bar">
      <div class="greeting">${greeting}，欢迎回来 👋</div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div class="username">${u.name}</div>
        <div class="topbar-icon-wrap" data-action="notifications">
          🔔
          ${unreadCount > 0 ? `<span class="unread-badge">${unreadCount > 99 ? '99+' : unreadCount}</span>` : ''}
        </div>
      </div>
      <div class="balance-bar">
        <div>
          <div class="balance-label">累计行程</div>
          <div class="balance-value">${completedOrders.length} 次</div>
        </div>
        <div style="text-align:right">
          <div class="balance-label">累计消费</div>
          <div class="balance-value">${formatPrice(totalSpent)}</div>
        </div>
      </div>
    </div>

    ${isNightTime() ? `
    <div style="margin:16px 20px 0;padding:12px 16px;background:linear-gradient(135deg,#2C3E50,#4a3f6b);border-radius:12px;color:#fff;font-size:13px;display:flex;align-items:center;gap:10px">
      <span style="font-size:20px">🌙</span>
      <div>
        <div style="font-weight:600">夜间时段</div>
        <div style="opacity:0.8;margin-top:2px">当前为夜间代驾时段（22:00-06:00），费用上浮30%</div>
      </div>
    </div>` : ''}

    <div class="quick-actions">
      <div class="quick-action" data-action="create-order">
        <div class="qa-icon" style="background:#FFF0EB;color:#FF6B35">🚗</div>
        <span class="qa-label">叫代驾</span>
      </div>
      <div class="quick-action" data-action="user-orders">
        <div class="qa-icon" style="background:#EBF5FB;color:#3498DB">📋</div>
        <span class="qa-label">我的订单</span>
      </div>
      <div class="quick-action" data-action="stats">
        <div class="qa-icon" style="background:#F0FFF4;color:#27AE60">📊</div>
        <span class="qa-label">统计</span>
      </div>
      <div class="quick-action" data-action="profile">
        <div class="qa-icon" style="background:#FDF2F8;color:#9B59B6">👤</div>
        <span class="qa-label">我的</span>
      </div>
    </div>

    ${activeOrder ? `
    <div class="section-title">📍 当前订单</div>
    <div class="order-card" data-action="order-detail" data-order-id="${activeOrder.id}" style="margin:0 20px 12px">
      <div class="order-header">
        <span class="order-id">订单 #${activeOrder.id.slice(-6).toUpperCase()}</span>
        ${statusBadge(activeOrder.status)}
      </div>
      <div class="order-route">
        <div class="route-item"><span class="route-dot start"></span><span>${activeOrder.from}</span></div>
        <div class="route-item" style="padding-left:2px"><span class="route-connector"></span></div>
        <div class="route-item"><span class="route-dot end"></span><span>${activeOrder.to}</span></div>
      </div>
      <div class="order-footer">
        <span class="order-price">${formatPrice(activeOrder.price)}</span>
        <span class="order-time">${activeOrder.createdAt}</span>
      </div>
    </div>` : ''}

    <div class="section-title">最近订单</div>
    ${orders.length === 0 ? `
      <div class="empty-state"><div class="empty-icon">🛣️</div><p>还没有订单，快去叫代驾吧</p></div>
    ` : orders.slice().reverse().slice(0, 5).map(o => `
    <div class="order-card" data-action="order-detail" data-order-id="${o.id}" style="margin:0 20px 12px">
      <div class="order-header">
        <span class="order-id">订单 #${o.id.slice(-6).toUpperCase()}</span>
        ${statusBadge(o.status)}
      </div>
      <div class="order-route">
        <div class="route-item"><span class="route-dot start"></span><span>${o.from}</span></div>
        <div class="route-item" style="padding-left:2px"><span class="route-connector"></span></div>
        <div class="route-item"><span class="route-dot end"></span><span>${o.to}</span></div>
      </div>
      <div class="order-footer">
        <span class="order-price">${formatPrice(o.price)}</span>
        <span class="order-time">${o.createdAt}</span>
      </div>
      ${o.status === 'completed' ? `<div style="padding:10px 0 0;border-top:1px solid var(--border);margin-top:8px;text-align:right">
        <button class="btn btn-sm btn-primary reorder-btn" data-from="${o.from}" data-to="${o.to}" style="font-size:12px">🚗 再来一单</button>
      </div>` : ''}
    </div>
    `).join('')}
  </div>

  <nav class="bottom-nav">
    <div class="nav-item active"><span class="nav-icon">🏠</span>首页</div>
    <div class="nav-item" data-action="create-order"><span class="nav-icon">🚗</span>叫代驾</div>
    <div class="nav-item" data-action="user-orders"><span class="nav-icon">📋</span>订单</div>
    <div class="nav-item" data-action="profile"><span class="nav-icon">👤</span>我的</div>
  </nav>`;
}

// ============================================================
//  用户端 - 下单页面
// ============================================================
function renderCreateOrder() {
  return `
  <div class="page">
    <div class="page-header">
      <button class="back-btn" data-action="user-main">←</button>
      <h2>叫代驾</h2>
    </div>
    <div class="page-content">
      <!-- 地图区域 -->
      <div class="map-container" id="order-map-container">
        <div id="order-map" class="map-canvas"></div>
        <!-- 地图上方搜索框 -->
        <div class="map-search-bar">
          <div class="map-search-input-wrap">
            <span class="map-search-icon">🔍</span>
            <input class="map-search-input" id="map-search-input" placeholder="搜索地点..." />
          </div>
        </div>
        <!-- 搜索结果面板 -->
        <div class="map-search-results" id="map-search-results" style="display:none"></div>
        <!-- 地图底部工具栏 -->
        <div class="map-toolbar">
          <button class="map-tool-btn" id="map-locate-btn" title="定位当前位置">📍</button>
          <div class="map-tool-info" id="map-tool-info">点击地图选择位置</div>
        </div>
      </div>

      <div class="card">
        <div class="form-group">
          <label>🟢 出发地 <span style="color:var(--text-muted);font-size:12px;font-weight:400">（点击地图或搜索设置）</span></label>
          <input class="form-control" id="order-from" placeholder="请输入出发地址" readonly />
          <input type="hidden" id="order-from-lat" />
          <input type="hidden" id="order-from-lng" />
        </div>
        <div style="text-align:center;color:var(--text-muted);font-size:18px;padding:2px 0">⇅</div>
        <div class="form-group">
          <label>🔴 目的地 <span style="color:var(--text-muted);font-size:12px;font-weight:400">（点击地图或搜索设置）</span></label>
          <input class="form-control" id="order-to" placeholder="请输入目的地址" readonly />
          <input type="hidden" id="order-to-lat" />
          <input type="hidden" id="order-to-lng" />
        </div>
        <div class="form-group">
          <label>📝 备注（可选）</label>
          <input class="form-control" id="order-note" placeholder="例：喝了点酒，车停在地下车库B1" />
        </div>
      </div>

      <div id="price-estimate-box" style="display:none" class="price-estimate">
        <div>
          <div class="price-label">预估费用</div>
          <div style="font-size:12px;opacity:0.8;margin-top:2px">实际费用以完成订单为准</div>
        </div>
        <div class="price-value" id="price-display">¥0</div>
      </div>

      <button class="btn btn-primary btn-block" id="estimate-btn" style="margin-bottom:12px">估算费用</button>
      <button class="btn btn-success btn-block" id="submit-order-btn" disabled>🚗 立即下单</button>
    </div>
  </div>`;
}

// ============================================================
//  用户端 - 订单详情
// ============================================================
function renderOrderDetail(orderId) {
  const order = DB.getList('orders').find(o => o.id === orderId);
  if (!order) return '<div class="page"><div class="page-content"><p>订单不存在</p></div></div>';

  const isUser = State.currentUser && State.currentUser.type === 'user';
  const isDriver = State.currentUser && State.currentUser.type === 'driver';
  const isStaff = State.currentUser && State.currentUser.type === 'staff';
  let backAction = 'user-main';
  if (isDriver) backAction = 'driver-orders';
  if (isStaff) backAction = 'staff-orders';

  // 步骤进度
  const steps = [
    { key: 'pending',   label: '待接单' },
    { key: 'accepted',  label: '已接单' },
    { key: 'ongoing',   label: '代驾中' },
    { key: 'completed', label: '已完成' },
  ];
  const stepIdx = steps.findIndex(s => s.key === order.status);
  const stepsHtml = order.status === 'cancelled' ? `
    <div style="text-align:center;padding:16px 0">
      <span class="badge badge-danger" style="font-size:14px;padding:8px 20px">订单已取消</span>
    </div>
  ` : `
    <div class="steps">
      ${steps.map((s, i) => `
        <div class="step ${i < stepIdx ? 'done' : i === stepIdx ? 'active' : ''}">
          <div class="step-dot">${i < stepIdx ? '✓' : i + 1}</div>
          <div class="step-label">${s.label}</div>
        </div>
      `).join('')}
    </div>
  `;

  // 乘客信息（司机/客服视角，已接单后显示）
  let passengerInfoHtml = '';
  if ((isDriver || isStaff) && order.driverId && ['accepted', 'ongoing', 'completed'].includes(order.status)) {
    // 优先取 customerName（司机主动创单），其次从 userId 查找
    let passengerName = order.customerName || '';
    let passengerPhone = order.customerPhone || '';
    if (order.userId && !passengerName) {
      const users = DB.getList('users');
      const user = users.find(u => u.id === order.userId);
      if (user) {
        passengerName = user.name;
        passengerPhone = user.phone;
      }
    }
    if (passengerName) {
      passengerInfoHtml = `
      <div class="card" style="margin-bottom:16px">
        <div class="card-header">👤 乘客信息</div>
        <div class="driver-info-card">
          <div class="driver-avatar" style="background:linear-gradient(135deg,#4facfe 0%,#00f2fe 100%)">👤</div>
          <div style="flex:1">
            <div class="driver-name">${passengerName}</div>
            ${passengerPhone ? `<div class="driver-detail">📞 ${passengerPhone}</div>` : ''}
            ${order.customerPhone ? `<div class="driver-detail">📞 ${order.customerPhone}</div>` : ''}
          </div>
          ${passengerPhone ? `<a href="tel:${passengerPhone || order.customerPhone}" class="btn btn-sm btn-success contact-btn" style="flex-shrink:0">📞 联系</a>` : ''}
        </div>
        ${!order.createdByDriver ? `
        <div style="margin-top:12px;padding:10px;background:#EBF5FB;border-radius:8px;font-size:13px;color:#2C3E50">
          <div style="font-weight:600;margin-bottom:6px">📍 乘客定位</div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <span style="color:var(--success)">●</span>
            <span>出发地：${order.from}</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="color:var(--danger)">●</span>
            <span>目的地：${order.to}</span>
          </div>
        </div>` : ''}
      </div>`;
    }
  }

  // 司机信息（乘客视角，已接单后显示）
  let driverInfoHtml = '';
  if ((isUser || isStaff) && order.driverId && ['accepted', 'ongoing', 'completed'].includes(order.status)) {
    const drivers = DB.getList('drivers');
    const driver = drivers.find(d => d.id === order.driverId);
    if (driver) {
      driverInfoHtml = `
      <div class="card" style="margin-bottom:16px">
        <div class="card-header">🧑‍✈️ 代驾司机</div>
        <div class="driver-info-card">
          <div class="driver-avatar">🧑‍✈️</div>
          <div style="flex:1">
            <div class="driver-name">${driver.name}</div>
            <div class="driver-detail">📞 ${driver.phone}</div>
            <div class="driver-detail">驾驶证：${driver.license || '已验证'}</div>
            <div class="driver-rating">⭐ ${driver.rating || '4.9'} 分</div>
          </div>
          ${isUser && driver.phone ? `<a href="tel:${driver.phone}" class="btn btn-sm btn-success contact-btn" style="flex-shrink:0">📞 联系司机</a>` : ''}
        </div>
      </div>`;
    }
  }

  // 操作按钮
  let actionButtons = '';
  if (isUser) {
    if (order.status === 'pending') {
      actionButtons = `<button class="btn btn-danger btn-block" data-action="cancel-order" data-order-id="${order.id}">取消订单</button>`;
    }
    if (order.status === 'completed' && !order.rated) {
      actionButtons = `
        <div class="card">
          <div class="card-header">⭐ 给司机评分</div>
          <div style="display:flex;gap:8px;justify-content:center;margin-bottom:12px">
            ${[1,2,3,4,5].map(n => `<span class="star-btn" data-star="${n}" style="font-size:28px;cursor:pointer;">☆</span>`).join('')}
          </div>
          <button class="btn btn-primary btn-block" id="submit-rating-btn" data-order-id="${order.id}" disabled>提交评分</button>
        </div>`;
    }
  }
  if (isDriver && order.driverId === State.currentUser.id) {
    if (order.status === 'accepted') {
      actionButtons = `<button class="btn btn-success btn-block" data-action="start-order" data-order-id="${order.id}">🚗 开始代驾</button>`;
    }
    if (order.status === 'ongoing') {
      actionButtons = `<button class="btn btn-primary btn-block" data-action="complete-order" data-order-id="${order.id}">✅ 完成代驾</button>`;
    }
  }

  return `
  <div class="page">
    <div class="page-header">
      <button class="back-btn" data-action="${backAction}">←</button>
      <h2>订单详情</h2>
      ${statusBadge(order.status)}
    </div>
    <div class="page-content">
      <div class="card" style="margin-bottom:16px">
        <div class="card-header">📍 行程信息</div>
        ${stepsHtml}
        <div class="order-route" style="margin-bottom:12px">
          <div class="route-item"><span class="route-dot start"></span><div><div style="font-size:12px;color:var(--text-muted)">出发地</div><div>${order.from}</div></div></div>
          <div class="route-item"><span class="route-connector"></span></div>
          <div class="route-item"><span class="route-dot end"></span><div><div style="font-size:12px;color:var(--text-muted)">目的地</div><div>${order.to}</div></div></div>
        </div>
        ${order.note ? `<div style="padding:10px;background:var(--bg);border-radius:8px;font-size:13px;color:var(--text-muted)">💬 备注：${order.note}</div>` : ''}
      </div>

      ${passengerInfoHtml}

      ${driverInfoHtml}

      ${order.createdByDriver && order.customerName ? `
      <div class="card" style="margin-bottom:16px">
        <div class="card-header">👤 客户信息</div>
        <div style="padding:4px 0">
          <div style="font-weight:600;font-size:15px">${order.customerName}</div>
          <div style="font-size:13px;color:var(--text-muted)">📞 ${order.customerPhone || '未填写'}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:4px">
            <span style="background:#EBF5FB;color:#3498DB;padding:2px 8px;border-radius:10px;font-size:11px">司机主动创单</span>
          </div>
        </div>
      </div>` : (!order.createdByDriver && !order.userId ? `
      <div class="card" style="margin-bottom:16px">
        <div class="card-header">👤 客户信息</div>
        <div style="font-weight:600">${order.customerName || '客户'}</div>
        ${order.customerPhone ? `<div style="font-size:13px;color:var(--text-muted)">📞 ${order.customerPhone}</div>` : ''}
      </div>` : '')}

      <div class="card" style="margin-bottom:16px">
        <div class="card-header">💰 费用信息</div>
          <span style="color:var(--text-muted)">订单编号</span>
          <span style="font-size:12px">#${order.id.slice(-8).toUpperCase()}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
          <span style="color:var(--text-muted)">下单时间</span>
          <span>${order.createdAt}</span>
        </div>
        ${order.acceptedAt ? `
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
          <span style="color:var(--text-muted)">接单时间</span><span>${order.acceptedAt}</span>
        </div>` : ''}
        ${order.completedAt ? `
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
          <span style="color:var(--text-muted)">完成时间</span><span>${order.completedAt}</span>
        </div>` : ''}
        <div style="display:flex;justify-content:space-between;padding:12px 0 0;align-items:center">
          <span style="font-size:15px;font-weight:600">应付金额</span>
          <span style="font-size:24px;font-weight:700;color:var(--primary)">${formatPrice(order.price)}</span>
        </div>
      </div>

      ${actionButtons}
    </div>
  </div>`;
}

// ============================================================
//  用户端 - 我的订单
// ============================================================
function renderUserOrders() {
  const u = State.currentUser;
  const allOrders = DB.getList('orders').filter(o => o.userId === u.id).reverse();
  const drivers = DB.getList('drivers');
  const filter = State.pageParams.filter || 'all';
  const orders = filter === 'all' ? allOrders : allOrders.filter(o => o.status === filter);
  const tabs = [
    { key: 'all', label: '全部' },
    { key: 'pending', label: '待接单' },
    { key: 'accepted', label: '进行中' },
    { key: 'completed', label: '已完成' },
    { key: 'cancelled', label: '已取消' },
  ];

  return `
  <div class="page">
    <div class="page-header">
      <button class="back-btn" data-action="user-main">←</button>
      <h2>我的订单</h2>
    </div>
    <div class="page-content">
      <div class="filter-tabs">
        ${tabs.map(t => `<div class="filter-tab ${filter === t.key ? 'active' : ''}" data-action="user-orders" data-filter="${t.key}">${t.label}</div>`).join('')}
      </div>
      ${orders.length === 0 ? `
        <div class="empty-state"><div class="empty-icon">📋</div><p>${filter === 'all' ? '还没有订单' : '没有' + (tabs.find(t => t.key === filter) || {}).label + '的订单'}</p></div>
      ` : orders.map(o => {
        const driver = o.driverId ? drivers.find(d => d.id === o.driverId) : null;
        return `
        <div class="order-card" data-action="order-detail" data-order-id="${o.id}">
          <div class="order-header">
            <span class="order-id">订单 #${o.id.slice(-6).toUpperCase()}</span>
            ${statusBadge(o.status)}
          </div>
          ${driver && ['accepted','ongoing','completed'].includes(o.status) ? `
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding:8px 10px;background:var(--bg);border-radius:8px">
            <span style="font-size:18px">🧑‍✈️</span>
            <div style="flex:1">
              <div style="font-size:13px;font-weight:600">${driver.name}</div>
              <div style="font-size:12px;color:var(--text-muted)">⭐ ${driver.rating || '4.9'} 分</div>
            </div>
            ${driver.phone ? `<a href="tel:${driver.phone}" class="btn btn-sm btn-success contact-list-btn" style="flex-shrink:0">📞 联系</a>` : ''}
          </div>` : ''}
          <div class="order-route">
            <div class="route-item"><span class="route-dot start"></span><span>${o.from}</span></div>
            <div class="route-item" style="padding-left:2px"><span class="route-connector"></span></div>
            <div class="route-item"><span class="route-dot end"></span><span>${o.to}</span></div>
          </div>
          <div class="order-footer">
            <span class="order-price">${formatPrice(o.price)}</span>
            <span class="order-time">${o.createdAt}</span>
          </div>
          ${o.status === 'completed' ? `<div style="padding:10px 0 0;border-top:1px solid var(--border);margin-top:8px;display:flex;gap:8px;justify-content:flex-end">
            <button class="btn btn-sm btn-primary reorder-btn" data-from="${o.from}" data-to="${o.to}" style="font-size:12px">🚗 再来一单</button>
          </div>` : ''}
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

// ============================================================
//  司机端 - 主页
// ============================================================
function renderDriverMain() {
  const d = State.currentUser;
  const myOrders = DB.getList('orders').filter(o => o.driverId === d.id);
  const completedOrders = myOrders.filter(o => o.status === 'completed');
  const totalIncome = completedOrders.reduce((s, o) => s + Number(o.price), 0);
  const pendingOrders = DB.getList('orders').filter(o => o.status === 'pending');
  const unreadCount = getUnreadCount(d.id);

  return `
  <div class="driver-home has-nav">
    <div class="top-bar">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div class="greeting" style="font-size:14px;opacity:0.8">代驾司机</div>
          <div class="username" style="font-size:22px;font-weight:700;color:#fff">${d.name}</div>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <div class="topbar-icon-wrap topbar-icon-light" data-action="notifications">
            🔔
            ${unreadCount > 0 ? `<span class="unread-badge">${unreadCount > 99 ? '99+' : unreadCount}</span>` : ''}
          </div>
          <div style="color:#fff;opacity:0.8;font-size:13px">📞 ${d.phone}</div>
        </div>
      </div>
      <div class="status-toggle" data-action="toggle-online" style="cursor:pointer">
        <div class="toggle-switch ${State.driverOnline ? 'on' : ''}" id="toggle-sw"></div>
        <div class="toggle-label">
          <div style="color:#fff;font-size:14px;font-weight:600">${State.driverOnline ? '🟢 接单中' : '⚫ 休息中'}</div>
          <div style="color:rgba(255,255,255,0.6);font-size:12px">${State.driverOnline ? '您已上线，可以接单' : '点击开始接单'}</div>
        </div>
        <div class="toggle-status ${State.driverOnline ? 'on' : 'off'}">${State.driverOnline ? 'ON' : 'OFF'}</div>
      </div>
    </div>

    <div class="stats-bar">
      <div class="stat-item">
        <div class="stat-value">${completedOrders.length}</div>
        <div class="stat-label">总行程</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${formatPrice(totalIncome)}</div>
        <div class="stat-label">累计收入</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${d.rating || '4.9'}</div>
        <div class="stat-label">评分</div>
      </div>
    </div>

    <div style="padding:20px 20px 0">
      ${State.driverOnline ? (
        pendingOrders.length > 0 ? `
        <div style="background:linear-gradient(135deg,#f093fb,#f5576c);border-radius:16px;padding:16px;color:#fff;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;cursor:pointer" data-action="order-hall">
          <div>
            <div style="font-size:16px;font-weight:700">📢 有新订单！</div>
            <div style="font-size:13px;opacity:0.9;margin-top:4px">当前 ${pendingOrders.length} 个订单等待接单</div>
          </div>
          <div style="font-size:28px">→</div>
        </div>` : `
        <div class="empty-state" style="padding:40px 0">
          <div class="empty-icon">🔍</div>
          <p>暂无新订单，等待中…</p>
        </div>`
      ) : `
      <div class="empty-state" style="padding:40px 0">
        <div class="empty-icon">😴</div>
        <p>上线后即可查看并接单</p>
      </div>`}
    </div>

    ${myOrders.filter(o => o.status === 'accepted' || o.status === 'ongoing').length > 0 ? `
    <div class="section-title">🚗 进行中的订单</div>
    ${myOrders.filter(o => ['accepted','ongoing'].includes(o.status)).map(o => `
      <div class="order-card" data-action="order-detail" data-order-id="${o.id}" style="margin:0 20px 12px">
        <div class="order-header">
          <span class="order-id">订单 #${o.id.slice(-6).toUpperCase()}</span>
          ${statusBadge(o.status)}
        </div>
        <div class="order-route">
          <div class="route-item"><span class="route-dot start"></span><span>${o.from}</span></div>
          <div class="route-item" style="padding-left:2px"><span class="route-connector"></span></div>
          <div class="route-item"><span class="route-dot end"></span><span>${o.to}</span></div>
        </div>
        <div class="order-footer">
          <span class="order-price">${formatPrice(o.price)}</span>
          <span class="order-time">${o.createdAt}</span>
        </div>
      </div>
    `).join('')}` : ''}
  </div>

  <nav class="bottom-nav">
    <div class="nav-item active"><span class="nav-icon">🏠</span>首页</div>
    <div class="nav-item" data-action="order-hall"><span class="nav-icon">📢</span>接单大厅</div>
    <div class="nav-item" data-action="driver-orders"><span class="nav-icon">📋</span>我的订单</div>
    <div class="nav-item" data-action="profile"><span class="nav-icon">👤</span>我的</div>
  </nav>`;
}

// ============================================================
//  司机端 - 订单大厅
// ============================================================
function renderOrderHall() {
  if (!State.driverOnline) {
    return `
    <div class="page">
      <div class="page-header">
        <button class="back-btn" data-action="driver-main">←</button>
        <h2>接单大厅</h2>
      </div>
      <div class="page-content">
        <div class="empty-state">
          <div class="empty-icon">⚫</div>
          <p>请先上线才能查看订单</p>
          <button class="btn btn-secondary" data-action="toggle-online" style="margin-top:16px;background:#2C3E50">立即上线</button>
        </div>
      </div>
    </div>`;
  }

  const allOrders = DB.getList('orders').filter(o => o.status === 'pending');

  return `
  <div class="page">
    <div class="page-header">
      <button class="back-btn" data-action="driver-main">←</button>
      <h2>接单大厅</h2>
      <span class="badge badge-warning">${allOrders.length} 个待接</span>
    </div>
    <div class="page-content">
      ${allOrders.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <p>暂无待接订单，稍后再来看看</p>
        </div>
      ` : allOrders.map(o => {
        const users = DB.getList('users');
        const user = users.find(u => u.id === o.userId);
        const pName = o.customerName || (user ? user.name : '乘客');
        const pPhone = o.customerPhone || (user ? user.phone : '');
        return `
        <div class="hall-order-card">
          <div class="hall-header">
            <div>
              <div class="order-user">👤 ${pName}</div>
              ${pPhone ? `<div class="order-meta">📞 ${pPhone}</div>` : ''}
              <div class="order-meta">${o.createdAt}</div>
            </div>
            <span class="order-price" style="font-size:20px">${formatPrice(o.price)}</span>
          </div>
          <div class="order-route" style="margin-bottom:12px">
            <div class="route-item"><span class="route-dot start"></span><span>${o.from}</span></div>
            <div class="route-item" style="padding-left:2px"><span class="route-connector"></span></div>
            <div class="route-item"><span class="route-dot end"></span><span>${o.to}</span></div>
          </div>
          ${o.note ? `<div style="font-size:13px;color:var(--text-muted);margin-bottom:10px">💬 ${o.note}</div>` : ''}
          <button class="btn btn-secondary btn-block" data-action="accept-order" data-order-id="${o.id}" style="background:#2C3E50">🚗 接单</button>
        </div>`;
      }).join('')}

      <!-- 主动创单入口 -->
      <div style="margin-top:24px;padding-top:16px;border-top:1px solid var(--border)">
        <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:16px;padding:16px;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:space-between" data-action="driver-create-order">
          <div>
            <div style="font-size:16px;font-weight:700">🤝 主动创单</div>
            <div style="font-size:13px;opacity:0.9;margin-top:4px">为客户创建代驾订单</div>
          </div>
          <div style="font-size:28px">+</div>
        </div>
      </div>
    </div>
  </div>`;
}

// ============================================================
//  司机端 - 主动创单（帮客户下单）
// ============================================================
function renderDriverCreateOrder() {
  return `
  <div class="page">
    <div class="page-header">
      <button class="back-btn" data-action="order-hall">←</button>
      <h2>主动创单</h2>
    </div>
    <div class="page-content">
      <!-- 地图区域 -->
      <div class="map-container" id="drv-map-container">
        <div id="drv-order-map" class="map-canvas"></div>
        <div class="map-search-bar">
          <div class="map-search-input-wrap">
            <span class="map-search-icon">🔍</span>
            <input class="map-search-input" id="drv-map-search-input" placeholder="搜索地点..." />
          </div>
        </div>
        <div class="map-search-results" id="drv-map-search-results" style="display:none"></div>
        <div class="map-toolbar">
          <button class="map-tool-btn" id="drv-map-locate-btn" title="定位当前位置">📍</button>
          <div class="map-tool-info" id="drv-map-tool-info">点击地图选择位置</div>
        </div>
      </div>

      <div class="card">
        <div class="form-group">
          <label>👤 客户姓名</label>
          <input class="form-control" id="drv-co-name" placeholder="请输入客户姓名" />
        </div>
        <div class="form-group">
          <label>📞 客户电话</label>
          <input class="form-control" id="drv-co-phone" placeholder="请输入客户手机号" />
        </div>
        <div class="form-group">
          <label>🟢 出发地 <span style="color:var(--text-muted);font-size:12px;font-weight:400">（地图选点或搜索）</span></label>
          <input class="form-control" id="drv-co-from" placeholder="请输入出发地址" readonly />
          <input type="hidden" id="drv-co-from-lat" />
          <input type="hidden" id="drv-co-from-lng" />
        </div>
        <div style="text-align:center;color:var(--text-muted);font-size:18px;padding:2px 0">⇅</div>
        <div class="form-group">
          <label>🔴 目的地 <span style="color:var(--text-muted);font-size:12px;font-weight:400">（地图选点或搜索）</span></label>
          <input class="form-control" id="drv-co-to" placeholder="请输入目的地址" readonly />
          <input type="hidden" id="drv-co-to-lat" />
          <input type="hidden" id="drv-co-to-lng" />
        </div>
        <div class="form-group">
          <label>💰 费用（元）</label>
          <input class="form-control" id="drv-co-price" type="number" placeholder="请输入代驾费用" />
        </div>
        <div class="form-group">
          <label>📝 备注（可选）</label>
          <input class="form-control" id="drv-co-note" placeholder="例：车停在地下车库B1" />
        </div>
      </div>

      <div class="card" style="margin-top:12px;background:#FFF9EB;border:1px solid #FFD93D">
        <div style="font-size:13px;color:#8B6914;display:flex;align-items:flex-start;gap:8px">
          <span style="font-size:16px">💡</span>
          <div>
            <strong>提示：</strong>创建的订单将自动指派给您，状态直接变为"已接单"。
            客户信息将记录在订单中，方便后续联系。
          </div>
        </div>
      </div>

      <button class="btn btn-success btn-block" id="drv-create-order-btn" style="margin-top:16px">🤝 确认创单</button>
    </div>
  </div>`;
}

// ============================================================
//  司机端 - 我的订单
// ============================================================
function renderDriverOrders() {
  const d = State.currentUser;
  const allOrders = DB.getList('orders').filter(o => o.driverId === d.id).reverse();
  const users = DB.getList('users');
  const filter = State.pageParams.filter || 'all';
  const orders = filter === 'all' ? allOrders : allOrders.filter(o => o.status === filter);
  const tabs = [
    { key: 'all', label: '全部' },
    { key: 'accepted', label: '已接单' },
    { key: 'ongoing', label: '代驾中' },
    { key: 'completed', label: '已完成' },
    { key: 'cancelled', label: '已取消' },
  ];

  return `
  <div class="page">
    <div class="page-header">
      <button class="back-btn" data-action="driver-main">←</button>
      <h2>我的订单</h2>
    </div>
    <div class="page-content">
      <div class="filter-tabs">
        ${tabs.map(t => `<div class="filter-tab ${filter === t.key ? 'active' : ''}" data-action="driver-orders" data-filter="${t.key}">${t.label}</div>`).join('')}
      </div>
      ${orders.length === 0 ? `
        <div class="empty-state"><div class="empty-icon">📋</div><p>${filter === 'all' ? '还没有接过订单' : '没有' + (tabs.find(t => t.key === filter) || {}).label + '的订单'}</p></div>
      ` : orders.map(o => {
        const pName = o.customerName || (o.userId ? (users.find(u => u.id === o.userId) || {}).name : '');
        const pPhone = o.customerPhone || (o.userId ? (users.find(u => u.id === o.userId) || {}).phone : '');
        return `
        <div class="order-card" data-action="order-detail" data-order-id="${o.id}">
          <div class="order-header">
            <span class="order-id">订单 #${o.id.slice(-6).toUpperCase()}</span>
            ${statusBadge(o.status)}
          </div>
          ${pName && ['accepted','ongoing','completed'].includes(o.status) ? `
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding:8px 10px;background:var(--bg);border-radius:8px">
            <span style="font-size:18px">👤</span>
            <div style="flex:1">
              <div style="font-size:13px;font-weight:600">${pName}</div>
              ${pPhone ? `<div style="font-size:12px;color:var(--text-muted)">📞 ${pPhone}</div>` : ''}
            </div>
            ${pPhone ? `<a href="tel:${pPhone}" class="btn btn-sm btn-success contact-list-btn" style="flex-shrink:0">📞 联系</a>` : ''}
          </div>` : ''}
          <div class="order-route">
            <div class="route-item"><span class="route-dot start"></span><span>${o.from}</span></div>
            <div class="route-item" style="padding-left:2px"><span class="route-connector"></span></div>
            <div class="route-item"><span class="route-dot end"></span><span>${o.to}</span></div>
          </div>
          <div class="order-footer">
            <span class="order-price">${formatPrice(o.price)}</span>
            <span class="order-time">${o.createdAt}</span>
          </div>
          ${o.status === 'completed' ? `<div style="padding:10px 0 0;border-top:1px solid var(--border);margin-top:8px;display:flex;gap:8px;justify-content:flex-end">
            <button class="btn btn-sm btn-primary reorder-btn" data-from="${o.from}" data-to="${o.to}" style="font-size:12px">🚗 再来一单</button>
          </div>` : ''}
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

// ============================================================
//  个人中心
// ============================================================
function renderProfile() {
  const u = State.currentUser;
  const isDriver = u.type === 'driver';
  const unreadCount = getUnreadCount(u.id);

  return `
  <div class="page">
    <div class="page-header">
      <button class="back-btn" data-action="${isDriver ? 'driver-main' : 'user-main'}">←</button>
      <h2>个人中心</h2>
      <div class="topbar-icon-wrap" data-action="notifications" style="position:relative;top:0">
        🔔
        ${unreadCount > 0 ? `<span class="unread-badge">${unreadCount > 99 ? '99+' : unreadCount}</span>` : ''}
      </div>
    </div>
    <div class="page-content">
      <div style="text-align:center;padding:24px 0">
        <div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,var(--primary),#FF8C42);display:flex;align-items:center;justify-content:center;font-size:36px;margin:0 auto 12px">${isDriver ? '🧑‍✈️' : '👤'}</div>
        <div style="font-size:20px;font-weight:700">${u.name}</div>
        <div style="font-size:14px;color:var(--text-muted);margin-top:4px">${isDriver ? '代驾司机' : '乘客'}</div>
      </div>

      <div class="card">
        <div class="card-header">账号信息</div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
          <span style="color:var(--text-muted)">手机号</span><span>${u.phone}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
          <span style="color:var(--text-muted)">注册时间</span><span style="font-size:12px">${u.createdAt || '未知'}</span>
        </div>
        ${isDriver ? `
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
          <span style="color:var(--text-muted)">驾驶证号</span><span>${u.license || '未填写'}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px 0">
          <span style="color:var(--text-muted)">评分</span><span>⭐ ${u.rating || '4.9'}</span>
        </div>` : `
        <div style="display:flex;justify-content:space-between;padding:8px 0">
          <span style="color:var(--text-muted)">账号ID</span><span style="font-size:12px;color:var(--text-muted)">${u.id.slice(-8).toUpperCase()}</span>
        </div>`}
      </div>

      <div class="card">
        <div class="card-header">更多</div>
        <div style="display:flex;flex-direction:column;gap:4px">
          <div data-action="notifications" style="padding:12px 0;border-bottom:1px solid var(--border);cursor:pointer;display:flex;justify-content:space-between;align-items:center">
            <span>📢 消息通知</span>
            <span style="display:flex;align-items:center;gap:6px">${unreadCount > 0 ? `<span class="unread-badge" style="font-size:11px">${unreadCount}</span>` : ''}<span style="color:var(--text-muted)">›</span></span>
          </div>
          <div data-action="stats" style="padding:12px 0;border-bottom:1px solid var(--border);cursor:pointer;display:flex;justify-content:space-between;align-items:center">
            <span>📊 统计报表</span><span style="color:var(--text-muted)">›</span>
          </div>
          <div data-action="feedback" style="padding:12px 0;border-bottom:1px solid var(--border);cursor:pointer;display:flex;justify-content:space-between;align-items:center">
            <span>💡 意见反馈</span><span style="color:var(--text-muted)">›</span>
          </div>
          <div data-action="about" style="padding:12px 0;border-bottom:1px solid var(--border);cursor:pointer;display:flex;justify-content:space-between;align-items:center">
            <span>ℹ️ 关于</span><span style="color:var(--text-muted)">›</span>
          </div>
          <div data-action="clear-data" style="padding:12px 0;cursor:pointer;display:flex;justify-content:space-between;align-items:center">
            <span style="color:var(--danger)">🗑️ 清空本地数据</span><span style="color:var(--text-muted)">›</span>
          </div>
        </div>
      </div>

      <button class="btn btn-danger btn-block" data-action="logout" style="margin-top:8px">退出登录</button>
    </div>
  </div>`;
}

// ============================================================
//  统计报表
// ============================================================
function renderStats() {
  const u = State.currentUser;
  const isDriver = u.type === 'driver';
  const orders = DB.getList('orders');
  const myOrders = isDriver
    ? orders.filter(o => o.driverId === u.id)
    : orders.filter(o => o.userId === u.id);

  const completed = myOrders.filter(o => o.status === 'completed');
  const cancelled = myOrders.filter(o => o.status === 'cancelled');
  const ongoing = myOrders.filter(o => ['accepted', 'ongoing'].includes(o.status));
  const pending = myOrders.filter(o => o.status === 'pending');
  const totalMoney = completed.reduce((s, o) => s + Number(o.price), 0);

  return `
  <div class="page">
    <div class="page-header">
      <button class="back-btn" data-action="${isDriver ? 'driver-main' : 'user-main'}">←</button>
      <h2>统计报表</h2>
    </div>
    <div class="page-content">
      <div class="card">
        <div class="card-header">${isDriver ? '📊 接单统计' : '📊 出行统计'}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div style="text-align:center;padding:16px;background:var(--bg);border-radius:12px">
            <div style="font-size:28px;font-weight:700;color:var(--primary)">${myOrders.length}</div>
            <div style="font-size:13px;color:var(--text-muted);margin-top:4px">总订单数</div>
          </div>
          <div style="text-align:center;padding:16px;background:var(--bg);border-radius:12px">
            <div style="font-size:28px;font-weight:700;color:var(--success)">${completed.length}</div>
            <div style="font-size:13px;color:var(--text-muted);margin-top:4px">已完成</div>
          </div>
          <div style="text-align:center;padding:16px;background:var(--bg);border-radius:12px">
            <div style="font-size:28px;font-weight:700;color:var(--warning)">${pending.length + ongoing.length}</div>
            <div style="font-size:13px;color:var(--text-muted);margin-top:4px">进行中</div>
          </div>
          <div style="text-align:center;padding:16px;background:var(--bg);border-radius:12px">
            <div style="font-size:28px;font-weight:700;color:var(--danger)">${cancelled.length}</div>
            <div style="font-size:13px;color:var(--text-muted);margin-top:4px">已取消</div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header">${isDriver ? '💰 收入统计' : '💰 消费统计'}</div>
        <div style="text-align:center;padding:20px 0">
          <div style="font-size:36px;font-weight:700;color:var(--primary)">${formatPrice(totalMoney)}</div>
          <div style="font-size:13px;color:var(--text-muted);margin-top:8px">${isDriver ? '累计收入' : '累计消费'}</div>
        </div>
        ${completed.length > 0 ? `
        <div style="border-top:1px solid var(--border);padding-top:12px">
          <div style="display:flex;justify-content:space-between;font-size:13px;color:var(--text-muted)">
            <span>平均每单</span>
            <span style="color:var(--text)">${formatPrice(totalMoney / completed.length)}</span>
          </div>
        </div>` : ''}
      </div>
    </div>
  </div>`;
}

// ============================================================
//  通知中心
// ============================================================
function renderNotifications() {
  var u = State.currentUser;
  var isDriver = u.type === 'driver';
  var allNotifs = DB.getList('notifications').filter(function(n) { return n.userId === u.id; });
  var unreadNotifs = allNotifs.filter(function(n) { return !n.read; });
  // 自动标记已读
  if (unreadNotifs.length > 0) { markAllRead(u.id); }
  var notifs = allNotifs.slice(0, 30);
  var typeIcons = { order: '📦', system: '📢', promo: '🎉', payment: '💰', rating: '⭐' };

  return `
  <div class="page">
    <div class="page-header">
      <button class="back-btn" data-action="${isDriver ? 'driver-main' : 'user-main'}">←</button>
      <h2>消息通知</h2>
    </div>
    <div class="page-content">
      ${notifs.length === 0 ? `
        <div class="empty-state"><div class="empty-icon">🔔</div><p>暂无消息</p></div>
      ` : notifs.map(function(n) {
        var icon = typeIcons[n.type] || '📢';
        return `
        <div class="notification-card" style="opacity:${n.read ? '0.6' : '1'}">
          <div class="notification-icon">${icon}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:14px;font-weight:600;margin-bottom:3px">${n.title}</div>
            <div style="font-size:13px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${n.content}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:4px;opacity:0.7">${n.time}</div>
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

// ============================================================
//  意见反馈
// ============================================================
function renderFeedback() {
  var u = State.currentUser;
  var isDriver = u.type === 'driver';
  return `
  <div class="page">
    <div class="page-header">
      <button class="back-btn" data-action="profile">←</button>
      <h2>意见反馈</h2>
    </div>
    <div class="page-content">
      <div class="card">
        <div class="card-header">📝 您的反馈对我们很重要</div>
        <div style="margin-bottom:16px">
          <label style="font-size:13px;font-weight:600;display:block;margin-bottom:8px">反馈类型</label>
          <div class="feedback-types" id="feedback-types">
            <div class="feedback-type active" data-type="suggestion">💡 建议</div>
            <div class="feedback-type" data-type="bug">🐛 问题</div>
            <div class="feedback-type" data-type="complaint">😤 投诉</div>
            <div class="feedback-type" data-type="praise">👍 表扬</div>
          </div>
        </div>
        <div style="margin-bottom:16px">
          <label style="font-size:13px;font-weight:600;display:block;margin-bottom:8px">详细描述</label>
          <textarea id="feedback-content" class="form-control" style="min-height:120px;resize:vertical;font-family:inherit" placeholder="请详细描述您的反馈内容，我们会认真对待每一条反馈…"></textarea>
        </div>
        <div style="margin-bottom:16px">
          <label style="font-size:13px;font-weight:600;display:block;margin-bottom:8px">联系方式（选填）</label>
          <input class="form-control" id="feedback-contact" placeholder="手机号或邮箱，方便我们回复您" value="${u.phone || ''}" />
        </div>
        <button class="btn btn-primary btn-block" id="submit-feedback-btn">提交反馈</button>
      </div>
      <div style="margin-top:16px;padding:16px;background:var(--bg);border-radius:12px;font-size:13px;color:var(--text-muted);display:flex;align-items:flex-start;gap:10px">
        <span style="font-size:18px">📞</span>
        <div>如需紧急帮助，请拨打客服热线：<strong style="color:var(--primary)">400-888-6666</strong>（工作日 9:00-18:00）</div>
      </div>
    </div>
  </div>`;
}

// ============================================================
//  关于页面
// ============================================================
function renderAbout() {
  var u = State.currentUser;
  var isDriver = u.type === 'driver';
  return `
  <div class="page">
    <div class="page-header">
      <button class="back-btn" data-action="profile">←</button>
      <h2>关于</h2>
    </div>
    <div class="page-content">
      <div style="text-align:center;padding:32px 0 24px">
        <div style="font-size:56px;margin-bottom:12px">🚗</div>
        <div style="font-size:22px;font-weight:700">代驾出行</div>
        <div style="font-size:13px;color:var(--text-muted);margin-top:6px">安全 · 快捷 · 专业</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:12px;padding:4px 12px;background:var(--bg);border-radius:12px;display:inline-block">v1.0.0</div>
      </div>

      <div class="card">
        <div class="card-header">🛡️ 服务保障</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div style="text-align:center;padding:12px;background:var(--bg);border-radius:10px">
            <div style="font-size:24px;margin-bottom:4px">🛡️</div>
            <div style="font-size:13px;font-weight:600">安全保障</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px">全程保险护航</div>
          </div>
          <div style="text-align:center;padding:12px;background:var(--bg);border-radius:10px">
            <div style="font-size:24px;margin-bottom:4px">🧑‍✈️</div>
            <div style="font-size:13px;font-weight:600">专业司机</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px">严格筛选培训</div>
          </div>
          <div style="text-align:center;padding:12px;background:var(--bg);border-radius:10px">
            <div style="font-size:24px;margin-bottom:4px">💰</div>
            <div style="font-size:13px;font-weight:600">透明计价</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px">无隐形消费</div>
          </div>
          <div style="text-align:center;padding:12px;background:var(--bg);border-radius:10px">
            <div style="font-size:24px;margin-bottom:4px">📞</div>
            <div style="font-size:13px;font-weight:600">24h客服</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px">随时在线支持</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">❓ 常见问题</div>
        <div class="faq-item">
          <div class="faq-q">如何叫代驾？</div>
          <div class="faq-a">进入叫代驾页面，设置出发地和目的地，估算费用后点击"立即下单"即可。</div>
        </div>
        <div class="faq-item">
          <div class="faq-q">费用是如何计算的？</div>
          <div class="faq-a">费用根据出发地到目的地的距离估算。夜间时段（22:00-06:00）自动上浮30%。</div>
        </div>
        <div class="faq-item">
          <div class="faq-q">如何取消订单？</div>
          <div class="faq-a">在订单详情页，待接单状态下可以取消订单。司机接单后请联系客服处理。</div>
        </div>
        <div class="faq-item">
          <div class="faq-q">如何成为代驾司机？</div>
          <div class="faq-a">在首页选择"我是司机"，填写真实姓名、手机号、驾驶证号完成注册即可。</div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">📋 服务条款</div>
        <div style="font-size:13px;color:var(--text-muted);line-height:1.8">
          <p>1. 本平台为代驾服务信息撮合平台，提供司机与乘客的对接服务。</p>
          <p>2. 代驾过程中请遵守交通法规，安全驾驶。</p>
          <p>3. 如有纠纷请联系平台客服协调处理。</p>
          <p>4. 本平台致力于提供安全便捷的代驾服务。</p>
        </div>
      </div>

      <div style="text-align:center;padding:20px 0;font-size:12px;color:var(--text-muted)">
        © 2026 代驾出行<br>安全 · 快捷 · 专业
      </div>
    </div>
  </div>`;
}

// ============================================================
//  事件绑定
// ============================================================
function bindEvents() {
  // 通用 data-action 路由
  document.querySelectorAll('[data-action]').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      handleAction(el.dataset.action, el.dataset);
    });
  });

  // Tab 切换（登录/注册）
  document.querySelectorAll('[data-tab]').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      const tab = el.dataset.tab;
      if (State.currentPage === 'user-auth') {
        navigate('user-auth', { tab });
      } else if (State.currentPage === 'driver-auth') {
        navigate('driver-auth', { tab });
      }
    });
  });

  // 联系按钮阻止冒泡（避免触发订单卡片的跳转）
  document.querySelectorAll('.contact-btn, .contact-list-btn').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
    });
  });

  // 用户登录表单
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', e => {
      e.preventDefault();
      const phone = document.getElementById('login-phone').value.trim();
      const pwd = document.getElementById('login-pwd').value;
      const user = DB.getList('users').find(u => u.phone === phone && u.pwd === pwd);
      if (!user) { showToast('手机号或密码错误', 'error'); return; }
      State.currentUser = { ...user, type: 'user' };
      showToast('登录成功，欢迎回来 ' + user.name, 'success');
      navigate('user-main');
    });
  }

  // 用户注册表单
  const regForm = document.getElementById('register-form');
  if (regForm) {
    regForm.addEventListener('submit', e => {
      e.preventDefault();
      const name = document.getElementById('reg-name').value.trim();
      const phone = document.getElementById('reg-phone').value.trim();
      const pwd = document.getElementById('reg-pwd').value;
      const pwd2 = document.getElementById('reg-pwd2').value;
      if (!name) { showToast('请输入昵称', 'error'); return; }
      if (!/^1\d{10}$/.test(phone)) { showToast('请输入正确的手机号', 'error'); return; }
      if (pwd.length < 6) { showToast('密码至少6位', 'error'); return; }
      if (pwd !== pwd2) { showToast('两次密码不一致', 'error'); return; }
      if (DB.getList('users').find(u => u.phone === phone)) { showToast('该手机号已注册', 'error'); return; }
      const user = { id: genId(), name, phone, pwd, createdAt: now() };
      DB.push('users', user);
      State.currentUser = { ...user, type: 'user' };
      showToast('注册成功！', 'success');
      navigate('user-main');
    });
  }

  // 司机登录表单
  const dLoginForm = document.getElementById('driver-login-form');
  if (dLoginForm) {
    dLoginForm.addEventListener('submit', e => {
      e.preventDefault();
      const phone = document.getElementById('dlogin-phone').value.trim();
      const pwd = document.getElementById('dlogin-pwd').value;
      const driver = DB.getList('drivers').find(d => d.phone === phone && d.pwd === pwd);
      if (!driver) { showToast('手机号或密码错误', 'error'); return; }
      State.currentUser = { ...driver, type: 'driver' };
      showToast('登录成功，欢迎 ' + driver.name, 'success');
      navigate('driver-main');
    });
  }

  // 司机注册表单
  const dRegForm = document.getElementById('driver-register-form');
  if (dRegForm) {
    dRegForm.addEventListener('submit', e => {
      e.preventDefault();
      const name = document.getElementById('dreg-name').value.trim();
      const phone = document.getElementById('dreg-phone').value.trim();
      const license = document.getElementById('dreg-license').value.trim();
      const pwd = document.getElementById('dreg-pwd').value;
      const pwd2 = document.getElementById('dreg-pwd2').value;
      if (!name) { showToast('请输入真实姓名', 'error'); return; }
      if (!/^1\d{10}$/.test(phone)) { showToast('请输入正确的手机号', 'error'); return; }
      if (!license) { showToast('请输入驾驶证号', 'error'); return; }
      if (pwd.length < 6) { showToast('密码至少6位', 'error'); return; }
      if (pwd !== pwd2) { showToast('两次密码不一致', 'error'); return; }
      if (DB.getList('drivers').find(d => d.phone === phone)) { showToast('该手机号已注册', 'error'); return; }
      const driver = { id: genId(), name, phone, license, pwd, rating: '4.9', createdAt: now() };
      DB.push('drivers', driver);
      State.currentUser = { ...driver, type: 'driver' };
      showToast('注册成功，欢迎加入！', 'success');
      navigate('driver-main');
    });
  }

  // ===== 地图初始化（乘客下单页 & 司机创单页共用） =====
  const orderMapEl = document.getElementById('order-map');
  if (orderMapEl && typeof TMap !== 'undefined') {
    initOrderMap('order-map', 'order-from', 'order-from-lat', 'order-from-lng', 'order-to', 'order-to-lat', 'order-to-lng', 'map-search-input', 'map-search-results', 'map-locate-btn', 'map-tool-info');
  }
  const drvMapEl = document.getElementById('drv-order-map');
  if (drvMapEl && typeof TMap !== 'undefined') {
    initOrderMap('drv-order-map', 'drv-co-from', 'drv-co-from-lat', 'drv-co-from-lng', 'drv-co-to', 'drv-co-to-lat', 'drv-co-to-lng', 'drv-map-search-input', 'drv-map-search-results', 'drv-map-locate-btn', 'drv-map-tool-info');
  }

  // ===== 再来一单按钮 =====
  document.querySelectorAll('.reorder-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      State.reorderFrom = btn.dataset.from;
      State.reorderTo = btn.dataset.to;
      navigate('create-order');
    });
  });

  // ===== 反馈表单 =====
  // 反馈类型选择
  document.querySelectorAll('.feedback-type').forEach(function(type) {
    type.addEventListener('click', function() {
      document.querySelectorAll('.feedback-type').forEach(function(t) { t.classList.remove('active'); });
      type.classList.add('active');
    });
  });
  // 提交反馈
  var feedbackBtn = document.getElementById('submit-feedback-btn');
  if (feedbackBtn) {
    feedbackBtn.addEventListener('click', function() {
      var activeType = document.querySelector('.feedback-type.active');
      var feedbackType = activeType ? activeType.dataset.type : 'suggestion';
      var content = document.getElementById('feedback-content').value.trim();
      var contact = document.getElementById('feedback-contact').value.trim();
      if (!content) { showToast('请输入反馈内容', 'error'); return; }
      if (content.length < 5) { showToast('反馈内容至少5个字', 'error'); return; }
      var list = DB.getList('feedbacks');
      list.unshift({ id: genId(), userId: State.currentUser.id, type: feedbackType, content: content, contact: contact, time: now() });
      DB.set('feedbacks', list);
      showToast('反馈提交成功！感谢您的宝贵意见 💚', 'success');
      setTimeout(function() { navigate('profile'); }, 800);
    });
  }

  // 估算费用按钮
  const estimateBtn = document.getElementById('estimate-btn');
  if (estimateBtn) {
    estimateBtn.addEventListener('click', () => {
      const from = document.getElementById('order-from').value.trim();
      const to = document.getElementById('order-to').value.trim();
      if (!from || !to) { showToast('请输入出发地和目的地', 'error'); return; }
      const price = estimatePrice(from, to);
      // 显示价格卡片
      const box = document.getElementById('price-estimate-box');
      const display = document.getElementById('price-display');
      if (box && display) {
        var nightNote = isNightTime() ? '<div style="font-size:11px;color:#E67E22;margin-top:4px">🌙 含夜间服务费（+30%）</div>' : '';
        display.innerHTML = '¥' + price + nightNote;
        box.style.display = 'flex';
      }
      // 启用下单按钮
      const submitBtn = document.getElementById('submit-order-btn');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.dataset.from = from;
        submitBtn.dataset.to = to;
        submitBtn.dataset.price = price;
      }
      showToast('预估费用：¥' + price, 'success');
    });
  }

  // 下单按钮
  const submitOrderBtn = document.getElementById('submit-order-btn');
  if (submitOrderBtn) {
    // 再来一单：自动预填出发地和目的地
    if (State.reorderFrom && State.reorderTo) {
      var fromInput = document.getElementById('order-from');
      var toInput = document.getElementById('order-to');
      if (fromInput) fromInput.value = State.reorderFrom;
      if (toInput) toInput.value = State.reorderTo;
      // 自动估算
      var price = estimatePrice(State.reorderFrom, State.reorderTo);
      var box = document.getElementById('price-estimate-box');
      var display = document.getElementById('price-display');
      if (box && display) {
        var nightNote = isNightTime() ? '<div style="font-size:11px;color:#E67E22;margin-top:4px">🌙 含夜间服务费（+30%）</div>' : '';
        display.innerHTML = '¥' + price + nightNote;
        box.style.display = 'flex';
      }
      submitOrderBtn.disabled = false;
      submitOrderBtn.dataset.from = State.reorderFrom;
      submitOrderBtn.dataset.to = State.reorderTo;
      submitOrderBtn.dataset.price = price;
      State.reorderFrom = null;
      State.reorderTo = null;
      showToast('已自动填入上次行程，点击下单即可 🚗', 'success');
    }
    submitOrderBtn.addEventListener('click', () => {
      const from = submitOrderBtn.dataset.from;
      const to = submitOrderBtn.dataset.to;
      const price = submitOrderBtn.dataset.price;
      const note = document.getElementById('order-note')?.value.trim() || '';
      const order = {
        id: genId(),
        userId: State.currentUser.id,
        from, to, note, price,
        status: 'pending',
        createdAt: now(),
        driverId: null
      };
      DB.push('orders', order);
      addNotification(u.id, '下单成功', '您的代驾订单 #' + order.id.slice(-6).toUpperCase() + ' 已提交，等待司机接单。', 'order');
      showToast('下单成功！等待司机接单 🎉', 'success');
      navigate('order-detail', { orderId: order.id });
    });
  }

  // 评分星星
  document.querySelectorAll('.star-btn').forEach(star => {
    star.addEventListener('click', () => {
      const val = parseInt(star.dataset.star);
      document.querySelectorAll('.star-btn').forEach((s, i) => {
        s.textContent = i < val ? '⭐' : '☆';
      });
      const submitBtn = document.getElementById('submit-rating-btn');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.dataset.rating = val;
      }
    });
  });

  // 提交评分
  const submitRatingBtn = document.getElementById('submit-rating-btn');
  if (submitRatingBtn) {
    submitRatingBtn.addEventListener('click', () => {
      const orderId = submitRatingBtn.dataset.orderId;
      const rating = submitRatingBtn.dataset.rating;
      DB.update('orders', orderId, o => ({ rated: true, userRating: rating }));
      showToast('评分提交成功！感谢您的反馈 ⭐', 'success');
      navigate('user-orders');
    });
  }

  // 客服端事件绑定
  if (typeof bindStaffEvents === 'function') {
    bindStaffEvents();
  }

  // 司机主动创单
  const drvCreateBtn = document.getElementById('drv-create-order-btn');
  if (drvCreateBtn) {
    drvCreateBtn.addEventListener('click', () => {
      const customerName = document.getElementById('drv-co-name').value.trim();
      const customerPhone = document.getElementById('drv-co-phone').value.trim();
      const from = document.getElementById('drv-co-from').value.trim();
      const to = document.getElementById('drv-co-to').value.trim();
      const price = document.getElementById('drv-co-price').value.trim();
      const note = document.getElementById('drv-co-note').value.trim();

      if (!customerName) { showToast('请输入客户姓名', 'error'); return; }
      if (!customerPhone) { showToast('请输入客户电话', 'error'); return; }
      if (!from) { showToast('请输入出发地', 'error'); return; }
      if (!to) { showToast('请输入目的地', 'error'); return; }
      if (!price || isNaN(price) || Number(price) <= 0) { showToast('请输入有效的费用金额', 'error'); return; }

      // 创建订单，自动指派给自己，状态直接为已接单
      const order = {
        id: genId(),
        userId: null, // 非平台用户下单
        driverId: State.currentUser.id,
        from, to, note, price: Number(price),
        status: 'accepted',
        createdAt: now(),
        acceptedAt: now(),
        customerName,
        customerPhone,
        createdByDriver: true
      };
      DB.push('orders', order);
      showToast('创单成功！已自动指派给您 🤝', 'success');
      navigate('order-detail', { orderId: order.id });
    });
  }
}

// ============================================================
//  Action 处理器
// ============================================================
function handleAction(action, dataset) {
  // 客服端 action 优先处理
  if (typeof handleStaffAction === 'function' && handleStaffAction(action, dataset)) return;

  switch (action) {
    case 'go-user':     navigate('user-auth', { tab: 'login' }); break;
    case 'go-driver':   navigate('driver-auth', { tab: 'login' }); break;
    case 'go-home':     navigate('home'); break;
    case 'user-main':   navigate('user-main'); break;
    case 'driver-main': navigate('driver-main'); break;
    case 'create-order':navigate('create-order'); break;
    case 'driver-create-order': navigate('driver-create-order'); break;
    case 'user-orders': navigate('user-orders', { filter: dataset.filter || 'all' }); break;
    case 'driver-orders': navigate('driver-orders', { filter: dataset.filter || 'all' }); break;
    case 'order-hall':  navigate('order-hall'); break;
    case 'stats':       navigate('stats'); break;
    case 'profile':     navigate('profile'); break;
    case 'notifications': navigate('notifications'); break;
    case 'feedback':    navigate('feedback'); break;
    case 'about':       navigate('about'); break;
    case 'logout':      logout(); break;
    case 'clear-data':  clearLocalData(); break;

    case 'order-detail':
      navigate('order-detail', { orderId: dataset.orderId });
      break;

    case 'toggle-online':
      State.driverOnline = !State.driverOnline;
      showToast(State.driverOnline ? '🟢 已上线，开始接单！' : '⚫ 已下线', State.driverOnline ? 'success' : '');
      render();
      break;

    // 司机接单
    case 'accept-order': {
      const orderId = dataset.orderId;
      const order = DB.getList('orders').find(o => o.id === orderId);
      if (!order || order.status !== 'pending') { showToast('订单已被其他司机抢走了', 'error'); render(); break; }
      DB.update('orders', orderId, () => ({
        status: 'accepted',
        driverId: State.currentUser.id,
        acceptedAt: now()
      }));
      addNotification(order.userId, '司机已接单', '您的代驾订单 #' + orderId.slice(-6).toUpperCase() + ' 已被司机接单，请等待司机到达。', 'order');
      addNotification(State.currentUser.id, '接单成功', '您已成功接单 #' + orderId.slice(-6).toUpperCase() + '，请尽快前往出发地。', 'order');
      showToast('接单成功！请前往出发地 🚗', 'success');
      navigate('order-detail', { orderId });
      break;
    }

    // 开始代驾
    case 'start-order': {
      const orderId = dataset.orderId;
      const order = DB.getList('orders').find(o => o.id === orderId);
      DB.update('orders', orderId, () => ({ status: 'ongoing', startedAt: now() }));
      if (order && order.userId) addNotification(order.userId, '代驾已开始', '您的代驾行程已开始，请注意安全。祝您一路顺风！', 'order');
      showToast('代驾已开始，行程进行中 🚗', 'success');
      navigate('order-detail', { orderId });
      break;
    }

    // 完成代驾
    case 'complete-order': {
      const orderId = dataset.orderId;
      const order = DB.getList('orders').find(o => o.id === orderId);
      DB.update('orders', orderId, () => ({ status: 'completed', completedAt: now() }));
      if (order) {
        addNotification(order.userId, '行程已完成', '您的代驾行程已完成，别忘了给司机评价哦！', 'payment');
        addNotification(State.currentUser.id, '订单已完成', '订单 #' + orderId.slice(-6).toUpperCase() + ' 已完成，收入 ' + (order.price || '0') + ' 元。', 'payment');
      }
      showToast('行程完成！感谢您的服务 ✅', 'success');
      navigate('order-detail', { orderId });
      break;
    }

    // 取消订单
    case 'cancel-order': {
      const orderId = dataset.orderId;
      const order = DB.getList('orders').find(o => o.id === orderId);
      if (confirm('确定要取消这个订单吗？')) {
        DB.update('orders', orderId, () => ({ status: 'cancelled', cancelledAt: now() }));
        if (order && order.driverId) addNotification(order.driverId, '订单已取消', '订单 #' + orderId.slice(-6).toUpperCase() + ' 已被乘客取消。', 'order');
        showToast('订单已取消', '');
        navigate('user-orders');
      }
      break;
    }
  }
}

// ============================================================
//  工具操作
// ============================================================
function logout() {
  State.currentUser = null;
  State.driverOnline = false;
  showToast('已退出登录');
  navigate('home');
}

function clearLocalData() {
  if (confirm('确定要清空所有本地数据吗？此操作不可撤销！')) {
    const keys = Object.keys(localStorage);
    keys.filter(k => k.startsWith('dj_')).forEach(k => localStorage.removeItem(k));
    alert('数据已清空，页面将刷新');
    location.reload();
  }
}

// ============================================================
//  初始化
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
  if (!DB.get('initialized')) {
    DB.set('initialized', true);
    // 示例乘客
    DB.push('users', { id: 'demo_user_1', name: '张三', phone: '13800000001', pwd: '123456', createdAt: now() });
    // 示例司机
    DB.push('drivers', { id: 'demo_drv_1', name: '李师傅', phone: '13900000001', license: 'A123456789', pwd: '123456', rating: '4.9', createdAt: now() });
    // 历史已完成订单
    DB.push('orders', {
      id: 'demo_ord_1', userId: 'demo_user_1', driverId: 'demo_drv_1',
      from: '珠江新城地铁站', to: '天河区家乐福', price: '68',
      status: 'completed', createdAt: '2026/3/26 22:00:00',
      acceptedAt: '2026/3/26 22:02:00', completedAt: '2026/3/26 22:45:00', note: ''
    });
    // 历史已取消订单
    DB.push('orders', {
      id: 'demo_ord_2', userId: 'demo_user_1', driverId: null,
      from: '广州南站', to: '白云区万达广场', price: '95',
      status: 'cancelled', createdAt: '2026/3/25 20:00:00', note: ''
    });
    // 示例客服（管理员）
    DB.push('staff', { id: 'demo_staff_1', name: '管理员小王', phone: '13700000001', pwd: '123456', role: 'admin', createdAt: now() });
    // 示例客服（普通）
    DB.push('staff', { id: 'demo_staff_2', name: '客服小李', phone: '13700000002', pwd: '123456', role: 'staff', createdAt: now() });
  }
  navigate('home');
});
