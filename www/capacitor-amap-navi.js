/**
 * AmapNavi.js - 高德导航 Capacitor 插件封装
 *
 * 使用方式：
 *   import AmapNavi from './capacitor-amap-navi.js';
 *   await AmapNavi.init('YOUR_AMAP_KEY');
 *   await AmapNavi.startNavigation({ waypoints, mode });
 *   await AmapNavi.startTracking((location) => { ... });
 */

(function (global) {
  'use strict';

  // 优先使用 Capacitor 插件
  var PluginClass = null;
  try {
    PluginClass = require('@capacitor/core').registerPlugin('AmapNavi');
  } catch (e) {
    // 非 Capacitor 环境（浏览器测试）
    PluginClass = null;
  }

  var AmapNavi = {
    _initialized: false,
    _apiKey: null,
    _tracking: false,
    _locationCallback: null,
    _listeners: {},
    _plugin: PluginClass,

    /**
     * 初始化高德导航 SDK
     * @param {string} apiKey - 高德地图 Key
     */
    async init(apiKey) {
      if (this._initialized && this._apiKey === apiKey) return;
      if (!this._plugin) {
        console.warn('[AmapNavi] 非 Capacitor 环境，跳过初始化');
        this._initialized = true;
        return;
      }
      try {
        await this._plugin.initialize({ apiKey });
        this._apiKey = apiKey;
        this._initialized = true;
        _log('[AmapNavi] 初始化成功');
      } catch (e) {
        console.error('[AmapNavi] 初始化失败:', e);
        throw e;
      }
    },

    /**
     * 检查高德地图 App 是否已安装
     */
    async isInstalled() {
      if (!this._plugin) return false;
      try {
        var result = await this._plugin.isAmapInstalled();
        return result.installed;
      } catch (e) {
        return false;
      }
    },

    /**
     * 启动导航（调起高德地图 App）
     * @param {Object} options
     * @param {Array} options.waypoints - 途经点 [{latitude, longitude, name?}, ...]
     *   第一个点=起点，最后一个点=终点
     * @param {number} [options.mode=0] - 0=驾车 1=步行 2=骑行
     */
    async startNavigation(options) {
      if (!options || !options.waypoints || options.waypoints.length < 2) {
        throw new Error('waypoints 至少需要起点和终点');
      }
      options.mode = options.mode || 0;

      if (!this._plugin) {
        // 浏览器环境：打开高德网页版
        var last = options.waypoints[options.waypoints.length - 1];
        var modeStr = ['drive', 'walk', 'ride'][options.mode] || 'drive';
        var url = 'https://uri.amap.com/navigation?to=' +
          last.longitude + ',' + last.latitude +
          (last.name ? '(' + encodeURIComponent(last.name) + ')' : '') +
          '&mode=' + modeStr + '&callnative=1';
        window.open(url, '_blank');
        _log('[AmapNavi] 浏览器环境，打开高德网页: ' + url);
        return { success: true };
      }

      try {
        var result = await this._plugin.launchNavi({
          waypoints: options.waypoints,
          mode: options.mode
        });
        _log('[AmapNavi] 导航已启动:', result);
        return result;
      } catch (e) {
        console.error('[AmapNavi] 启动导航失败:', e);
        throw e;
      }
    },

    /**
     * 启动 GPS 定位追踪
     * @param {Function} callback - 位置更新回调 { latitude, longitude, bearing, speed }
     */
    async startTracking(callback) {
      this._locationCallback = callback;
      if (this._tracking) return;

      if (!this._plugin) {
        // 浏览器环境用 Geolocation API
        this._browserGeolocation(callback);
        return;
      }

      try {
        var trackingId = await this._plugin.startLocationTracking();
        this._trackingId = trackingId.trackingId;

        // 监听位置更新事件
        this._plugin.addListener('locationUpdate', function (data) {
          callback({
            latitude: data.latitude,
            longitude: data.longitude,
            bearing: data.bearing || 0,
            speed: data.speed || 0
          });
        });

        this._tracking = true;
        _log('[AmapNavi] GPS 追踪已启动, trackingId:', this._trackingId);
      } catch (e) {
        console.error('[AmapNavi] 启动 GPS 失败:', e);
        // 降级到浏览器定位
        this._browserGeolocation(callback);
      }
    },

    /**
     * 停止 GPS 追踪
     */
    async stopTracking() {
      this._locationCallback = null;
      if (!this._tracking) return;

      if (this._browserWatchId != null) {
        navigator.geolocation.clearWatch(this._browserWatchId);
        this._browserWatchId = null;
      }

      if (this._plugin && this._trackingId) {
        try {
          await this._plugin.stopLocationTracking();
        } catch (e) {}
      }

      this._tracking = false;
      _log('[AmapNavi] GPS 追踪已停止');
    },

    /**
     * 启动嵌入式全屏导航（App 内直接显示高德导航界面）
     * @param {Object} options
     * @param {Array} options.waypoints - 途经点 [{latitude, longitude, name?}, ...]
     *   第一个点=起点，最后一个点=终点
     * @param {number} [options.mode=0] - 0=驾车 1=步行 2=骑行
     */
    async startEmbeddedNavi(options) {
      if (!options || !options.waypoints || options.waypoints.length < 2) {
        throw new Error('waypoints 至少需要起点和终点');
      }
      options.mode = options.mode || 0;

      if (!this._plugin) {
        // 浏览器环境：降级为外部 App 导航（无法内嵌）
        _log('[AmapNavi] 浏览器环境不支持嵌入式导航，降级为外部导航');
        return this.startNavigation(options);
      }

      try {
        var result = await this._plugin.startEmbeddedNavi({
          waypoints: options.waypoints,
          mode: options.mode
        });
        _log('[AmapNavi] 嵌入式导航已启动:', result);
        return result;
      } catch (e) {
        console.error('[AmapNavi] 嵌入式导航失败:', e);
        // 降级到外部 App 导航
        _log('[AmapNavi] 降级为外部 App 导航');
        return this.startNavigation(options);
      }
    },

    /**
     * 计算两点间距离（米）
     */
    async distance(from, to) {
      if (!this._plugin) {
        // 浏览器环境用 Haversine 公式
        return this._haversineDistance(from, to);
      }
      try {
        var result = await this._plugin.calculateDistance({ from, to });
        return result.distance;
      } catch (e) {
        return this._haversineDistance(from, to);
      }
    },

    // ---- 私有方法 ----

    _browserGeolocation(callback) {
      var self = this;
      if (!navigator.geolocation) {
        console.warn('[AmapNavi] 浏览器不支持 Geolocation');
        return;
      }
      this._browserWatchId = navigator.geolocation.watchPosition(
        function (pos) {
          callback({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            bearing: pos.coords.heading || 0,
            speed: pos.coords.speed || 0
          });
        },
        function (err) {
          console.warn('[AmapNavi] Geolocation 错误:', err.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    },

    _haversineDistance(from, to) {
      var R = 6371000;
      var lat1 = from.latitude * Math.PI / 180;
      var lat2 = to.latitude * Math.PI / 180;
      var dLat = (to.latitude - from.latitude) * Math.PI / 180;
      var dLng = (to.longitude - from.longitude) * Math.PI / 180;
      var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
      var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    }
  };

  // 暴露到全局
  global.AmapNavi = AmapNavi;

})(typeof window !== 'undefined' ? window : global);
