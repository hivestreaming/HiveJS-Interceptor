

module.exports = {
    extension: ['ts'],
    recursive: false,
    require: [
        "jsdom-global/register",
        "ts-node/register",
        "source-map-support/register"
    ],
  };