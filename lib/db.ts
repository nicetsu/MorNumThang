import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// ponytail: singleton so Next dev hot-reload doesn't exhaust connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Prefer DATABASE_URL (local dev / migrations, session pooler); on Vercel fall back to
// Supabase's managed POSTGRES_PRISMA_URL (transaction pooler, right for serverless).
export function pgAdapter() {
  const url = new URL(process.env.DATABASE_URL ?? process.env.POSTGRES_PRISMA_URL!);
  // Drop sslmode so node-pg doesn't force full cert verification — Supabase's pooler cert
  // isn't in node's default chain. We encrypt but skip chain verification via the ssl option.
  // ponytail: fine for a demo; use a proper CA bundle if this ever holds real PHI.
  url.searchParams.delete("sslmode");
  // ponytail: cap connections per serverless instance so a burst can't exhaust the pooler.
  // The transaction pooler multiplexes these across the DB.
  return new PrismaPg({
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: false },
    max: 3,
  });
}

const adapter = pgAdapter();

export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
