import { execSync } from "node:child_process";

/**
 * Run reference-data seed during deploy. Prefer DIRECT_URL (Supabase direct
 * Postgres) for sequential upserts; fall back to DATABASE_URL for local Docker.
 */
const databaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("run-db-seed: missing DIRECT_URL and DATABASE_URL");
  process.exit(1);
}

execSync("pnpm exec prisma db seed", {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: databaseUrl },
});
