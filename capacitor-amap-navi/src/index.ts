import { registerPlugin } from '@capacitor/core';
import type { AmapNaviPlugin as IAmapNaviPlugin, NaviConfig, NaviLaunchOptions, NaviRoutePoint } from './definitions';
import type { PluginListenerHandle } from '@capacitor/core';

const AmapNaviPlugin = registerPlugin<{
  initialize(opts: NaviConfig): Promise<{ success: boolean }>;
  startEmbeddedNavi(opts: NaviLaunchOptions): Promise<{ success: boolean }>;
  launchNavi(opts: NaviLaunchOptions): Promise<{ success: boolean }>;
  isAmapInstalled(): Promise<{ installed: boolean }>;
  getCurrentLocation(): Promise<{ latitude: number; longitude: number }>;
  startLocationTracking(): Promise<{ trackingId: string }>;
  stopLocationTracking(): Promise<void>;
  calculateDistance(opts: { from: NaviRoutePoint; to: NaviRoutePoint }): Promise<{ distance: number }>;
  addListener(eventName: string, listenerFunc: Function): Promise<PluginListenerHandle>;
}>('AmapNavi');

export const AmapNavi: IAmapNaviPlugin = {
  initialize(config: NaviConfig) {
    return AmapNaviPlugin.initialize(config);
  },

  startEmbeddedNavi(options: NaviLaunchOptions) {
    return AmapNaviPlugin.startEmbeddedNavi(options);
  },

  launchNavi(options: NaviLaunchOptions) {
    return AmapNaviPlugin.launchNavi(options);
  },

  isAmapInstalled() {
    return AmapNaviPlugin.isAmapInstalled();
  },

  getCurrentLocation() {
    return AmapNaviPlugin.getCurrentLocation();
  },

  startLocationTracking() {
    return AmapNaviPlugin.startLocationTracking();
  },

  stopLocationTracking() {
    return AmapNaviPlugin.stopLocationTracking();
  },

  calculateDistance(from: NaviRoutePoint, to: NaviRoutePoint) {
    return AmapNaviPlugin.calculateDistance({ from, to });
  },

  addListener(eventName: 'naviStart' | 'naviStop' | 'arrived' | 'locationUpdate', listener: Function) {
    return AmapNaviPlugin.addListener(eventName, listener);
  }
};

export { NaviConfig, NaviLaunchOptions, NaviRoutePoint };
export default AmapNavi;
