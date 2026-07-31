import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isGeminiConfigured } from "@/lib/gemini";
import { runAnomalyAnalysis, ANALYSIS_COOLDOWN_MS } from "@/lib/anomalies";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const bodySchema = z.object({ dateFrom: isoDate, dateTo: isoDate });

// POST /api/anomalies/analyze — runs the AI anomaly analysis for the given
// period. Rate-limited to once per ANALYSIS_COOLDOWN_MS; if a recent run
// exists it is returned instead of calling the model again.
export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isGeminiConfigured()) {
    return NextResponse.json(
      { error: "Анализ не настроен: не задан GEMINI_API_KEY." },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { dateFrom, dateTo } = parsed.data;

  // Once-per-day gate: if a run exists within the cooldown, return it.
  const last = await prisma.analysisRun.findFirst({
    orderBy: { createdAt: "desc" },
  });
  if (last) {
    const nextAllowedAt = new Date(last.createdAt.getTime() + ANALYSIS_COOLDOWN_MS);
    if (nextAllowedAt.getTime() > Date.now()) {
      return NextResponse.json(
        {
          error: "Анализ уже запускался сегодня. Попробуйте позже.",
          nextAllowedAt: nextAllowedAt.toISOString(),
          last: {
            result: last.result,
            model: last.model,
            dateFrom: last.dateFrom,
            dateTo: last.dateTo,
            createdAt: last.createdAt.toISOString(),
          },
        },
        { status: 429 },
      );
    }
  }

  try {
    const { result, model } = await runAnomalyAnalysis(dateFrom, dateTo);

    const saved = await prisma.analysisRun.create({
      data: { result, model, dateFrom, dateTo },
    });

    return NextResponse.json({
      last: {
        result: saved.result,
        model: saved.model,
        dateFrom: saved.dateFrom,
        dateTo: saved.dateTo,
        createdAt: saved.createdAt.toISOString(),
      },
      nextAllowedAt: new Date(
        saved.createdAt.getTime() + ANALYSIS_COOLDOWN_MS,
      ).toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
