// Minimal client for the Google Gemini API (Google AI Studio key).
// Used only server-side; the API key never reaches the browser.

const DEFAULT_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

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
