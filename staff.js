/* ================================================
   代驾服务平台 - 客服端/管理后台模块
   依赖 app-fixed.js 中的全局变量：DB, State, genId, now, formatPrice, statusBadge, showToast, navigate, estimatePrice
================================================ */

// ============================================================
//  客服端 - 登录/注册页面
// ============================================================
function renderStaffAuth(tab) {
  tab = tab || 'login';
  return `
  <div class="page staff-auth-page">
    <div class="page-header">
      <button class="back-btn" data-action="go-home">←</button>
      <h2>客服 / 管理</h2>
    </div>
    <div class="page-content">
      <div class="auth-box">
        <div class="auth-tabs">
          <button class="tab-btn ${tab === 'login' ? 'active' : ''}" data-tab="login">登录</button>
          <button class="tab-btn ${tab === 'register' ? 'active' : ''}" data-tab="register">注册</button>
        </div>

        <div id="staff-login-panel" class="auth-panel" style="display:${tab === 'login' ? 'block' : 'none'}">
          <form id="staff-login-form" class="auth-form">
            <div class="form-group">
              <label>工号 / 手机号</label>
              <input type="text" id="slogin-phone" placeholder="请输入手机号" required>
            </div>
            <div class="form-group">
              <label>密码</label>
              <input type="password" id="slogin-pwd" placeholder="请输入密码" required>
            </div>
            <button type="submit" class="btn btn-primary btn-block">登录</button>
          </form>
        </div>

        <div id="staff-register-panel" class="auth-panel" style="display:${tab === 'register' ? 'block' : 'none'}">
          <form id="staff-register-form" class="auth-form">
            <div class="form-group">
              <label>姓名</label>
              <input type="text" id="sreg-name" placeholder="请输入姓名" required>
            </div>
            <div class="form-group">
              <label>手机号</label>
              <input type="text" id="sreg-phone" placeholder="请输入手机号" required>
            </div>
            <div class="form-group">
              <label>角色</label>
              <select id="sreg-role">
                <option value="staff">客服</option>
                <option value="admin">管理员</option>
              </select>
            </div>
            <div class="form-group">
              <label>密码</label>
              <input type="password" id="sreg-pwd" placeholder="至少6位" required>
            </div>
            <div class="form-group">
              <label>确认密码</label>
              <input type="password" id="sreg-pwd2" placeholder="再次输入密码" required>
            </div>
            <button type="submit" class="btn btn-primary btn-block">注册</button>
          </form>
        </div>
      </div>
    </div>
  </div>`;
}

