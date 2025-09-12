module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@': './src',
          },
        },
      ],
      // WICHTIG: Dieses Plugin **ganz am Ende** einfügen!
      'react-native-reanimated/plugin',
    ],
  };
};