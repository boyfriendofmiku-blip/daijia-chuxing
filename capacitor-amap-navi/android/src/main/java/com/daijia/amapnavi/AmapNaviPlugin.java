package com.daijia.amapnavi;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Location;
import android.net.Uri;
import android.os.Build;
import android.util.Log;

import com.amap.api.location.AMapLocation;
import com.amap.api.location.AMapLocationClient;
import com.amap.api.location.AMapLocationClientOption;
import com.amap.api.location.AMapLocationListener;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import org.json.JSONException;
import org.json.JSONObject;

import java.net.URLEncoder;
import java.util.ArrayList;
import java.util.List;

/**
 * 高德导航 Capacitor 插件
 *
 * 功能：
 * 1. 嵌入式全屏导航（AMapNaviView，直接在App内显示高德导航界面）
 * 2. GPS 精准定位（使用高德定位 SDK，比浏览器 API 更准确、更持续）
 * 3. 距离计算
 *
 * 优势：
 * - 逐条语音导航由高德 SDK 直接提供，App 内全屏显示，无需跳转
 * - GPS 定位为原生级别，不受 WebView 限制
 * - 切后台时定位可持续
 *
 * API 适配说明（v10.0.800）：
 * - JSArray.getJSObject(int) → Capacitor JSArray 无此方法，需手动解析
 * - setMockParse(boolean) → v10.0.800 中已移除
 * - resolveActivity(pm, MATCH_DEFAULT_ONLY) → API 30+ 废弃第二参数
 */
@CapacitorPlugin(
    name = "AmapNavi",
    permissions = {
        @Permission(strings = {"android.permission.ACCESS_FINE_LOCATION"}, alias = "location"),
        @Permission(strings = {"android.permission.ACCESS_COARSE_LOCATION"}, alias = "coarseLocation"),
        @Permission(strings = {"android.permission.ACCESS_BACKGROUND_LOCATION"}, alias = "backgroundLocation")
    }
)
public class AmapNaviPlugin extends Plugin implements AMapLocationListener {

    private static final String TAG = "AmapNaviPlugin";
    private AMapLocationClient locationClient = null;
    private AMapLocationClientOption locationOption = null;
    private String currentApiKey = null;
    private boolean isTracking = false;
    private PluginCall _pendingLocationCall = null;

    // ============================================================
    //  初始化
    // ============================================================

    @PluginMethod
    public void initialize(PluginCall call) {
        String apiKey = call.getString("apiKey", "");
        if (apiKey == null || apiKey.isEmpty()) {
            call.reject("apiKey is required");
            return;
        }
        this.currentApiKey = apiKey;
        Log.i(TAG, "AmapNavi initialized with key: " + apiKey);

        // 初始化定位 SDK（只需要一次）
        try {
            AMapLocationClient.setApiKey(apiKey);
            initLocationClient();
        } catch (Exception e) {
            Log.e(TAG, "Failed to init Amap location", e);
        }

        call.resolve(new JSObject().put("success", true));
    }

    // ============================================================
    //  启动嵌入式全屏导航（App 内直接显示高德导航界面）
    // ============================================================

