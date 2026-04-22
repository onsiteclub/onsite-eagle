import type { SQLiteDBConnection } from '@capacitor-community/sqlite'
import { isNativePlatform } from '@/lib/native/platform'
import { DATABASE_NAME, DATABASE_VERSION, MIGRATIONS } from './schema'

let connection: SQLiteDBConnection | null = null
let initPromise: Promise<SQLiteDBConnection> | null = null

/**
 * Returns the open SQLite connection, opening + migrating it if needed.
 * Native-only. Call `isSQLiteAvailable()` first if you need to branch.
 */
export async function getDatabase(): Promise<SQLiteDBConnection> {
  if (!isNativePlatform()) {
    throw new Error('SQLite is only available on native platforms')
  }

  if (connection) return connection

  if (!initPromise) {
    initPromise = openAndMigrate()
  }

  connection = await initPromise
  return connection
}

export function isSQLiteAvailable(): boolean {
  return isNativePlatform()
}

async function openAndMigrate(): Promise<SQLiteDBConnection> {
  const { CapacitorSQLite, SQLiteConnection } = await import('@capacitor-community/sqlite')
  const sqlite = new SQLiteConnection(CapacitorSQLite)

  const alreadyConnected = (await sqlite.isConnection(DATABASE_NAME, false)).result
  const db: SQLiteDBConnection = alreadyConnected
    ? await sqlite.retrieveConnection(DATABASE_NAME, false)
    : await sqlite.createConnection(DATABASE_NAME, false, 'no-encryption', DATABASE_VERSION, false)

  await db.open()

  await db.execute(`
    CREATE TABLE IF NOT EXISTS _meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)

  const currentVersion = await readSchemaVersion(db)

  for (const migration of MIGRATIONS) {
    if (migration.version <= currentVersion) continue
    for (const statement of migration.statements) {
      await db.execute(statement)
    }
    await writeSchemaVersion(db, migration.version)
  }

  return db
}

async function readSchemaVersion(db: SQLiteDBConnection): Promise<number> {
  const result = await db.query(`SELECT value FROM _meta WHERE key = 'schema_version';`)
  const row = result.values?.[0] as { value?: string } | undefined
  return row?.value ? Number.parseInt(row.value, 10) : 0
}

async function writeSchemaVersion(db: SQLiteDBConnection, version: number): Promise<void> {
  await db.run(
    `INSERT OR REPLACE INTO _meta (key, value) VALUES ('schema_version', ?);`,
    [String(version)],
  )
}

/** Convenience: run a SELECT and return typed rows. */
export async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const db = await getDatabase()
  const result = await db.query(sql, params as never)
  return (result.values ?? []) as T[]
}

/** Convenience: run an INSERT / UPDATE / DELETE. */
export async function execute(sql: string, params: unknown[] = []): Promise<void> {
  const db = await getDatabase()
  await db.run(sql, params as never)
}

/**
 * Close and release the connection. Safe to call at app exit.
 * Normally you don't need this — SQLite stays open for the lifetime
 * of the process.
 */
export async function closeDatabase(): Promise<void> {
  if (!connection) return
  try {
    await connection.close()
  } finally {
    connection = null
    initPromise = null
  }
}
