"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AmapNavi = void 0;
const core_1 = require("@capacitor/core");
const AmapNaviPlugin = (0, core_1.registerPlugin)('AmapNavi');
exports.AmapNavi = {
    initialize(config) {
        return AmapNaviPlugin.initialize(config);
    },
    startEmbeddedNavi(options) {
        return AmapNaviPlugin.startEmbeddedNavi(options);
    },
    launchNavi(options) {
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
    calculateDistance(from, to) {
        return AmapNaviPlugin.calculateDistance({ from, to });
    },
    addListener(eventName, listener) {
        return AmapNaviPlugin.addListener(eventName, listener);
    }
};
exports.default = exports.AmapNavi;