// ============================================================
//  客服端 - 主页面（仪表盘）
// ============================================================
function renderStaffMain() {
  const orders = DB.getList('orders');
  const drivers = DB.getList('drivers');
  const users = DB.getList('users');
  const s = State.currentUser;

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const ongoingOrders = orders.filter(o => ['accepted', 'ongoing'].includes(o.status));
  const completedOrders = orders.filter(o => o.status === 'completed');
  const todayOrders = orders.filter(o => {
    if (!o.createdAt) return false;
    return o.createdAt.includes(new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }));
  });
  const totalRevenue = completedOrders.reduce((sum, o) => sum + (parseFloat(o.price) || 0), 0);

  const roleLabel = s.role === 'admin' ? '🛡️ 管理员' : '🎧 客服';

  return `
  <div class="page staff-page">
    <div class="staff-top-bar">
      <div>
        <div class="staff-greeting">你好，${s.name}</div>
        <div class="staff-role">${roleLabel}</div>
      </div>
      <button class="btn btn-sm btn-outline" data-action="staff-logout">退出登录</button>
    </div>

    <div class="page-content">
      <!-- 实时概览卡片 -->
      <div class="staff-overview">
        <div class="staff-stat-card accent-orange">
          <div class="staff-stat-num">${pendingOrders.length}</div>
          <div class="staff-stat-label">待接单</div>
        </div>
        <div class="staff-stat-card accent-blue">
          <div class="staff-stat-num">${ongoingOrders.length}</div>
          <div class="staff-stat-label">进行中</div>
        </div>
        <div class="staff-stat-card accent-green">
          <div class="staff-stat-num">${completedOrders.length}</div>
          <div class="staff-stat-label">已完成</div>
        </div>
        <div class="staff-stat-card accent-purple">
          <div class="staff-stat-num">${formatPrice(totalRevenue)}</div>
          <div class="staff-stat-label">总收入</div>
        </div>
      </div>

      <div class="staff-row">
        <div class="staff-mini-stat">
          <span>今日订单</span>
          <strong>${todayOrders.length}</strong>
        </div>
        <div class="staff-mini-stat">
          <span>注册司机</span>
          <strong>${drivers.length}</strong>
        </div>
        <div class="staff-mini-stat">
          <span>注册用户</span>
          <strong>${users.length}</strong>
        </div>
        <div class="staff-mini-stat">
          <span>总订单</span>
          <strong>${orders.length}</strong>
        </div>
      </div>

      <!-- 快捷操作 -->
      <div class="card" style="margin-top:16px">
        <div class="card-header">⚡ 快捷操作</div>
        <div class="staff-actions-grid">
          <button class="staff-action-btn" data-action="staff-orders">
            <span class="staff-action-icon">📋</span>
            <span>订单管理</span>
          </button>
          <button class="staff-action-btn" data-action="staff-dispatch">
            <span class="staff-action-icon">🚀</span>
            <span>主动派单</span>
          </button>
          <button class="staff-action-btn" data-action="staff-drivers">
            <span class="staff-action-icon">🧑‍✈️</span>
            <span>司机管理</span>
          </button>
          <button class="staff-action-btn" data-action="staff-users">
            <span class="staff-action-icon">👥</span>
            <span>用户管理</span>
          </button>
          <button class="staff-action-btn" data-action="staff-stats">
            <span class="staff-action-icon">📊</span>
            <span>数据统计</span>
          </button>
        </div>
      </div>

      <!-- 待处理订单提醒 -->
      ${pendingOrders.length > 0 ? `
      <div class="card staff-alert-card" style="margin-top:16px">
        <div class="card-header">🔔 待处理订单</div>
        ${pendingOrders.slice(0, 3).map(o => {
          const user = DB.getList('users').find(u => u.id === o.userId);
          return `
          <div class="staff-pending-item">
            <div>
              <div style="font-weight:600">${o.from} → ${o.to}</div>
              <div style="font-size:12px;color:var(--text-muted)">${o.customerName || (user ? user.name : '未知')} | ${formatPrice(o.price)}</div>
            </div>
            <button class="btn btn-sm btn-success" data-action="staff-dispatch" data-order-id="${o.id}">派单</button>
          </div>`;
        }).join('')}
        ${pendingOrders.length > 3 ? `<div style="text-align:center;padding:8px;color:var(--text-muted);font-size:13px">还有 ${pendingOrders.length - 3} 个待处理订单...</div>` : ''}
      </div>` : `
      <div class="card staff-empty-card" style="margin-top:16px">
        <div class="staff-empty-icon">✅</div>
        <div class="staff-empty-text">暂无待处理订单</div>
      </div>`}
    </div>
  </div>`;
}

