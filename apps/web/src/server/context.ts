import path from "node:path";

import type { DatabaseInstance } from "./db/client";
import { createDatabaseClient, getDatabase, resolveDatabasePath } from "./db/client";
import { initializeDatabase, initializeDatabaseForSqlite } from "./db/init";
import type { ModelProvider } from "./providers/model-provider";
import { OpenAIProvider } from "./providers/openai-provider";
import { resolveWorkspaceRoot } from "./utils/workspace";

export type AppPaths = {
  rootDir: string;
  dataDir: string;
  objectsDir: string;
  exportsDir: string;
  backupsDir: string;
  databasePath: string;
};

export type AppContext = {
  db: DatabaseInstance;
  sqlite: ReturnType<typeof getDatabase>["sqlite"];
  provider: ModelProvider;
  paths: AppPaths;
};

function resolvePaths(): AppPaths {
  const rootDir = resolveWorkspaceRoot();
  const dataDir = process.env.AIKP_DATA_DIR ? path.resolve(process.env.AIKP_DATA_DIR) : path.join(rootDir, "data");

  return {
    rootDir,
    dataDir,
    objectsDir: path.join(dataDir, "objects"),
    exportsDir: path.join(dataDir, "exports"),
    backupsDir: path.join(dataDir, "backups"),
    databasePath: resolveDatabasePath()
  };
}

let cachedContext: AppContext | null = null;

export function getAppContext(): AppContext {
  if (cachedContext) {
    return cachedContext;
  }

  initializeDatabase();
  const { db, sqlite } = getDatabase();
  cachedContext = {
    db,
    sqlite,
    provider: new OpenAIProvider(),
    paths: resolvePaths()
  };

  return cachedContext;
}

export function createAppContext(options: {
  dataDir: string;
  databasePath: string;
  provider: ModelProvider;
}): AppContext {
  const client = createDatabaseClient(options.databasePath);
  initializeDatabaseForSqlite(client.sqlite);
  return {
    db: client.db,
    sqlite: client.sqlite,
    provider: options.provider,
    paths: {
      rootDir: resolveWorkspaceRoot(),
      dataDir: options.dataDir,
      objectsDir: path.join(options.dataDir, "objects"),
      exportsDir: path.join(options.dataDir, "exports"),
      backupsDir: path.join(options.dataDir, "backups"),
      databasePath: options.databasePath
    }
  };
}
