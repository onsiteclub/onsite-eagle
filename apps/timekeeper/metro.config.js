const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// --- REACT-NATIVE VERSION ISOLATION ---
// Root has react-native 0.76.9, local has 0.76.0.
// Without blocking, Metro mixes internal modules from both versions
// causing "TypeError: property is not writable" at startup.

const rootRN = path.resolve(monorepoRoot, 'node_modules', 'react-native')
  .replace(/[\\]/g, '\\\\');

config.resolver.blockList = [
  new RegExp(`${rootRN}[\\\\/].*`),
];

config.resolver.extraNodeModules = {
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
};

module.exports = config;
