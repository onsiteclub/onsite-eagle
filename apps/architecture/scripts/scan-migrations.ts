import fs from "fs";
import path from "path";

const MONOREPO = path.resolve(__dirname, "../../..");
const MIGRATIONS_DIR = path.join(MONOREPO, "supabase", "migrations");

interface MigrationInfo {
  filename: string;
  name: string;
  date: string | null;
  lineCount: number;
  statements: {
    createTable: number;
    alterTable: number;
    createPolicy: number;
    dropPolicy: number;
    createFunction: number;
    createView: number;
    createIndex: number;
    other: number;
  };
  tablesCreated: string[];
  tablesAltered: string[];
}

function parseMigration(filename: string, content: string): MigrationInfo {
  // Try to extract date from filename prefix
  const dateMatch = filename.match(/^(\d{3,8})/);
  let date: string | null = null;
  if (dateMatch) {
    const num = dateMatch[1];
    if (num.length === 8) {
      // YYYYMMDD format
      date = `${num.slice(0, 4)}-${num.slice(4, 6)}-${num.slice(6, 8)}`;
    }
  }

  // Extract human-readable name
  const name = filename
    .replace(/^\d+_/, "")
    .replace(/\.sql$/, "")
    .replace(/_/g, " ");

  // Count DDL statements
  const lines = content.split("\n");
  const createTable = (content.match(/CREATE\s+TABLE/gi) || []).length;
  const alterTable = (content.match(/ALTER\s+TABLE/gi) || []).length;
  const createPolicy = (content.match(/CREATE\s+POLICY/gi) || []).length;
  const dropPolicy = (content.match(/DROP\s+POLICY/gi) || []).length;
  const createFunction = (content.match(/CREATE\s+(OR\s+REPLACE\s+)?FUNCTION/gi) || []).length;
  const createView = (content.match(/CREATE\s+(OR\s+REPLACE\s+)?(MATERIALIZED\s+)?VIEW/gi) || []).length;
  const createIndex = (content.match(/CREATE\s+(UNIQUE\s+)?INDEX/gi) || []).length;

  // Extract table names from CREATE TABLE
  const tablesCreated = [...content.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/gi)]
    .map((m) => m[1]);

  const tablesAltered = [...new Set(
    [...content.matchAll(/ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(\w+)/gi)]
      .map((m) => m[1])
  )];

  return {
    filename,
    name,
    date,
    lineCount: lines.length,
    statements: {
      createTable,
      alterTable,
      createPolicy,
      dropPolicy,
      createFunction,
      createView,
      createIndex,
      other: 0,
    },
    tablesCreated,
    tablesAltered,
  };
}

export function scanMigrations(): MigrationInfo[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    return [];
  }

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  return files.map((filename) => {
    const content = fs.readFileSync(path.join(MIGRATIONS_DIR, filename), "utf-8");
    return parseMigration(filename, content);
  });
}
