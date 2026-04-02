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

// 全局错误处理
window.onerror = function(msg, url, line, col, error) {
  console.error('全局错误:', msg, 'at', line + ':' + col, error);
  var app = document.getElementById('app');
  if (app) {
    app.innerHTML = '<div style="padding:40px;text-align:center"><div style="font-size:48px;margin-bottom:20px">⚠️</div><h3>应用加载失败</h3><p style="color:#666;margin:12px 0">' + msg + '</p><p style="color:#999;font-size:12px;margin:8px 0">' + url + ':' + line + ':' + col + '</p><button onclick="window.location.reload()" style="padding:12px 24px;background:#3498db;color:#fff;border:none;border-radius:8px;font-size:16px">重新加载</button></div>';
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

// ============ 路线展示地图（只读，用于订单详情/接单大厅） ============
function initRouteDisplayMap(mapDivId, fromLat, fromLng, toLat, toLng, options) {
  var toInput = document.getElementById(opts.toInputId);
  var searchInput = document.getElementById(opts.searchInputId);
  var searchResults = document.getElementById(opts.searchResultsId);
  var locateBtn = document.getElementById(opts.locateBtnId);
  var toolInfo = document.getElementById(opts.toolInfoId);
  var routeInfoEl = document.getElementById(opts.routeInfoId);
  if (!mapDiv) return;
  
  // 检查地图API是否就绪
  if (typeof TMap === 'undefined') {
    console.warn('腾讯地图API未加载，地图功能暂不可用');
    if (toolInfo) toolInfo.textContent = '地图加载中...';
    return;
  }

  var selectMode = 'from';
  var map = null;
  var fromMarker = null;
  var toMarker = null;
  var geocoder = null;
  var searchTimer = null;
  var routeLine = null; // 路线折线对象
  var routeDistance = 0; // 路线距离（米）
  var routeDuration = 0; // 路线时间（秒）

  var center = new TMap.LatLng(23.129, 113.264);
  map = new TMap.Map(mapDiv, {
    center: center,
    zoom: 13,
    pitch: 30,
    mapStyleId: 'style1'
  });

  geocoder = new TMap.service.Geocoder();

  // 暴露给外部读取路线信息的接口
  map._getRouteInfo = function() {
    return { distance: routeDistance, duration: routeDuration };
  };

  function updateInfo(text) {
    if (toolInfo) toolInfo.textContent = text;
  }

  // 更新路线信息显示
  function updateRouteInfo(distance, duration) {
    routeDistance = distance || 0;
    routeDuration = duration || 0;
    if (!routeInfoEl) return;
    if (distance > 0) {
      var distKm = distance >= 1000 ? (distance / 1000).toFixed(1) + ' km' : distance + ' m';
      var durMin = Math.ceil(duration / 60);
      var durText = durMin >= 60 ? Math.floor(durMin / 60) + '小时' + (durMin % 60) + '分钟' : durMin + '分钟';
      routeInfoEl.innerHTML = '<div class="route-info-row"><span class="route-info-icon">🚗</span><span class="route-info-label">预估距离</span><span class="route-info-value">' + distKm + '</span></div>' +
        '<div class="route-info-row"><span class="route-info-icon">⏱️</span><span class="route-info-label">预计时间</span><span class="route-info-value">' + durText + '</span></div>';
      routeInfoEl.style.display = 'flex';
    } else {
      routeInfoEl.style.display = 'none';
    }
  }

  // 清除路线
  function clearRoute() {
    if (routeLine) { routeLine.setMap(null); routeLine = null; }
    routeDistance = 0;
    routeDuration = 0;
    updateRouteInfo(0, 0);
  }

  // 规划驾车路线
  function planRoute() {
    var fl = document.getElementById(opts.fromLatId);
    var fg = document.getElementById(opts.fromLngId);
    var tl = document.getElementById(opts.toLatId);
    var tg = document.getElementById(opts.toLngId);
    if (!fl || !fg || !tl || !tg || !fl.value || !fg.value || !tl.value || !tg.value) return;

    clearRoute();
    updateInfo('⏳ 规划路线中...');

    var driving = new TMap.service.DrivingService({
      complete: function(result) {
        if (result && result.result && result.result.routes && result.result.routes.length > 0) {
          var route = result.result.routes[0];
          updateRouteInfo(route.distance, route.duration);

          // 绘制路线
          var path = [];
          if (route.steps) {
            route.steps.forEach(function(step) {
              if (step.polyline) path = path.concat(step.polyline);
            });
          }
          if (path.length > 0) {
            routeLine = new TMap.MultiPolyline({
              map: map,
              styles: {
                'route-style': new TMap.PolylineStyle({
                  color: '#3777FF',
                  width: 6,
                  borderWidth: 2,
                  borderColor: '#FFF',
                  lineCap: 'round',
                  lineJoin: 'round'
                })
              },
              geometries: [{
                id: 'route-line',
                styleId: 'route-style',
                paths: path
              }]
            });
          }

          // 调整视野
          if (route.bounds) {
            try {
              map.fitBounds(new TMap.LatLngBounds(
                new TMap.LatLng(route.bounds.southwest.lat, route.bounds.southwest.lng),
                new TMap.LatLng(route.bounds.northeast.lat, route.bounds.northeast.lng)
              ), { padding: 80 });
            } catch(e) {}
          }

          updateInfo('✅ 路线规划完成');
        } else {
          // 没有路线结果，只显示标记点
          updateInfo('⚠️ 未找到合适路线，已标记起终点');
        }
      },
      error: function(err) {
        console.warn('路线规划失败:', err);
        updateInfo('📍 已标记起终点（路线规划暂不可用）');
      }
    });

    driving.search({
      from: new TMap.LatLng(parseFloat(fl.value), parseFloat(fg.value)),
      to: new TMap.LatLng(parseFloat(tl.value), parseFloat(tg.value))
    });
  }

  function updateMarker(type, lat, lng, address) {
    var pos = new TMap.LatLng(lat, lng);
    if (type === 'from') {
      if (fromMarker) fromMarker.setMap(null);
      fromMarker = new TMap.MultiMarker({
        map: map,
        geometries: [{
          id: 'from_marker',
          position: pos,
          content: '<div style="background:#27AE60;color:#fff;padding:4px 10px;border-radius:20px;font-size:13px;font-weight:600;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.3);position:relative"><span style="position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid #27AE60"></span>🟢 出发</div>'
        }]
      });
      if (fromInput) fromInput.value = address;
      var fl = document.getElementById(opts.fromLatId);
      var fg = document.getElementById(opts.fromLngId);
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
      var tl = document.getElementById(opts.toLatId);
      var tg = document.getElementById(opts.toLngId);
      if (tl) tl.value = lat;
      if (tg) tg.value = lng;
    }

    // 如果起终点都设了，自动规划路线
    var fLat = document.getElementById(opts.fromLatId);
    var fLng = document.getElementById(opts.fromLngId);
    var tLat = document.getElementById(opts.toLatId);
    var tLng = document.getElementById(opts.toLngId);
    if (fLat && fLat.value && fLng && fLng.value && tLat && tLat.value && tLng && tLng.value) {
      planRoute();
    }
  }

  map.on('click', function(evt) {
    var lat = evt.latLng.getLat();
    var lng = evt.latLng.getLng();
    geocoder.getAddress({ location: new TMap.LatLng(lat, lng) }).then(function(res) {
      var address = res.result.address;
      updateMarker(selectMode, lat, lng, address);
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

  if (searchInput) {
    // 在手机浏览器上确保搜索框可以点击和输入
    // 移除readonly属性（如果存在）
    searchInput.removeAttribute('readonly');
    // 防止触摸事件穿透到地图
    searchInput.addEventListener('touchstart', function(e) { 
      e.stopPropagation();
      // 确保搜索框获得焦点
      searchInput.focus();
    });
    searchInput.addEventListener('touchmove', function(e) { e.stopPropagation(); });
    // 修复手机浏览器上输入框聚焦问题
    searchInput.addEventListener('focus', function() {
      setTimeout(function() {
        if (searchInput) searchInput.focus();
      }, 100);
    });
    searchInput.addEventListener('click', function(e) {
      e.stopPropagation();
      searchInput.focus();
    });
    // 阻止搜索结果面板的触摸穿透
    if (searchResults) {
      searchResults.addEventListener('touchstart', function(e) { e.stopPropagation(); });
      searchResults.addEventListener('touchmove', function(e) { e.stopPropagation(); });
    }
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
              item.addEventListener('touchstart', function(e) { e.stopPropagation(); });
              item.addEventListener('touchmove', function(e) { e.stopPropagation(); });
            });
          }
        }).catch(function() {
          if (searchResults) { searchResults.innerHTML = '<div class="map-search-empty">搜索失败，请重试</div>'; searchResults.style.display = 'block'; }
        });
      }, 400);
    });
  }

  document.addEventListener('click', function(e) {
    if (searchResults && !searchResults.contains(e.target) && e.target !== searchInput) {
      searchResults.style.display = 'none';
    }
  });

  if (fromInput) {
    fromInput.addEventListener('focus', function() {
      selectMode = 'from';
      updateInfo('🟢 点击地图或搜索选择出发地');
      // 确保地图可见且聚焦
      if (map) {
        map.setZoom(15);
        // 如果有当前位置的标记，调整视图
        if (fromMarker) {
          var pos = fromMarker.getGeometries()[0].position;
          map.setCenter(pos);
        }
      }
    });
    fromInput.removeAttribute('readonly');
    // 添加输入事件，尝试自动搜索
    fromInput.addEventListener('input', function(e) {
      var keyword = fromInput.value.trim();
      if (keyword.length > 2) {
        // 自动搜索并更新地图位置
        var poiservice = new TMap.service.PoiSearch();
        poiservice.search({ keyword: keyword, pageSize: 3 }).then(function(res) {
          if (res.data && res.data.length > 0) {
            var poi = res.data[0];
            updateMarker('from', poi.location.lat, poi.location.lng, poi.title);
          }
        }).catch(function() {});
      }
    });
  }
  if (toInput) {
    toInput.addEventListener('focus', function() {
      selectMode = 'to';
      updateInfo('🔴 点击地图或搜索选择目的地');
      // 确保地图可见且聚焦
      if (map) {
        map.setZoom(15);
        // 如果有当前位置的标记，调整视图
        if (toMarker) {
          var pos = toMarker.getGeometries()[0].position;
          map.setCenter(pos);
        }
      }
    });
    toInput.removeAttribute('readonly');
    // 添加输入事件，尝试自动搜索
    toInput.addEventListener('input', function(e) {
      var keyword = toInput.value.trim();
      if (keyword.length > 2) {
        // 自动搜索并更新地图位置
        var poiservice = new TMap.service.PoiSearch();
        poiservice.search({ keyword: keyword, pageSize: 3 }).then(function(res) {
          if (res.data && res.data.length > 0) {
            var poi = res.data[0];
            updateMarker('to', poi.location.lat, poi.location.lng, poi.title);
          }
        }).catch(function() {});
      }
    });
  }

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
      updateInfo('📍 点击地图选择位置');
    }, { enableHighAccuracy: true, timeout: 8000 });
  } else {
    updateInfo('📍 点击地图选择位置');
  }

  return map; // 返回map实例，供外部使用
}

