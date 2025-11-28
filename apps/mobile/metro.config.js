// metro.config.js - final für Expo + Firebase v10 auf React Native (Hermes)
const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// Firebase nutzt intern .cjs-Dateien -> hier explizit erlauben
if (!config.resolver.sourceExts.includes('cjs')) {
  config.resolver.sourceExts.push('cjs');
}

// WICHTIG: Package-Exports für Firebase deaktivieren, damit Metro die
// klassischen CJS-Bundles benutzt und der
// 'Component auth has not been registered yet'-Fehler verschwindet.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;