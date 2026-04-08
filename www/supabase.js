/* ================================================
   代驾出行 - Supabase 数据层
   替代 localStorage，实现跨设备数据共享
================================================ */

const SUPABASE_URL = 'https://qwxsnqeigqrslewqdjco.supabase.co';
const SUPABASE_KEY = 'sb_publishable_p1hgv-jDE3SBZ5_MoaU_5Q_UYEsMl8h';

let _sb = null;

// 模拟Supabase对象（当SDK未加载时使用）
function _mockSb() {
  var mockQuery = function() {
    var q = {
      select: function() { return q; },
      insert: function() { return q; },
      update: function() { return q; },
      eq: function() { return q; },
      order: function() { return q; },
      limit: function() { return q; },
      single: function() { return Promise.resolve({ data: null, error: { code: 'NO_SUPABASE', message: 'Supabase SDK未加载' } }); },
      then: function(cb) { return Promise.resolve({ data: [], error: null }).then(cb); }
    };
    return q;
  };
  return {
    from: function() { return mockQuery(); },
    channel: function() {
      return {
        on: function() { return { subscribe: function() { return {}; } }; }
      };
    }
  };
}

function sb() {
  if (!_sb) {
    if (!window.supabase) {
      console.warn('Supabase SDK未加载，使用模拟对象');
      return _mockSb();
    }
    _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return _sb;
}

// 本地缓存，减少请求
const _cache = {
  users: null,
  orders: null,
  cacheTime: 0,
  CACHE_TTL: 5000 // 5秒缓存
};

// ============ 通用查询 ============

async function fetchUsers() {
  const { data, error } = await sb().from('users').select('*').order('created_at', { ascending: true });
  if (error) { console.error('fetchUsers error:', error); return []; }
  // 统一字段名，方便现有代码使用
  return data.map(u => ({
    id: String(u.id),
    phone: u.phone,
    password: u.password,
    name: u.name,
    role: u.role, // 'passenger' | 'driver' | 'admin' | 'staff'
    avatar: u.avatar,
    car_plate: u.car_plate,
    car_model: u.car_model,
    rating: u.rating ? String(u.rating) : '4.9',
    total_orders: u.total_orders || 0,
    online: u.online || false,
    createdAt: u.created_at ? new Date(u.created_at).toLocaleString('zh-CN', { hour12: false }) : '',
    // 保留原始字段
    license: u.car_plate || '', // 司机的驾驶证号用car_plate存
    _sb_id: u.id
  }));
}

async function fetchOrders() {
  const { data, error } = await sb().from('orders').select('*').order('created_at', { ascending: false });
  if (error) { console.error('fetchOrders error:', error); return []; }
  return data.map(o => ({
    id: String(o.id),
    order_no: o.order_no,
    passenger_id: o.passenger_id ? String(o.passenger_id) : null,
    driver_id: o.driver_id ? String(o.driver_id) : null,
    userId: o.passenger_id ? String(o.passenger_id) : null,
    driverId: o.driver_id ? String(o.driver_id) : null,
    status: o.status,
    from: o.from_addr,
    to: o.to_addr,
    from_addr: o.from_addr,
    to_addr: o.to_addr,
    from_lat: o.from_lat,
    from_lng: o.from_lng,
    to_lat: o.to_lat,
    to_lng: o.to_lng,
    distance: o.distance,
    price: o.price ? String(o.price) : '0',
    rating: o.rating,
    review: o.review,
    driverLat: o.driver_lat || null,
    driverLng: o.driver_lng || null,
    createdAt: o.created_at ? new Date(o.created_at).toLocaleString('zh-CN', { hour12: false }) : '',
    acceptedAt: o.accepted_at ? new Date(o.accepted_at).toLocaleString('zh-CN', { hour12: false }) : null,
    completedAt: o.completed_at ? new Date(o.completed_at).toLocaleString('zh-CN', { hour12: false }) : null,
    note: '', // orders表没有note字段，用review代替
    customerName: '',
    customerPhone: '',
    createdByDriver: false,
    _sb_id: o.id
  }));
}

// ============ DB 兼容层（异步） ============
const DB = {
  // 用户
  async getUsers() { return fetchUsers(); },
  async getDrivers() { return (await fetchUsers()).filter(u => u.role === 'driver'); },
  async getStaff() { return (await fetchUsers()).filter(u => u.role === 'admin' || u.role === 'staff'); },
  async getPassengers() { return (await fetchUsers()).filter(u => u.role === 'passenger'); },

  // 订单
  async getOrders() { return fetchOrders(); },

  // 通知（暂时保留本地）
  getList(key) { try { return JSON.parse(localStorage.getItem('dj_' + key)) || null; } catch { return null; } },
  set(key, val) { localStorage.setItem('dj_' + key, JSON.stringify(val)); },
  push(key, item) { const list = this.getList(key) || []; list.push(item); this.set(key, list); },

  // ============ 用户操作 ============
  async findUser(phone, password, role) {
    const { data, error } = await sb()
      .from('users')
      .select('*')
      .eq('phone', phone)
      .eq('password', password)
      .eq('role', role)
      .limit(1);
    if (error || !data || data.length === 0) return null;
    const u = data[0];
    return {
      id: String(u.id),
      phone: u.phone,
      password: u.password,
      name: u.name,
      role: u.role,
      avatar: u.avatar,
      car_plate: u.car_plate,
      car_model: u.car_model,
      rating: u.rating ? String(u.rating) : '4.9',
      total_orders: u.total_orders || 0,
      online: u.online || false,
      createdAt: u.created_at ? new Date(u.created_at).toLocaleString('zh-CN', { hour12: false }) : '',
      license: u.car_plate || '',
      _sb_id: u.id
    };
  },

  async findUserByPhone(phone, role) {
    const { data, error } = await sb()
      .from('users')
      .select('*')
      .eq('phone', phone)
      .eq('role', role)
      .limit(1);
    if (error || !data || data.length === 0) return null;
    const u = data[0];
    return {
      id: String(u.id),
      phone: u.phone,
      password: u.password,
      name: u.name,
      role: u.role,
      createdAt: u.created_at ? new Date(u.created_at).toLocaleString('zh-CN', { hour12: false }) : '',
      license: u.car_plate || '',
      _sb_id: u.id
    };
  },

  async registerUser(user) {
    const { data, error } = await sb()
      .from('users')
      .insert({
        phone: user.phone,
        password: user.pwd || user.password,
        role: user.role || 'passenger',
        name: user.name,
        car_plate: user.license || null,
        rating: user.rating || 5.0,
        online: false
      })
      .select()
      .single();
    if (error) {
      if (error.code === '23505') return { error: '该手机号已注册' };
      console.error('registerUser error:', error);
      return { error: '注册失败：' + (error.message || '未知错误') };
    }
    return {
      id: String(data.id),
      phone: data.phone,
      name: data.name,
      role: data.role,
      createdAt: data.created_at ? new Date(data.created_at).toLocaleString('zh-CN', { hour12: false }) : '',
      license: data.car_plate || '',
      _sb_id: data.id
    };
  },

  // ============ 订单操作 ============
  async createOrder(order) {
    const orderNo = 'DJ' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
    const now = new Date().toLocaleString('zh-CN', { hour12: false });

    // 尝试写入 Supabase
    if (window.supabase) {
      const insertData = {
        order_no: orderNo,
        passenger_id: order.userId ? parseInt(order.userId) : null,
        driver_id: order.driverId ? parseInt(order.driverId) : null,
        status: order.status || 'pending',
        from_addr: order.from,
        to_addr: order.to,
        from_lat: order.from_lat || null,
        from_lng: order.from_lng || null,
        to_lat: order.to_lat || null,
        to_lng: order.to_lng || null,
        distance: order.distance || null,
        price: parseFloat(order.price) || 0
      };

      try {
        const { data, error } = await sb()
          .from('orders')
          .insert(insertData)
          .select()
          .single();

        if (!error && data) {
          return {
            id: String(data.id),
            order_no: data.order_no,
            userId: data.passenger_id ? String(data.passenger_id) : null,
            driverId: data.driver_id ? String(data.driver_id) : null,
            status: data.status,
            from: data.from_addr,
            to: data.to_addr,
            price: String(data.price),
            createdAt: data.created_at ? new Date(data.created_at).toLocaleString('zh-CN', { hour12: false }) : now,
            acceptedAt: data.accepted_at ? new Date(data.accepted_at).toLocaleString('zh-CN', { hour12: false }) : null,
            completedAt: data.completed_at ? new Date(data.completed_at).toLocaleString('zh-CN', { hour12: false }) : null,
            note: order.note || '',
            customerName: order.customerName || '',
            customerPhone: order.customerPhone || '',
            createdByDriver: order.createdByDriver || false,
            _sb_id: data.id
          };
        }
        console.warn('createOrder Supabase失败，降级本地存储:', error);
      } catch(e) {
        console.warn('createOrder 异常，降级本地存储:', e);
      }
    }

    // 降级：本地 localStorage 存储
    const localId = 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const localOrder = {
      id: localId,
      order_no: orderNo,
      userId: order.userId ? String(order.userId) : null,
      driverId: order.driverId ? String(order.driverId) : null,
      status: order.status || 'pending',
      from: order.from,
      to: order.to,
      from_lat: order.from_lat || null,
      from_lng: order.from_lng || null,
      to_lat: order.to_lat || null,
      to_lng: order.to_lng || null,
      distance: order.distance || null,
      price: String(parseFloat(order.price) || 0),
      createdAt: now,
      acceptedAt: null,
      completedAt: null,
      note: order.note || '',
      customerName: order.customerName || '',
      customerPhone: order.customerPhone || '',
      createdByDriver: order.createdByDriver || false,
      _local: true
    };
    try {
      var localOrders = JSON.parse(localStorage.getItem('dj_local_orders') || '[]');
      localOrders.unshift(localOrder);
      localStorage.setItem('dj_local_orders', JSON.stringify(localOrders));
    } catch(e) {}
    console.log('订单已保存到本地存储（离线模式）:', localOrder.id);
    return localOrder;
  },

  async updateOrder(orderId, updates) {
    const sbData = {};
    if (updates.status) sbData.status = updates.status;
    if (updates.driverId !== undefined) sbData.driver_id = updates.driverId ? parseInt(updates.driverId) : null;
    if (updates.acceptedAt) sbData.accepted_at = new Date().toISOString();
    if (updates.completedAt) sbData.completed_at = new Date().toISOString();
    if (updates.rating) sbData.rating = updates.rating;
    if (updates.review) sbData.review = updates.review;
    if (updates.price) sbData.price = parseFloat(updates.price);
    // 司机实时位置
    if (updates.driverLat !== undefined) sbData.driver_lat = parseFloat(updates.driverLat);
    if (updates.driverLng !== undefined) sbData.driver_lng = parseFloat(updates.driverLng);

    const { data, error } = await sb()
      .from('orders')
      .update(sbData)
      .eq('id', parseInt(orderId))
      .select()
      .single();

    if (error) {
      console.error('updateOrder error:', error);
      return null;
    }
    return data;
  },

  async getOrderById(orderId) {
    // 先检查本地存储
    if (String(orderId).startsWith('local_')) {
      try {
        var localOrders = JSON.parse(localStorage.getItem('dj_local_orders') || '[]');
        var found = localOrders.find(function(o) { return o.id === String(orderId); });
        if (found) return found;
      } catch(e) {}
      return null;
    }

    const { data, error } = await sb()
      .from('orders')
      .select('*')
      .eq('id', parseInt(orderId))
      .single();
    if (error || !data) return null;
    return {
      id: String(data.id),
      order_no: data.order_no,
      userId: data.passenger_id ? String(data.passenger_id) : null,
      driverId: data.driver_id ? String(data.driver_id) : null,
      status: data.status,
      from: data.from_addr,
      to: data.to_addr,
      fromLat: data.from_lat,
      fromLng: data.from_lng,
      toLat: data.to_lat,
      toLng: data.to_lng,
      distance: data.distance,
      price: String(data.price),
      rating: data.rating,
      review: data.review,
      driverLat: data.driver_lat || null,
      driverLng: data.driver_lng || null,
      createdAt: data.created_at ? new Date(data.created_at).toLocaleString('zh-CN', { hour12: false }) : '',
      acceptedAt: data.accepted_at ? new Date(data.accepted_at).toLocaleString('zh-CN', { hour12: false }) : null,
      completedAt: data.completed_at ? new Date(data.completed_at).toLocaleString('zh-CN', { hour12: false }) : null,
      _sb_id: data.id
    };
  },

  // ============ 司机上线/下线 ============
  async setDriverOnline(userId, online) {
    const { error } = await sb()
      .from('users')
      .update({ online: online })
      .eq('id', parseInt(userId));
    if (error) console.error('setDriverOnline error:', error);
  },

  // ============ 订阅实时订单变更 ============
  subscribeOrders(callback) {
    return sb()
      .channel('orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        callback(payload);
      })
      .subscribe();
  },

  // ============ 订阅用户变更（上下线） ============
  subscribeUsers(callback) {
    return sb()
      .channel('users-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, (payload) => {
        callback(payload);
      })
      .subscribe();
  },

  // ============ 短信验证码 ============
  // 发送验证码
  async sendSMS(phone, type = 'register', role = 'passenger') {
    try {
      var resp = await fetch(SUPABASE_URL + '/functions/v1/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone, type: type, role: role })
      });
      var data = await resp.json();
      if (data.error) return { error: data.error };
      return { success: true, dev_mode: data.dev_mode, code: data.code, message: data.message };
    } catch(e) {
      console.error('sendSMS error:', e);
      return { error: '网络错误，请检查网络连接' };
    }
  },

  // 验证验证码
  async verifySMSCode(phone, code, type = 'register') {
    try {
      var resp = await fetch(SUPABASE_URL + '/functions/v1/verify-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone, code: code, type: type })
      });
      var data = await resp.json();
      if (data.error) return { valid: false, error: data.error };
      return { valid: true, role: data.role };
    } catch(e) {
      console.error('verifySMSCode error:', e);
      return { valid: false, error: '网络错误，请检查网络连接' };
    }
  }
};

// 将DB对象挂载到window，确保其他文件可以访问
window.DB = DB;

// 监听Supabase SDK加载成功事件，重新初始化client
window.addEventListener('supabase-loaded', function() {
  console.log('Supabase SDK加载成功，初始化client');
  _sb = null; // 重置，让下次sb()调用重新创建
});

console.log('supabase.js加载完毕，DB对象已挂载到window.DB');
