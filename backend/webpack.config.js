const path = require('path');

module.exports = function (options, webpack) {
  return {
    ...options,
    resolve: {
      ...options.resolve,
      alias: {
        ...options.resolve?.alias,
        '@dating-app/protocol': path.resolve(__dirname, '../__protocol/dist/index'),
      },
    },
  };
};
