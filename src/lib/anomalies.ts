import { getAccounts } from "@/lib/accounts";
import { getStatsForAccounts } from "@/lib/stats";
import { generateText, activeModel } from "@/lib/gemini";
import { LOW_BALANCE_THRESHOLD } from "@/lib/constants";
import { toIso } from "@/lib/dateRanges";
import type { AccountStats, CampaignRow } from "@/types/yandex";

// Persona + task for the model. Kept strict so the output is actionable and in
// Russian markdown.
const SYSTEM = `Ты — опытный специалист по контекстной рекламе в Яндекс.Директе с многолетним опытом ведения агентских аккаунтов.
Тебе дают статистику по нескольким рекламным кабинетам за ТЕКУЩИЙ и ПРЕДЫДУЩИЙ равные периоды, а также баланс каждого кабинета.
Твоя задача — найти аномалии и отклонения от нормы и выдать краткий разбор для медиабайера.

Ищи в том числе:
- резкий рост или падение расхода;
- рост CPA (цены лида) и падение числа лидов/конверсий;
- падение показов, кликов, CTR (снижение охватов);
- риск скорой остановки кампаний из-за низкого баланса (порог ~${LOW_BALANCE_THRESHOLD} ₽);
- кампании с расходом, но без лидов;
- кампании, которые «встали» (были показы/расход в прошлом периоде и почти ноль в текущем).

Правила ответа:
- Отвечай на русском, в Markdown.
- Сначала список аномалий, каждая с маркером важности: 🔴 критично, 🟡 внимание. Для каждой: что произошло (с цифрами и % изменения), вероятная причина, конкретная рекомендация.
- Группируй по кабинетам, если аномалий много.
- В конце блок «Приоритеты» — 2–3 самых важных действия.
- Не выдумывай данных, опирайся только на переданные цифры. Если явных аномалий нет — так и напиши.
- Будь конкретным и лаконичным, без воды.`;

// The "Анализ" button may run at most once per this window.
export const ANALYSIS_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export interface AnalysisResult {
  result: string;
  model: string;
}

// Computes the previous period of equal length, ending the day before dateFrom.
function previousPeriod(dateFrom: string, dateTo: string) {
  const from = new Date(`${dateFrom}T00:00:00`);
  const to = new Date(`${dateTo}T00:00:00`);
  const days = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;

  const prevTo = new Date(from);
  prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevFrom.getDate() - (days - 1));

  return { dateFrom: toIso(prevFrom), dateTo: toIso(prevTo) };
}

function cpa(r: { cost: number; conversions: number }): number {
  return r.conversions > 0 ? Math.round((r.cost / r.conversions) * 100) / 100 : 0;
}

function campaignMetrics(r: CampaignRow) {
  return {
    impressions: r.impressions,
    clicks: r.clicks,
    cost: r.cost,
    ctr: r.ctr,
    leads: r.conversions,
    cpa: cpa(r),
  };
}

// Builds a compact JSON payload pairing current and previous data per account
// and per campaign (top campaigns by current spend to keep it small).
function buildPayload(
  current: AccountStats[],
  previous: AccountStats[],
  period: { dateFrom: string; dateTo: string },
  prev: { dateFrom: string; dateTo: string },
) {
  const prevById = new Map(previous.map((a) => [a.accountId, a]));
  const MAX_CAMPAIGNS = 15;

  const accounts = current.map((acc) => {
    const prevAcc = prevById.get(acc.accountId);
    const prevRows = new Map(
      (prevAcc?.rows ?? []).map((r) => [r.campaignId, r]),
    );

    const campaigns = [...acc.rows]
      .sort((a, b) => b.cost - a.cost)
      .slice(0, MAX_CAMPAIGNS)
      .map((r) => {
        const pr = prevRows.get(r.campaignId);
        return {
          campaign: r.campaignName,
          current: campaignMetrics(r),
          previous: pr ? campaignMetrics(pr) : null,
        };
      });

    return {
      account: acc.label,
      balance: acc.balance,
      lowBalanceThreshold: LOW_BALANCE_THRESHOLD,
      current: {
        impressions: acc.totals.impressions,
        clicks: acc.totals.clicks,
        cost: acc.totals.cost,
        ctr: acc.totals.ctr,
        leads: acc.totals.conversions,
        cpa: acc.totals.cpa,
      },
      previous: prevAcc
        ? {
            impressions: prevAcc.totals.impressions,
            clicks: prevAcc.totals.clicks,
            cost: prevAcc.totals.cost,
            ctr: prevAcc.totals.ctr,
            leads: prevAcc.totals.conversions,
            cpa: prevAcc.totals.cpa,
          }
        : null,
      campaigns,
    };
  });

  return { period, previousPeriod: prev, currency: "RUB", accounts };
}

// Fetches current + previous stats for all accounts and asks the model to flag
// anomalies. Returns the markdown result and the model used.
export async function runAnomalyAnalysis(
  dateFrom: string,
  dateTo: string,
): Promise<AnalysisResult> {
  const accountIds = getAccounts().map((a) => a.id);
  const prev = previousPeriod(dateFrom, dateTo);

  const [current, previous] = await Promise.all([
    getStatsForAccounts({ accountIds, dateFrom, dateTo }),
    getStatsForAccounts({
      accountIds,
      dateFrom: prev.dateFrom,
      dateTo: prev.dateTo,
    }),
  ]);

  const payload = buildPayload(current, previous, { dateFrom, dateTo }, prev);
  const prompt = `Проанализируй эти данные и найди аномалии.\n\nДанные (JSON):\n${JSON.stringify(
    payload,
  )}`;

  const result = await generateText({ system: SYSTEM, prompt });
  return { result, model: activeModel() };
}
