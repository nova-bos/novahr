import { defineConfig } from "prisma/config";

// The Prisma CLI doesn't load .env files on its own (unlike Next.js) - load
// it here so `prisma migrate` / `prisma db seed` see DATABASE_URL etc.
try {
  process.loadEnvFile(".env");
} catch {
  // .env is optional for commands that don't need a datasource (e.g. `generate`).
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // Migrate needs a direct (non-pooled) connection - the app's PrismaClient
  // uses DATABASE_URL (pooled) via the adapter in src/lib/prisma.ts.
  datasource: {
    url: process.env["DIRECT_URL"],
  },
});
