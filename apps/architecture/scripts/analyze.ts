import fs from "fs";
import path from "path";
import { scanApps } from "./scan-apps";
import { scanPackages } from "./scan-packages";
import { scanDocs } from "./scan-docs";
import { scanDeps } from "./scan-deps";
import { scanMigrations } from "./scan-migrations";

const DATA_DIR = path.resolve(__dirname, "../data");

function writeJson(filename: string, data: unknown): void {
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  const size = fs.statSync(filePath).size;
  console.log(`  ✓ ${filename} (${(size / 1024).toFixed(1)} KB)`);
}

async function main() {
  console.log("\n🔍 OnSite Eagle — Analyze Monorepo\n");
  const start = Date.now();

  // Ensure data dir exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // 1. Scan apps
  console.log("📱 Scanning apps...");
  const apps = scanApps();
  writeJson("apps.json", apps);

  // 2. Scan packages
  console.log("📦 Scanning packages...");
  const packages = scanPackages();
  writeJson("packages.json", packages);

  // 3. Scan docs
  console.log("📄 Scanning docs...");
  const docs = scanDocs();
  writeJson("docs.json", docs);

  // 4. Scan deps (needs apps + packages)
  console.log("🔗 Building dependency graph...");
  const deps = scanDeps(apps, packages);
  writeJson("deps.json", deps);

  // 5. Scan migrations
  console.log("📜 Scanning migrations...");
  const migrations = scanMigrations();
  writeJson("migrations.json", migrations);

  // Summary
  const elapsed = Date.now() - start;
  console.log(`\n✅ Done in ${elapsed}ms`);
  console.log(`   ${apps.length} apps`);
  console.log(`   ${packages.length} packages`);
  console.log(`   ${docs.length} docs`);
  console.log(`   ${deps.edges.length} dependency edges`);
  console.log(`   ${deps.orphans.length} orphan packages: ${deps.orphans.join(", ") || "none"}`);
  console.log(`   ${migrations.length} migrations`);
  console.log(`   ${migrations.reduce((s, m) => s + m.statements.createTable, 0)} total CREATE TABLE`);
  console.log(`   ${migrations.reduce((s, m) => s + m.statements.createPolicy, 0)} total CREATE POLICY`);
  console.log("");
}

main().catch((err) => {
  console.error("❌ Analyze failed:", err);
  process.exit(1);
});
