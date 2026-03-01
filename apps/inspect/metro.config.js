const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch ONLY the packages this app actually imports (not the whole monorepo!)
// Watching monorepoRoot on Windows causes Metro to scan .next/, .turbo/, all apps → hangs.
// Only packages actually imported by the app (checked via grep @onsite/)
config.watchFolders = [
  path.resolve(monorepoRoot, 'packages', 'auth'),
  path.resolve(monorepoRoot, 'packages', 'auth-ui'),
  path.resolve(monorepoRoot, 'packages', 'tokens'),
  path.resolve(monorepoRoot, 'packages', 'shared'),
  path.resolve(monorepoRoot, 'packages', 'timeline'),
  path.resolve(monorepoRoot, 'packages', 'offline'),
  path.resolve(monorepoRoot, 'packages', 'logger'),
  path.resolve(monorepoRoot, 'packages', 'media'),
  path.resolve(monorepoRoot, 'packages', 'agenda'),
  path.resolve(monorepoRoot, 'packages', 'camera'),
  path.resolve(monorepoRoot, 'packages', 'sharing'),
  path.resolve(monorepoRoot, 'packages', 'ai'),
  path.resolve(monorepoRoot, 'packages', 'framing'),
];

// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 3. Prevent Metro from walking up the directory tree looking for modules
config.resolver.disableHierarchicalLookup = true;

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
  // React version isolation
  new RegExp(`${rootReact}[\\\\/].*`),
  new RegExp(`${rootReactDom}[\\\\/].*`),
  new RegExp(`${rootRN}[\\\\/].*`),
  // Block Next.js/Turbo build artifacts (prevents file watcher churn on Windows)
  /.*[\\/]apps[\\/].*[\\/]\.next[\\/].*/,
  /.*[\\/]apps[\\/].*[\\/]dist[\\/].*/,
  /.*[\\/]apps[\\/].*[\\/]build[\\/].*/,
  /.*[\\/]\.turbo[\\/].*/,
  /.*[\\/]coverage[\\/].*/,
];

config.resolver.extraNodeModules = {
  react: path.resolve(projectRoot, 'node_modules/react'),
  'react-dom': path.resolve(projectRoot, 'node_modules/react-dom'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
};

module.exports = config;
