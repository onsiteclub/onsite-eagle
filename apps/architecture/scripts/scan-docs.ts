import fs from "fs";
import path from "path";

const MONOREPO = path.resolve(__dirname, "../../..");

interface DocInfo {
  path: string;
  relativePath: string;
  title: string;
  category: "root" | "intelligence" | "per-app" | "memory" | "per-package";
  headings: string[];
  wordCount: number;
  lineCount: number;
  modifiedAt: string;
  tableRefs: string[];
}

const TABLE_PREFIXES = [
  "core_", "egl_", "tmk_", "ccl_", "bil_", "shp_", "club_",
  "crd_", "sht_", "ref_", "log_", "agg_", "int_",
];

function extractTitle(content: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "(sem título)";
}

function extractHeadings(content: string): string[] {
  const matches = content.matchAll(/^#{2,3}\s+(.+)$/gm);
  return [...matches].map((m) => m[1].trim()).slice(0, 30);
}

function extractTableRefs(content: string): string[] {
  const refs = new Set<string>();
  for (const prefix of TABLE_PREFIXES) {
    const regex = new RegExp(`\\b(${prefix}\\w+)\\b`, "g");
    const matches = content.matchAll(regex);
    for (const m of matches) refs.add(m[1]);
  }
  return [...refs].sort();
}

function categorize(relPath: string): DocInfo["category"] {
  if (relPath.startsWith("intelligence/")) return "intelligence";
  if (relPath.match(/^apps\/[^/]+\//)) return "per-app";
  if (relPath.includes(".claude/") || relPath.includes("memory/")) return "memory";
  if (relPath.startsWith("packages/")) return "per-package";
  return "root";
}

function walkDir(dir: string, base: string, results: string[]): void {
  const SKIP = new Set([
    "node_modules", ".next", ".turbo", ".expo", "dist",
    "build", ".git", "android", "ios", ".claude",
  ]);

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(full, base, results);
    } else if (entry.name.endsWith(".md")) {
      results.push(full);
    }
  }
}

export function scanDocs(): DocInfo[] {
  const mdFiles: string[] = [];
  walkDir(MONOREPO, MONOREPO, mdFiles);

  return mdFiles.map((filePath) => {
    const content = fs.readFileSync(filePath, "utf-8");
    const stat = fs.statSync(filePath);
    const relativePath = path.relative(MONOREPO, filePath).replace(/\\/g, "/");

    return {
      path: filePath,
      relativePath,
      title: extractTitle(content),
      category: categorize(relativePath),
      headings: extractHeadings(content),
      wordCount: content.split(/\s+/).length,
      lineCount: content.split("\n").length,
      modifiedAt: stat.mtime.toISOString(),
      tableRefs: extractTableRefs(content),
    };
  });
}
