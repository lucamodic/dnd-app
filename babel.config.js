module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // El plugin de reanimated DEBE ir último.
    plugins: ["react-native-reanimated/plugin"],
  };
};
