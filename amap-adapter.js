// 高德地图 API 适配器
// 用 AMap 替换 TMap

console.log('[AMap] 适配器加载');

// 主函数定义
function initOrderMap(opts) {
  console.log('[AMap] initOrderMap 调用', opts);
  var mapDiv = document.getElementById(opts.mapDivId);
  if (!mapDiv) {
    console.warn('[AMap] mapDiv未找到:', opts.mapDivId);
    return;
  }
  
  // 检查高德地图 API
  if (typeof AMap === 'undefined') {
    console.warn('[AMap] 高德地图API未加载');
    var toolInfo = document.getElementById(opts.toolInfoId);
    if (toolInfo) toolInfo.textContent = '地图加载中...';
    return;
  }
  
  console.log('[AMap] 开始初始化地图');
  
  // 需要异步加载的插件
  AMap.plugin([
    'AMap.PlaceSearch', 
    'AMap.Geocoder', 
    'AMap.Driving', 
    'AMap.Geolocation'
  ], function() {
    initMapWithPlugins(opts);
  });
  
  function initMapWithPlugins(opts) {
    console.log('[AMap] 插件加载完成');
    
    var selectMode = 'from';
    var fromMarker = null;
    var toMarker = null;
    var routeLine = null;
    var routeDistance = 0;
    var routeDuration = 0;

    // 初始化地图（默认广州）
    var map = new AMap.Map(mapDiv, {
      zoom: 13,
      center: [113.264, 23.129],
      mapStyle: 'amap://styles/light',
      showLabel: true,
      viewMode: '2D'
    });
    
    // 添加工具栏按钮事件
    // 放大按钮
    var zoomInBtn = document.getElementById(opts.zoomInBtnId);
    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', function() {
        map.zoomIn();
      });
    }
    
    // 缩小按钮
    var zoomOutBtn = document.getElementById(opts.zoomOutBtnId);
    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', function() {
        map.zoomOut();
      });
    }
    
    // 地图类型切换按钮
    var typeBtn = document.getElementById(opts.typeBtnId);
    var isSatellite = false;
    if (typeBtn) {
      typeBtn.addEventListener('click', function() {
        isSatellite = !isSatellite;
        if (isSatellite) {
          map.setMapStyle('amap://styles/satellite');
          typeBtn.textContent = '🗺️';
          typeBtn.classList.add('active');
        } else {
          map.setMapStyle('amap://styles/light');
          typeBtn.textContent = '🛰️';
          typeBtn.classList.remove('active');
        }
      });
    }

    // 实时路况切换按钮
    var trafficBtn = document.getElementById(opts.trafficBtnId);
    var isTrafficOn = true;
    if (trafficBtn) {
      trafficBtn.classList.add('active');
      trafficBtn.addEventListener('click', function() {
        isTrafficOn = !isTrafficOn;
        if (isTrafficOn) {
          map.setTrafficOn();
          trafficBtn.classList.add('active');
        } else {
          map.setTrafficOff();
          trafficBtn.classList.remove('active');
        }
      });
    }

    // 交换起终点按钮
    var swapBtn = document.getElementById(opts.swapBtnId);
    if (swapBtn) {
      swapBtn.addEventListener('click', function() {
        var fromInput = document.getElementById(opts.fromInputId);
        var toInput = document.getElementById(opts.toInputId);
        var fromLat = document.getElementById(opts.fromLatId);
        var fromLng = document.getElementById(opts.fromLngId);
        var toLat = document.getElementById(opts.toLatId);
        var toLng = document.getElementById(opts.toLngId);
        
        if (fromInput && toInput) {
          // 交换文本值
          var tempText = fromInput.value;
          fromInput.value = toInput.value;
          toInput.value = tempText;
          
          // 交换经纬度
          if (fromLat && fromLng && toLat && toLng) {
            var tempLat = fromLat.value;
            var tempLng = fromLng.value;
            fromLat.value = toLat.value;
            fromLng.value = toLng.value;
            toLat.value = tempLat;
            toLng.value = tempLng;
          }
          
          // 交换标记
          var tempMarker = fromMarker;
          fromMarker = toMarker;
          toMarker = tempMarker;
          
          // 更新标记并重新规划路线
          if (fromMarker) {
            fromMarker.setIcon(new AMap.Icon({
              size: new AMap.Size(32, 32),
              image: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNCIgZmlsbD0iIzI3QUU2MCIvPjxjaXJjbGUgY3g9IjE2IiBjeT0iNiIgcj0iNCIgZmlsbD0id2hpdGUiLz48dGV4dCB4PSIxNiIgeT0iMTgiIHRmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMiIgZm9ybWF0PSJ0cmltJ3MgYXV0byIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGRhdGEtdW5pY29kZT0i7Y+R5Yiw7aSw7Iao5pGzIj7tl5HiiaM+PXRleHQ+PjwvZz48L3N2Zz4=',
              imageSize: new AMap.Size(32, 32)
            }));
          }
          if (toMarker) {
            toMarker.setIcon(new AMap.Icon({
              size: new AMap.Size(32, 32),
              image: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNCIgZmlsbD0iI0U3NDQzQyIvPjxjaXJjbGUgY3g9IjE2IiBjeT0iNiIgcj0iNCIgZmlsbD0id2hpdGUiLz48dGV4dCB4PSIxNiIgeT0iMTgiIHRmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMiIgZm9ybWF0PSJ0cmltJ3MgYXV0byIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGRhdGEtdW5pY29kZT0i7Y+R5Yiw7Yiw7Ziq5pGzIj7tl5HiiaM+PXRleHQ+PjwvZz48L3N2Zz4=',
              imageSize: new AMap.Size(32, 32)
            }));
          }
          
          // 重新规划路线
          planRoute();
          
          showToast('已交换起终点 🔄', 'success');
        }
      });
    }

    // 使用插件方式创建的地理编码服务
    var geocoder = new AMap.Geocoder({ city: '全国', radius: 1000 });
    var driving = new AMap.Driving({
      policy: AMap.DrivingPolicy.LEAST_TIME,
      city: '全国',
      showTraffic: true,  // 显示实时路况
      extensions: 'all'   // 返回完整信息
    });
    var placeSearch = new AMap.PlaceSearch({
      map: map,
      pageSize: 8,
      pageIndex: 1,
      city: '',
      type: ''
    });

    var toolInfo = document.getElementById(opts.toolInfoId);
    var routeInfoEl = document.getElementById(opts.routeInfoId);

    function updateInfo(text) {
    if (toolInfo) toolInfo.textContent = text;
  }

  function updateRouteInfo(distance, duration) {
    // 确保是有效数字
    routeDistance = parseFloat(distance) || 0;
    routeDuration = parseFloat(duration) || 0;

    console.log('[AMap] updateRouteInfo - 距离:', routeDistance, '时间:', routeDuration);

    if (!routeInfoEl) return;

    if (routeDistance > 0) {
      var distKm = routeDistance >= 1000 ? (routeDistance / 1000).toFixed(1) + ' km' : routeDistance + ' m';
      var durMin = Math.ceil(routeDuration / 60);
      var durText = durMin >= 60 ? Math.floor(durMin / 60) + '小时' + (durMin % 60) + '分钟' : durMin + '分钟';
      routeInfoEl.innerHTML = '<div class="route-info-row"><span class="route-info-icon">🚗</span><span class="route-info-label">预估距离</span><span class="route-info-value">' + distKm + '</span></div>' +
        '<div class="route-info-row"><span class="route-info-icon">⏱️</span><span class="route-info-label">预计时间</span><span class="route-info-value">' + durText + '</span></div>';
      routeInfoEl.style.display = 'flex';
    } else {
      routeInfoEl.style.display = 'none';
    }
  }

  function clearRoute() {
    if (routeLine) { routeLine.setMap(null); routeLine = null; }
    routeDistance = 0;
    routeDuration = 0;
    updateRouteInfo(0, 0);
  }

  function planRoute() {
    var fl = document.getElementById(opts.fromLatId);
    var fg = document.getElementById(opts.fromLngId);
    var tl = document.getElementById(opts.toLatId);
    var tg = document.getElementById(opts.toLngId);
    if (!fl || !fg || !tl || !tg || !fl.value || !fg.value || !tl.value || !tg.value) return;

    clearRoute();
    updateInfo('⏳ 规划路线中...');

    // 高德LngLat顺序：经度在前，纬度在后
    var fromPos = [parseFloat(fg.value), parseFloat(fl.value)];
    var toPos = [parseFloat(tg.value), parseFloat(tl.value)];

    console.log('[AMap] 规划路线:', fromPos, '->', toPos);

    driving.search(fromPos, toPos, function(status, result) {
      console.log('[AMap] 路线结果状态:', status, result);

      if (status === 'complete' && result.routes && result.routes.length > 0) {
        var route = result.routes[0];
        console.log('[AMap] 路线数据:', route);

        // v2.0 API 距离和时间可能在不同的位置
        var distance = route.distance || 0;
        var duration = route.time || route.duration || 0;

        // 如果还是没有，尝试从 steps 中计算
        if (!distance && route.steps) {
          distance = route.steps.reduce(function(sum, step) {
            return sum + (step.distance || 0);
          }, 0);
        }
        if (!duration && route.steps) {
          duration = route.steps.reduce(function(sum, step) {
            return sum + (step.time || 0);
          }, 0);
        }

        console.log('[AMap] 距离:', distance, '时间:', duration);
        updateRouteInfo(distance, duration);

        // 绘制路线 - 尝试多种方式
        var path = null;
        if (route.path && route.path.length > 0) {
          path = route.path;
        } else if (route.steps) {
          // 从 steps 构建路径
          var points = [];
          route.steps.forEach(function(step) {
            if (step.path) {
              points = points.concat(step.path);
            }
          });
          if (points.length > 0) path = points;
        }

        if (path && path.length > 0) {
          console.log('[AMap] 绘制路线，点数:', path.length);
          routeLine = new AMap.Polyline({
            path: path,
            strokeColor: '#3777FF',
            strokeWeight: 6,
            strokeStyle: 'solid',
            lineCap: 'round',
            lineJoin: 'round'
          });
          routeLine.setMap(map);
          map.setFitView();
          updateInfo('✅ 路线规划完成');
        } else {
          updateInfo('⚠️ 路线已规划，绘制中...');
          // 强制调整视野到起终点
          if (fromMarker && toMarker) {
            map.setFitView([fromMarker, toMarker]);
          }
        }
      } else {
        console.log('[AMap] 路线规划失败:', result);
        updateInfo('⚠️ 未找到合适路线');
      }
    });
  }

  function updateMarker(type, lng, lat, address) {
    var pos = [lng, lat];
    var content = type === 'from' 
      ? '<div style="background:#27AE60;color:#fff;padding:4px 10px;border-radius:20px;font-size:13px;font-weight:600;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.3)">🟢 出发</div>'
      : '<div style="background:#E74C3C;color:#fff;padding:4px 10px;border-radius:20px;font-size:13px;font-weight:600;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.3)">🔴 目的地</div>';

    var marker = new AMap.Marker({
      position: pos,
      content: content,
      offset: new AMap.Pixel(-30, -20)
    });
    marker.setMap(map);

    if (type === 'from') {
      if (fromMarker) fromMarker.setMap(null);
      fromMarker = marker;
      var fromInput = document.getElementById(opts.fromInputId);
      if (fromInput) fromInput.value = address;
      var fromLat = document.getElementById(opts.fromLatId);
      var fromLng = document.getElementById(opts.fromLngId);
      if (fromLat) fromLat.value = lat;
      if (fromLng) fromLng.value = lng;
    } else {
      if (toMarker) toMarker.setMap(null);
      toMarker = marker;
      var toInput = document.getElementById(opts.toInputId);
      if (toInput) toInput.value = address;
      var toLat = document.getElementById(opts.toLatId);
      var toLng = document.getElementById(opts.toLngId);
      if (toLat) toLat.value = lat;
      if (toLng) toLng.value = lng;
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

  // 地图点击事件
  map.on('click', function(e) {
    var lng = e.lnglat.getLng();
    var lat = e.lnglat.getLat();
    geocoder.getAddress([lng, lat], function(status, result) {
      var address = result && result.regeocode ? result.regeocode.formattedAddress : lat.toFixed(6) + ', ' + lng.toFixed(6);
      updateMarker(selectMode, lng, lat, address);
      if (selectMode === 'from') {
        var toInput = document.getElementById(opts.toInputId);
        if (!toInput || !toInput.value) {
          selectMode = 'to';
          updateInfo('📍 已设置出发地，点击地图选择目的地');
        }
      } else {
        updateInfo('✅ 出发地和目的地已设置');
      }
    });
  });

  // 定位按钮
  var locateBtn = document.getElementById(opts.locateBtnId);
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
        map.setCenter([lng, lat]);
        map.setZoom(15);
        geocoder.getAddress([lng, lat], function(status, result) {
          var address = result && result.regeocode ? result.regeocode.formattedAddress : '我的位置';
          updateMarker(selectMode, lng, lat, address);
          updateInfo('✅ 定位成功');
          var toInput = document.getElementById(opts.toInputId);
          if (selectMode === 'from' && (!toInput || !toInput.value)) {
            selectMode = 'to';
            setTimeout(function() { updateInfo('📍 点击地图或搜索设置目的地'); }, 1500);
          }
        });
      }, function(err) {
        showToast('定位失败：' + (err.message || '请允许浏览器获取位置'), 'error');
        updateInfo('点击地图选择位置');
      }, { enableHighAccuracy: true, timeout: 8000 });
    });
  }

  // 搜索框
  var searchInput = document.getElementById(opts.searchInputId);
  var searchResults = document.getElementById(opts.searchResultsId);
  var searchTimer = null;

  if (searchInput) {
    searchInput.removeAttribute('readonly');
    searchInput.addEventListener('touchstart', function(e) { e.stopPropagation(); });
    searchInput.addEventListener('touchmove', function(e) { e.stopPropagation(); });
    searchInput.addEventListener('click', function(e) { e.stopPropagation(); searchInput.focus(); });

    searchInput.addEventListener('input', function() {
      var keyword = searchInput.value.trim();
      if (searchTimer) clearTimeout(searchTimer);
      if (!keyword) {
        if (searchResults) searchResults.style.display = 'none';
        return;
      }
      searchTimer = setTimeout(function() {
        console.log('[AMap] 搜索关键词:', keyword);
        placeSearch.search(keyword, function(status, result) {
          console.log('[AMap] 搜索结果状态:', status);
          console.log('[AMap] 搜索结果:', JSON.stringify(result).substring(0, 500));
          if (status === 'complete' && result.poiList && result.poiList.pois && result.poiList.pois.length > 0) {
            var pois = result.poiList.pois;
            var html = pois.map(function(poi, idx) {
              return '<div class="map-search-item" data-idx="' + idx + '">' +
                '<div class="map-search-item-title">' + poi.name + '</div>' +
                '<div class="map-search-item-addr">' + (poi.address || poi.cityName) + '</div>' +
                '</div>';
            }).join('');
            if (searchResults) {
              searchResults.innerHTML = html;
              searchResults.style.display = 'block';
              searchResults.querySelectorAll('.map-search-item').forEach(function(item) {
                item.addEventListener('click', function(e) {
                  e.stopPropagation();
                  var idx = parseInt(item.dataset.idx);
                  var poi = pois[idx];
                  var lng = poi.location.getLng();
                  var lat = poi.location.getLat();
                  var address = poi.name + (poi.address ? '（' + poi.address + '）' : '');
                  map.setCenter([lng, lat]);
                  map.setZoom(15);
                  updateMarker(selectMode, lng, lat, address);
                  if (searchResults) searchResults.style.display = 'none';
                  if (searchInput) searchInput.value = '';
                  var toInput = document.getElementById(opts.toInputId);
                  if (selectMode === 'from' && (!toInput || !toInput.value)) {
                    selectMode = 'to';
                    updateInfo('📍 已设置出发地，点击地图或搜索设置目的地');
                  } else {
                    updateInfo('✅ 出发地和目的地已设置');
                  }
                });
              });
            }
          } else {
            if (searchResults) { searchResults.innerHTML = '<div class="map-search-empty">未找到相关地点</div>'; searchResults.style.display = 'block'; }
          }
        });
      }, 400);
    });
  }

  // 隐藏搜索结果
  document.addEventListener('click', function(e) {
    if (searchResults && !searchResults.contains(e.target) && e.target !== searchInput) {
      searchResults.style.display = 'none';
    }
  });

  // 出发地/目的地输入框事件
  var fromInput = document.getElementById(opts.fromInputId);
  var toInput = document.getElementById(opts.toInputId);

  if (fromInput) {
    fromInput.removeAttribute('readonly');
    fromInput.addEventListener('focus', function() {
      selectMode = 'from';
      updateInfo('🟢 点击地图或搜索选择出发地');
      if (map) map.setZoom(15);
    });
  }

  if (toInput) {
    toInput.removeAttribute('readonly');
    toInput.addEventListener('focus', function() {
      selectMode = 'to';
      updateInfo('🔴 点击地图或搜索选择目的地');
      if (map) map.setZoom(15);
    });
  }

  // 浏览器定位
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(pos) {
      var lat = pos.coords.latitude;
      var lng = pos.coords.longitude;
      map.setCenter([lng, lat]);
      map.setZoom(15);
      geocoder.getAddress([lng, lat], function(status, result) {
        var address = result && result.regeocode ? result.regeocode.formattedAddress : '我的位置';
        updateMarker('from', lng, lat, address);
        selectMode = 'to';
        updateInfo('✅ 已自动定位，点击地图设置目的地');
      });
    }, function() {}, { timeout: 5000 });
  }

  updateInfo('📍 点击地图选择出发地');

  return {
    getRouteInfo: function() {
      return { distance: routeDistance, duration: routeDuration };
    }
  }; // 闭合 return 对象
  } // 闭合 initMapWithPlugins 函数

} // 闭合 initOrderMap 函数

