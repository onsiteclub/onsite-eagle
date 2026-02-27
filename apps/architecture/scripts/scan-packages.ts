import fs from "fs";
import path from "path";

const MONOREPO = path.resolve(__dirname, "../../..");
const PKGS_DIR = path.join(MONOREPO, "packages");

interface PkgInfo {
  slug: string;
  name: string;
  version: string;
  layer: "foundation" | "composition";
  internalDeps: string[];
  externalDeps: string[];
  hasReadme: boolean;
  hasSrc: boolean;
  exports: string[];
}

const RUNTIME_DEPS = new Set([
  "react", "react-dom", "react-native", "next", "expo",
  "@supabase/supabase-js", "@supabase/ssr",
  "qrcode.react", "react-native-qrcode-svg",
]);

export function scanPackages(): PkgInfo[] {
  const dirs = fs.readdirSync(PKGS_DIR).filter((d) => {
    return fs.existsSync(path.join(PKGS_DIR, d, "package.json"));
  });

  return dirs.map((dir) => {
    const pkgPath = path.join(PKGS_DIR, dir, "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    const deps = pkg.dependencies || {};
    const internalDeps = Object.keys(deps)
      .filter((d) => d.startsWith("@onsite/"))
      .map((d) => d.replace("@onsite/", ""));
    const externalDeps = Object.keys(deps).filter(
      (d) => !d.startsWith("@onsite/")
    );

    const hasRuntimeDep = externalDeps.some((d) => RUNTIME_DEPS.has(d));
    const hasInternalDep = internalDeps.length > 0;

    // Extract exports from package.json
    const exportsField = pkg.exports;
    let exportsList: string[] = ["."];
    if (exportsField && typeof exportsField === "object") {
      exportsList = Object.keys(exportsField);
    }

    return {
      slug: dir,
      name: pkg.name || `@onsite/${dir}`,
      version: pkg.version || "0.0.0",
      layer: hasRuntimeDep || hasInternalDep ? "composition" : "foundation",
      internalDeps,
      externalDeps,
      hasReadme: fs.existsSync(path.join(PKGS_DIR, dir, "README.md")),
      hasSrc: fs.existsSync(path.join(PKGS_DIR, dir, "src")),
      exports: exportsList,
    };
  });
}
