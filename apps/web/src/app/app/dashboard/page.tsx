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
    { label: "Revenue", value: `$${pl.totalRevenue.toFixed(2)}` },
    { label: "Cost", value: `$${pl.totalCost.toFixed(2)}` },
    { label: "Margin", value: `$${pl.totalMargin.toFixed(2)}` },
    { label: "Requests", value: pl.totalRequests.toLocaleString() },
  ];

  return (
    <div className="space-y-10">
      <h1 className="text-base font-semibold">Dashboard</h1>

      <div className="grid grid-cols-4 border-y border-gray-200 divide-x divide-gray-200">
        {stats.map((s) => (
          <div key={s.label} className="py-3 px-4">
            <p className="text-[11px] uppercase tracking-wider text-gray-500">
              {s.label}
            </p>
            <p className="text-lg font-medium mt-1 tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-sm font-medium">Daily margin</h2>
          <span className="text-xs text-gray-500">Last 30 days</span>
        </div>
        <MarginChart data={trend} />
      </section>
    </div>
  );
}