// ============ 路线展示地图（只读，用于订单详情/接单大厅） ============
// 在指定div中展示起终点路线，可选回调获取路线信息
function initRouteDisplayMap(mapDivId, fromLat, fromLng, toLat, toLng, options) {
  var mapDiv = document.getElementById(mapDivId);
  if (!mapDiv) return null;
  
  // 检查地图API是否就绪
  if (typeof TMap === 'undefined') {
    console.warn('腾讯地图API未加载，无法显示路线地图 ' + mapDivId);
    mapDiv.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:14px">地图加载中...</div>';
    return null;
  }
  
  options = options || {};

  var map = new TMap.Map(mapDiv, {
    center: new TMap.LatLng(fromLat, fromLng),
    zoom: 12,
    pitch: 20,
    mapStyleId: 'style1',
    disableZoom: options.disableZoom || false
  });

  // 起终点标记
  new TMap.MultiMarker({
    map: map,
    geometries: [
      {
        id: 'start',
        position: new TMap.LatLng(fromLat, fromLng),
        content: '<div style="background:#27AE60;color:#fff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.3)">A</div>'
      },
      {
        id: 'end',
        position: new TMap.LatLng(toLat, toLng),
        content: '<div style="background:#E74C3C;color:#fff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.3)">B</div>'
      }
    ]
  });

  // 规划路线
  var driving = new TMap.service.DrivingService({
    complete: function(result) {
      if (result && result.result && result.result.routes && result.result.routes.length > 0) {
        var route = result.result.routes[0];

        // 路线信息回调
        if (options.onRouteReady) {
          options.onRouteReady({ distance: route.distance, duration: route.duration });
        }

        // 绘制路线
        var path = [];
        if (route.steps) {
          route.steps.forEach(function(step) {
            if (step.polyline) path = path.concat(step.polyline);
          });
        }
        if (path.length > 0) {
          new TMap.MultiPolyline({
            map: map,
            styles: {
              'style': new TMap.PolylineStyle({
                color: '#3777FF',
                width: 6,
                borderWidth: 2,
                borderColor: '#FFF',
                lineCap: 'round',
                lineJoin: 'round'
              })
            },
            geometries: [{ id: 'line', styleId: 'style', paths: path }]
          });
        }

        // 调整视野
        if (route.bounds) {
          try {
            map.fitBounds(new TMap.LatLngBounds(
              new TMap.LatLng(route.bounds.southwest.lat, route.bounds.southwest.lng),
              new TMap.LatLng(route.bounds.northeast.lat, route.bounds.northeast.lng)
            ), { padding: 40 });
          } catch(e) {}
        }
      }
    },
    error: function() {
      // 路线规划失败时只显示标记点
      map.fitBounds(new TMap.LatLngBounds([
        new TMap.LatLng(fromLat, fromLng),
        new TMap.LatLng(toLat, toLng)
      ]), { padding: 60 });
    }
  });

  driving.search({
    from: new TMap.LatLng(fromLat, fromLng),
    to: new TMap.LatLng(toLat, toLng)
  });

  return map;
}

