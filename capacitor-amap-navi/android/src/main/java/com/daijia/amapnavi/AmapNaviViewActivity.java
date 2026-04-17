package com.daijia.amapnavi;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.util.Log;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.amap.api.navi.model.AMapNaviTrafficFacilityInfo;
import com.amap.api.navi.model.AimLessModeStat;
import com.amap.api.navi.model.NaviInfo;
import com.amap.api.navi.model.NaviLatLng;

/**
 * 嵌入式高德导航 Activity
 *
 * 使用 AMapNaviView 实现完整的 App 内置逐条语音导航。
 * 依赖：com.amap.api:navi-3dmap-location-search:10.0.800_3dmap10.0.800_loc6.4.5_sea9.7.2
 *
 * API 适配说明（v10.0.800）：
 * - AMapNaviPoint → NaviLatLng (com.amap.api.navi.model)
 * - calculateDriveRoute 参数改为 NaviPoi / NaviLatLng 列表
 * - 策略常量改为 PathPlanningStrategy 枚举
 * - onCalculateRouteSuccess 回调参数改为 int[]
 * - 新增必需方法：OnUpdateTrafficFacility, onStopSpeaking, onGpsSignalWeak
 * - AMapNaviListener 与 AMapNaviViewListener 都有 onNaviCancel()，
 *   前者无参数，后者带 Object 参数，需分开实现
 */
public class AmapNaviViewActivity extends Activity implements AMapNaviListener, AMapNaviViewListener {

    private static final String TAG = "AmapNaviViewActivity";
    private static final int REQUEST_PERMISSION = 1001;

    private AMapNaviView naviView;
    private String naviType = "driving"; // driving / walking / riding

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (!checkPermissions()) {
            requestPermissions();
            return;
        }

