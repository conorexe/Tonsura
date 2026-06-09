import { getDb } from "@/lib/db";
import {
  requestVolumeSeries,
  latencyPercentiles,
  perSubKeyPL,
} from "@tonsura/db";
import { VolumeChart } from "@/components/charts/VolumeChart";

export const dynamic = "force-dynamic";

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

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Analytics</h1>
      <div className="grid grid-cols-3 gap-4 lg:grid-cols-6">
        {[
          { label: "Active keys", value: String(keyCount) },
          { label: "Requests (30d)", value: nfmt(totalRequests) },
          { label: "Error rate", value: `${errorRate.toFixed(2)}%` },
          { label: "P50 latency", value: `${latency.p50}ms` },
          { label: "P95 latency", value: `${latency.p95}ms` },
          { label: "P99 latency", value: `${latency.p99}ms` },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border p-4">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="text-2xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-sm font-medium text-gray-500 mb-4">
          Request Volume (24h)
        </h2>
        <VolumeChart data={volume} />
      </div>
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="p-4 border-b font-medium flex items-baseline justify-between">
          <span>P&amp;L per API key (30d)</span>
          <span className="text-sm font-normal text-gray-500">
            {keyCount} keys · ${totalMargin.toFixed(2)} total margin
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b bg-gray-50">
                <th className="px-4 py-2 font-medium">API key</th>
                <th className="px-4 py-2 font-medium text-right">Requests</th>
                <th className="px-4 py-2 font-medium text-right">Avg latency</th>
                <th className="px-4 py-2 font-medium text-right">Errors</th>
                <th className="px-4 py-2 font-medium text-right">Revenue</th>
                <th className="px-4 py-2 font-medium text-right">Cost</th>
                <th className="px-4 py-2 font-medium text-right">Margin</th>
                <th className="px-4 py-2 font-medium text-right">Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {subKeyPL.map((row) => {
                const errPct =
                  row.requests > 0 ? (row.errors / row.requests) * 100 : 0;
                const marginPct =
                  row.revenue > 0 ? (row.margin / row.revenue) * 100 : null;
                return (
                  <tr key={row.subKeyId} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-xs text-gray-600 truncate max-w-[14rem]">
                      {row.subKeyId}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {nfmt(row.requests)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-gray-600">
                      {row.avgLatency}ms
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      <span
                        className={
                          errPct > 0.3 ? "text-red-600" : "text-gray-600"
                        }
                      >
                        {row.errors} ({errPct.toFixed(2)}%)
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      ${row.revenue.toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-gray-600">
                      ${row.cost.toFixed(2)}
                    </td>
                    <td
                      className={`px-4 py-2 text-right tabular-nums font-medium ${
                        row.margin >= 0 ? "text-green-700" : "text-red-600"
                      }`}
                    >
                      ${row.margin.toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-gray-600">
                      {marginPct === null ? "—" : `${marginPct.toFixed(0)}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function nfmt(n: number): string {
  return n.toLocaleString("en-US");
}
