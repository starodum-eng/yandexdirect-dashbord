import type { YandexAccount } from "@/lib/accounts";
import type { CampaignRow, SearchQueryRow } from "@/types/yandex";
import {
  REPORT_FIELDS,
  SEARCH_QUERY_FIELDS,
  parseReportTsv,
  parseSearchQueryTsv,
} from "./report";

const REPORTS_ENDPOINT = "https://api.direct.yandex.com/json/v5/reports";

// Max attempts to poll for an asynchronously-generated report (HTTP 201/202).
const MAX_POLL_ATTEMPTS = 8;

// Attribution model used when counting conversions for specific goals.
// LSC = last significant click. Override via env if needed.
const ATTRIBUTION_MODEL = process.env.YANDEX_ATTRIBUTION_MODEL ?? "LSC";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class YandexApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "YandexApiError";
  }
}

interface FetchReportParams {
  account: YandexAccount;
  dateFrom: string; // YYYY-MM-DD
  dateTo: string; // YYYY-MM-DD
}

interface RequestReportParams extends FetchReportParams {
  reportType: string;
  fieldNames: readonly string[];
}

// Requests a report from the Yandex.Direct Reports API v5 for a single account
// and returns the raw TSV body. Handles the asynchronous report lifecycle: the
// API answers 201/202 while the report is being prepared, and 200 with the TSV
// once ready. Runs entirely on the server; the token never leaves here.
async function requestReportTsv({
  account,
  dateFrom,
  dateTo,
  reportType,
  fieldNames,
}: RequestReportParams): Promise<string> {
  // When the account restricts leads to specific goals, request per-goal
  // conversion columns (Conversions_<goalId>_<model>) for those goals; the
  // report parser sums them. Without goals, the aggregated Conversions column
  // (all Metrica goals) is returned.
  const goalParams =
    account.goals.length > 0
      ? { Goals: account.goals, AttributionModels: [ATTRIBUTION_MODEL] }
      : {};

  const body = {
    params: {
      SelectionCriteria: {
        DateFrom: dateFrom,
        DateTo: dateTo,
      },
      ...goalParams,
      FieldNames: fieldNames,
      ReportName: `${reportType}_${account.id}_${dateFrom}_${dateTo}_${Date.now()}`,
      ReportType: reportType,
      DateRangeType: "CUSTOM_DATE",
      Format: "TSV",
      IncludeVAT: "YES",
    },
  };

  const headers: Record<string, string> = {
    Authorization: `Bearer ${account.token}`,
    "Accept-Language": "ru",
    "Content-Type": "application/json; charset=utf-8",
    processingMode: "auto",
    returnMoneyInMicros: "false",
    skipReportHeader: "false",
    skipColumnHeader: "false",
    skipReportSummary: "true",
  };

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    const res = await fetch(REPORTS_ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (res.status === 200) {
      return res.text();
    }

    // Report is being prepared — wait as suggested by retryIn (seconds) header.
    if (res.status === 201 || res.status === 202) {
      const retryIn = Number(res.headers.get("retryIn") ?? "3");
      const waitMs = Math.min(Math.max(retryIn, 1), 10) * 1000;
      await sleep(waitMs);
      continue;
    }

    // Any other status is a hard error — surface the response body for context.
    const errText = await res.text().catch(() => "");
    throw new YandexApiError(
      `Yandex.Direct API error (${res.status}) for account ${account.id}: ${errText.slice(0, 500)}`,
      res.status,
    );
  }

  throw new YandexApiError(
    `Report for account ${account.id} was not ready after ${MAX_POLL_ATTEMPTS} attempts.`,
  );
}

// Per-campaign statistics (CUSTOM_REPORT).
export async function fetchAccountReport(
  params: FetchReportParams,
): Promise<CampaignRow[]> {
  const tsv = await requestReportTsv({
    ...params,
    reportType: "CUSTOM_REPORT",
    fieldNames: REPORT_FIELDS,
  });
  return parseReportTsv(tsv);
}

// Per-search-query statistics (SEARCH_QUERY_PERFORMANCE_REPORT).
export async function fetchAccountSearchQueries(
  params: FetchReportParams,
): Promise<SearchQueryRow[]> {
  const tsv = await requestReportTsv({
    ...params,
    reportType: "SEARCH_QUERY_PERFORMANCE_REPORT",
    fieldNames: SEARCH_QUERY_FIELDS,
  });
  return parseSearchQueryTsv(tsv);
}
