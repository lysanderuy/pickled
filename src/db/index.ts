import "server-only";

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "@/lib/env";

import * as schema from "./schema";

type Db = PostgresJsDatabase<typeof schema>;

// Lazy init — next build imports this without DATABASE_URL set. Cached on
// globalThis so dev hot reload doesn't exhaust the connection pool.
const globalForDb = globalThis as unknown as { db?: Db };

function createDb(): Db {
  // prepare: false is required when connecting through the Supabase
  // transaction pooler (port 6543), which does not support prepared statements.
  const client = postgres(env.DATABASE_URL, { prepare: false });
  return drizzle(client, { schema });
}

export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    const instance = (globalForDb.db ??= createDb());
    const value = instance[prop as keyof Db];
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
