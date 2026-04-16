package com.daijia.amapnavi;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.amap.api.navi.AmapNaviParams;
import com.amap.api.navi.AmapNaviType;
import com.amap.api.nvi.NaviType;
import com.amap.api.navi.AMapNavi;
import com.amap.api.navi.AMapNaviListener;
import com.amap.api.navi.INaviInfoCallback;
import com.amap.api.navi.model.AMapCalcRouteResult;
import com.amap.api.navi.model.AMapLaneInfo;
import com.amap.api.navi.model.AMapModelDigitizedBird;
import com.amap.api.navi.model.AMapNaviCameraInfo;
import com.amap.api.navi.model.AMapNaviCross;
import com.amap.api.navi.model.AMapNaviInfo;
import com.amap.api.navi.model.AMapNaviLocation;
import com.amap.api.navi.model.AMapNaviPath;
import com.amap.api.navi.model.AMapNaviRoadFlagInfo;
import com.amap.api.navi.model.AMapNaviRouteNotifyData;
import com.amap.api.navi.model.AMapNaviSetting;
import com.amap.api.navi.model.AMapNaviTurnDrowsee;
import com.amap.api.navi.model.AimLessModeStat;
import com.amap.api.navi.model.NaviInfo;
import com.autonavi.ae.pos.LocationErrorType;
import com.autonavi.ae.pos.WGS84Point;

import java.util.ArrayList;
import java.util.List;

/**
 * 嵌入式高德导航 Activity
 *
 * 使用 AMapNaviView 实现完整的 App 内置逐条语音导航。
 * 包含：全屏地图 + 实时路线 + 逐条转向提示 + 语音播报 + 电子眼提醒
 *
 * 使用方式（通过 Intent 启动）：
 *   Intent intent = new Intent(context, AmapNaviViewActivity.class);
 *   intent.putExtra("start_lat", 39.90);
 *   intent.putExtra("start_lng", 116.40);
 *   intent.putExtra("end_lat", 39.95);
 *   intent.putExtra("end_lng", 116.45);
 *   intent.putExtra("start_name", "我的位置");
 *   intent.putExtra("end_name", "目的地");
 *   intent.putExtra("navi_type", "driving"); // driving | riding | walking
 *   context.startActivity(intent);
 *
 * Activity 会自动管理生命周期（onResume/onPause/onDestroy）
 * 完成后 Activity 会自动 finish()
 */
public class AmapNaviViewActivity extends Activity implements AMapNaviListener, INaviInfoCallback {

    private static final String TAG = "AmapNaviViewActivity";
    private static final int REQUEST_PERMISSION = 1001;

    // 导航视图（原生全屏导航界面）
    private com.amap.api.nvi.AMapNaviView naviView;

    // 导航类型：0=驾车 1=步行 2=骑行
    private int naviType = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 检查权限
        if (!checkPermissions()) {
            requestPermissions();
            return;
        }

        // 初始化高德导航 SDK
        AMapNavi.getInstance(this).addAMapNaviListener(this);

        // 创建导航视图
        naviView = new com.amap.api.nvi.AMapNaviView(this);
        naviView.setNaviViewListener(this);
        naviView.setExtendMode(com.amap.api.nvi.AMapNaviView.GD_EXTEND_MODE_NOT);
        naviView.setMode(AMapNaviView.Navi_Mode.Day_Mode);
        setContentView(naviView);

