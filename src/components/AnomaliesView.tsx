"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import { PRESETS, presetRange, type PresetKey } from "@/lib/dateRanges";
import { formatDateTime } from "@/lib/format";

interface LastRun {
  result: string;
  model: string;
  dateFrom: string;
  dateTo: string;
  createdAt: string;
}

interface AnomaliesState {
  configured: boolean;
  canRun: boolean;
  nextAllowedAt: string | null;
  last: LastRun | null;
}

// Only period presets make sense here (analysis always covers all accounts).
const PERIOD_PRESETS: PresetKey[] = ["last7", "lastWeek", "last30", "last3m"];

// Minimal markdown styling without a typography plugin.
const MD: Components = {
  h1: (p) => <h1 className="mt-4 text-base font-semibold text-gray-900" {...p} />,
  h2: (p) => <h2 className="mt-4 text-base font-semibold text-gray-900" {...p} />,
  h3: (p) => <h3 className="mt-3 text-sm font-semibold text-gray-800" {...p} />,
  p: (p) => <p className="mt-2 text-sm leading-relaxed text-gray-700" {...p} />,
  ul: (p) => <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700" {...p} />,
  ol: (p) => <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-gray-700" {...p} />,
  li: (p) => <li className="leading-relaxed" {...p} />,
  strong: (p) => <strong className="font-semibold text-gray-900" {...p} />,
  hr: () => <hr className="my-4 border-gray-200" />,
  code: (p) => (
    <code className="rounded bg-gray-100 px-1 py-0.5 text-xs" {...p} />
  ),
};

export function AnomaliesView() {
  const [state, setState] = useState<AnomaliesState | null>(null);
  const [preset, setPreset] = useState<PresetKey>("last30");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/anomalies");
      if (!res.ok) throw new Error(`Ошибка загрузки (${res.status})`);
      setState(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAnalysis() {
    setRunning(true);
    setError(null);
    try {
      const range = presetRange(preset);
      const res = await fetch("/api/anomalies/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(range),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? `Ошибка (${res.status})`);
        if (json.last) {
          setState((s) => ({
            configured: s?.configured ?? true,
            canRun: false,
            nextAllowedAt: json.nextAllowedAt ?? null,
            last: json.last,
          }));
        }
        return;
      }
      setState({
        configured: true,
        canRun: false,
        nextAllowedAt: json.nextAllowedAt ?? null,
        last: json.last,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setRunning(false);
    }
  }

  const nextAllowedText = useMemo(() => {
    if (!state?.nextAllowedAt) return null;
    return formatDateTime(state.nextAllowedAt);
  }, [state?.nextAllowedAt]);

  const disabled =
    running || !state || !state.configured || !state.canRun;

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2">
            {PRESETS.filter((p) => PERIOD_PRESETS.includes(p.key)).map((p) => (
              <button
                key={p.key}
                onClick={() => setPreset(p.key)}
                disabled={running}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  preset === p.key
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={runAnalysis}
            disabled={disabled}
            className="ml-auto rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50"
          >
            {running ? "Анализируем…" : "Анализ"}
          </button>
        </div>

        <p className="mt-3 text-xs text-gray-500">
          ИИ сравнивает выбранный период с предыдущим равным и ищет отклонения.
          Доступно не чаще раза в сутки.
          {state?.last && (
            <>
              {" "}Последний анализ: {formatDateTime(state.last.createdAt)} (
              {state.last.model}).
            </>
          )}
          {!state?.canRun && nextAllowedText && (
            <> Снова можно: {nextAllowedText}.</>
          )}
        </p>

        {state && !state.configured && (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Анализ не настроен: задайте переменную окружения GEMINI_API_KEY
            (ключ из Google AI Studio) и передеплойте.
          </p>
        )}
        {error && (
          <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
            {/^Gemini API error/.test(error) && (
              <>
                {" "}
                <a
                  href="/api/anomalies/models"
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  Посмотреть доступные модели
                </a>{" "}
                и задать GEMINI_MODEL.
              </>
            )}
          </div>
        )}
      </div>

      {state?.last ? (
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div className="mb-2 text-xs text-gray-500">
            Период: {state.last.dateFrom} — {state.last.dateTo}
          </div>
          <ReactMarkdown components={MD}>{state.last.result}</ReactMarkdown>
        </div>
      ) : (
        !running && (
          <div className="rounded-xl bg-white p-8 text-center text-sm text-gray-500 shadow-sm ring-1 ring-gray-200">
            Анализ ещё не запускался. Выберите период и нажмите «Анализ».
          </div>
        )
      )}
    </div>
  );
}
