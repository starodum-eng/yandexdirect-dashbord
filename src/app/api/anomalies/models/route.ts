import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isGeminiConfigured, listModels, activeModel } from "@/lib/gemini";

export const dynamic = "force-dynamic";

// GET /api/anomalies/models — lists Gemini models available to the configured
// key (those supporting generateContent), plus the currently selected model.
// Useful for choosing a valid GEMINI_MODEL when direct API access from the
// user's location is geo-restricted (this call runs from the server).
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isGeminiConfigured()) {
    return NextResponse.json(
      { configured: false, current: activeModel(), models: [] },
      { status: 200 },
    );
  }

  try {
    const models = await listModels();
    return NextResponse.json({
      configured: true,
      current: activeModel(),
      models,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
