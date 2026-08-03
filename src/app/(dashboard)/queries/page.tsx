import { getPublicAccounts } from "@/lib/accounts";
import { SearchQueriesView } from "@/components/SearchQueriesView";

export const dynamic = "force-dynamic";

export default function SearchQueriesPage() {
  const accounts = getPublicAccounts();

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-semibold text-gray-900">
        Поисковые запросы
      </h1>
      <SearchQueriesView accounts={accounts} />
    </div>
  );
}