        initNaviView();
    }

    private void initNaviView() {
        try {
            AMapNavi.getInstance(this).addAMapNaviListener(this);

            naviView = new AMapNaviView(this);
            naviView.setAMapNaviViewListener(this);
            setContentView(naviView);
            naviView.onCreate(null);

            Log.i(TAG, "AmapNaviViewActivity created");
        } catch (Exception e) {
            Log.e(TAG, "initNaviView error", e);
            Toast.makeText(this, "导航视图初始化失败", Toast.LENGTH_SHORT).show();
            finish();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (naviView != null) naviView.onResume();
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (naviView != null) naviView.onPause();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (naviView != null) naviView.onDestroy();
        try {
            AMapNavi.getInstance(this).removeAMapNaviListener(this);
            AMapNavi.getInstance(this).destroy();
        } catch (Exception e) {
            Log.w(TAG, "onDestroy cleanup error", e);
        }
        Log.i(TAG, "AmapNaviViewActivity destroyed");
    }

    @Override
    public void onBackPressed() {
        try {
            AMapNavi.getInstance(this).stopNavi();
        } catch (Exception e) {
            Log.w(TAG, "stopNavi error", e);
        }
        super.onBackPressed();
    }

    // ============================================================
    //  权限检查
    // ============================================================

    private boolean checkPermissions() {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
                == PackageManager.PERMISSION_GRANTED;
    }

    private void requestPermissions() {
        ActivityCompat.requestPermissions(this,
                new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION},
                REQUEST_PERMISSION);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQUEST_PERMISSION) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                initNaviView();
            } else {
                Toast.makeText(this, "需要定位权限才能使用导航", Toast.LENGTH_LONG).show();
                finish();
            }
        }
    }

    // ============================================================
    //  路径规划 + 启动导航
    // ============================================================

    private void startNaviFromIntent() {
        double startLat = getIntent().getDoubleExtra("start_lat", 0);
        double startLng = getIntent().getDoubleExtra("start_lng", 0);
        double endLat   = getIntent().getDoubleExtra("end_lat", 0);
        double endLng   = getIntent().getDoubleExtra("end_lng", 0);
        String startName = getIntent().getStringExtra("start_name");
        String endName   = getIntent().getStringExtra("end_name");
        this.naviType   = getIntent().getStringExtra("navi_type");

        if (endLat == 0 || endLng == 0) {
            Toast.makeText(this, "目的地坐标无效", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }

        if (startName == null) startName = "我的位置";
        if (endName == null) endName = "目的地";

        try {
            // v10.0.800: 使用 NaviLatLng（替代已删除的 AMapNaviPoint）
            NaviLatLng startLatLng = null;
            if (startLat != 0 && startLng != 0) {
                startLatLng = new NaviLatLng(startLng, startLat);
            }
            NaviLatLng endLatLng = new NaviLatLng(endLng, endLat);

            AMapNavi navi = AMapNavi.getInstance(this);

            if ("walking".equals(naviType)) {
                navi.calculateWalkRoute(startLatLng, endLatLng);
            } else if ("riding".equals(naviType)) {
                navi.calculateRideRoute(startLatLng, endLatLng);
            } else {
                // 驾车（代驾模式）
                navi.calculateDriveRoute(startLatLng, endLatLng, 0);
            }

            Log.i(TAG, "已发起路线计算: " + startName + " -> " + endName);
        } catch (Exception e) {
            Log.e(TAG, "startNaviFromIntent error", e);
            Toast.makeText(this, "路径规划失败: " + e.getMessage(), Toast.LENGTH_SHORT).show();
            finish();
        }
    }

    // ============================================================
    //  AMapNaviListener (v10.0.800)
    // ============================================================

    @Override
    public void onInitNaviFailure() {
        Log.e(TAG, "导航初始化失败");
        Toast.makeText(this, "导航初始化失败，请重试", Toast.LENGTH_SHORT).show();
        finish();
    }

    @Override
    public void onInitNaviSuccess() {
        Log.i(TAG, "导航初始化成功，开始路径规划");
        startNaviFromIntent();
    }

    @Override
    public void onCalculateRouteFailure(int errorCode) {
        Log.e(TAG, "路线计算失败: " + errorCode);
        String msg = errorCode == 31 ? "无法找到路线，请检查起终点位置" : "路线计算失败";
        Toast.makeText(this, msg, Toast.LENGTH_SHORT).show();
    }

    @Override
    public void onCalculateRouteSuccess(int[] routeIds) {
        Log.i(TAG, "路线计算成功，数量: " + routeIds.length);
        try {
            AMapNavi.getInstance(this).startNavi(NaviType.GPS);
        } catch (Exception e) {
            Log.e(TAG, "startNavi error", e);
        }
    }

    @Override
    public void onArriveDestination() {
        Log.i(TAG, "到达目的地");
        Toast.makeText(this, "已到达目的地", Toast.LENGTH_SHORT).show();
        if (naviView != null) {
            naviView.postDelayed(this::finish, 2000);
        } else {
            finish();
        }
    }

    // ---- v10.0.800 AMapNaviListener 其他回调（空实现） ----

    @Override public void onEndEmulatorNavi() {}
    @Override public void onStopNavi() { finish(); }

    @Override
    public void onCalculateRouteFailure(AMapCalcRouteResult result) {
        Log.e(TAG, "路线计算失败: " + result.getErrorCode() + " - " + result.getErrorDescription());
    }

    @Override
    public void onCalculateRouteSuccess(AMapCalcRouteResult result) {
        Log.i(TAG, "路线计算成功");
        try {
            AMapNavi.getInstance(this).startNavi(NaviType.GPS);
        } catch (Exception e) {
            Log.e(TAG, "startNavi error", e);
        }
    }

    @Override public void onNaviRouteNotify(AMapNaviRouteNotifyData data) {}
    @Override public void updateAimlessModeStatistics(AimLessModeStat stat) {}
    @Override public void updateAimlessModeCongestionInfo(com.amap.api.navi.model.AimLessModeCongestionInfo info) {}
    @Override public void onPlayRing(int i) {}
    @Override public void onLocationChange(AMapNaviLocation location) {}
    @Override public void onGetNavigationText(int type, String desc) {}
    @Override public void onGetNavigationText(String s) {}
    @Override public void onGpsOpenStatus(boolean open) {}
    @Override public void onGpsSignalWeak(boolean isWeak) {}
    @Override public void onNaviSetting() {}
    @Override public void onNaviMapMode(int i) {}
    @Override public void onNaviCancel() { finish(); }
    @Override public void onNaviTurnClick() {}
    @Override public void onNextRoadClick() {}
    @Override public void onScanViewButtonClick() {}
    @Override public void onLockMap(boolean isLock) {}
    @Override public void onNaviViewLoaded() {}
    @Override public void onMapTypeChanged(int type) {}
    @Override public void onNaviViewShowMode(int showMode) {}
    @Override
    public void onNaviInfoUpdate(NaviInfo naviInfo) {}
    @Override
    public void OnUpdateTrafficFacility(AMapNaviTrafficFacilityInfo[] infos) {}

    // ============================================================
    //  AMapNaviViewListener (v10.0.800)
    // ============================================================

    @Override
    public void onNaviCancel(Object o) {
        finish();
    }

    @Override
    public boolean onNaviBackClick() {
        finish();
        return true;
    }
}
