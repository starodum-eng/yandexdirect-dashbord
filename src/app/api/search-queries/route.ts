import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getAccounts } from "@/lib/accounts";
import { getSearchQueriesForAccounts } from "@/lib/searchQueries";
import type { SearchQueriesResponse } from "@/types/yandex";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

const querySchema = z.object({
  dateFrom: isoDate,
  dateTo: isoDate,
  account: z.string().default("all"),
  client: z.string().default("all"),
  refresh: z.enum(["true", "false"]).default("false"),
});

// GET /api/search-queries?dateFrom=&dateTo=&account=&client=&refresh=
// Returns per-account search-query statistics for the requested filters.
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

  const accountIds = getAccounts()
    .filter((a) => client === "all" || a.client === client)
    .filter((a) => account === "all" || a.id === account)
    .map((a) => a.id);

  if (accountIds.length === 0) {
    return NextResponse.json({ error: "No matching accounts" }, { status: 400 });
  }

  const accounts = await getSearchQueriesForAccounts({
    accountIds,
    dateFrom,
    dateTo,
    forceRefresh: refresh === "true",
  });

  const response: SearchQueriesResponse = { dateFrom, dateTo, accounts };
  return NextResponse.json(response);
}
