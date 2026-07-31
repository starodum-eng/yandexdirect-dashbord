import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isGeminiConfigured } from "@/lib/gemini";
import { ANALYSIS_COOLDOWN_MS } from "@/lib/anomalies";

export const dynamic = "force-dynamic";

// GET /api/anomalies — returns the latest analysis and whether a new run is
// currently allowed (once-per-day gate).
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const last = await prisma.analysisRun.findFirst({
    orderBy: { createdAt: "desc" },
  });

  const nextAllowedAt = last
    ? new Date(last.createdAt.getTime() + ANALYSIS_COOLDOWN_MS)
    : null;
  const canRun = !nextAllowedAt || nextAllowedAt.getTime() <= Date.now();

  return NextResponse.json({
    configured: isGeminiConfigured(),
    canRun,
    nextAllowedAt: nextAllowedAt?.toISOString() ?? null,
    last: last
      ? {
          result: last.result,
          model: last.model,
          dateFrom: last.dateFrom,
          dateTo: last.dateTo,
          createdAt: last.createdAt.toISOString(),
        }
      : null,
  });
}