// ============================================================
//  客服端 - 订单管理
// ============================================================
function renderStaffOrders() {
  const orders = DB.getList('orders').sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt.replace(/\//g, '-')) : 0;
    const tb = b.createdAt ? new Date(b.createdAt.replace(/\//g, '-')) : 0;
    return tb - ta;
  });
  const filterStatus = State.pageParams.filterStatus || 'all';
  const filtered = filterStatus === 'all' ? orders : orders.filter(o => o.status === filterStatus);

  const statusFilters = [
    { key: 'all', label: '全部' },
    { key: 'pending', label: '待接单' },
    { key: 'accepted', label: '已接单' },
    { key: 'ongoing', label: '代驾中' },
    { key: 'completed', label: '已完成' },
    { key: 'cancelled', label: '已取消' },
  ];

  return `
  <div class="page staff-page">
    <div class="staff-top-bar">
      <button class="back-btn" data-action="staff-main" style="color:#fff">←</button>
      <h2 style="color:#fff">订单管理</h2>
      <div style="width:40px"></div>
    </div>

    <div class="page-content">
      <!-- 筛选栏 -->
      <div class="staff-filter-bar">
        ${statusFilters.map(f => `
          <button class="staff-filter-btn ${filterStatus === f.key ? 'active' : ''}" data-action="staff-filter-orders" data-filter="${f.key}">${f.label}</button>
        `).join('')}
      </div>

      <div style="margin-top:12px;color:var(--text-muted);font-size:13px">共 ${filtered.length} 条订单</div>

      <!-- 订单列表 -->
      ${filtered.length === 0 ? `
        <div class="staff-empty-card">
          <div class="staff-empty-icon">📋</div>
          <div class="staff-empty-text">暂无订单</div>
        </div>
      ` : filtered.map(o => {
        const user = DB.getList('users').find(u => u.id === o.userId);
        const driver = o.driverId ? DB.getList('drivers').find(d => d.id === o.driverId) : null;
        return `
        <div class="card staff-order-card" style="margin-top:10px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <span style="font-size:12px;color:var(--text-muted)">#${o.id.slice(-8).toUpperCase()}</span>
            ${statusBadge(o.status)}
          </div>
          <div class="order-route" style="margin-bottom:8px">
            <div class="route-item"><span class="route-dot start"></span><div>${o.from}</div></div>
            <div class="route-item"><span class="route-connector"></span></div>
            <div class="route-item"><span class="route-dot end"></span><div>${o.to}</div></div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px">
            <div>
              <span>${o.customerName || (user ? user.name : '未知')}</span>
              ${driver ? `<span style="margin-left:8px">司机：${driver.name}</span>` : ''}
            </div>
            <strong style="color:var(--accent)">${formatPrice(o.price)}</strong>
          </div>
          <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn btn-sm btn-outline" data-action="order-detail" data-order-id="${o.id}">详情</button>
            ${o.status === 'pending' ? `
              <button class="btn btn-sm btn-success" data-action="staff-dispatch" data-order-id="${o.id}">派单</button>
              <button class="btn btn-sm btn-danger" data-action="staff-cancel-order" data-order-id="${o.id}">取消</button>
            ` : ''}
            ${o.status === 'accepted' ? `
              <button class="btn btn-sm btn-success" data-action="staff-start-order" data-order-id="${o.id}">开始代驾</button>
            ` : ''}
            ${o.status === 'ongoing' ? `
              <button class="btn btn-sm btn-primary" data-action="staff-complete-order" data-order-id="${o.id}">完成代驾</button>
            ` : ''}
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

// ============================================================
//  客服端 - 主动派单
// ============================================================
function renderStaffDispatch(targetOrderId) {
  const orders = DB.getList('orders');
  const drivers = DB.getList('drivers');
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const onlineDrivers = drivers.filter(d => d.rating); // 所有注册司机都可派单

  // 如果指定了订单ID
  let selectedOrder = null;
  if (targetOrderId) {
    selectedOrder = orders.find(o => o.id === targetOrderId && o.status === 'pending');
  }

  return `
  <div class="page staff-page">
    <div class="staff-top-bar">
      <button class="back-btn" data-action="staff-main" style="color:#fff">←</button>
      <h2 style="color:#fff">主动派单</h2>
      <div style="width:40px"></div>
    </div>

    <div class="page-content">
      <!-- 步骤1: 选择订单 -->
      <div class="card" style="margin-top:12px">
        <div class="card-header">📋 Step 1：选择待派订单</div>
        ${pendingOrders.length === 0 ? `
          <div class="staff-empty-text">暂无待派订单</div>
        ` : `
          <div class="staff-order-select" id="dispatch-order-select">
            ${pendingOrders.map(o => {
              const user = DB.getList('users').find(u => u.id === o.userId);
              return `
              <div class="staff-order-option ${selectedOrder && selectedOrder.id === o.id ? 'selected' : ''}" data-order-id="${o.id}" data-action="select-dispatch-order">
                <div style="font-weight:600">${o.from} → ${o.to}</div>
                <div style="font-size:12px;color:var(--text-muted)">${o.customerName || (user ? user.name : '未知')} | ${formatPrice(o.price)} | ${o.createdAt || ''}</div>
              </div>`;
            }).join('')}
          </div>
        `}
      </div>

      <!-- 步骤2: 选择司机 -->
      <div class="card" style="margin-top:12px">
        <div class="card-header">🧑‍✈️ Step 2：选择代驾司机</div>
        ${onlineDrivers.length === 0 ? `
          <div class="staff-empty-text">暂无可用司机</div>
        ` : `
          <div class="staff-driver-select" id="dispatch-driver-select">
            ${onlineDrivers.map(d => {
              const activeOrders = orders.filter(o => o.driverId === d.id && ['accepted', 'ongoing'].includes(o.status)).length;
              return `
              <div class="staff-driver-option" data-driver-id="${d.id}" data-action="select-dispatch-driver">
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <div>
                    <div style="font-weight:600">🧑‍✈️ ${d.name}</div>
                    <div style="font-size:12px;color:var(--text-muted)">📞 ${d.phone} | ⭐ ${d.rating || '4.9'}</div>
                  </div>
                  <span style="font-size:12px;padding:2px 8px;border-radius:10px;background:${activeOrders > 0 ? 'var(--accent)' : 'var(--success)'};color:#fff">
                    ${activeOrders > 0 ? '接单中(' + activeOrders + ')' : '空闲'}
                  </span>
                </div>
              </div>`;
            }).join('')}
          </div>
        `}
      </div>

      <!-- 确认派单 -->
      <button class="btn btn-primary btn-block" id="confirm-dispatch-btn" style="margin-top:16px" disabled>
        🚀 确认派单
      </button>
      ${selectedOrder ? `<div id="dispatch-selected-order" data-order-id="${selectedOrder.id}" style="display:none"></div>` : '<div id="dispatch-selected-order" style="display:none"></div>'}
      <div id="dispatch-selected-driver" style="display:none"></div>
    </div>
  </div>`;
}

// ============================================================
//  客服端 - 司机管理
// ============================================================
function renderStaffDrivers() {
  const drivers = DB.getList('drivers');
  const orders = DB.getList('orders');

  return `
  <div class="page staff-page">
    <div class="staff-top-bar">
      <button class="back-btn" data-action="staff-main" style="color:#fff">←</button>
      <h2 style="color:#fff">司机管理</h2>
      <div style="width:40px"></div>
    </div>

    <div class="page-content">
      <div style="margin-top:12px;color:var(--text-muted);font-size:13px">共 ${drivers.length} 位注册司机</div>

      ${drivers.length === 0 ? `
        <div class="staff-empty-card">
          <div class="staff-empty-icon">🧑‍✈️</div>
          <div class="staff-empty-text">暂无注册司机</div>
        </div>
      ` : drivers.map(d => {
        const drvOrders = orders.filter(o => o.driverId === d.id);
        const completedCount = drvOrders.filter(o => o.status === 'completed').length;
        const totalIncome = drvOrders.filter(o => o.status === 'completed').reduce((s, o) => s + (parseFloat(o.price) || 0), 0);
        const activeCount = drvOrders.filter(o => ['accepted', 'ongoing'].includes(o.status)).length;

        return `
        <div class="card staff-driver-card" style="margin-top:10px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div style="display:flex;gap:12px;align-items:center">
              <div class="staff-avatar">🧑‍✈️</div>
              <div>
                <div style="font-weight:700;font-size:16px">${d.name}</div>
                <div style="font-size:13px;color:var(--text-muted)">📞 ${d.phone}</div>
                <div style="font-size:12px;color:var(--text-muted)">驾驶证：${d.license || '未填写'}</div>
              </div>
            </div>
            <div style="text-align:right">
              <div style="font-size:18px;color:var(--accent)">⭐ ${d.rating || '4.9'}</div>
              <div style="font-size:11px;color:var(--text-muted)">评分</div>
            </div>
          </div>
          <div class="staff-driver-stats-row">
            <div><strong>${completedCount}</strong><span>完成单</span></div>
            <div><strong>${activeCount}</strong><span>进行中</span></div>
            <div><strong>${formatPrice(totalIncome)}</strong><span>总收入</span></div>
            <div><strong>${drvOrders.length}</strong><span>总订单</span></div>
          </div>
          <div style="margin-top:10px;font-size:12px;color:var(--text-muted)">注册时间：${d.createdAt || '未知'}</div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

// ============================================================
//  客服端 - 用户管理
// ============================================================
function renderStaffUsers() {
  const users = DB.getList('users');
  const orders = DB.getList('orders');

  return `
  <div class="page staff-page">
    <div class="staff-top-bar">
      <button class="back-btn" data-action="staff-main" style="color:#fff">←</button>
      <h2 style="color:#fff">用户管理</h2>
      <div style="width:40px"></div>
    </div>

    <div class="page-content">
      <div style="margin-top:12px;color:var(--text-muted);font-size:13px">共 ${users.length} 位注册用户</div>

      ${users.length === 0 ? `
        <div class="staff-empty-card">
          <div class="staff-empty-icon">👥</div>
          <div class="staff-empty-text">暂无注册用户</div>
        </div>
      ` : users.map(u => {
        const userOrders = orders.filter(o => o.userId === u.id);
        const totalSpent = userOrders.filter(o => o.status === 'completed').reduce((s, o) => s + (parseFloat(o.price) || 0), 0);
        const pendingCount = userOrders.filter(o => o.status === 'pending').length;

        return `
        <div class="card staff-user-card" style="margin-top:10px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div style="display:flex;gap:12px;align-items:center">
              <div class="staff-avatar user">👤</div>
              <div>
                <div style="font-weight:700;font-size:16px">${u.name}</div>
                <div style="font-size:13px;color:var(--text-muted)">📞 ${u.phone}</div>
              </div>
            </div>
            <div style="text-align:right">
              <div style="font-size:18px;color:var(--accent)">${formatPrice(totalSpent)}</div>
              <div style="font-size:11px;color:var(--text-muted)">累计消费</div>
            </div>
          </div>
          <div class="staff-driver-stats-row">
            <div><strong>${userOrders.length}</strong><span>总订单</span></div>
            <div><strong>${pendingCount}</strong><span>待接单</span></div>
            <div><strong>${userOrders.filter(o => o.status === 'completed').length}</strong><span>已完成</span></div>
            <div><strong>${userOrders.filter(o => o.status === 'cancelled').length}</strong><span>已取消</span></div>
          </div>
          <div style="margin-top:10px;font-size:12px;color:var(--text-muted)">注册时间：${u.createdAt || '未知'}</div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

// ============================================================
//  客服端 - 数据统计
// ============================================================
function renderStaffStats() {
  const orders = DB.getList('orders');
  const drivers = DB.getList('drivers');
  const users = DB.getList('users');

  const completed = orders.filter(o => o.status === 'completed');
  const cancelled = orders.filter(o => o.status === 'cancelled');
  const totalRevenue = completed.reduce((s, o) => s + (parseFloat(o.price) || 0), 0);
  const avgPrice = completed.length > 0 ? totalRevenue / completed.length : 0;
  const completionRate = orders.length > 0 ? ((completed.length / orders.length) * 100).toFixed(1) : 0;

  // 司机排行
  const driverRanking = drivers.map(d => {
    const drvCompleted = orders.filter(o => o.driverId === d.id && o.status === 'completed');
    return {
      name: d.name,
      rating: d.rating || '4.9',
      count: drvCompleted.length,
      income: drvCompleted.reduce((s, o) => s + (parseFloat(o.price) || 0), 0)
    };
  }).sort((a, b) => b.income - a.income);

  // 最近订单
  const recentOrders = [...orders].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt.replace(/\//g, '-')) : 0;
    const tb = b.createdAt ? new Date(b.createdAt.replace(/\//g, '-')) : 0;
    return tb - ta;
  }).slice(0, 10);

  return `
  <div class="page staff-page">
    <div class="staff-top-bar">
      <button class="back-btn" data-action="staff-main" style="color:#fff">←</button>
      <h2 style="color:#fff">数据统计</h2>
      <div style="width:40px"></div>
    </div>

    <div class="page-content">
      <!-- 核心指标 -->
      <div class="staff-overview">
        <div class="staff-stat-card accent-green">
          <div class="staff-stat-num">${formatPrice(totalRevenue)}</div>
          <div class="staff-stat-label">总营收</div>
        </div>
        <div class="staff-stat-card accent-blue">
          <div class="staff-stat-num">${completed.length}</div>
          <div class="staff-stat-label">完成订单</div>
        </div>
        <div class="staff-stat-card accent-orange">
          <div class="staff-stat-num">${completionRate}%</div>
          <div class="staff-stat-label">完成率</div>
        </div>
        <div class="staff-stat-card accent-purple">
          <div class="staff-stat-num">${formatPrice(avgPrice)}</div>
          <div class="staff-stat-label">客单价</div>
        </div>
      </div>

      <div class="staff-row">
        <div class="staff-mini-stat">
          <span>总订单</span><strong>${orders.length}</strong>
        </div>
        <div class="staff-mini-stat">
          <span>已取消</span><strong>${cancelled.length}</strong>
        </div>
        <div class="staff-mini-stat">
          <span>司机数</span><strong>${drivers.length}</strong>
        </div>
        <div class="staff-mini-stat">
          <span>用户数</span><strong>${users.length}</strong>
        </div>
      </div>

      <!-- 司机收入排行 -->
      <div class="card" style="margin-top:16px">
        <div class="card-header">🏆 司机收入排行</div>
        ${driverRanking.length === 0 ? '<div class="staff-empty-text">暂无数据</div>' : `
          <div class="staff-rank-list">
            ${driverRanking.filter(d => d.count > 0).map((d, i) => `
              <div class="staff-rank-item">
                <div class="staff-rank-pos ${i < 3 ? 'top-' + (i + 1) : ''}">${i + 1}</div>
                <div class="staff-rank-info">
                  <div class="staff-rank-name">${d.name}</div>
                  <div class="staff-rank-detail">${d.count}单 · ⭐${d.rating}</div>
                </div>
                <div class="staff-rank-value">${formatPrice(d.income)}</div>
              </div>
            `).join('')}
          </div>
        `}
      </div>

      <!-- 最近订单 -->
      <div class="card" style="margin-top:16px">
        <div class="card-header">📋 最近订单</div>
        ${recentOrders.length === 0 ? '<div class="staff-empty-text">暂无订单</div>' : `
          <div class="staff-recent-list">
            ${recentOrders.map(o => {
              const user = DB.getList('users').find(u => u.id === o.userId);
              const driver = o.driverId ? DB.getList('drivers').find(d => d.id === o.driverId) : null;
              return `
              <div class="staff-recent-item">
                <div>
                  <div style="font-weight:600;font-size:13px">${o.from} → ${o.to}</div>
                  <div style="font-size:12px;color:var(--text-muted)">${o.customerName || (user ? user.name : '未知')} ${driver ? '· ' + driver.name : ''}</div>
                </div>
                <div style="text-align:right">
                  <div style="font-weight:700;color:var(--accent)">${formatPrice(o.price)}</div>
                  ${statusBadge(o.status)}
                </div>
              </div>`;
            }).join('')}
          </div>
        `}
      </div>
    </div>
  </div>`;
}

// ============================================================
//  客服端事件绑定
// ============================================================
function bindStaffEvents() {
  // Tab 切换（客服登录/注册）
  document.querySelectorAll('[data-tab]').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      const tab = el.dataset.tab;
      if (State.currentPage === 'staff-auth') {
        navigate('staff-auth', { tab });
      }
    });
  });

  // 客服登录
  const sLoginForm = document.getElementById('staff-login-form');
  if (sLoginForm) {
    sLoginForm.addEventListener('submit', e => {
      e.preventDefault();
      const phone = document.getElementById('slogin-phone').value.trim();
      const pwd = document.getElementById('slogin-pwd').value;
      const staff = DB.getList('staff').find(s => s.phone === phone && s.pwd === pwd);
      if (!staff) { showToast('手机号或密码错误', 'error'); return; }
      State.currentUser = { ...staff, type: 'staff' };
      showToast('欢迎回来，' + staff.name + (staff.role === 'admin' ? ' 🛡️' : ' 🎧'), 'success');
      navigate('staff-main');
    });
  }

  // 客服注册
  const sRegForm = document.getElementById('staff-register-form');
  if (sRegForm) {
    sRegForm.addEventListener('submit', e => {
      e.preventDefault();
      const name = document.getElementById('sreg-name').value.trim();
      const phone = document.getElementById('sreg-phone').value.trim();
      const role = document.getElementById('sreg-role').value;
      const pwd = document.getElementById('sreg-pwd').value;
      const pwd2 = document.getElementById('sreg-pwd2').value;
      if (!name) { showToast('请输入姓名', 'error'); return; }
      if (!/^1\d{10}$/.test(phone)) { showToast('请输入正确的手机号', 'error'); return; }
      if (pwd.length < 6) { showToast('密码至少6位', 'error'); return; }
      if (pwd !== pwd2) { showToast('两次密码不一致', 'error'); return; }
      if (DB.getList('staff').find(s => s.phone === phone)) { showToast('该手机号已注册', 'error'); return; }
      const staff = { id: genId(), name, phone, role, pwd, createdAt: now() };
      DB.push('staff', staff);
      State.currentUser = { ...staff, type: 'staff' };
      showToast('注册成功！', 'success');
      navigate('staff-main');
    });
  }

  // 派单选择逻辑
  let selectedDispatchOrderId = null;
  let selectedDispatchDriverId = null;

  const orderIdFromParams = State.pageParams.orderId || document.getElementById('dispatch-selected-order')?.dataset?.orderId;
  if (orderIdFromParams) {
    selectedDispatchOrderId = orderIdFromParams;
    updateDispatchBtn();
  }

  document.querySelectorAll('[data-action="select-dispatch-order"]').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      selectedDispatchOrderId = el.dataset.orderId;
      document.querySelectorAll('.staff-order-option').forEach(o => o.classList.remove('selected'));
      el.classList.add('selected');
      updateDispatchBtn();
    });
  });

  document.querySelectorAll('[data-action="select-dispatch-driver"]').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      selectedDispatchDriverId = el.dataset.driverId;
      document.querySelectorAll('.staff-driver-option').forEach(o => o.classList.remove('selected'));
      el.classList.add('selected');
      updateDispatchBtn();
    });
  });

  function updateDispatchBtn() {
    const btn = document.getElementById('confirm-dispatch-btn');
    if (btn) {
      btn.disabled = !(selectedDispatchOrderId && selectedDispatchDriverId);
    }
  }

  // 确认派单
  const confirmDispatchBtn = document.getElementById('confirm-dispatch-btn');
  if (confirmDispatchBtn) {
    confirmDispatchBtn.addEventListener('click', () => {
      if (!selectedDispatchOrderId || !selectedDispatchDriverId) {
        showToast('请先选择订单和司机', 'error');
        return;
      }
      const order = DB.getList('orders').find(o => o.id === selectedDispatchOrderId);
      if (!order || order.status !== 'pending') {
        showToast('订单状态已变更，无法派单', 'error');
        return;
      }
      const driver = DB.getList('drivers').find(d => d.id === selectedDispatchDriverId);
      if (!driver) {
        showToast('司机不存在', 'error');
        return;
      }
      DB.update('orders', selectedDispatchOrderId, () => ({
        status: 'accepted',
        driverId: selectedDispatchDriverId,
        acceptedAt: now(),
        dispatched: true
      }));
      showToast('已将订单派给 ' + driver.name + ' 🚀', 'success');
      navigate('staff-orders');
    });
  }
}

