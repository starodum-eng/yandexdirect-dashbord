import { getPublicAccounts } from "@/lib/accounts";
import { StatsView } from "@/components/StatsView";

export const dynamic = "force-dynamic";

export default function CampaignsPage() {
  const accounts = getPublicAccounts();

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-semibold text-gray-900">Кампании</h1>
      <StatsView accounts={accounts} mode="campaigns" />
    </div>
  );
}
