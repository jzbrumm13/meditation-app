// Metro config — treat .html files as bundled assets so the untouched
// candle_timer.html can be loaded into a WebView via expo-asset.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('html');
module.exports = config;
