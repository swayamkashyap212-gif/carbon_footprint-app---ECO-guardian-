const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;

const config = getDefaultConfig(projectRoot);

config.resolver.useWatchman = false;

config.maxWorkers = 2;

config.watcher = {
  ...config.watcher,
  additionalExts: [],
  blacklistedRE: [
    /temp\/.*/,
    /android\/.*/,
    /android-native\/.*/,
    /backend\/.*/,
    /node_modules\/.*\/test\/.*/,
    /ecoguardian-web\/.*/,
    /supabase\/.*/,
    /\.git\/.*/,
    /\.expo\/.*/,
    /\.tmp\/.*/,
  ],
};

const existingBlock = config.resolver.blockList;
config.resolver.blockList = existingBlock instanceof RegExp
  ? [existingBlock, /temp\/.*/, /android\/.*/, /backend\/.*/, /ecoguardian-web\/.*/, /supabase\/.*/]
  : Array.isArray(existingBlock)
    ? [...existingBlock, /temp\/.*/, /android\/.*/, /backend\/.*/, /ecoguardian-web\/.*/, /supabase\/.*/]
    : [/temp\/.*/, /android\/.*/, /backend\/.*/, /ecoguardian-web\/.*/, /supabase\/.*/];

module.exports = config;
