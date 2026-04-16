import type { PluginListenerHandle } from '@capacitor/core';

export interface NaviRoutePoint {
  /** 纬度 */
  latitude: number;
  /** 经度 */
  longitude: number;
  /** 名称（可选） */
  name?: string;
}

export interface NaviConfig {
  /** 高德地图 Key（必须） */
  apiKey: string;
  /** 是否开启实时路况 */
  trafficEnabled?: boolean;
  /** 是否开启卫星图 */
  satelliteEnabled?: boolean;
}

export interface NaviLaunchOptions {
  /** 途经点和终点（第一个是起点，最后一个是终点） */
  waypoints: NaviRoutePoint[];
  /** 导航模式: 0=驾车 1=步行 2=骑行 */
  mode?: number;
}

export interface AmapNaviPlugin {
  /**
   * 初始化高德导航 SDK
   * 需要在启动导航前调用一次
   */
  initialize(config: NaviConfig): Promise<{ success: boolean }>;

  /**
   * 启动嵌入式全屏导航（App 内直接显示高德导航界面）
   * 这是主要入口，会在 App 内全屏显示高德导航，包含逐条语音提示
   *
   * @param waypoints 途经点：[起点, 终点]，至少2个点
   * @param mode 0=驾车 1=步行 2=骑行
   */
  startEmbeddedNavi(options: NaviLaunchOptions): Promise<{ success: boolean }>;

  /**
   * 启动导航（跳转高德导航 App，兜底方案）
   * 如果安装了高德 App，会直接调起；否则打开网页版
   */
  launchNavi(options: NaviLaunchOptions): Promise<{ success: boolean }>;

  /**
   * 判断高德导航 App 是否已安装
   */
  isAmapInstalled(): Promise<{ installed: boolean }>;

  /**
   * 获取当前 GPS 位置（一次性）
   */
  getCurrentLocation(): Promise<{ latitude: number; longitude: number }>;

  /**
   * 开始监听位置变化（持续回调）
   * @param callback 位置更新回调，interval 为回调间隔（毫秒）
   */
  startLocationTracking(callback: (location: { latitude: number; longitude: number; bearing: number; speed: number }) => void): Promise<{ trackingId: string }>;

  /**
   * 停止位置监听
   */
  stopLocationTracking(): Promise<void>;

  /**
   * 计算两点间距离（米）
   */
  calculateDistance(from: NaviRoutePoint, to: NaviRoutePoint): Promise<{ distance: number }>;

  // ========== 事件监听 ==========

  /** 导航开始事件 */
  addListener(eventName: 'naviStart', listener: () => void): Promise<PluginListenerHandle>;

  /** 导航结束事件 */
  addListener(eventName: 'naviStop', listener: () => void): Promise<PluginListenerHandle>;

  /** 到达目的地事件 */
  addListener(eventName: 'arrived', listener: (data: { type: 'waypoint' | 'destination'; index: number }) => void): Promise<PluginListenerHandle>;

  /** 位置更新事件（startLocationTracking 时触发） */
  addListener(eventName: 'locationUpdate', listener: (data: { latitude: number; longitude: number; bearing: number; speed: number }) => void): Promise<PluginListenerHandle>;
}
