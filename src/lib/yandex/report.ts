import type { CampaignRow, StatsTotals } from "@/types/yandex";

// Field order requested from the Reports API. Must match the header row of the
// returned TSV report.
export const REPORT_FIELDS = [
  "CampaignId",
  "CampaignName",
  "Impressions",
  "Clicks",
  "Cost",
  "Ctr",
  "Conversions",
] as const;

function toNumber(value: string | undefined): number {
  if (value === undefined || value === "" || value === "--") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

// Parses the TSV body returned by the Reports API into campaign rows.
// The report uses a header row when includeHeaders is enabled; we locate the
// header to be resilient to the leading report-name line and trailing totals.
export function parseReportTsv(tsv: string): CampaignRow[] {
  const lines = tsv.split("\n").filter((l) => l.trim() !== "");
  if (lines.length === 0) return [];

  // Find the header line (contains "CampaignId").
  const headerIdx = lines.findIndex((l) => l.split("\t")[0] === "CampaignId");
  if (headerIdx === -1) return [];

  const header = lines[headerIdx].split("\t");
  const col = (name: string) => header.indexOf(name);

  const idxCampaignId = col("CampaignId");
  const idxCampaignName = col("CampaignName");
  const idxImpressions = col("Impressions");
  const idxClicks = col("Clicks");
  const idxCost = col("Cost");
  const idxCtr = col("Ctr");
  const idxConversions = col("Conversions");

  const rows: CampaignRow[] = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cells = lines[i].split("\t");
    // Skip the trailing "Total rows" summary line produced by the API.
    if (cells[0] === "Total rows" || cells.length < header.length) continue;

    rows.push({
      campaignId: cells[idxCampaignId] ?? "",
      campaignName: cells[idxCampaignName] ?? "",
      impressions: toNumber(cells[idxImpressions]),
      clicks: toNumber(cells[idxClicks]),
      cost: toNumber(cells[idxCost]),
      ctr: toNumber(cells[idxCtr]),
      conversions: toNumber(cells[idxConversions]),
    });
  }

  return rows;
}

// Aggregates campaign rows into totals. CTR is recomputed from summed
// impressions/clicks rather than averaged.
export function computeTotals(rows: CampaignRow[]): StatsTotals {
  const totals = rows.reduce(
    (acc, r) => {
      acc.impressions += r.impressions;
      acc.clicks += r.clicks;
      acc.cost += r.cost;
      acc.conversions += r.conversions;
      return acc;
    },
    { impressions: 0, clicks: 0, cost: 0, conversions: 0 },
  );

  const ctr =
    totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;

  const cpa =
    totals.conversions > 0 ? totals.cost / totals.conversions : 0;

  return {
    impressions: totals.impressions,
    clicks: totals.clicks,
    cost: Math.round(totals.cost * 100) / 100,
    ctr: Math.round(ctr * 100) / 100,
    conversions: totals.conversions,
    cpa: Math.round(cpa * 100) / 100,
  };
}
