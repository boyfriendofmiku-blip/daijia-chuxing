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

import com.amap.api.navi.AMapNavi;
import com.amap.api.navi.AMapNaviListener;
import com.amap.api.navi.AMapNaviView;
import com.amap.api.navi.AMapNaviViewListener;
import com.amap.api.navi.enums.NaviType;
import com.amap.api.navi.model.AMapCalcRouteResult;
import com.amap.api.navi.model.AMapLaneInfo;
import com.amap.api.navi.model.AMapModelDigitizedBird;
import com.amap.api.navi.model.AMapNaviCameraInfo;
import com.amap.api.navi.model.AMapNaviCross;
import com.amap.api.navi.model.AMapNaviInfo;
import com.amap.api.navi.model.AMapNaviLocation;
import com.amap.api.navi.model.AMapNaviPath;
import com.amap.api.navi.model.AMapNaviPoint;
import com.amap.api.navi.model.AMapNaviRoadFlagInfo;
import com.amap.api.navi.model.AMapNaviRouteNotifyData;
import com.amap.api.navi.model.AMapNaviSetting;
import com.amap.api.navi.model.AMapNaviTrafficFacilityInfo;
import com.amap.api.navi.model.AimLessModeStat;
import com.amap.api.navi.model.NaviInfo;
import com.autonavi.tbt.TrafficFacilityInfo;

import java.util.ArrayList;
import java.util.List;

/**
 * 嵌入式高德导航 Activity
 *
 * 使用 AMapNaviView 实现完整的 App 内置逐条语音导航。
 * 依赖：com.amap.api:navi-3dmap:10.0.800
 */
public class AmapNaviViewActivity extends Activity implements AMapNaviListener, AMapNaviViewListener {

    private static final String TAG = "AmapNaviViewActivity";
    private static final int REQUEST_PERMISSION = 1001;

    private AMapNaviView naviView;
    private int naviType = 0; // 0=驾车 1=步行 2=骑行

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
        String typeStr  = getIntent().getStringExtra("navi_type");

        if (endLat == 0 || endLng == 0) {
            Toast.makeText(this, "目的地坐标无效", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }

        try {
            List<AMapNaviPoint> points = new ArrayList<>();
            if (startLat != 0 && startLng != 0) {
                points.add(AMapNaviPoint.fromLngLat(startLng, startLat));
            }
            AMapNaviPoint endPoint = AMapNaviPoint.fromLngLat(endLng, endLat);

            if ("walking".equals(typeStr)) {
                AMapNavi.getInstance(this).calculateWalkRoute(
                    startLat != 0 ? AMapNaviPoint.fromLngLat(startLng, startLat) : null,
                    endPoint
                );
            } else if ("riding".equals(typeStr)) {
                AMapNavi.getInstance(this).calculateRideRoute(
                    startLat != 0 ? AMapNaviPoint.fromLngLat(startLng, startLat) : null,
                    endPoint
                );
            } else {
                // 驾车（代驾模式）
                List<AMapNaviPoint> wayPoints = null;
                AMapNavi.getInstance(this).calculateDriveRoute(
                    points,
                    wayPoints,
                    AMapNavi.getInstance(this).getDriveStrategies().get(0).getStrategyFlag()
                );
            }
        } catch (Exception e) {
            Log.e(TAG, "startNaviFromIntent error", e);
            Toast.makeText(this, "路径规划失败: " + e.getMessage(), Toast.LENGTH_SHORT).show();
            finish();
        }
    }

    // ============================================================
    //  AMapNaviListener
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
    public void onCalculateRouteFailure(AMapCalcRouteResult result) {
        Log.e(TAG, "路线计算失败: " + result.getErrorCode() + " - " + result.getErrorDescription());
        String msg = result.getErrorCode() == 31 ? "无法找到路线，请检查起终点位置" : "路线计算失败";
        Toast.makeText(this, msg, Toast.LENGTH_SHORT).show();
    }

    @Override
    public void onCalculateRouteSuccess(AMapCalcRouteResult result) {
        Log.i(TAG, "路线计算成功，路线数: " + result.getRouteIds().length);
        try {
            AMapNavi.getInstance(this).startNavi(NaviType.GPS);
        } catch (Exception e) {
            Log.e(TAG, "startNavi error", e);
        }
    }

    @Override
    public void onArriveDestination(boolean hasNextWayPoint) {
        Log.i(TAG, "到达目的地");
        Toast.makeText(this, "已到达目的地 🎉", Toast.LENGTH_SHORT).show();
        if (naviView != null) {
            naviView.postDelayed(this::finish, 2000);
        } else {
            finish();
        }
    }

    @Override
    public void onStartNavi(int naviType) {
        Log.i(TAG, "开始导航，类型: " + naviType);
    }

    @Override
    public void onStopNavi() {
        Log.i(TAG, "停止导航");
        finish();
    }

    // 以下为空实现的必要接口方法
    @Override public void onEndEmulatorNavi() {}
    @Override public void onRecalculateRoute(int errorCode) {}
    @Override public void onNaviInfoUpdate(NaviInfo naviInfo) {}
    @Override public void onNaviLocationUpdate(AMapNaviLocation location) {}
    @Override public void onNaviRouteNotify(AMapNaviRouteNotifyData data) {}
    @Override public void updateAimlessModeStatistics(AimLessModeStat stat) {}
    @Override public void updateAimlessModeCongestionInfo(String s) {}
    @Override public void onPlayRing(int i) {}
    @Override public void onGetDigitizedBird(AMapModelDigitizedBird bird) {}
    @Override public void onLocationChange(AMapNaviLocation location) {}
    @Override public void onGetNavigationText(int type, String desc) {}
    @Override public void onGetNavigationText(String s) {}
    @Override public void onGpsOpenStatus(boolean open) {}
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

    // ============================================================
    //  AMapNaviViewListener
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