        Log.i(TAG, "AmapNaviViewActivity created");
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (naviView != null) {
            naviView.onResume();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (naviView != null) {
            naviView.onPause();
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (naviView != null) {
            naviView.onDestroy();
        }
        AMapNavi.getInstance(this).removeAMapNaviListener(this);
        Log.i(TAG, "AmapNaviViewActivity destroyed");
    }

    @Override
    public void onBackPressed() {
        // 返回键直接结束导航
        AMapNavi.getInstance(this).stopNavi();
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
                recreate(); // 重新创建 Activity
            } else {
                Toast.makeText(this, "需要定位权限才能使用导航", Toast.LENGTH_LONG).show();
                finish();
            }
        }
    }

    // ============================================================
    //  开始路径规划 + 启动导航
    // ============================================================

    @Override
    public void onNaviViewLoaded() {
        Log.i(TAG, "导航视图加载完成，开始路径规划");
        // 视图加载完成后立即开始导航
        startNaviFromIntent();
    }

    private void startNaviFromIntent() {
        double startLat = getIntent().getDoubleExtra("start_lat", 0);
        double startLng = getIntent().getDoubleExtra("start_lng", 0);
        double endLat   = getIntent().getDoubleExtra("end_lat", 0);
        double endLng   = getIntent().getDoubleExtra("end_lng", 0);
        String startName = getIntent().getStringExtra("start_name");
        String endName   = getIntent().getStringExtra("end_name");
        String typeStr   = getIntent().getStringExtra("navi_type");

        if (endLat == 0 || endLng == 0) {
            Toast.makeText(this, "目的地坐标无效", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }

        // 解析导航类型
        if ("walking".equals(typeStr)) {
            naviType = AmapNaviType.WALK;
        } else if ("riding".equals(typeStr)) {
            naviType = AmapNaviType.RIDE;
        } else {
            naviType = AmapNaviType.DRIVE;
        }

        // 构建途经点
        List<com.amap.api.navi.model.AMapNaviPoint> points = new ArrayList<>();
        try {
            // 起点
            if (startLat != 0 && startLng != 0) {
                points.add(com.amap.api.navi.model.AMapNaviPoint.create(startLat, startLng, com.amap.api.navi.model.AMapNaviPoint.POI_TYPE_START));
            }
            // 终点
            points.add(com.amap.api.navi.model.AMapNaviPoint.create(endLat, endLng, com.amap.api.navi.model.AMapNaviPoint.POI_TYPE_END));
        } catch (Exception e) {
            Log.e(TAG, "创建导航点失败", e);
            Toast.makeText(this, "导航点创建失败", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }

        if (points.size() < 2) {
            Toast.makeText(this, "缺少导航点", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }

        // 计算驾车路线（同步计算，然后自动开始导航）
        AMapNavi.getInstance(this).calculateDriveRoute(points, null, com.amap.api.navi.model.AMapNaviType.DRIVE);
    }

    // ============================================================
    //  AMapNaviListener - 导航事件回调
    // ============================================================

    @Override
    public void onInitNaviFailure() {
        Log.e(TAG, "导航初始化失败");
        Toast.makeText(this, "导航初始化失败，请重试", Toast.LENGTH_SHORT).show();
        finish();
    }

    @Override
    public void onInitNaviSuccess() {
        Log.i(TAG, "导航初始化成功");
    }

    @Override
    public void onCalculateRouteFailure(int errorCode) {
        Log.e(TAG, "路线计算失败: " + errorCode);
        String msg = errorCode == 31 ? "无法找到路线，请检查起终点" : "路线计算失败";
        Toast.makeText(this, msg, Toast.LENGTH_SHORT).show();
    }

    @Override
    public void onCalculateRouteSuccess(int[] routeIds) {
        Log.i(TAG, "路线计算成功，开始导航");
        // 自动开始导航
        naviView.startNavi();
    }

    @Override
    public void onEndEmulatorNavi() {
        Log.i(TAG, "模拟导航结束");
    }

    @Override
    public void onArriveDestination() {
        Log.i(TAG, "到达目的地");
        Toast.makeText(this, "已到达目的地 🎉", Toast.LENGTH_SHORT).show();
        // 延迟1秒后关闭导航视图，让用户看到提示
        naviView.postDelayed(new Runnable() {
            @Override
            public void run() {
                finish();
            }
        }, 2000);
    }

    @Override
    public void onStartNavi(int naviType) {
        Log.i(TAG, "开始导航，类型: " + naviType);
    }

    @Override
    public void onStopNavi() {
        Log.i(TAG, "停止导航");
    }

    @Override
    public void onRecalculateRoute(int errorCode) {
        Log.w(TAG, "重新计算路线: " + errorCode);
    }

    @Override
    public void onSatelliteSignalChanged(boolean has) {}

    @Override
    public void onNaviInfoUpdate(NaviInfo naviInfo) {}

    @Override
    public void onNaviLocationUpdate(AMapNaviLocation location) {}

    @Override
    public void onRoadCrossUpdate(AMapNaviCross cross) {}

    @Override
    public void onLaneInfoUpdate(AMapLaneInfo laneInfo) {}

    @Override
    public void onNaviTurnTo(int iconType) {}

    @Override
    public void notifyParallelRoad(int parallelRoadType) {}

    @Override
    public void onOnDistanceToRoad(boolean isAlongRoad, double distance, double direction) {}

    @Override
    public void onCameraInfoListUpdate(AMapNaviCameraInfo[] cameraInfos) {}

    @Override
    public void onServiceAreaUpdate(AMapNaviServiceAreaInfo[] serviceAreaInfos) {}

    @Override
    public void onShowLaneInfo(AMapLaneInfo[] laneInfos, byte[] laneBackgroundInfo, byte[] laneRecommendedInfo) {}

    @Override
    public void onHideLaneInfo() {}

    @Override
    public void onGetNavigationText(int type, String description) {}

    @Override
    public void onGetNavigationText(String s) {}

    @Override
    public void showLaneInfo(AMapLaneInfo[] laneInfos, byte[] laneBackgroundInfo, byte[] laneRecommendedInfo) {}

    @Override
    public void hideLaneInfo() {}

    @Override
    public void onCalculateRouteFailure(AMapCalcRouteResult result) {
        Log.e(TAG, "路线计算失败: " + result.getErrorCode() + " - " + result.getErrorDescription());
        String msg = "路线计算失败";
        if (result.getErrorCode() == 31) msg = "无法找到路线，请检查起终点位置";
        Toast.makeText(this, msg, Toast.LENGTH_SHORT).show();
    }

    @Override
    public void onCalculateRouteSuccess(AMapCalcRouteResult result) {
        Log.i(TAG, "路线计算成功，结果数: " + result.getRouteIds().length);
        naviView.startNavi();
    }

    @Override
    public void onNaviRouteNotify(AMapNaviRouteNotifyData routeNotifyData) {}

    @Override
    public void onGpsSignalChange(boolean has) {}

    @Override
    public void updateAimlessModeStatistics(AimLessModeStat stat) {}

    @Override
    public void updateAimlessModeCongestionInfo(String s) {}

    @Override
    public void onPlayRing(int i) {}

    @Override
    public void onGetDigitizedBird(AMapModelDigitizedBird aMapModelDigitizedBird) {}

    @Override
    public void onLocationChange(AMapNaviLocation aMapNaviLocation) {}

    @Override
    public void onNaviSetting() {}

    @Override
    public void onNaviCancel() {
        finish();
    }

    @Override
    public boolean onNaviBackClick() {
        finish();
        return true;
    }

    @Override
    public void onNaviMapMode(int i) {}

    @Override
    public void onNaviGuideChanged(int i, int i1, String s) {}

    @Override
    public void showCross(AMapNaviCross aMapNaviCross) {}

    @Override
    public void hideCross() {}

    @Override
    public void showModeCross(AMapNaviCross aMapNaviCross) {}

    @Override
    public void hideModeCross() {}

    @Override
    public void showZoomControlsView(boolean b) {}

    @Override
    public void hideZoomControlsView() {}

    @Override
    public void showAimlessMode(AimLessModeStat aimLessModeStat) {}

    @Override
    public void hideAimlessMode() {}

    @Override
    public void setModeCrossRoadFlagInfo(AMapNaviRoadFlagInfo[] aMapNaviRoadFlagInfos) {}

    @Override
    public void updateLocationData(AMapNaviLocation aMapNaviLocation) {}

    // ============================================================
    //  INaviInfoCallback - 导航视图回调
    // ============================================================

    @Override
    public void onNaviInfoInitialized(AMapNaviInfo aMapNaviInfo) {}

    @Override
    public void onNaviTurnClickListener(int i) {}

    @Override
    public void onNaviSecondTurnClickListener() {}

    @Override
    public boolean onNaviViewCreated(android.view.View view) {
        Log.i(TAG, "导航视图创建完成");
        return false;
    }

    @Override
    public void onNaviViewShow(boolean b, com.amap.api.nvi.NaviType naviType) {
        Log.i(TAG, "导航视图显示: " + b + ", 类型: " + naviType);
    }

    @Override
    public void onNaviViewCancel() {
        finish();
    }

    @Override
    public void onNaviViewFinish(boolean b) {
        if (b) {
            Log.i(TAG, "导航正常结束");
        } else {
            Log.w(TAG, "导航非正常退出");
        }
        finish();
    }

    @Override
    public void onNaviViewChange(int i) {}

    @Override
    public void onNaviRoadTextUpdate(CharSequence charSequence, CharSequence charSequence1) {}

    @Override
    public void onNaviSpeedUpdate(int i) {}

    // 兼容旧版本回调
    @Override
    public void onCalculateDriveRoute(int i, int i1, int i2, int i3) {}
    @Override
    public void onGpsSignalStatusChanged(boolean b, String s) {}
    @Override
    public void onLocationChanged(android.location.Location location) {}
    @Override
    public void onNaviEnd() {}
    @Override
    public void onAircraftSignalChanged(boolean b, int i) {}
    @Override
    public void onNaviLocusUpdate(WGS84Point wGS84Point) {}
    @Override
    public void onOffline_() {}
    @Override
    public void onReCalculateRoute() {}
    @Override
    public void onStopSpeaking() {}
    @Override
    public void onSpeakCallback(int i) {}
    @Override
    public void onUpdateInterval(int i, AMapNaviInfo aMapNaviInfo) {}
    @Override
    public void onStartSpeaking() {}
}
