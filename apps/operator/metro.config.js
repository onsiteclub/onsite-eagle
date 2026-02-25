const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo
config.watchFolders = [monorepoRoot];

// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// --- REACT 18/19 ISOLATION ---
// Root has React 19.x (Next.js apps), local has React 18.3.1 (Expo).
// Without blocking, Metro resolves React 19 from root → runtime crashes.
const rootReact = path.resolve(monorepoRoot, 'node_modules', 'react')
  .replace(/[\\]/g, '\\\\');
const rootReactDom = path.resolve(monorepoRoot, 'node_modules', 'react-dom')
  .replace(/[\\]/g, '\\\\');

// --- REACT-NATIVE VERSION ISOLATION ---
// Root has react-native 0.76.9, local has 0.76.0.
const rootRN = path.resolve(monorepoRoot, 'node_modules', 'react-native')
  .replace(/[\\]/g, '\\\\');

config.resolver.blockList = [
  new RegExp(`${rootReact}[\\\\/].*`),
  new RegExp(`${rootReactDom}[\\\\/].*`),
  new RegExp(`${rootRN}[\\\\/].*`),
];

config.resolver.extraNodeModules = {
  react: path.resolve(projectRoot, 'node_modules/react'),
  'react-dom': path.resolve(projectRoot, 'node_modules/react-dom'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
};

module.exports = config;
