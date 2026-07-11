import { NextResponse } from "next/server";
import { getAccounts } from "@/lib/accounts";
import { getStatsForAccounts } from "@/lib/stats";

export const dynamic = "force-dynamic";

// Default date range refreshed by the scheduled job: the current month to date.
function defaultRange(): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  return { dateFrom: from, dateTo: to };
}

// GET /api/cron/refresh — force-refreshes cached snapshots for all accounts.
// Intended to be called by an external scheduler (e.g. Vercel Cron, a system
// crontab curl). Protected by the CRON_SECRET bearer token when configured.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const { searchParams } = new URL(request.url);
  const { dateFrom: defFrom, dateTo: defTo } = defaultRange();
  const dateFrom = searchParams.get("dateFrom") ?? defFrom;
  const dateTo = searchParams.get("dateTo") ?? defTo;

  const accountIds = getAccounts().map((a) => a.id);
  const accounts = await getStatsForAccounts({
    accountIds,
    dateFrom,
    dateTo,
    forceRefresh: true,
  });

  return NextResponse.json({
    refreshed: accounts.map((a) => ({
      accountId: a.accountId,
      refreshedAt: a.refreshedAt,
      error: a.error ?? null,
    })),
    dateFrom,
    dateTo,
  });
}
