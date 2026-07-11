import type { YandexAccount } from "@/lib/accounts";
import type { CampaignRow } from "@/types/yandex";
import { REPORT_FIELDS, parseReportTsv } from "./report";

const REPORTS_ENDPOINT = "https://api.direct.yandex.com/json/v5/reports";

// Max attempts to poll for an asynchronously-generated report (HTTP 201/202).
const MAX_POLL_ATTEMPTS = 8;

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

// Requests a CUSTOM_REPORT from the Yandex.Direct Reports API v5 for a single
// account. Handles the asynchronous report lifecycle: the API answers with
// 201/202 while the report is still being prepared, and 200 with the TSV body
// once it is ready. Runs entirely on the server; the token never leaves here.
export async function fetchAccountReport({
  account,
  dateFrom,
  dateTo,
}: FetchReportParams): Promise<CampaignRow[]> {
  const body = {
    params: {
      SelectionCriteria: {
        DateFrom: dateFrom,
        DateTo: dateTo,
      },
      FieldNames: REPORT_FIELDS,
      ReportName: `report_${account.id}_${dateFrom}_${dateTo}_${Date.now()}`,
      ReportType: "CUSTOM_REPORT",
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
      const text = await res.text();
      return parseReportTsv(text);
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
