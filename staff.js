/* ================================================
   代驾服务平台 - 客服端/管理后台模块 (Supabase版)
   依赖：supabase.js, app-fixed.js
================================================ */

// ============================================================
//  客服端 - 登录/注册页面
// ============================================================
function renderStaffAuth(tab) {
  tab = tab || 'login';
  return '<div class="page staff-auth-page">' +
    '<div class="page-header"><button class="back-btn" data-action="go-home">←</button><h2>客服 / 管理</h2></div>' +
    '<div class="page-content"><div class="auth-box">' +
      '<div class="auth-tabs">' +
        '<button class="tab-btn ' + (tab === 'login' ? 'active' : '') + '" data-tab="login">登录</button>' +
        '<button class="tab-btn ' + (tab === 'register' ? 'active' : '') + '" data-tab="register">注册</button>' +
      '</div>' +
      '<div id="staff-login-panel" class="auth-panel" style="display:' + (tab === 'login' ? 'block' : 'none') + '">' +
        '<form id="staff-login-form" class="auth-form">' +
          '<div class="form-group"><label>工号 / 手机号</label><input type="text" id="slogin-phone" placeholder="请输入手机号" required></div>' +
          '<div class="form-group"><label>密码</label><input type="password" id="slogin-pwd" placeholder="请输入密码" required></div>' +
          '<button type="submit" class="btn btn-primary btn-block">登录</button>' +
        '</form>' +
      '</div>' +
      '<div id="staff-register-panel" class="auth-panel" style="display:' + (tab === 'register' ? 'block' : 'none') + '">' +
        '<form id="staff-register-form" class="auth-form">' +
          '<div class="form-group"><label>姓名</label><input type="text" id="sreg-name" placeholder="请输入姓名" required></div>' +
          '<div class="form-group"><label>手机号</label><input type="text" id="sreg-phone" placeholder="请输入手机号" required></div>' +
          '<div class="form-group"><label>角色</label><select id="sreg-role"><option value="staff">客服</option><option value="admin">管理员</option></select></div>' +
          '<div class="form-group"><label>密码</label><input type="password" id="sreg-pwd" placeholder="至少6位" required></div>' +
          '<div class="form-group"><label>确认密码</label><input type="password" id="sreg-pwd2" placeholder="再次输入密码" required></div>' +
          '<button type="submit" class="btn btn-primary btn-block">注册</button>' +
        '</form>' +
      '</div>' +
    '</div></div></div>';
}

