import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "node:fs";
import path from "node:path";

import * as schema from "./schema";
import { resolveWorkspaceRoot } from "@/server/utils/workspace";

export type DatabaseInstance = ReturnType<typeof drizzle<typeof schema>>;

function resolveDataDir() {
  if (process.env.AIKP_DATA_DIR) {
    return path.resolve(process.env.AIKP_DATA_DIR);
  }
  return path.join(resolveWorkspaceRoot(), "data");
}

export function resolveDatabasePath() {
  if (process.env.AIKP_DATABASE_PATH) {
    return path.resolve(process.env.AIKP_DATABASE_PATH);
  }
  return path.join(resolveDataDir(), "knowledge-passport.sqlite");
}

export function createSqliteConnection() {
  return createSqliteConnectionForPath(resolveDatabasePath());
}

export function createSqliteConnectionForPath(databasePath: string) {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  const sqlite = new Database(databasePath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return sqlite;
}

export function createDatabaseClient(databasePath: string) {
  const sqlite = createSqliteConnectionForPath(databasePath);
  return {
    sqlite,
    db: drizzle(sqlite, { schema })
  };
}

let cachedDatabase: ReturnType<typeof createSqliteConnection> | null = null;
let cachedDrizzle: DatabaseInstance | null = null;

export function getDatabase() {
  if (!cachedDatabase) {
    cachedDatabase = createSqliteConnection();
  }

  if (!cachedDrizzle) {
    cachedDrizzle = drizzle(cachedDatabase, { schema });
  }

  return {
    sqlite: cachedDatabase,
    db: cachedDrizzle
  };
}
