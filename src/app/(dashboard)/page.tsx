import { getPublicAccounts } from "@/lib/accounts";
import { StatsView } from "@/components/StatsView";

export const dynamic = "force-dynamic";

export default function OverviewPage() {
  const accounts = getPublicAccounts();

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-semibold text-gray-900">Сводная статистика</h1>
      <StatsView accounts={accounts} mode="summary" />
    </div>
  );
}