// ============================================================
//  客服端 - 主页面（仪表盘）
// ============================================================
async function renderStaffMain() {
  const orders = await DB.getOrders();
  const drivers = await DB.getDrivers();
  const users = await DB.getPassengers();
  const s = State.currentUser;

  const pendingOrders = orders.filter(function(o) { return o.status === 'pending'; });
  const ongoingOrders = orders.filter(function(o) { return ['accepted', 'ongoing'].includes(o.status); });
  const completedOrders = orders.filter(function(o) { return o.status === 'completed'; });
  const todayStr = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const todayOrders = orders.filter(function(o) { return o.createdAt && o.createdAt.includes(todayStr); });
  const totalRevenue = completedOrders.reduce(function(sum, o) { return sum + (parseFloat(o.price) || 0); }, 0);

  const roleLabel = s.role === 'admin' ? '🛡️ 管理员' : '🎧 客服';

  let pendingHtml = '';
  if (pendingOrders.length > 0) {
    pendingHtml = '<div class="card staff-alert-card" style="margin-top:16px"><div class="card-header">🔔 待处理订单</div>';
    pendingOrders.slice(0, 3).forEach(function(o) {
      var user = o.userId ? users.find(function(u) { return u.id === o.userId; }) : null;
      pendingHtml += '<div class="staff-pending-item"><div><div style="font-weight:600">' + o.from + ' → ' + o.to + '</div><div style="font-size:12px;color:var(--text-muted)">' + (user ? user.name : '未知') + ' | ' + formatPrice(o.price) + '</div></div><button class="btn btn-sm btn-success" data-action="staff-dispatch" data-order-id="' + o.id + '">派单</button></div>';
    });
    if (pendingOrders.length > 3) {
      pendingHtml += '<div style="text-align:center;padding:8px;color:var(--text-muted);font-size:13px">还有 ' + (pendingOrders.length - 3) + ' 个待处理订单...</div>';
    }
    pendingHtml += '</div>';
  } else {
    pendingHtml = '<div class="card staff-empty-card" style="margin-top:16px"><div class="staff-empty-icon">✅</div><div class="staff-empty-text">暂无待处理订单</div></div>';
  }

  return '<div class="page staff-page">' +
    '<div class="staff-top-bar"><div><div class="staff-greeting">你好，' + s.name + '</div><div class="staff-role">' + roleLabel + '</div></div><button class="btn btn-sm btn-outline" data-action="staff-logout">退出登录</button></div>' +
    '<div class="page-content">' +
      '<div class="staff-overview">' +
        '<div class="staff-stat-card accent-orange"><div class="staff-stat-num">' + pendingOrders.length + '</div><div class="staff-stat-label">待接单</div></div>' +
        '<div class="staff-stat-card accent-blue"><div class="staff-stat-num">' + ongoingOrders.length + '</div><div class="staff-stat-label">进行中</div></div>' +
        '<div class="staff-stat-card accent-green"><div class="staff-stat-num">' + completedOrders.length + '</div><div class="staff-stat-label">已完成</div></div>' +
        '<div class="staff-stat-card accent-purple"><div class="staff-stat-num">' + formatPrice(totalRevenue) + '</div><div class="staff-stat-label">总收入</div></div>' +
      '</div>' +
      '<div class="staff-row">' +
        '<div class="staff-mini-stat"><span>今日订单</span><strong>' + todayOrders.length + '</strong></div>' +
        '<div class="staff-mini-stat"><span>注册司机</span><strong>' + drivers.length + '</strong></div>' +
        '<div class="staff-mini-stat"><span>注册用户</span><strong>' + users.length + '</strong></div>' +
        '<div class="staff-mini-stat"><span>总订单</span><strong>' + orders.length + '</strong></div>' +
      '</div>' +
      '<div class="card" style="margin-top:16px"><div class="card-header">⚡ 快捷操作</div>' +
        '<div class="staff-actions-grid">' +
          '<button class="staff-action-btn" data-action="staff-orders"><span class="staff-action-icon">📋</span><span>订单管理</span></button>' +
          '<button class="staff-action-btn" data-action="staff-dispatch"><span class="staff-action-icon">🚀</span><span>主动派单</span></button>' +
          '<button class="staff-action-btn" data-action="staff-drivers"><span class="staff-action-icon">🧑‍✈️</span><span>司机管理</span></button>' +
          '<button class="staff-action-btn" data-action="staff-users"><span class="staff-action-icon">👥</span><span>用户管理</span></button>' +
          '<button class="staff-action-btn" data-action="staff-stats"><span class="staff-action-icon">📊</span><span>数据统计</span></button>' +
        '</div>' +
      '</div>' +
      pendingHtml +
    '</div></div>';
}

