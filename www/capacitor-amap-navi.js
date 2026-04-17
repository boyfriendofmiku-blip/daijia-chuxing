/**
 * capacitor-amap-navi.js - 高德嵌入式全屏导航
 *
 * 在 App 内直接显示高德导航界面，包含完整逐条语音导航。
 * 不依赖任何外部 App，APK 内置高德 SDK。
 *
 * 使用方式：
 *   window.AmapNavi.startEmbeddedNavi({
 *     waypoints: [
 *       { latitude: 39.9, longitude: 116.4, name: '起点' },
 *       { latitude: 39.9, longitude: 116.5, name: '终点' }
 *     ],
 *     mode: 0  // 0=驾车 1=步行 2=骑行
 *   });
 */
(function (global) {
  'use strict';

  // 注册 Capacitor 插件（仅在 Capacitor 环境下生效）
  var plugin = null;
  try {
    plugin = require('@capacitor/core').registerPlugin('AmapNavi');
  } catch (e) {
    console.warn('[AmapNavi] 非 Capacitor 环境，将使用浏览器降级');
  }

  var AMapAPIKey = '700c467755db139a0780ef3c86276a83';

  var AmapNavi = {
    _plugin: plugin,
    _inited: false,

    /**
     * 启动嵌入式全屏导航（App 内直接显示高德导航界面）
     * @param {Object} options
     * @param {Array} options.waypoints - 途经点，第一个=起点，最后一个=终点
     * @param {number} [options.mode=0] - 0=驾车 1=步行 2=骑行
     */
    async startEmbeddedNavi(options) {
      if (!options || !options.waypoints || options.waypoints.length < 2) {
        throw new Error('waypoints 至少需要起点和终点');
      }
      options.mode = options.mode || 0;

      // Capacitor 原生插件路径
      if (this._plugin) {
        try {
          // 先初始化（如果还没初始化过）
          if (!this._inited) {
            await this._plugin.initialize({ apiKey: AMapAPIKey });
            this._inited = true;
          }
          var result = await this._plugin.startEmbeddedNavi({
            waypoints: options.waypoints,
            mode: options.mode
          });
          console.log('[AmapNavi] 嵌入式导航已启动:', result);
          return result;
        } catch (e) {
          console.error('[AmapNavi] 嵌入式导航调用失败:', e);
          throw e;
        }
      }

      // 浏览器环境：打开高德网页版
      var dest = options.waypoints[options.waypoints.length - 1];
      var modeMap = { 0: 'car', 1: 'walk', 2: 'ride' };
      var mode = modeMap[options.mode] || 'car';
      var url = 'https://m.amap.com/navi/?start=&end=' +
        dest.longitude + ',' + dest.latitude +
        '&navi=' + (options.mode === 1 ? 'walk' : options.mode === 2 ? 'ride' : 'driving') +
        '&ext=1&callnative=1';
      window.open(url, '_blank');
      console.log('[AmapNavi] 浏览器环境，打开高德网页导航:', url);
      return { success: true, browser: true };
    },

    /**
     * 启动 GPS 定位追踪（持续回调）
     * @param {Function} callback - { latitude, longitude, bearing, speed }
     */
    async startTracking(callback) {
      if (this._plugin) {
        try {
          await this._plugin.startLocationTracking();
          this._plugin.addListener('locationUpdate', function (data) {
            callback({
              latitude: data.latitude,
              longitude: data.longitude,
              bearing: data.bearing || 0,
              speed: data.speed || 0
            });
          });
          console.log('[AmapNavi] GPS 追踪已启动（原生）');
          return;
        } catch (e) {
          console.warn('[AmapNavi] 原生 GPS 失败，使用浏览器定位:', e);
        }
      }
      // 浏览器 Geolocation 降级
      if (navigator.geolocation) {
        navigator.geolocation.watchPosition(
          function (pos) {
            callback({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              bearing: pos.coords.heading || 0,
              speed: pos.coords.speed || 0
            });
          },
          function (err) { console.warn('[AmapNavi] 定位错误:', err.message); },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
        console.log('[AmapNavi] GPS 追踪已启动（浏览器 Geolocation）');
      }
    },

    /**
     * 停止 GPS 追踪
     */
    async stopTracking() {
      if (this._plugin) {
        try { await this._plugin.stopLocationTracking(); } catch (e) {}
      }
    }
  };

  global.AmapNavi = AmapNavi;

})(typeof window !== 'undefined' ? window : global);
