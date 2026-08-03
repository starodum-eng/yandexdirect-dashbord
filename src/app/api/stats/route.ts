import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getAccounts } from "@/lib/accounts";
import { getStatsForAccounts } from "@/lib/stats";
import { computeTotals } from "@/lib/yandex/report";
import type { CampaignRow, StatsResponse } from "@/types/yandex";

export const dynamic = "force-dynamic";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

const querySchema = z.object({
  dateFrom: isoDate,
  dateTo: isoDate,
  // "all" or a specific account id.
  account: z.string().default("all"),
  // "all" or a specific client name.
  client: z.string().default("all"),
  refresh: z.enum(["true", "false"]).default("false"),
});

// GET /api/stats?dateFrom=&dateTo=&account=all|<id>&refresh=true|false
// Returns aggregated statistics for the requested accounts and date range.
export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    dateFrom: searchParams.get("dateFrom"),
    dateTo: searchParams.get("dateTo"),
    account: searchParams.get("account") ?? "all",
    client: searchParams.get("client") ?? "all",
    refresh: searchParams.get("refresh") ?? "false",
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { dateFrom, dateTo, account, client, refresh } = parsed.data;

  if (dateFrom > dateTo) {
    return NextResponse.json(
      { error: "dateFrom must be on or before dateTo" },
      { status: 400 },
    );
  }

  // Filter accounts by client, then by a specific account.
  const allAccounts = getAccounts();
  const accountIds = allAccounts
    .filter((a) => client === "all" || a.client === client)
    .filter((a) => account === "all" || a.id === account)
    .map((a) => a.id);

  if (accountIds.length === 0) {
    return NextResponse.json({ error: "No matching accounts" }, { status: 400 });
  }

  const accounts = await getStatsForAccounts({
    accountIds,
    dateFrom,
    dateTo,
    forceRefresh: refresh === "true",
  });

  const allRows: CampaignRow[] = accounts.flatMap((a) => a.rows);

  const knownBalances = accounts
    .map((a) => a.balance)
    .filter((b): b is number => b !== null);
  const totalBalance =
    knownBalances.length > 0
      ? knownBalances.reduce((sum, b) => sum + b, 0)
      : null;

  const response: StatsResponse = {
    dateFrom,
    dateTo,
    totals: computeTotals(allRows),
    totalBalance,
    accounts,
  };

  return NextResponse.json(response);
}
