// Minimal client for the Google Gemini API (Google AI Studio key).
// Used only server-side; the API key never reaches the browser.

// Evergreen alias that tracks the current stable Flash model. Override with
// GEMINI_MODEL if a specific model is needed (see GET /api/anomalies/models).
const DEFAULT_MODEL = process.env.GEMINI_MODEL ?? "gemini-flash-latest";

export class GeminiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeminiError";
  }
}

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

interface GenerateParams {
  system: string; // system instruction
  prompt: string; // user content
  temperature?: number;
}

// Calls generateContent and returns the model's text. Throws GeminiError on any
// failure so the caller can surface a friendly message.
export async function generateText({
  system,
  prompt,
  temperature = 0.4,
}: GenerateParams): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiError("GEMINI_API_KEY is not set.");
  }

  const model = DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new GeminiError(
      `Gemini API error (${res.status}): ${detail.slice(0, 300)}`,
    );
  }

  const json: unknown = await res.json();
  const text = extractText(json);
  if (!text) {
    throw new GeminiError("Пустой ответ модели.");
  }
  return text;
}

export function activeModel(): string {
  return DEFAULT_MODEL;
}

export interface ModelInfo {
  name: string; // model id without the "models/" prefix
  displayName?: string;
}

// Lists models available to the configured key that support generateContent.
// Runs server-side (Vercel), so it works even where direct API calls from the
// user's own location are geo-restricted. Throws GeminiError on failure.
export async function listModels(): Promise<ModelInfo[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiError("GEMINI_API_KEY is not set.");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(
    apiKey,
  )}`;
  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new GeminiError(
      `Gemini API error (${res.status}): ${detail.slice(0, 300)}`,
    );
  }

  const json: unknown = await res.json();
  const models = (json as { models?: unknown }).models;
  if (!Array.isArray(models)) return [];

  return models
    .filter((m) => {
      const methods = (m as { supportedGenerationMethods?: unknown })
        .supportedGenerationMethods;
      return Array.isArray(methods) && methods.includes("generateContent");
    })
    .map((m) => {
      const raw = String((m as { name?: unknown }).name ?? "");
      return {
        name: raw.replace(/^models\//, ""),
        displayName: (m as { displayName?: string }).displayName,
      };
    });
}

// Pulls candidates[0].content.parts[*].text out of the response.
function extractText(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const candidates = (json as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return null;

  const parts = (
    candidates[0] as { content?: { parts?: unknown } } | undefined
  )?.content?.parts;
  if (!Array.isArray(parts)) return null;

  const text = parts
    .map((p) => (p as { text?: unknown }).text)
    .filter((t): t is string => typeof t === "string")
    .join("");

  return text.trim() || null;
}