// ============================================================
//  客服端 - 订单管理
// ============================================================
async function renderStaffOrders() {
  const orders = await DB.getOrders();
  const users = await DB.getUsers();
  const drivers = await DB.getDrivers();
  orders.sort(function(a, b) {
    var ta = a.createdAt ? new Date(a.createdAt.replace(/\//g, '-')) : 0;
    var tb = b.createdAt ? new Date(b.createdAt.replace(/\//g, '-')) : 0;
    return tb - ta;
  });
  const filterStatus = State.pageParams.filterStatus || 'all';
  const filtered = filterStatus === 'all' ? orders : orders.filter(function(o) { return o.status === filterStatus; });

  const statusFilters = [
    { key: 'all', label: '全部' },
    { key: 'pending', label: '待接单' },
    { key: 'accepted', label: '已接单' },
    { key: 'ongoing', label: '代驾中' },
    { key: 'completed', label: '已完成' },
    { key: 'cancelled', label: '已取消' },
  ];

  let ordersHtml = '';
  if (filtered.length === 0) {
    ordersHtml = '<div class="staff-empty-card"><div class="staff-empty-icon">📋</div><div class="staff-empty-text">暂无订单</div></div>';
  } else {
    filtered.forEach(function(o) {
      var user = o.userId ? users.find(function(u) { return u.id === o.userId; }) : null;
      var driver = o.driverId ? drivers.find(function(d) { return d.id === o.driverId; }) : null;
      ordersHtml += '<div class="card staff-order-card" style="margin-top:10px">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><span style="font-size:12px;color:var(--text-muted)">#' + o.id.slice(-8).toUpperCase() + '</span>' + statusBadge(o.status) + '</div>' +
        '<div class="order-route" style="margin-bottom:8px"><div class="route-item"><span class="route-dot start"></span><div>' + o.from + '</div></div><div class="route-item"><span class="route-connector"></span></div><div class="route-item"><span class="route-dot end"></span><div>' + o.to + '</div></div></div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;font-size:13px"><div><span>' + (user ? user.name : '未知') + '</span>' + (driver ? '<span style="margin-left:8px">司机：' + driver.name + '</span>' : '') + '</div><strong style="color:var(--accent)">' + formatPrice(o.price) + '</strong></div>' +
        '<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">' +
          '<button class="btn btn-sm btn-outline" data-action="order-detail" data-order-id="' + o.id + '">详情</button>' +
          (o.status === 'pending' ? '<button class="btn btn-sm btn-success" data-action="staff-dispatch" data-order-id="' + o.id + '">派单</button><button class="btn btn-sm btn-danger" data-action="staff-cancel-order" data-order-id="' + o.id + '">取消</button>' : '') +
          (o.status === 'accepted' ? '<button class="btn btn-sm btn-success" data-action="staff-start-order" data-order-id="' + o.id + '">开始代驾</button>' : '') +
          (o.status === 'ongoing' ? '<button class="btn btn-sm btn-primary" data-action="staff-complete-order" data-order-id="' + o.id + '">完成代驾</button>' : '') +
        '</div></div>';
    });
  }

  return '<div class="page staff-page">' +
    '<div class="staff-top-bar"><button class="back-btn" data-action="staff-main" style="color:#fff">←</button><h2 style="color:#fff">订单管理</h2><div style="width:40px"></div></div>' +
    '<div class="page-content">' +
      '<div class="staff-filter-bar">' +
        statusFilters.map(function(f) { return '<button class="staff-filter-btn ' + (filterStatus === f.key ? 'active' : '') + '" data-action="staff-filter-orders" data-filter="' + f.key + '">' + f.label + '</button>'; }).join('') +
      '</div>' +
      '<div style="margin-top:12px;color:var(--text-muted);font-size:13px">共 ' + filtered.length + ' 条订单</div>' +
      ordersHtml +
    '</div></div>';
}

// ============================================================
//  客服端 - 主动派单
// ============================================================
async function renderStaffDispatch(targetOrderId) {
  const orders = await DB.getOrders();
  const drivers = await DB.getDrivers();
  const users = await DB.getUsers();
  const pendingOrders = orders.filter(function(o) { return o.status === 'pending'; });

  let selectedOrder = null;
  if (targetOrderId) {
    selectedOrder = orders.find(function(o) { return o.id === targetOrderId && o.status === 'pending'; });
  }

  let ordersHtml = '';
  if (pendingOrders.length === 0) {
    ordersHtml = '<div class="staff-empty-text">暂无待派订单</div>';
  } else {
    ordersHtml = pendingOrders.map(function(o) {
      var user = o.userId ? users.find(function(u) { return u.id === o.userId; }) : null;
      return '<div class="staff-order-option ' + (selectedOrder && selectedOrder.id === o.id ? 'selected' : '') + '" data-order-id="' + o.id + '" data-action="select-dispatch-order"><div style="font-weight:600">' + o.from + ' → ' + o.to + '</div><div style="font-size:12px;color:var(--text-muted)">' + (user ? user.name : '未知') + ' | ' + formatPrice(o.price) + ' | ' + (o.createdAt || '') + '</div></div>';
    }).join('');
  }

  let driversHtml = '';
  if (drivers.length === 0) {
    driversHtml = '<div class="staff-empty-text">暂无可用司机</div>';
  } else {
    driversHtml = drivers.map(function(d) {
      var activeOrders = orders.filter(function(o) { return o.driverId === d.id && ['accepted', 'ongoing'].includes(o.status); }).length;
      return '<div class="staff-driver-option" data-driver-id="' + d.id + '" data-action="select-dispatch-driver"><div style="display:flex;justify-content:space-between;align-items:center"><div><div style="font-weight:600">🧑‍✈️ ' + d.name + '</div><div style="font-size:12px;color:var(--text-muted)">📞 ' + d.phone + ' | ⭐ ' + (d.rating || '4.9') + '</div></div><span style="font-size:12px;padding:2px 8px;border-radius:10px;background:' + (activeOrders > 0 ? 'var(--accent)' : 'var(--success)') + ';color:#fff">' + (activeOrders > 0 ? '接单中(' + activeOrders + ')' : '空闲') + '</span></div></div>';
    }).join('');
  }

  return '<div class="page staff-page">' +
    '<div class="staff-top-bar"><button class="back-btn" data-action="staff-main" style="color:#fff">←</button><h2 style="color:#fff">主动派单</h2><div style="width:40px"></div></div>' +
    '<div class="page-content">' +
      '<div class="card" style="margin-top:12px"><div class="card-header">📋 Step 1：选择待派订单</div><div class="staff-order-select" id="dispatch-order-select">' + ordersHtml + '</div></div>' +
      '<div class="card" style="margin-top:12px"><div class="card-header">🧑‍✈️ Step 2：选择代驾司机</div><div class="staff-driver-select" id="dispatch-driver-select">' + driversHtml + '</div></div>' +
      '<button class="btn btn-primary btn-block" id="confirm-dispatch-btn" style="margin-top:16px" disabled>🚀 确认派单</button>' +
      (selectedOrder ? '<div id="dispatch-selected-order" data-order-id="' + selectedOrder.id + '" style="display:none"></div>' : '<div id="dispatch-selected-order" style="display:none"></div>') +
      '<div id="dispatch-selected-driver" style="display:none"></div>' +
    '</div></div>';
}

// ============================================================
//  客服端 - 司机管理
// ============================================================
async function renderStaffDrivers() {
  const drivers = await DB.getDrivers();
  const orders = await DB.getOrders();

  let html = '';
  if (drivers.length === 0) {
    html = '<div class="staff-empty-card"><div class="staff-empty-icon">🧑‍✈️</div><div class="staff-empty-text">暂无注册司机</div></div>';
  } else {
    drivers.forEach(function(d) {
      var drvOrders = orders.filter(function(o) { return o.driverId === d.id; });
      var completedCount = drvOrders.filter(function(o) { return o.status === 'completed'; }).length;
      var totalIncome = drvOrders.filter(function(o) { return o.status === 'completed'; }).reduce(function(s, o) { return s + (parseFloat(o.price) || 0); }, 0);
      var activeCount = drvOrders.filter(function(o) { return ['accepted', 'ongoing'].includes(o.status); }).length;

      html += '<div class="card staff-driver-card" style="margin-top:10px">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start"><div style="display:flex;gap:12px;align-items:center"><div class="staff-avatar">🧑‍✈️</div><div><div style="font-weight:700;font-size:16px">' + d.name + '</div><div style="font-size:13px;color:var(--text-muted)">📞 ' + d.phone + '</div><div style="font-size:12px;color:var(--text-muted)">驾驶证：' + (d.license || '未填写') + '</div></div></div><div style="text-align:right"><div style="font-size:18px;color:var(--accent)">⭐ ' + (d.rating || '4.9') + '</div><div style="font-size:11px;color:var(--text-muted)">评分</div></div></div>' +
        '<div class="staff-driver-stats-row"><div><strong>' + completedCount + '</strong><span>完成单</span></div><div><strong>' + activeCount + '</strong><span>进行中</span></div><div><strong>' + formatPrice(totalIncome) + '</strong><span>总收入</span></div><div><strong>' + drvOrders.length + '</strong><span>总订单</span></div></div>' +
        '<div style="margin-top:10px;font-size:12px;color:var(--text-muted)">注册时间：' + (d.createdAt || '未知') + '</div></div>';
    });
  }

  return '<div class="page staff-page"><div class="staff-top-bar"><button class="back-btn" data-action="staff-main" style="color:#fff">←</button><h2 style="color:#fff">司机管理</h2><div style="width:40px"></div></div>' +
    '<div class="page-content"><div style="margin-top:12px;color:var(--text-muted);font-size:13px">共 ' + drivers.length + ' 位注册司机</div>' + html + '</div></div>';
}

// ============================================================
//  客服端 - 用户管理
// ============================================================
async function renderStaffUsers() {
  const users = await DB.getPassengers();
  const orders = await DB.getOrders();

  let html = '';
  if (users.length === 0) {
    html = '<div class="staff-empty-card"><div class="staff-empty-icon">👥</div><div class="staff-empty-text">暂无注册用户</div></div>';
  } else {
    users.forEach(function(u) {
      var userOrders = orders.filter(function(o) { return o.userId === u.id; });
      var totalSpent = userOrders.filter(function(o) { return o.status === 'completed'; }).reduce(function(s, o) { return s + (parseFloat(o.price) || 0); }, 0);
      var pendingCount = userOrders.filter(function(o) { return o.status === 'pending'; }).length;

      html += '<div class="card staff-user-card" style="margin-top:10px">' +
        '<div style="display:flex;justify-content:space-between;align-items:center"><div style="display:flex;gap:12px;align-items:center"><div class="staff-avatar user">👤</div><div><div style="font-weight:700;font-size:16px">' + u.name + '</div><div style="font-size:13px;color:var(--text-muted)">📞 ' + u.phone + '</div></div></div><div style="text-align:right"><div style="font-size:18px;color:var(--accent)">' + formatPrice(totalSpent) + '</div><div style="font-size:11px;color:var(--text-muted)">累计消费</div></div></div>' +
        '<div class="staff-driver-stats-row"><div><strong>' + userOrders.length + '</strong><span>总订单</span></div><div><strong>' + pendingCount + '</strong><span>待接单</span></div><div><strong>' + userOrders.filter(function(o) { return o.status === 'completed'; }).length + '</strong><span>已完成</span></div><div><strong>' + userOrders.filter(function(o) { return o.status === 'cancelled'; }).length + '</strong><span>已取消</span></div></div>' +
        '<div style="margin-top:10px;font-size:12px;color:var(--text-muted)">注册时间：' + (u.createdAt || '未知') + '</div></div>';
    });
  }

  return '<div class="page staff-page"><div class="staff-top-bar"><button class="back-btn" data-action="staff-main" style="color:#fff">←</button><h2 style="color:#fff">用户管理</h2><div style="width:40px"></div></div>' +
    '<div class="page-content"><div style="margin-top:12px;color:var(--text-muted);font-size:13px">共 ' + users.length + ' 位注册用户</div>' + html + '</div></div>';
}

// ============================================================
//  客服端 - 数据统计
// ============================================================
async function renderStaffStats() {
  const orders = await DB.getOrders();
  const drivers = await DB.getDrivers();
  const users = await DB.getPassengers();

  const completed = orders.filter(function(o) { return o.status === 'completed'; });
  const cancelled = orders.filter(function(o) { return o.status === 'cancelled'; });
  const totalRevenue = completed.reduce(function(s, o) { return s + (parseFloat(o.price) || 0); }, 0);
  const avgPrice = completed.length > 0 ? totalRevenue / completed.length : 0;
  const completionRate = orders.length > 0 ? ((completed.length / orders.length) * 100).toFixed(1) : 0;

  var driverRanking = drivers.map(function(d) {
    var drvCompleted = orders.filter(function(o) { return o.driverId === d.id && o.status === 'completed'; });
    return { name: d.name, rating: d.rating || '4.9', count: drvCompleted.length, income: drvCompleted.reduce(function(s, o) { return s + (parseFloat(o.price) || 0); }, 0) };
  }).sort(function(a, b) { return b.income - a.income; });

  var recentOrders = orders.slice().sort(function(a, b) {
    var ta = a.createdAt ? new Date(a.createdAt.replace(/\//g, '-')) : 0;
    var tb = b.createdAt ? new Date(b.createdAt.replace(/\//g, '-')) : 0;
    return tb - ta;
  }).slice(0, 10);

  let rankHtml = '';
  if (driverRanking.length === 0) {
    rankHtml = '<div class="staff-empty-text">暂无数据</div>';
  } else {
    rankHtml = '<div class="staff-rank-list">';
    driverRanking.filter(function(d) { return d.count > 0; }).forEach(function(d, i) {
      rankHtml += '<div class="staff-rank-item"><div class="staff-rank-pos ' + (i < 3 ? 'top-' + (i + 1) : '') + '">' + (i + 1) + '</div><div class="staff-rank-info"><div class="staff-rank-name">' + d.name + '</div><div class="staff-rank-detail">' + d.count + '单 · ⭐' + d.rating + '</div></div><div class="staff-rank-value">' + formatPrice(d.income) + '</div></div>';
    });
    rankHtml += '</div>';
  }

  let recentHtml = '';
  if (recentOrders.length === 0) {
    recentHtml = '<div class="staff-empty-text">暂无订单</div>';
  } else {
    recentHtml = '<div class="staff-recent-list">';
    recentOrders.forEach(function(o) {
      var user = o.userId ? users.find(function(u) { return u.id === o.userId; }) : null;
      var driver = o.driverId ? drivers.find(function(d) { return d.id === o.driverId; }) : null;
      recentHtml += '<div class="staff-recent-item"><div><div style="font-weight:600;font-size:13px">' + o.from + ' → ' + o.to + '</div><div style="font-size:12px;color:var(--text-muted)">' + (user ? user.name : '未知') + ' ' + (driver ? '· ' + driver.name : '') + '</div></div><div style="text-align:right"><div style="font-weight:700;color:var(--accent)">' + formatPrice(o.price) + '</div>' + statusBadge(o.status) + '</div></div>';
    });
    recentHtml += '</div>';
  }

  return '<div class="page staff-page"><div class="staff-top-bar"><button class="back-btn" data-action="staff-main" style="color:#fff">←</button><h2 style="color:#fff">数据统计</h2><div style="width:40px"></div></div>' +
    '<div class="page-content">' +
      '<div class="staff-overview">' +
        '<div class="staff-stat-card accent-green"><div class="staff-stat-num">' + formatPrice(totalRevenue) + '</div><div class="staff-stat-label">总营收</div></div>' +
        '<div class="staff-stat-card accent-blue"><div class="staff-stat-num">' + completed.length + '</div><div class="staff-stat-label">完成订单</div></div>' +
        '<div class="staff-stat-card accent-orange"><div class="staff-stat-num">' + completionRate + '%</div><div class="staff-stat-label">完成率</div></div>' +
        '<div class="staff-stat-card accent-purple"><div class="staff-stat-num">' + formatPrice(avgPrice) + '</div><div class="staff-stat-label">客单价</div></div>' +
      '</div>' +
      '<div class="staff-row">' +
        '<div class="staff-mini-stat"><span>总订单</span><strong>' + orders.length + '</strong></div>' +
        '<div class="staff-mini-stat"><span>已取消</span><strong>' + cancelled.length + '</strong></div>' +
        '<div class="staff-mini-stat"><span>司机数</span><strong>' + drivers.length + '</strong></div>' +
        '<div class="staff-mini-stat"><span>用户数</span><strong>' + users.length + '</strong></div>' +
      '</div>' +
      '<div class="card" style="margin-top:16px"><div class="card-header">🏆 司机收入排行</div>' + rankHtml + '</div>' +
      '<div class="card" style="margin-top:16px"><div class="card-header">📋 最近订单</div>' + recentHtml + '</div>' +
    '</div></div>';
}

// ============================================================
//  客服端事件绑定
// ============================================================
function bindStaffEvents() {
  // 客服登录
  var sLoginForm = document.getElementById('staff-login-form');
  if (sLoginForm) {
    sLoginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      var phone = document.getElementById('slogin-phone').value.trim();
      var pwd = document.getElementById('slogin-pwd').value;
      // 先查admin，再查staff
      var staff = await DB.findUser(phone, pwd, 'admin');
      if (!staff) staff = await DB.findUser(phone, pwd, 'staff');
      if (!staff) { showToast('手机号或密码错误', 'error'); return; }
      State.currentUser = { id: staff.id, name: staff.name, phone: staff.phone, role: staff.role, type: 'staff', createdAt: staff.createdAt };
      showToast('欢迎回来，' + staff.name + (staff.role === 'admin' ? ' 🛡️' : ' 🎧'), 'success');
      navigate('staff-main');
    });
  }

  // 客服注册
  var sRegForm = document.getElementById('staff-register-form');
  if (sRegForm) {
    sRegForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      var name = document.getElementById('sreg-name').value.trim();
      var phone = document.getElementById('sreg-phone').value.trim();
      var role = document.getElementById('sreg-role').value;
      var pwd = document.getElementById('sreg-pwd').value;
      var pwd2 = document.getElementById('sreg-pwd2').value;
      if (!name) { showToast('请输入姓名', 'error'); return; }
      if (!/^1\d{10}$/.test(phone)) { showToast('请输入正确的手机号', 'error'); return; }
      if (pwd.length < 6) { showToast('密码至少6位', 'error'); return; }
      if (pwd !== pwd2) { showToast('两次密码不一致', 'error'); return; }
      var result = await DB.registerUser({ name: name, phone: phone, pwd: pwd, role: role });
      if (result.error) { showToast(result.error, 'error'); return; }
      State.currentUser = { id: result.id, name: result.name, phone: result.phone, role: role, type: 'staff', createdAt: result.createdAt };
      showToast('注册成功！', 'success');
      navigate('staff-main');
    });
  }

  // 派单选择逻辑
  var selectedDispatchOrderId = null;
  var selectedDispatchDriverId = null;

  var orderIdFromParams = State.pageParams.orderId || (document.getElementById('dispatch-selected-order') ? document.getElementById('dispatch-selected-order').dataset.orderId : '');
  if (orderIdFromParams) {
    selectedDispatchOrderId = orderIdFromParams;
    updateDispatchBtn();
  }

  document.querySelectorAll('[data-action="select-dispatch-order"]').forEach(function(el) {
    el.addEventListener('click', function(e) {
      e.stopPropagation();
      selectedDispatchOrderId = el.dataset.orderId;
      document.querySelectorAll('.staff-order-option').forEach(function(o) { o.classList.remove('selected'); });
      el.classList.add('selected');
      updateDispatchBtn();
    });
  });

  document.querySelectorAll('[data-action="select-dispatch-driver"]').forEach(function(el) {
    el.addEventListener('click', function(e) {
      e.stopPropagation();
      selectedDispatchDriverId = el.dataset.driverId;
      document.querySelectorAll('.staff-driver-option').forEach(function(o) { o.classList.remove('selected'); });
      el.classList.add('selected');
      updateDispatchBtn();
    });
  });

  function updateDispatchBtn() {
    var btn = document.getElementById('confirm-dispatch-btn');
    if (btn) { btn.disabled = !(selectedDispatchOrderId && selectedDispatchDriverId); }
  }

  // 确认派单
  var confirmDispatchBtn = document.getElementById('confirm-dispatch-btn');
  if (confirmDispatchBtn) {
    confirmDispatchBtn.addEventListener('click', async function() {
      if (!selectedDispatchOrderId || !selectedDispatchDriverId) {
        showToast('请先选择订单和司机', 'error');
        return;
      }
      var order = await DB.getOrderById(selectedDispatchOrderId);
      if (!order || order.status !== 'pending') {
        showToast('订单状态已变更，无法派单', 'error');
        return;
      }
      showToast('正在派单...', '');
      var result = await DB.updateOrder(selectedDispatchOrderId, {
        status: 'accepted',
        driverId: selectedDispatchDriverId,
        acceptedAt: true
      });
      if (result) {
        showToast('派单成功 🚀', 'success');
        navigate('staff-orders');
      } else {
        showToast('派单失败，请重试', 'error');
      }
    });
  }
}

// ============================================================
//  客服端 Action 处理（注入到 handleAction 中）
// ============================================================
function handleStaffAction(action, dataset) {
  switch (action) {
    case 'go-staff':   navigate('staff-auth'); return true;
    case 'staff-main': navigate('staff-main'); return true;
    case 'staff-logout': State.currentUser = null; showToast('已退出客服登录'); navigate('home'); return true;
    case 'staff-orders':
      if (dataset.orderId) navigate('staff-dispatch', { orderId: dataset.orderId });
      else navigate('staff-orders');
      return true;
    case 'staff-dispatch': navigate('staff-dispatch', { orderId: dataset.orderId || '' }); return true;
    case 'staff-drivers': navigate('staff-drivers'); return true;
    case 'staff-users': navigate('staff-users'); return true;
    case 'staff-stats': navigate('staff-stats'); return true;
    case 'staff-filter-orders': navigate('staff-orders', { filterStatus: dataset.filter }); return true;

    case 'staff-cancel-order': {
      if (confirm('确定要取消此订单吗？')) {
        DB.updateOrder(dataset.orderId, { status: 'cancelled' }).then(function() {
          showToast('订单已取消');
          render();
        });
      }
      return true;
    }
    case 'staff-start-order': {
      DB.updateOrder(dataset.orderId, { status: 'ongoing' }).then(function() {
        showToast('代驾已开始 🚗', 'success');
        render();
      });
      return true;
    }
    case 'staff-complete-order': {
      DB.updateOrder(dataset.orderId, { status: 'completed', completedAt: true }).then(function() {
        showToast('代驾已完成 ✅', 'success');
        render();
      });
      return true;
    }
  }
  return false;
}