// 路线展示地图（订单详情用）
function initRouteDisplayMap(mapDivId, fromLat, fromLng, toLat, toLng, options) {
  var mapDiv = document.getElementById(mapDivId);
  if (!mapDiv || typeof AMap === 'undefined') return null;

  var map = new AMap.Map(mapDiv, {
    zoom: 12,
    center: [(fromLng + toLng) / 2, (fromLat + toLat) / 2],
    mapStyle: 'amap://styles/light'
  });

  // 起点标记
  var fromMarker = new AMap.Marker({
    position: [fromLng, fromLat],
    content: '<div style="background:#27AE60;color:#fff;padding:4px 8px;border-radius:12px;font-size:12px">🟢 出发</div>',
    offset: new AMap.Pixel(-20, -15)
  });
  fromMarker.setMap(map);

  // 终点标记
  var toMarker = new AMap.Marker({
    position: [toLng, toLat],
    content: '<div style="background:#E74C3C;color:#fff;padding:4px 8px;border-radius:12px;font-size:12px">🔴 目的地</div>',
    offset: new AMap.Pixel(-20, -15)
  });
  toMarker.setMap(map);

  // 路线规划
  var driving = new AMap.Driving({ policy: AMap.DrivingPolicy.LEAST_TIME });
  driving.search([fromLng, fromLat], [toLng, toLat], function(status, result) {
    if (status === 'complete' && result.routes && result.routes.length > 0) {
      var route = result.routes[0];
      var path = route.path;
      if (path && path.length > 0) {
        var polyline = new AMap.Polyline({
          path: path,
          strokeColor: '#3777FF',
          strokeWeight: 5,
          strokeStyle: 'solid'
        });
        polyline.setMap(map);
      }
      map.setFitView();
      if (options && options.onRouteReady) {
        options.onRouteReady({ distance: route.distance, duration: route.duration });
      }
    }
  });

  return { map: map };
}

// 导出全局函数供 app-fixed.js 调用
window.initAMapOrderMap = initOrderMap;
window.initAMapRouteDisplay = initRouteDisplayMap;