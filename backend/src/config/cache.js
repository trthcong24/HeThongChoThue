const NodeCache = require("node-cache");
const env = require("./env");

const appCache = new NodeCache({
  stdTTL: env.cacheTtl,
  checkperiod: Math.max(10, Math.floor(env.cacheTtl / 2))
});

module.exports = appCache;
