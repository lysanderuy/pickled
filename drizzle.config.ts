import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// dotenv skips already-set keys, so .env.local wins over .env.
config({ path: ".env.local" });
config({ path: ".env" });

export default defineConfig({
  schema: "./src/db/schema",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    // Migrations need session mode (5432) — transaction pooler (6543)
    // does not support the prepared statements drizzle-kit relies on.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
  },
});
