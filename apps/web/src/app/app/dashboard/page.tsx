import { getDb } from "@/lib/db";
import { summaryPL, dailyMarginTrend } from "@tonsura/db";
import { MarginChart } from "@/components/charts/MarginChart";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const db = getDb();
  const [pl, trend] = await Promise.all([
    summaryPL(db, 30),
    dailyMarginTrend(db, 30),
  ]);

  const stats = [
    { label: "Revenue (30d)", value: `$${pl.totalRevenue.toFixed(2)}` },
    { label: "Cost (30d)", value: `$${pl.totalCost.toFixed(2)}` },
    { label: "Margin (30d)", value: `$${pl.totalMargin.toFixed(2)}` },
    { label: "Requests (30d)", value: pl.totalRequests.toLocaleString() },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border p-4">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="text-2xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-sm font-medium text-gray-500 mb-4">
          Daily Margin (30d)
        </h2>
        <MarginChart data={trend} />
      </div>
    </div>
  );
}
