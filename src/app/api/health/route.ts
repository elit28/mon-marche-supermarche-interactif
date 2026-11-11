import { NextResponse } from "next/server";
import { getSql } from "@/server/db";

/** Sonde de santé (Docker, orchestrateurs) : application + base de données. */
export async function GET() {
  try {
    await getSql()`SELECT 1`;
    return NextResponse.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ status: "degraded", database: "unreachable" }, { status: 503 });
  }
}
