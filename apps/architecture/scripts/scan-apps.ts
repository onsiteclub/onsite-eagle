import fs from "fs";
import path from "path";

const MONOREPO = path.resolve(__dirname, "../../..");
const APPS_DIR = path.join(MONOREPO, "apps");

interface AppInfo {
  slug: string;
  name: string;
  version: string;
  runtime: "nextjs" | "expo" | "capacitor" | "external" | "tbd";
  port: number | null;
  internalDeps: string[];
  allDeps: string[];
  scripts: Record<string, string>;
  hasClaudeMd: boolean;
  hasPipelineMd: boolean;
  hasAppJson: boolean;
  hasEnvExample: boolean;
}

function detectRuntime(deps: Record<string, string>): AppInfo["runtime"] {
  if (deps["next"]) return "nextjs";
  if (deps["expo"]) return "expo";
  if (deps["vite"] || deps["@capacitor/core"]) return "capacitor";
  return "tbd";
}

function extractPort(scripts: Record<string, string>): number | null {
  const dev = scripts?.dev || "";
  const match = dev.match(/--port\s+(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

export function scanApps(): AppInfo[] {
  const dirs = fs.readdirSync(APPS_DIR).filter((d) => {
    const pkgPath = path.join(APPS_DIR, d, "package.json");
    return fs.existsSync(pkgPath);
  });

  return dirs.map((dir) => {
    const pkgPath = path.join(APPS_DIR, dir, "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    const internalDeps = Object.keys(pkg.dependencies || {})
      .filter((d) => d.startsWith("@onsite/"))
      .map((d) => d.replace("@onsite/", ""));

    return {
      slug: dir,
      name: pkg.name || dir,
      version: pkg.version || "0.0.0",
      runtime: detectRuntime(pkg.dependencies || {}),
      port: extractPort(pkg.scripts || {}),
      internalDeps,
      allDeps: Object.keys(allDeps),
      scripts: pkg.scripts || {},
      hasClaudeMd: fs.existsSync(path.join(APPS_DIR, dir, "CLAUDE.md")),
      hasPipelineMd: fs.existsSync(path.join(APPS_DIR, dir, "PIPELINE.md")),
      hasAppJson: fs.existsSync(path.join(APPS_DIR, dir, "app.json")),
      hasEnvExample: fs.existsSync(path.join(APPS_DIR, dir, ".env.example")),
    };
  });
}
