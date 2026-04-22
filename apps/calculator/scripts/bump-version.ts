// scripts/bump-version.ts
// Phase 5.7 — sync a new version across package.json + Android build.gradle + iOS project.pbxproj.
//
// Usage:
//   npx tsx scripts/bump-version.ts patch          # 1.2.3 → 1.2.4
//   npx tsx scripts/bump-version.ts minor          # 1.2.3 → 1.3.0
//   npx tsx scripts/bump-version.ts major          # 1.2.3 → 2.0.0
//   npx tsx scripts/bump-version.ts 1.5.0          # explicit
//
// What it touches:
//   - package.json                 "version": "X.Y.Z"
//   - android/app/build.gradle     versionName "X.Y.Z"  + versionCode N (auto-increment)
//   - ios/App/App.xcodeproj/project.pbxproj
//                                  MARKETING_VERSION = X.Y.Z;     (Debug + Release)
//                                  CURRENT_PROJECT_VERSION = N;   (+1 from previous)
//
// The versionCode / CURRENT_PROJECT_VERSION always increment; the app stores
// reject any upload with a lower or equal integer. Semver strings (X.Y.Z) are
// the human-readable side; integer build numbers are the machine side.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CALC_ROOT = join(HERE, '..');
const PKG_PATH = join(CALC_ROOT, 'package.json');
const GRADLE_PATH = join(CALC_ROOT, 'android', 'app', 'build.gradle');
const PBXPROJ_PATH = join(CALC_ROOT, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');

type BumpKind = 'patch' | 'minor' | 'major';

function parseVersion(v: string): [number, number, number] {
  const m = v.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!m) throw new Error(`Invalid semver: ${v}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function bumpSemver(current: string, kind: BumpKind): string {
  const [major, minor, patch] = parseVersion(current);
  switch (kind) {
    case 'major': return `${major + 1}.0.0`;
    case 'minor': return `${major}.${minor + 1}.0`;
    case 'patch': return `${major}.${minor}.${patch + 1}`;
  }
}

function resolveTarget(arg: string, currentSemver: string): string {
  if (arg === 'patch' || arg === 'minor' || arg === 'major') {
    return bumpSemver(currentSemver, arg);
  }
  // Explicit version — validate.
  parseVersion(arg);
  return arg;
}

function updatePackageJson(newSemver: string): { previous: string } {
  const raw = readFileSync(PKG_PATH, 'utf8');
  const pkg = JSON.parse(raw);
  const previous = String(pkg.version ?? '0.0.0');
  pkg.version = newSemver;
  // Preserve trailing newline if original had one.
  const trailingNewline = raw.endsWith('\n') ? '\n' : '';
  writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + trailingNewline);
  return { previous };
}

function updateGradle(newSemver: string): { versionCode: number } {
  if (!existsSync(GRADLE_PATH)) {
    throw new Error(`Gradle file not found: ${GRADLE_PATH}`);
  }
  let content = readFileSync(GRADLE_PATH, 'utf8');

  // Auto-increment versionCode.
  const codeMatch = content.match(/versionCode\s+(\d+)/);
  if (!codeMatch) throw new Error('Could not find versionCode in build.gradle');
  const previousCode = Number(codeMatch[1]);
  const nextCode = previousCode + 1;

  content = content.replace(/versionCode\s+\d+/, `versionCode ${nextCode}`);
  content = content.replace(/versionName\s+"[^"]+"/, `versionName "${newSemver}"`);

  writeFileSync(GRADLE_PATH, content);
  return { versionCode: nextCode };
}

function updatePbxproj(newSemver: string): { currentProjectVersion: number } {
  if (!existsSync(PBXPROJ_PATH)) {
    throw new Error(`pbxproj not found: ${PBXPROJ_PATH}`);
  }
  let content = readFileSync(PBXPROJ_PATH, 'utf8');

  // Auto-increment CURRENT_PROJECT_VERSION. The file has this set twice
  // (Debug + Release) — they should stay in sync, so take the first occurrence.
  const pvMatch = content.match(/CURRENT_PROJECT_VERSION\s*=\s*(\d+)\s*;/);
  if (!pvMatch) throw new Error('Could not find CURRENT_PROJECT_VERSION in pbxproj');
  const previousPv = Number(pvMatch[1]);
  const nextPv = previousPv + 1;

  content = content.replace(/CURRENT_PROJECT_VERSION\s*=\s*\d+\s*;/g, `CURRENT_PROJECT_VERSION = ${nextPv};`);
  content = content.replace(/MARKETING_VERSION\s*=\s*[0-9.]+\s*;/g, `MARKETING_VERSION = ${newSemver};`);

  writeFileSync(PBXPROJ_PATH, content);
  return { currentProjectVersion: nextPv };
}

function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: npx tsx scripts/bump-version.ts <patch|minor|major|X.Y.Z>');
    process.exit(1);
  }

  const pkg = JSON.parse(readFileSync(PKG_PATH, 'utf8'));
  const currentSemver = String(pkg.version ?? '0.0.0');
  const newSemver = resolveTarget(arg, currentSemver);

  if (newSemver === currentSemver && arg !== currentSemver) {
    console.log(`[bump] Already at ${currentSemver}, nothing to do.`);
    return;
  }

  console.log(`[bump] ${currentSemver} → ${newSemver}`);

  const pkgResult = updatePackageJson(newSemver);
  console.log(`[bump] package.json version: ${pkgResult.previous} → ${newSemver}`);

  const gradleResult = updateGradle(newSemver);
  console.log(`[bump] android/app/build.gradle: versionName="${newSemver}" versionCode=${gradleResult.versionCode}`);

  const pbxResult = updatePbxproj(newSemver);
  console.log(`[bump] ios pbxproj: MARKETING_VERSION=${newSemver} CURRENT_PROJECT_VERSION=${pbxResult.currentProjectVersion}`);

  console.log(`[bump] Done. Commit with: git add -A && git commit -m "chore: bump to v${newSemver}"`);
}

try {
  main();
} catch (err) {
  console.error(`[bump] ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
