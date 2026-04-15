package com.daijia.amapnavi;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Location;
import android.net.Uri;
import android.os.Looper;
import android.util.Log;

import com.amap.api.location.AMapLocation;
import com.amap.api.location.AMapLocationClient;
import com.amap.api.location.AMapLocationClientOption;
import com.amap.api.location.AMapLocationListener;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.NativePlugin;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;

import java.net.URLEncoder;
import java.util.ArrayList;
import java.util.List;

/**
 * 高德导航 Capacitor 插件
 *
 * 功能：
 * 1. 调起高德导航 App（Intent 方式，支持驾车/骑行/步行语音导航）
 * 2. GPS 精准定位（使用高德定位 SDK，比浏览器 API 更准确、更持续）
 * 3. 距离计算
 *
 * 优势：
 * - 语音导航由高德 App 提供，稳定准确
 * - GPS 定位为原生级别，不受 WebView 限制
 * - 切后台时定位可持续（配合 Service）
 */
@NativePlugin(
    name = "AmapNavi",
    permissions = {
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_BACKGROUND_LOCATION"
    }
)
public class AmapNaviPlugin extends Plugin implements AMapLocationListener {

    private static final String TAG = "AmapNaviPlugin";
    private AMapLocationClient locationClient = null;
    private AMapLocationClientOption locationOption = null;
    private String currentApiKey = null;
    private boolean isTracking = false;

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
    //  启动导航 - 调起高德 App
    // ============================================================

    /**
     * 启动导航
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
            List<String> latLngs = new ArrayList<>();
            List<String> names = new ArrayList<>();

            for (int i = 0; i < waypointsArr.length(); i++) {
                JSObject point = waypointsArr.getJSObject(i);
                double lat = point.getDouble("latitude");
                double lng = point.getDouble("longitude");
                String name = point.optString("name", "");
                latLngs.add(lat + "," + lng + (!name.isEmpty() ? "(" + URLEncoder.encode(name, "UTF-8") + ")" : ""));
                names.add(name);
            }

            int mode = call.getInt("mode", 0);
            String modeStr = "drive";
            if (mode == 1) modeStr = "walk";
            if (mode == 2) modeStr = "ride";

            // 构建高德 URI
            // 格式: amapuri://route/plan/?mode=xxx&daddr=lat,lng&daddr=lat,lng&dev=1
            StringBuilder uri = new StringBuilder("amapuri://route/plan/?");
            uri.append("mode=").append(modeStr).append("&");

            // 依次添加途经点
            for (int i = 0; i < latLngs.size(); i++) {
                uri.append("daddr=").append(latLngs.get(i));
                if (i < latLngs.size() - 1) uri.append("&");
            }

            uri.append("&dev=1");
            uri.append("&sourceApplication=代驾出行");

            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.addCategory(Intent.CATEGORY_DEFAULT);
            intent.setData(Uri.parse(uri.toString()));
            intent.setPackage("com.autonavi.minimap");

            if (isIntentAvailable(getContext(), intent)) {
                getContext().startActivity(intent);
                Log.i(TAG, "Launched Amap navi: " + uri);
                notifyListeners("naviStart", new JSObject());
                call.resolve(new JSObject().put("success", true));
            } else {
                // 没装高德 App，尝试调起高德 Web
                Intent webIntent = new Intent(Intent.ACTION_VIEW);
                webIntent.setData(Uri.parse("https://uri.amap.com/navigation?to=&mode=" + modeStr + "&callnative=1"));
                getContext().startActivity(webIntent);
                Log.w(TAG, "Amap app not installed, opened web version");
                call.reject("未检测到高德地图 App，已打开网页版");
            }

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

    private boolean isIntentAvailable(Context ctx, Intent intent) {
        PackageManager pm = ctx.getPackageManager();
        return intent.resolveActivity(pm, PackageManager.MATCH_DEFAULT_ONLY) != null;
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
            call.setCallback("locationCallback", call.getCallbackId());
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
            locationOption.setInterval(3000); // 3秒一次
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
            locationOption.setMockParse(true); // 允许模拟位置
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
            return;
        }

        JSObject data = new JSObject();
        data.put("latitude", location.getLatitude());
        data.put("longitude", location.getLongitude());
        data.put("bearing", location.getBearing());
        data.put("speed", location.getSpeed());
        data.put("accuracy", location.getAccuracy());
        data.put("timestamp", location.getTime());

        notifyListeners("locationUpdate", data);

        // 如果是单次定位，完成后停止
        if (!isTracking && locationOption.isOnceLocation()) {
            locationClient.stopLocation();
        }
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