    /**
     * 启动嵌入式全屏导航
     *
     * @param waypoints 途经点：[起点, 途经点1, ..., 终点]
     * @param mode 0=驾车 1=步行 2=骑行
     */
    @PluginMethod
    public void startEmbeddedNavi(PluginCall call) {
        JSArray waypointsArr = call.getArray("waypoints");
        if (waypointsArr == null || waypointsArr.length() < 2) {
            call.reject("waypoints 必须包含起点和终点，至少2个点");
            return;
        }

        try {
            // v10.0.800: Capacitor JSArray 没有 getJSObject(int)，需手动解析
            JSONObject startPoint = waypointsArr.getJSONObject(0);
            JSONObject endPoint   = waypointsArr.getJSONObject(waypointsArr.length() - 1);

            double startLat = startPoint.getDouble("latitude");
            double startLng = startPoint.getDouble("longitude");
            double endLat   = endPoint.getDouble("latitude");
            double endLng   = endPoint.getDouble("longitude");
            String startName = startPoint.optString("name", "我的位置");
            String endName   = endPoint.optString("name", "目的地");

            int mode = call.getInt("mode", 0); // 0=驾车 1=步行 2=骑行
            String naviType = "driving";
            if (mode == 1) naviType = "walking";
            if (mode == 2) naviType = "riding";

            Intent intent = new Intent(getContext(), AmapNaviViewActivity.class);
            intent.putExtra("start_lat", startLat);
            intent.putExtra("start_lng", startLng);
            intent.putExtra("end_lat",   endLat);
            intent.putExtra("end_lng",   endLng);
            intent.putExtra("start_name", startName);
            intent.putExtra("end_name",   endName);
            intent.putExtra("navi_type",  naviType);
            // 不用 NEW_TASK，保持在同一任务栈，按返回键能回到 App

            getActivity().startActivity(intent);
            Log.i(TAG, "启动嵌入式导航: " + startName + " -> " + endName + " (type=" + naviType + ")");
            notifyListeners("naviStart", new JSObject());
            call.resolve(new JSObject().put("success", true));
        } catch (JSONException e) {
            Log.e(TAG, "startEmbeddedNavi JSON parse error", e);
            call.reject("解析坐标数据失败: " + e.getMessage());
        } catch (Exception e) {
            Log.e(TAG, "startEmbeddedNavi error", e);
            call.reject("启动导航失败: " + e.getMessage());
        }
    }

    // ============================================================
    //  启动导航 - 调起高德 App（兜底方案）
    // ============================================================