// ============================================================
//  客服端 Action 处理（注入到 handleAction 中）
// ============================================================
function handleStaffAction(action, dataset) {
  switch (action) {
    case 'go-staff':
      navigate('staff-auth');
      return true;

    case 'go-home':
      navigate('home');
      return true;

    case 'staff-main':
      navigate('staff-main');
      return true;

    case 'staff-logout':
      State.currentUser = null;
      showToast('已退出客服登录');
      navigate('home');
      return true;

    case 'staff-orders':
      if (dataset.orderId) {
        navigate('staff-dispatch', { orderId: dataset.orderId });
      } else {
        navigate('staff-orders');
      }
      return true;

    case 'staff-dispatch':
      navigate('staff-dispatch', { orderId: dataset.orderId || '' });
      return true;

    case 'staff-drivers':
      navigate('staff-drivers');
      return true;

    case 'staff-users':
      navigate('staff-users');
      return true;

    case 'staff-stats':
      navigate('staff-stats');
      return true;

    case 'staff-filter-orders':
      navigate('staff-orders', { filterStatus: dataset.filter });
      return true;

    case 'staff-cancel-order': {
      if (confirm('确定要取消此订单吗？')) {
        DB.update('orders', dataset.orderId, () => ({ status: 'cancelled', cancelledAt: now() }));
        showToast('订单已取消');
        render();
      }
      return true;
    }

    case 'staff-start-order': {
      DB.update('orders', dataset.orderId, () => ({ status: 'ongoing', startedAt: now() }));
      showToast('代驾已开始 🚗', 'success');
      render();
      return true;
    }

    case 'staff-complete-order': {
      DB.update('orders', dataset.orderId, () => ({ status: 'completed', completedAt: now() }));
      showToast('代驾已完成 ✅', 'success');
      render();
      return true;
    }
  }
  return false;
}
