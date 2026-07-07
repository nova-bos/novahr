import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Liveness probe: never cache, always hit the database.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Cheap round trip that proves the connection pool can reach Postgres.
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      db: "up",
      time: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ status: "error", db: "down" }, { status: 503 });
  }
}