    /**
     * 启动导航（调起高德 App，直接开始导航）
     * 使用 androidamap://navi scheme，自动填入起终点并开始导航
     * @param waypoints 途经点列表（第一个=起点，最后一个=终点）
     * @param mode 0=驾车 1=步行 2=骑行
     */
    @PluginMethod
    public void launchNavi(PluginCall call) {
        JSArray waypointsArr = call.getArray("waypoints");
        if (waypointsArr == null || waypointsArr.length() < 2) {
            call.reject("waypoints 必须包含起点和终点，至少2个点");
            return;
        }

        try {
            JSONObject startPoint = waypointsArr.getJSONObject(0);
            JSONObject endPoint   = waypointsArr.getJSONObject(waypointsArr.length() - 1);

            double startLat = startPoint.getDouble("latitude");
            double startLng = startPoint.getDouble("longitude");
            String startName = startPoint.optString("name", "我的位置");

            double endLat = endPoint.getDouble("latitude");
            double endLng = endPoint.getDouble("longitude");
            String endName = endPoint.optString("name", "目的地");

            int mode = call.getInt("mode", 0);
            // 高德 navi scheme: 0=驾车, 2=公交, 4=步行, 6=骑行
            int naviMode = 0;
            if (mode == 2) naviMode = 6; // 骑行
            else if (mode == 1) naviMode = 4; // 步行

            // 方案1: androidamap://navi — 直接启动导航（推荐）
            // 坐标保留6位小数，避免精度问题
            String sLat = String.format("%.6f", startLat);
            String sLng = String.format("%.6f", startLng);
            String eLat = String.format("%.6f", endLat);
            String eLng = String.format("%.6f", endLng);

            // androidamap://navi: poiname/lat/lon 是【终点】，slat/slon 是起点（可选）
            String naviUri = String.format(
                "androidamap://navi?sourceApplication=%s&poiname=%s&lat=%s&lon=%s&slat=%s&slon=%s&dev=0&style=%d",
                URLEncoder.encode("代驾出行", "UTF-8"),
                URLEncoder.encode(endName, "UTF-8"), eLat, eLng,
                sLat, sLng,
                naviMode
            );

            // 方案2: amapuri://route/plan — 路线规划页面（带起终点）
            // 正确参数名：sname/slat/slon（起点），dname/dlat/dlon（终点）
            String routeUri = String.format(
                "amapuri://route/plan/?sourceApplication=%s&t=%s&sname=%s&slat=%s&slon=%s&dname=%s&dlat=%s&dlon=%s&dev=0",
                URLEncoder.encode("代驾出行", "UTF-8"),
                naviMode == 6 ? "3" : naviMode == 4 ? "2" : "0",
                URLEncoder.encode(startName, "UTF-8"), sLat, sLng,
                URLEncoder.encode(endName, "UTF-8"), eLat, eLng
            );

            // 先尝试 androidamap://navi（直接导航，最简洁）
            Intent naviIntent = new Intent(Intent.ACTION_VIEW);
            naviIntent.addCategory(Intent.CATEGORY_DEFAULT);
            naviIntent.setData(Uri.parse(naviUri));

            if (isIntentAvailable(getContext(), naviIntent)) {
                getContext().startActivity(naviIntent);
                Log.i(TAG, "Launched Amap navi (direct): " + naviUri);
                notifyListeners("naviStart", new JSObject());
                call.resolve(new JSObject().put("success", true).put("method", "direct-navi"));
            } else {
                // 降级到 amapuri://route/plan（路线规划页面）
                Intent routeIntent = new Intent(Intent.ACTION_VIEW);
                routeIntent.addCategory(Intent.CATEGORY_DEFAULT);
                routeIntent.setData(Uri.parse(routeUri));

                if (isIntentAvailable(getContext(), routeIntent)) {
                    getContext().startActivity(routeIntent);
                    Log.i(TAG, "Launched Amap route plan: " + routeUri);
                    notifyListeners("naviStart", new JSObject());
                    call.resolve(new JSObject().put("success", true).put("method", "route-plan"));
                } else {
                    // 最后降级到网页版
                    String webUrl = String.format(
                        "https://uri.amap.com/navigation?from=%s,%s(%s)&to=%s,%s(%s)&mode=%s&callnative=1",
                        sLng, sLat, URLEncoder.encode(startName, "UTF-8"),
                        eLng, eLat, URLEncoder.encode(endName, "UTF-8"),
                        naviMode == 6 ? "ride" : naviMode == 4 ? "walk" : "bus"
                    );
                    Intent webIntent = new Intent(Intent.ACTION_VIEW);
                    webIntent.setData(Uri.parse(webUrl));
                    getContext().startActivity(webIntent);
                    Log.w(TAG, "Amap app not installed, opened web: " + webUrl);
                    call.resolve(new JSObject().put("success", true).put("method", "web"));
                }
            }

        } catch (JSONException e) {
            Log.e(TAG, "launchNavi JSON parse error", e);
            call.reject("解析坐标数据失败: " + e.getMessage());
        } catch (Exception e) {
            Log.e(TAG, "launchNavi error", e);
            call.reject("启动导航失败: " + e.getMessage());
        }
    }

    // ============================================================
    //  检查高德 App 是否安装
    // ============================================================

    @PluginMethod
    public void isAmapInstalled(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setData(Uri.parse("amapuri://"));
        intent.setPackage("com.autonavi.minimap");
        boolean installed = isIntentAvailable(getContext(), intent);
        Log.i(TAG, "isAmapInstalled: " + installed);
        call.resolve(new JSObject().put("installed", installed));
    }

