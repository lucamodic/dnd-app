module.exports = function (api) {
  api.cache(true);
  return {
    // En SDK 54 / Reanimated 4, babel-preset-expo ya incluye el plugin de worklets
    // automáticamente, así que no hace falta agregarlo a mano.
    presets: ["babel-preset-expo"],
  };
};
