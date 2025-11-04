// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module-resolver', { alias: { '@': './src' } }],
      // WICHTIG: das Reanimated-Plugin MUSS als letztes stehen
      'react-native-reanimated/plugin',
    ],
  };
};