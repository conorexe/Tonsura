import { getDb } from "@/lib/db";
import {
  requestVolumeSeries,
  latencyPercentiles,
  perSubKeyPL,
} from "@tonsura/db";
import { VolumeChart } from "@/components/charts/VolumeChart";

export const dynamic = "force-dynamic";

const nfmt = (n: number) => n.toLocaleString("en-US");

export default async function AnalyticsPage() {
  const db = getDb();
  const [volume, latency, subKeyPL] = await Promise.all([
    requestVolumeSeries(db, 24),
    latencyPercentiles(db, 24),
    perSubKeyPL(db, 30),
  ]);

  const keyCount = subKeyPL.length;
  const totalRequests = subKeyPL.reduce((sum, r) => sum + r.requests, 0);
  const totalErrors = subKeyPL.reduce((sum, r) => sum + r.errors, 0);
  const totalMargin = subKeyPL.reduce((sum, r) => sum + r.margin, 0);
  const errorRate =
    totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

  const stats = [
    { label: "Active keys", value: String(keyCount) },
    { label: "Requests (30d)", value: nfmt(totalRequests) },
    { label: "Error rate", value: `${errorRate.toFixed(2)}%` },
    { label: "p50", value: `${latency.p50}ms` },
    { label: "p95", value: `${latency.p95}ms` },
    { label: "p99", value: `${latency.p99}ms` },
  ];

  return (
    <div className="space-y-10">
      <h1 className="text-base font-semibold">Analytics</h1>

      <div className="grid grid-cols-6 border-y border-gray-200 divide-x divide-gray-200">
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
          <h2 className="text-sm font-medium">Request volume</h2>
          <span className="text-xs text-gray-500">Last 24 hours</span>
        </div>
        <VolumeChart data={volume} />
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-sm font-medium">P&amp;L per key</h2>
          <span className="text-xs text-gray-500 tabular-nums">
            {keyCount} keys · ${totalMargin.toFixed(2)} margin
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-200">
                <th className="font-normal py-2">Key</th>
                <th className="font-normal py-2 text-right">Requests</th>
                <th className="font-normal py-2 text-right">Latency</th>
                <th className="font-normal py-2 text-right">Errors</th>
                <th className="font-normal py-2 text-right">Revenue</th>
                <th className="font-normal py-2 text-right">Cost</th>
                <th className="font-normal py-2 text-right">Margin</th>
                <th className="font-normal py-2 text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {subKeyPL.map((row) => {
                const errPct =
                  row.requests > 0 ? (row.errors / row.requests) * 100 : 0;
                const marginPct =
                  row.revenue > 0 ? (row.margin / row.revenue) * 100 : null;
                return (
                  <tr key={row.subKeyId} className="border-b border-gray-100">
                    <td className="py-2.5 font-mono text-xs text-gray-600 truncate max-w-[14rem]">
                      {row.subKeyId}
                    </td>
                    <td className="py-2.5 text-right tabular-nums">
                      {nfmt(row.requests)}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-gray-600">
                      {row.avgLatency}ms
                    </td>
                    <td className="py-2.5 text-right tabular-nums">
                      <span
                        className={
                          errPct > 0.3 ? "text-red-600" : "text-gray-600"
                        }
                      >
                        {row.errors}
                      </span>
                    </td>
                    <td className="py-2.5 text-right tabular-nums">
                      ${row.revenue.toFixed(2)}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-gray-600">
                      ${row.cost.toFixed(2)}
                    </td>
                    <td
                      className={`py-2.5 text-right tabular-nums ${row.margin < 0 ? "text-red-600" : ""}`}
                    >
                      ${row.margin.toFixed(2)}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-gray-600">
                      {marginPct === null ? "" : `${marginPct.toFixed(0)}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