// ============ 地图全屏展开 ============
function openMapFullscreen() {
  if (!window.__detailRouteMap || typeof TMap === 'undefined') {
    showToast('地图尚未加载完成', 'error');
    return;
  }

  // 获取订单数据
  var order = window.__lastDetailOrder || {};
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
      var fsMap = new TMap.Map(container, {
        center: new TMap.LatLng(order.fromLat, order.fromLng),
        zoom: 13,
        pitch: 30,
        mapStyleId: 'style1'
      });

      // 起终点标记
      new TMap.MultiMarker({
        map: fsMap,
        geometries: [
          {
            id: 'start',
            position: new TMap.LatLng(order.fromLat, order.fromLng),
            content: '<div style="background:#27AE60;color:#fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:bold;box-shadow:0 2px 12px rgba(39,174,96,0.4)">A</div>'
          },
          {
            id: 'end',
            position: new TMap.LatLng(order.toLat, order.toLng),
            content: '<div style="background:#E74C3C;color:#fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:bold;box-shadow:0 2px 12px rgba(231,76,60,0.4)">B</div>'
          }
        ]
      });

      // 重新规划路线
      new TMap.service.DrivingService({
        complete: function(result) {
          if (result && result.result && result.result.routes && result.result.routes.length > 0) {
            var route = result.result.routes[0];
            var path = [];
            if (route.steps) {
              route.steps.forEach(function(step) {
                if (step.polyline) path = path.concat(step.polyline);
              });
            }
            if (path.length > 0) {
              new TMap.MultiPolyline({
                map: fsMap,
                styles: {
                  'style': new TMap.PolylineStyle({
                    color: '#3777FF',
                    width: 8,
                    borderWidth: 2,
                    borderColor: '#FFF',
                    lineCap: 'round',
                    lineJoin: 'round'
                  })
                },
                geometries: [{ id: 'line', styleId: 'style', paths: path }]
              });
            }
            if (route.bounds) {
              try {
                fsMap.fitBounds(new TMap.LatLngBounds(
                  new TMap.LatLng(route.bounds.southwest.lat, route.bounds.southwest.lng),
                  new TMap.LatLng(route.bounds.northeast.lat, route.bounds.northeast.lng)
                ), { padding: 80 });
              } catch(e) {}
            }
          }
        }
      }).search({
        from: new TMap.LatLng(order.fromLat, order.fromLng),
        to: new TMap.LatLng(order.toLat, order.toLng)
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
      // 添加触摸反馈
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
    
    // 点击空白区域也关闭（底部信息区除外）
    overlay.addEventListener('click', function(e) {
      if (e.target.id === 'map-fs-container' || e.target === overlay) {
        closeMapFullscreen();
      }
    });
    
    // 手机上的触摸关闭（滑动关闭）
    var startY = 0;
    overlay.addEventListener('touchstart', function(e) {
      startY = e.touches[0].clientY;
    });
    overlay.addEventListener('touchmove', function(e) {
      var currentY = e.touches[0].clientY;
      var diff = currentY - startY;
      // 向下滑动超过100px关闭
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

  // 从地图获取预估时间
  if (window.__orderMap && window.__orderMap._getRouteInfo) {
    const routeInfo = window.__orderMap._getRouteInfo();
    if (routeInfo && routeInfo.duration) {
      durationMinutes = Math.ceil(routeInfo.duration / 60); // 秒转分钟
    }
  }

  // 计算总价
  let totalPrice = basePrice;

  // 超出30分钟，每30分钟加收20元
  if (durationMinutes > 30) {
    const extraMinutes = durationMinutes - 30;
    const extraPeriods = Math.ceil(extraMinutes / 30); // 向上取整
    totalPrice = basePrice + extraPeriods * 20;
  }

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

// ============ 通知模块（本地localStorage存储） ============
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
function navigate(page, params) {
  State.currentPage = page;
  State.pageParams = params || {};
  render();
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
      case 'order-hall':     app.innerHTML = await renderOrderHall(); break;
      case 'driver-create-order': app.innerHTML = renderDriverCreateOrder(); break;
      case 'user-orders':    app.innerHTML = await renderUserOrders(); break;
      case 'driver-orders':  app.innerHTML = await renderDriverOrders(); break;
      case 'profile':        app.innerHTML = await renderProfile(); break;
      case 'stats':          app.innerHTML = await renderStats(); break;
      case 'notifications':  app.innerHTML = renderNotifications(); break;
      case 'feedback':       app.innerHTML = renderFeedback(); break;
      case 'about':          app.innerHTML = renderAbout(); break;
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
  // 如果地图API还未就绪，等待就绪后再初始化
  var mapReady = typeof TMap !== 'undefined' || typeof AMap !== 'undefined';
  if (mapReady) {
    initPageExtras();
  } else if (window.__tmapReady || window.__amapReady) {
    initPageExtras();
  } else {
    // 监听地图API就绪事件
    var initExtrasOnce = function() {
      initPageExtras();
      window.removeEventListener('tmap-ready', initExtrasOnce);
    };
    window.addEventListener('tmap-ready', initExtrasOnce);
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
  const tab = State.pageParams && State.pageParams.tab === 'register' ? 'register' : 'login';
  return '<div class="auth-page page">' +
    '<div class="auth-hero"><div class="icon">👤</div><h1>乘客端</h1></div>' +
    '<div class="auth-body"><div class="auth-card">' +
      '<div class="auth-tabs">' +
        '<button class="auth-tab ' + (tab === 'login' ? 'active' : '') + '" data-tab="login">登录</button>' +
        '<button class="auth-tab ' + (tab === 'register' ? 'active' : '') + '" data-tab="register">注册</button>' +
      '</div>' +
      (tab === 'login' ? '<form id="login-form">' +
        '<div class="form-group"><label>手机号</label><input class="form-control" type="tel" id="login-phone" placeholder="请输入手机号" maxlength="11" /></div>' +
        '<div class="form-group"><label>密码</label><input class="form-control" type="password" id="login-pwd" placeholder="请输入密码" /></div>' +
        '<button class="btn btn-primary btn-block" type="submit">登录</button>' +
        '<div class="auth-link">还没有账号？<a data-tab="register">立即注册</a></div>' +
      '</form>' : '<form id="register-form">' +
        '<div class="form-group"><label>昵称</label><input class="form-control" type="text" id="reg-name" placeholder="请输入昵称" /></div>' +
        '<div class="form-group"><label>手机号</label><input class="form-control" type="tel" id="reg-phone" placeholder="请输入手机号" maxlength="11" /></div>' +
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
  const tab = State.pageParams && State.pageParams.tab === 'register' ? 'register' : 'login';
  return '<div class="auth-page page" style="background:linear-gradient(180deg,#2C3E50 0%,#2C3E50 200px,var(--bg) 200px)">' +
    '<div class="auth-hero" style="background:transparent"><div class="icon">🧑‍✈️</div><h1>司机端</h1></div>' +
    '<div class="auth-body"><div class="auth-card">' +
      '<div class="auth-tabs">' +
        '<button class="auth-tab ' + (tab === 'login' ? 'active' : '') + '" data-tab="login">登录</button>' +
        '<button class="auth-tab ' + (tab === 'register' ? 'active' : '') + '" data-tab="register">注册</button>' +
      '</div>' +
      (tab === 'login' ? '<form id="driver-login-form">' +
        '<div class="form-group"><label>手机号</label><input class="form-control" type="tel" id="dlogin-phone" placeholder="请输入手机号" maxlength="11" /></div>' +
        '<div class="form-group"><label>密码</label><input class="form-control" type="password" id="dlogin-pwd" placeholder="请输入密码" /></div>' +
        '<button class="btn btn-secondary btn-block" type="submit" style="background:#2C3E50">登录</button>' +
        '<div class="auth-link">还没有账号？<a data-tab="register">立即注册</a></div>' +
      '</form>' : '<form id="driver-register-form">' +
        '<div class="form-group"><label>真实姓名</label><input class="form-control" type="text" id="dreg-name" placeholder="请输入真实姓名" /></div>' +
        '<div class="form-group"><label>手机号</label><input class="form-control" type="tel" id="dreg-phone" placeholder="请输入手机号" maxlength="11" /></div>' +
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
  return '<div class="page">' +
    '<div class="page-header"><button class="back-btn" data-action="user-main">←</button><h2>叫代驾</h2></div>' +
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
  let backAction = 'user-main';
  if (isDriver) backAction = 'driver-orders';
  if (isStaff) backAction = 'staff-orders';

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
  if ((isUser || isStaff) && order.driverId && ['accepted', 'ongoing', 'completed'].includes(order.status)) {
    const drivers = await DB.getDrivers();
    const driver = drivers.find(function(d) { return d.id === order.driverId; });
    if (driver) {
      driverInfoHtml = '<div class="card" style="margin-bottom:16px">' +
        '<div class="card-header">🧑‍✈️ 代驾司机</div>' +
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
  if (order.fromLat && order.fromLng && order.toLat && order.toLng) {
    routeMapHtml = '<div id="detail-route-map-wrapper" style="position:relative;margin-bottom:12px">' +
      '<div id="detail-route-map" class="detail-route-map"></div>' +
      '<button class="map-expand-btn" data-action="expand-map" data-map-id="detail-route-map">⛶</button>' +
      '</div>';
    // 距离信息
    var distText = '';
    if (order.distance && order.distance > 0) {
      distText = order.distance >= 1000 ? (order.distance / 1000).toFixed(1) + ' km' : order.distance + ' m';
    }
    if (distText) {
      routeMapHtml += '<div style="font-size:13px;color:var(--text-muted);text-align:center;margin-bottom:8px">📏 预估距离：' + distText + '</div>';
    }
  }

  // 操作按钮
  let actionButtons = '';
  if (isUser && order.status === 'pending') {
    actionButtons = '<button class="btn btn-danger btn-block" data-action="cancel-order" data-order-id="' + order.id + '">取消订单</button>';
  }
  if (isDriver && order.driverId === State.currentUser.id) {
    if (order.status === 'accepted') {
      actionButtons = '<button class="btn btn-success btn-block" data-action="start-order" data-order-id="' + order.id + '">🚗 开始代驾</button>';
    }
    if (order.status === 'ongoing') {
      actionButtons = '<button class="btn btn-primary btn-block" data-action="complete-order" data-order-id="' + order.id + '">✅ 完成代驾</button>';
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
    '<div class="page-header"><button class="back-btn" data-action="user-main">←</button><h2>我的订单</h2></div>' +
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
    return '<div class="page"><div class="page-header"><button class="back-btn" data-action="driver-main">←</button><h2>接单大厅</h2></div>' +
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

  return '<div class="page"><div class="page-header"><button class="back-btn" data-action="driver-main">←</button><h2>接单大厅</h2><span class="badge badge-warning">' + allOrders.length + ' 个待接</span></div>' +
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

  return '<div class="page"><div class="page-header"><button class="back-btn" data-action="driver-main">←</button><h2>我的订单</h2></div>' +
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
      '<div style="text-align:center;padding:32px 0 24px"><div style="font-size:56px;margin-bottom:12px">🚗</div><div style="font-size:22px;font-weight:700">代驾出行</div><div style="font-size:13px;color:var(--text-muted);margin-top:6px">安全 · 快捷 · 专业</div><div style="font-size:12px;color:var(--text-muted);margin-top:12px;padding:4px 12px;background:var(--bg);border-radius:12px;display:inline-block">v2.0.0 · 云端同步</div></div>' +
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
//  事件绑定
// ============================================================
function bindEvents() {
  // 通用 data-action 路由
  document.querySelectorAll('[data-action]').forEach(function(el) {
    el.addEventListener('click', function(e) {
      e.stopPropagation();
      handleAction(el.dataset.action, el.dataset);
    });
  });

  // Tab 切换
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
      if (!name) { showToast('请输入昵称', 'error'); return; }
      if (!/^1\d{10}$/.test(phone)) { showToast('请输入正确的手机号', 'error'); return; }
      if (pwd.length < 6) { showToast('密码至少6位', 'error'); return; }
      if (pwd !== pwd2) { showToast('两次密码不一致', 'error'); return; }
      var result = await DB.registerUser({ name: name, phone: phone, pwd: pwd, role: 'passenger' });
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
      navigate('driver-main');
    });
  }

  // ===== 司机注册（异步） =====
  var dRegForm = document.getElementById('driver-register-form');
  if (dRegForm) {
    dRegForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      var name = document.getElementById('dreg-name').value.trim();
      var phone = document.getElementById('dreg-phone').value.trim();
      var license = document.getElementById('dreg-license').value.trim();
      var pwd = document.getElementById('dreg-pwd').value;
      var pwd2 = document.getElementById('dreg-pwd2').value;
      if (!name) { showToast('请输入真实姓名', 'error'); return; }
      if (!/^1\d{10}$/.test(phone)) { showToast('请输入正确的手机号', 'error'); return; }
      if (!license) { showToast('请输入驾驶证号', 'error'); return; }
      if (pwd.length < 6) { showToast('密码至少6位', 'error'); return; }
      if (pwd !== pwd2) { showToast('两次密码不一致', 'error'); return; }
      var result = await DB.registerUser({ name: name, phone: phone, pwd: pwd, role: 'driver', license: license });
      if (result.error) { showToast(result.error, 'error'); return; }
      State.currentUser = { id: result.id, name: result.name, phone: result.phone, license: license, type: 'driver', rating: '4.9', createdAt: result.createdAt };
      showToast('注册成功，欢迎加入！', 'success');
      navigate('driver-main');
    });
  }

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
    case 'logout':      logout(); break;
    case 'clear-data':  clearLocalData(); break;

    case 'order-detail':
      navigate('order-detail', { orderId: dataset.orderId });
      break;

    case 'toggle-online': {
      State.driverOnline = !State.driverOnline;
      await DB.setDriverOnline(State.currentUser.id, State.driverOnline);
      showToast(State.driverOnline ? '🟢 已上线，开始接单！' : '⚫ 已下线', State.driverOnline ? 'success' : '');
      render();
      break;
    }

    // 司机接单
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

    // 完成代驾
    case 'complete-order': {
      var orderId3 = dataset.orderId;
      showToast('正在完成...', '');
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
  // 检查地图API是否就绪（支持高德或腾讯地图）
  if (typeof TMap === 'undefined' && typeof AMap === 'undefined') {
    console.warn('地图API未就绪，跳过地图初始化');
    return;
  }
  
  // 如果高德地图已就绪但TMap兼容层未就绪，等待一下
  if (typeof AMap !== 'undefined' && typeof TMap === 'undefined') {
    console.log('等待TMap兼容层就绪...');
    await new Promise(function(resolve) {
      var checkTmap = setInterval(function() {
        if (typeof TMap !== 'undefined') {
          clearInterval(checkTmap);
          resolve();
        }
      }, 100);
      setTimeout(function() { clearInterval(checkTmap); resolve(); }, 5000);
    });
  }
  
  // 初始化订单详情页的路线地图
  if (State.currentPage === 'order-detail' && State.pageParams.orderId) {
    var order = await DB.getOrderById(State.pageParams.orderId);
    if (order && order.fromLat && order.fromLng && order.toLat && order.toLng) {
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
function _startApp() {
  startRealtime();
  navigate('home');
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
