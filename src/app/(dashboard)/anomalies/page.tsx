import { AnomaliesView } from "@/components/AnomaliesView";

export const dynamic = "force-dynamic";

export default function AnomaliesPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-lg font-semibold text-gray-900">Аномалии</h1>
      <AnomaliesView />
    </div>
  );
}