    /**
     * 检查 Intent 是否可被处理
     * v10.0.800: resolveActivity(pm) 在 API 30+ 不再接受第二参数
     */
    private boolean isIntentAvailable(Context ctx, Intent intent) {
        PackageManager pm = ctx.getPackageManager();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            // Android 11+: 使用 PackageManager.resolveActivity
            return pm.resolveActivity(intent, PackageManager.MATCH_DEFAULT_ONLY) != null;
        } else {
            // Android 10 及以下
            return intent.resolveActivity(pm) != null;
        }
    }

    // ============================================================
    //  GPS 定位
    // ============================================================

    @PluginMethod
    public void getCurrentLocation(PluginCall call) {
        try {
            if (locationClient == null) {
                initLocationClient();
            }
            locationOption.setOnceLocation(true);
            locationClient.setLocationOption(locationOption);
            locationClient.startLocation();
            // 保存 call，位置回调时使用
            this._pendingLocationCall = call;
            call.setKeepAlive(true);
        } catch (Exception e) {
            call.reject("获取位置失败: " + e.getMessage());
        }
    }

    @PluginMethod
    public void startLocationTracking(PluginCall call) {
        try {
            if (locationClient == null) {
                initLocationClient();
            }
            isTracking = true;
            locationOption.setOnceLocation(false);
            locationOption.setInterval(3000);
            locationOption.setNeedAddress(true);
            locationClient.setLocationOption(locationOption);
            locationClient.startLocation();

            JSObject ret = new JSObject();
            ret.put("trackingId", "amap_gps");
            call.resolve(ret);
            Log.i(TAG, "Location tracking started");
        } catch (Exception e) {
            Log.e(TAG, "startLocationTracking error", e);
            call.reject("启动定位失败: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopLocationTracking(PluginCall call) {
        try {
            isTracking = false;
            if (locationClient != null) {
                locationClient.stopLocation();
            }
            call.resolve();
            Log.i(TAG, "Location tracking stopped");
        } catch (Exception e) {
            call.reject("停止定位失败: " + e.getMessage());
        }
    }

    private void initLocationClient() {
        try {
            if (currentApiKey != null && !currentApiKey.isEmpty()) {
                AMapLocationClient.setApiKey(currentApiKey);
            }
            locationClient = new AMapLocationClient(getContext());
            locationOption = new AMapLocationClientOption();
            locationOption.setLocationMode(AMapLocationClientOption.AMapLocationMode.Hight_Accuracy);
            locationOption.setOnceLocation(false);
            locationOption.setInterval(3000);
            locationOption.setNeedAddress(false);
            // v10.0.800: setMockParse(true) 已移除，不再调用
            locationClient.setLocationListener(this);
        } catch (Exception e) {
            Log.e(TAG, "initLocationClient error", e);
        }
    }

    @Override
    public void onLocationChanged(AMapLocation location) {
        if (location == null) return;

        int errorCode = location.getErrorCode();
        if (errorCode != 0) {
            Log.w(TAG, "Location error: " + errorCode + " - " + location.getErrorInfo());
            if (_pendingLocationCall != null) {
                _pendingLocationCall.reject("定位失败: " + location.getErrorInfo());
                _pendingLocationCall = null;
            }
            return;
        }

        JSObject data = new JSObject();
        data.put("latitude", location.getLatitude());
        data.put("longitude", location.getLongitude());
        data.put("bearing", location.getBearing());
        data.put("speed", location.getSpeed());
        data.put("accuracy", location.getAccuracy());
        data.put("timestamp", location.getTime());

        // 一次性定位回调
        if (_pendingLocationCall != null) {
            _pendingLocationCall.resolve(data);
            _pendingLocationCall = null;
            if (!isTracking) {
                locationClient.stopLocation();
                return;
            }
        }

        // 持续追踪事件
        notifyListeners("locationUpdate", data);
    }

    // ============================================================
    //  距离计算
    // ============================================================

    @PluginMethod
    public void calculateDistance(PluginCall call) {
        try {
            JSObject from = call.getObject("from");
            JSObject to = call.getObject("to");

            double lat1 = from.getDouble("latitude");
            double lng1 = from.getDouble("longitude");
            double lat2 = to.getDouble("latitude");
            double lng2 = to.getDouble("longitude");

            float[] results = new float[1];
            Location.distanceBetween(lat1, lng1, lat2, lng2, results);

            JSObject ret = new JSObject();
            ret.put("distance", results[0]);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("计算距离失败: " + e.getMessage());
        }
    }

    // ============================================================
    //  生命周期
    // ============================================================

    @Override
    public void load() {
        super.load();
        Log.i(TAG, "AmapNaviPlugin loaded");
    }

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        if (locationClient != null) {
            locationClient.onDestroy();
            locationClient = null;
        }
        Log.i(TAG, "AmapNaviPlugin destroyed");
    }
}
